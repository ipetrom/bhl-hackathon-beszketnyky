-- Savings tracking table for user decisions
CREATE TABLE IF NOT EXISTS model_savings (
    id SERIAL PRIMARY KEY,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    original_model_id VARCHAR(255) NOT NULL,
    original_model_name VARCHAR(255) NOT NULL,
    suggested_model_id VARCHAR(255) NOT NULL,
    suggested_model_name VARCHAR(255) NOT NULL,
    cost_saved_input FLOAT NOT NULL,
    cost_saved_output FLOAT NOT NULL,
    co2_saved FLOAT NOT NULL,
    complexity_level INTEGER NOT NULL,
    query_preview TEXT,
    user_id VARCHAR(255) DEFAULT 'default_user'
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_savings_created_at ON model_savings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_savings_user_id ON model_savings(user_id);
