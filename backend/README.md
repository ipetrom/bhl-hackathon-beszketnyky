# Chatbot Backend API

A FastAPI backend for an intelligent chatbot that automatically selects the optimal AI model based on query complexity, with support for model suggestions to save costs and reduce carbon emissions.

## Features

- **Automatic Complexity Analysis**: Uses a low-cost OpenAI model (gpt-4o-mini) to analyze query complexity (1-10 scale)
- **Smart Model Selection**: Automatically selects the most cost-effective and energy-efficient model for each task
- **Model Suggestions**: When users select expensive models for simple tasks, suggests cheaper alternatives
- **Multi-Provider Support**: Works with Anthropic, OpenAI, and Groq models
- **Database-Driven**: Model configurations stored in PostgreSQL for easy management

## Setup

### 1. Install Dependencies

```bash
cd backend
poetry install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env` and fill in your API keys:

```bash
cp .env.example .env
```

Required environment variables:
- `ANTHROPIC_API_KEY`: Your Anthropic API key
- `OPENAI_API_KEY`: Your OpenAI API key (required for complexity analysis)
- `GROQ_API_KEY`: Your Groq API key
- Database credentials (DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD)

### 3. Set Up Database

Make sure PostgreSQL is running and initialize the database:

```bash
psql -U postgres -f ../db/init.sql
```

### 4. Run the Server

```bash
poetry run python server.py
```

Or use uvicorn directly:

```bash
poetry run uvicorn server:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at `http://localhost:8000`

## API Endpoints

### GET `/`
Health check endpoint.

**Response:**
```json
{
  "message": "Chatbot Backend API",
  "status": "running"
}
```

### GET `/models`
List all available models from the database.

**Response:**
```json
{
  "models": [
    {
      "id": "gpt-4o-mini",
      "name": "GPT-4o Mini",
      "provider": "OpenAI",
      "complexity_level": 4,
      "task_type": "[text_summarization, text_generation, explanation_task]",
      "co2": 0.024,
      "cost_input_tokens": 0.15,
      "cost_output_tokens": 0.6
    }
  ]
}
```

### POST `/complexity`
Analyze the complexity of a user query.

**Request:**
```json
{
  "query": "Write a distributed caching system in Python"
}
```

**Response:**
```json
{
  "complexity_level": 8,
  "recommended_model": {
    "id": "gpt-4o",
    "name": "GPT-4o",
    "provider": "OpenAI",
    "complexity_level": 9,
    "co2": 0.4,
    "cost_input_tokens": 2.5
  }
}
```

### POST `/suggest-model`
Check if a selected model is over-engineered for a task and suggest alternatives.

**Request:**
```json
{
  "query": "Summarize this paragraph",
  "selected_model_id": "claude-opus-4-5-20251101"
}
```

**Response:**
```json
{
  "should_change": true,
  "current_model": {
    "id": "claude-opus-4-5-20251101",
    "complexity_level": 10,
    "co2": 0.8
  },
  "suggested_model": {
    "id": "gpt-4o-mini",
    "complexity_level": 4,
    "co2": 0.024
  },
  "reason": "Your task requires complexity level 3, but you selected a model with complexity level 10...",
  "savings": {
    "cost_input_tokens": 4.85,
    "cost_output_tokens": 24.4,
    "co2": 0.776
  }
}
```

### POST `/chat`
Process a chat completion request with automatic or manual model selection.

**Request:**
```json
{
  "messages": [
    {"role": "user", "content": "Explain quantum computing"}
  ],
  "model_id": "claude-opus-4-5-20251101",
  "user_selected": true
}
```

**Response:**
```json
{
  "message": {
    "role": "assistant",
    "content": "Quantum computing is..."
  },
  "model_used": "claude-opus-4-5-20251101",
  "complexity_detected": 5,
  "model_suggestion": {
    "suggested_model": {
      "id": "gpt-4o-mini",
      "name": "GPT-4o Mini"
    },
    "reason": "This task has complexity level 5, but you selected a level 10 model...",
    "savings": {
      "cost_input_tokens": 4.85,
      "co2": 0.776
    }
  }
}
```

## How It Works

1. **Complexity Analysis**: Each user query is analyzed by a lightweight OpenAI model (gpt-4o-mini) that predicts the complexity level (1-10)

2. **Model Selection**:
   - If no model is specified, the system selects the most cost-effective model that meets the required complexity
   - If a model is specified, the system checks if it's over-engineered (complexity difference >= 3)

3. **Smart Suggestions**: When users select expensive models for simple tasks, the system calculates potential cost and CO2 savings and suggests better alternatives

4. **Database-Driven**: All model configurations, including complexity levels, costs, and CO2 emissions, are stored in PostgreSQL for easy updates

## Complexity Level Guidelines

- **1-2**: Simple questions, basic greetings
- **3-4**: Text summarization, simple explanations
- **5-6**: Moderate text generation, basic code questions
- **7-8**: Complex code generation, advanced reasoning
- **9-10**: Highly complex tasks, sophisticated content generation

## Development

### Run with auto-reload:
```bash
poetry run uvicorn server:app --reload
```

### API Documentation:
Once the server is running, visit:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`
