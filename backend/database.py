"""
Database utilities for connecting to PostgreSQL and querying models.
Falls back to models_config.py if database is unavailable.
"""
import os
from typing import List, Optional
from dataclasses import dataclass
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv

load_dotenv()

# Import models_config as fallback
try:
    from models_config import MODEL_CONFIGS, Provider
except ImportError:
    MODEL_CONFIGS = {}
    Provider = None


@dataclass
class ModelDB:
    """Model representation from database."""
    id: int
    model_name: str
    model_id: str
    provider: str
    complexity_level: int
    task_type: str
    co2: float
    cost_input_tokens: float
    cost_output_tokens: float


class Database:
    """PostgreSQL database connection manager."""

    def __init__(self):
        """Initialize database connection from environment variables."""
        self.connection_params = {
            "host": os.getenv("DB_HOST", "localhost"),
            "port": os.getenv("DB_PORT", "5432"),
            "database": os.getenv("DB_NAME", "postgres"),
            "user": os.getenv("DB_USER", "postgres"),
            "password": os.getenv("DB_PASSWORD", "postgres"),
        }
        self._test_connection()

    def _test_connection(self):
        """Test database connection."""
        try:
            conn = self.get_connection()
            conn.close()
            print("Database connection successful!")
            self._use_database = True
        except Exception as e:
            print(f"Warning: Database connection failed: {e}")
            print("Falling back to models_config.py")
            self._use_database = False

    def get_connection(self):
        """Get a new database connection."""
        return psycopg2.connect(**self.connection_params)

    def get_all_models(self) -> List[ModelDB]:
        """Get all models from database or fallback to config."""
        # Fallback to models_config if database is not available
        if not self._use_database:
            return self._get_models_from_config()
        
        conn = self.get_connection()
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                cursor.execute("""
                    SELECT id, model_name, model_id, provider, complexity_level,
                           task_type, co2, cost_input_tokens, cost_output_tokens
                    FROM model
                    ORDER BY complexity_level ASC
                """)
                rows = cursor.fetchall()
                if not rows:
                    # If database is empty, fallback to config
                    return self._get_models_from_config()
                return [ModelDB(**row) for row in rows]
        except Exception as e:
            print(f"Error fetching models from database: {e}, falling back to config")
            return self._get_models_from_config()
        finally:
            conn.close()
    
    def _get_models_from_config(self) -> List[ModelDB]:
        """Get models from models_config.py as fallback."""
        models = []
        for idx, (model_id, config) in enumerate(MODEL_CONFIGS.items(), start=1):
            # Default values for fields not in config
            models.append(ModelDB(
                id=idx,
                model_name=config.name,
                model_id=config.model_id,
                provider=config.provider.value if hasattr(config.provider, 'value') else str(config.provider),
                complexity_level=config.complexity_level,
                task_type="general",
                co2=0.0,  # Default CO2 value
                cost_input_tokens=0.0,  # Default cost
                cost_output_tokens=0.0,  # Default cost
            ))
        return models

    def get_model_by_id(self, model_id: str) -> Optional[ModelDB]:
        """Get a specific model by model_id."""
        # Fallback to models_config if database is not available
        if not self._use_database:
            return self._get_model_from_config(model_id)
        
        conn = self.get_connection()
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                cursor.execute("""
                    SELECT id, model_name, model_id, provider, complexity_level,
                           task_type, co2, cost_input_tokens, cost_output_tokens
                    FROM model
                    WHERE model_id = %s
                """, (model_id,))
                row = cursor.fetchone()
                if row:
                    return ModelDB(**row)
                else:
                    # Fallback to config if not found in database
                    return self._get_model_from_config(model_id)
        except Exception as e:
            print(f"Error fetching model {model_id} from database: {e}, falling back to config")
            return self._get_model_from_config(model_id)
        finally:
            conn.close()
    
    def _get_model_from_config(self, model_id: str) -> Optional[ModelDB]:
        """Get a model from models_config.py by ID."""
        if model_id not in MODEL_CONFIGS:
            return None
        config = MODEL_CONFIGS[model_id]
        return ModelDB(
            id=hash(model_id) % 1000000,  # Generate a pseudo-ID
            model_name=config.name,
            model_id=config.model_id,
            provider=config.provider.value if hasattr(config.provider, 'value') else str(config.provider),
            complexity_level=config.complexity_level,
            task_type="general",
            co2=0.0,
            cost_input_tokens=0.0,
            cost_output_tokens=0.0,
        )

    def get_models_by_complexity(self, min_complexity: int) -> List[ModelDB]:
        """
        Get models that meet or exceed the minimum complexity level.
        Returns models sorted by: exact match first, then complexity (ascending), then cost (ascending).
        """
        # Fallback to models_config if database is not available
        if not self._use_database:
            all_models = self._get_models_from_config()
            suitable = [m for m in all_models if m.complexity_level >= min_complexity]
            # Sort: exact complexity match first, then by complexity level, then by cost
            suitable.sort(key=lambda m: (
                0 if m.complexity_level == min_complexity else 1,  # Exact match first
                m.complexity_level,  # Then by complexity
                m.cost_input_tokens,  # Then by cost
                m.co2  # Finally by CO2
            ))
            return suitable
        
        conn = self.get_connection()
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                cursor.execute("""
                    SELECT id, model_name, model_id, provider, complexity_level,
                           task_type, co2, cost_input_tokens, cost_output_tokens
                    FROM model
                    WHERE complexity_level >= %s
                    ORDER BY 
                        CASE WHEN complexity_level = %s THEN 0 ELSE 1 END,
                        complexity_level ASC, 
                        cost_input_tokens ASC, 
                        co2 ASC
                """, (min_complexity, min_complexity))
                rows = cursor.fetchall()
                if not rows:
                    # Fallback to config if database is empty
                    all_models = self._get_models_from_config()
                    suitable = [m for m in all_models if m.complexity_level >= min_complexity]
                    suitable.sort(key=lambda m: (
                        0 if m.complexity_level == min_complexity else 1,
                        m.complexity_level,
                        m.cost_input_tokens,
                        m.co2
                    ))
                    return suitable
                return [ModelDB(**row) for row in rows]
        except Exception as e:
            print(f"Error fetching models by complexity from database: {e}, falling back to config")
            all_models = self._get_models_from_config()
            suitable = [m for m in all_models if m.complexity_level >= min_complexity]
            suitable.sort(key=lambda m: (
                0 if m.complexity_level == min_complexity else 1,
                m.complexity_level,
                m.cost_input_tokens,
                m.co2
            ))
            return suitable
        finally:
            conn.close()

    def get_optimal_model_for_complexity(self, complexity: int) -> Optional[ModelDB]:
        """
        Get the most cost-effective model for the exact complexity level.
        Prioritizes models with the exact complexity level, then selects the cheapest one.
        """
        models = self.get_models_by_complexity(complexity)
        if not models:
            return None
        
        # Filter for exact complexity match first
        exact_matches = [m for m in models if m.complexity_level == complexity]
        if exact_matches:
            # Among exact matches, return the cheapest (already sorted by cost)
            return exact_matches[0]
        
        # If no exact match, return the cheapest model that meets the requirement
        # (already sorted by complexity then cost)
        return models[0]

    def get_cheaper_alternatives(self, current_model_id: str, required_complexity: int) -> List[ModelDB]:
        """
        Get cheaper alternative models that can handle the required complexity.
        Returns models that are more efficient than the current model.
        """
        current_model = self.get_model_by_id(current_model_id)
        if not current_model:
            return []

        suitable_models = self.get_models_by_complexity(required_complexity)

        # Filter models that are cheaper or more energy efficient than current
        alternatives = [
            model for model in suitable_models
            if (model.cost_input_tokens < current_model.cost_input_tokens
                or model.co2 < current_model.co2)
            and model.model_id != current_model_id
        ]

        # Sort by cost and CO2 efficiency
        alternatives.sort(key=lambda m: (m.cost_input_tokens, m.co2))

        return alternatives


# Global database instance
_db_instance: Optional[Database] = None


def get_database() -> Database:
    """Get or create the global database instance."""
    global _db_instance
    if _db_instance is None:
        _db_instance = Database()
    return _db_instance
