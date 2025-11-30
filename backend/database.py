"""
Database utilities for connecting to PostgreSQL and querying models.
"""
import os
from typing import List, Optional
from dataclasses import dataclass
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv

load_dotenv()


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
        except Exception as e:
            print(f"Warning: Database connection failed: {e}")
            print("Please check your database configuration in .env file")

    def get_connection(self):
        """Get a new database connection."""
        return psycopg2.connect(**self.connection_params)

    def get_all_models(self) -> List[ModelDB]:
        """Get all models from database."""
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
                return [ModelDB(**row) for row in rows]
        finally:
            conn.close()

    def get_model_by_id(self, model_id: str) -> Optional[ModelDB]:
        """Get a specific model by model_id."""
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
                return ModelDB(**row) if row else None
        finally:
            conn.close()

    def get_models_by_complexity(self, min_complexity: int) -> List[ModelDB]:
        """
        Get models that meet or exceed the minimum complexity level.
        Returns models sorted by complexity (ascending) to prefer cheaper options.
        """
        conn = self.get_connection()
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                cursor.execute("""
                    SELECT id, model_name, model_id, provider, complexity_level,
                           task_type, co2, cost_input_tokens, cost_output_tokens
                    FROM model
                    WHERE complexity_level >= %s
                    ORDER BY complexity_level ASC, co2 ASC, cost_input_tokens ASC
                """, (min_complexity,))
                rows = cursor.fetchall()
                return [ModelDB(**row) for row in rows]
        finally:
            conn.close()

    def get_optimal_model_for_complexity(self, complexity: int) -> Optional[ModelDB]:
        """
        Get the most cost-effective model that meets the complexity requirement.
        Selects the model with lowest complexity that meets the requirement,
        then among those, prefers the one with lowest cost and CO2.
        """
        models = self.get_models_by_complexity(complexity)
        if not models:
            return None
        # The first model is already the most efficient due to sorting
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
