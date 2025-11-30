"""
Savings tracker for monitoring user decisions to switch to cheaper models.
"""
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from dataclasses import dataclass
import psycopg2
from psycopg2.extras import RealDictCursor
from database import get_database


@dataclass
class SavingEntry:
    """A single savings entry."""
    id: int
    created_at: datetime
    original_model_id: str
    original_model_name: str
    suggested_model_id: str
    suggested_model_name: str
    cost_saved_input: float
    cost_saved_output: float
    co2_saved: float
    complexity_level: int
    query_preview: Optional[str]
    user_id: str


class SavingsTracker:
    """Track and retrieve model switching savings."""

    def __init__(self):
        """Initialize savings tracker using database connection."""
        self.db = get_database()

    def record_savings(
        self,
        original_model_id: str,
        original_model_name: str,
        suggested_model_id: str,
        suggested_model_name: str,
        cost_saved_input: float,
        cost_saved_output: float,
        co2_saved: float,
        complexity_level: int,
        query_preview: Optional[str] = None,
        user_id: str = "default_user"
    ) -> int:
        """
        Record a savings entry when user switches to a cheaper model.

        Returns:
            The ID of the created entry
        """
        conn = self.db.get_connection()
        try:
            with conn.cursor() as cursor:
                cursor.execute("""
                    INSERT INTO model_savings (
                        original_model_id, original_model_name,
                        suggested_model_id, suggested_model_name,
                        cost_saved_input, cost_saved_output, co2_saved,
                        complexity_level, query_preview, user_id
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    RETURNING id
                """, (
                    original_model_id, original_model_name,
                    suggested_model_id, suggested_model_name,
                    cost_saved_input, cost_saved_output, co2_saved,
                    complexity_level, query_preview, user_id
                ))
                result = cursor.fetchone()
                conn.commit()
                return result[0] if result else 0
        finally:
            conn.close()

    def get_all_savings(self, user_id: str = "default_user") -> List[SavingEntry]:
        """Get all savings entries for a user, ordered by most recent."""
        conn = self.db.get_connection()
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                cursor.execute("""
                    SELECT * FROM model_savings
                    WHERE user_id = %s
                    ORDER BY created_at DESC
                """, (user_id,))
                rows = cursor.fetchall()
                return [SavingEntry(**row) for row in rows]
        finally:
            conn.close()

    def get_total_savings(self, user_id: str = "default_user") -> Dict[str, float]:
        """Get total cost and CO2 savings for a user."""
        conn = self.db.get_connection()
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                cursor.execute("""
                    SELECT
                        COALESCE(SUM(cost_saved_input), 0) as total_cost_input,
                        COALESCE(SUM(cost_saved_output), 0) as total_cost_output,
                        COALESCE(SUM(co2_saved), 0) as total_co2,
                        COUNT(*) as total_switches
                    FROM model_savings
                    WHERE user_id = %s
                """, (user_id,))
                result = cursor.fetchone()
                if result:
                    return {
                        "total_cost_input": float(result['total_cost_input']),
                        "total_cost_output": float(result['total_cost_output']),
                        "total_cost": float(result['total_cost_input']) + float(result['total_cost_output']),
                        "total_co2": float(result['total_co2']),
                        "total_switches": int(result['total_switches'])
                    }
                return {
                    "total_cost_input": 0.0,
                    "total_cost_output": 0.0,
                    "total_cost": 0.0,
                    "total_co2": 0.0,
                    "total_switches": 0
                }
        finally:
            conn.close()

    def get_savings_by_period(
        self,
        days: int = 30,
        user_id: str = "default_user"
    ) -> List[Dict[str, Any]]:
        """Get savings grouped by day for the last N days."""
        conn = self.db.get_connection()
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                cursor.execute("""
                    SELECT
                        DATE(created_at) as date,
                        SUM(cost_saved_input + cost_saved_output) as daily_cost_saved,
                        SUM(co2_saved) as daily_co2_saved,
                        COUNT(*) as daily_switches
                    FROM model_savings
                    WHERE user_id = %s
                        AND created_at >= NOW() - INTERVAL '%s days'
                    GROUP BY DATE(created_at)
                    ORDER BY date DESC
                """, (user_id, days))
                rows = cursor.fetchall()
                return [dict(row) for row in rows]
        finally:
            conn.close()

    def get_model_switch_stats(self, user_id: str = "default_user") -> List[Dict[str, Any]]:
        """Get statistics about which models were switched from/to."""
        conn = self.db.get_connection()
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                cursor.execute("""
                    SELECT
                        original_model_name,
                        suggested_model_name,
                        COUNT(*) as switch_count,
                        SUM(cost_saved_input + cost_saved_output) as total_cost_saved,
                        SUM(co2_saved) as total_co2_saved
                    FROM model_savings
                    WHERE user_id = %s
                    GROUP BY original_model_name, suggested_model_name
                    ORDER BY switch_count DESC
                """, (user_id,))
                rows = cursor.fetchall()
                return [dict(row) for row in rows]
        finally:
            conn.close()


# Global tracker instance
_tracker_instance: Optional[SavingsTracker] = None


def get_savings_tracker() -> SavingsTracker:
    """Get or create the global savings tracker instance."""
    global _tracker_instance
    if _tracker_instance is None:
        _tracker_instance = SavingsTracker()
    return _tracker_instance
