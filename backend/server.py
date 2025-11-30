"""
FastAPI backend server for the chatbot application.
Provides endpoints for chat completion, complexity analysis, and model suggestions.
"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
import os
from dotenv import load_dotenv

from database import get_database, ModelDB
from complexity_agent import get_complexity_agent
from model_factory import get_model_factory
from rag.router import router as rag_router

load_dotenv()

app = FastAPI(title="Chatbot Backend API")

# Include RAG router
app.include_router(rag_router)

# CORS middleware for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],  # Frontend URLs
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============= Request/Response Models =============

class Message(BaseModel):
    """Chat message model."""
    role: str  # "user" or "assistant"
    content: str


class ChatRequest(BaseModel):
    """Request for chat completion."""
    messages: List[Message]
    model_id: Optional[str] = None  # If None, auto-select based on complexity
    user_selected: bool = False  # Whether user manually selected this model
    skip_suggestion_check: bool = False  # Skip suggestion check (e.g., when user explicitly keeps current model)


class ChatResponse(BaseModel):
    """Response from chat completion."""
    message: Message
    model_used: str
    complexity_detected: int
    model_suggestion: Optional[Dict[str, Any]] = None  # Suggestion if user picked expensive model


class ComplexityRequest(BaseModel):
    """Request for complexity analysis."""
    query: str


class ComplexityResponse(BaseModel):
    """Response from complexity analysis."""
    complexity_level: int
    recommended_model: Dict[str, Any]


class ModelListResponse(BaseModel):
    """Response for listing all available models."""
    models: List[Dict[str, Any]]


class ModelSuggestionRequest(BaseModel):
    """Request for model suggestion."""
    query: str
    selected_model_id: str


class ModelSuggestionResponse(BaseModel):
    """Response for model suggestion."""
    should_change: bool
    current_model: Dict[str, Any]
    suggested_model: Optional[Dict[str, Any]] = None
    reason: Optional[str] = None
    savings: Optional[Dict[str, float]] = None  # cost and CO2 savings


# ============= Helper Functions =============

def model_to_dict(model: ModelDB) -> Dict[str, Any]:
    """Convert ModelDB to dictionary for API responses."""
    return {
        "id": model.model_id,
        "name": model.model_name,
        "provider": model.provider,
        "complexity_level": model.complexity_level,
        "task_type": model.task_type,
        "co2": model.co2,
        "cost_input_tokens": model.cost_input_tokens,
        "cost_output_tokens": model.cost_output_tokens,
    }


def convert_messages(messages: List[Message]) -> List:
    """Convert API messages to LangChain messages."""
    langchain_messages = []
    for msg in messages:
        if msg.role == "user":
            langchain_messages.append(HumanMessage(content=msg.content))
        elif msg.role == "assistant":
            langchain_messages.append(AIMessage(content=msg.content))
        elif msg.role == "system":
            langchain_messages.append(SystemMessage(content=msg.content))
    return langchain_messages


# ============= API Endpoints =============

@app.get("/")
async def root():
    """Root endpoint."""
    return {"message": "Chatbot Backend API", "status": "running"}


@app.get("/health")
async def health():
    """Health check endpoint."""
    return {"status": "healthy"}


@app.get("/models", response_model=ModelListResponse)
async def list_models():
    """
    List all available models from the database.
    """
    try:
        db = get_database()
        models = db.get_all_models()
        return ModelListResponse(
            models=[model_to_dict(model) for model in models]
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching models: {str(e)}")


@app.post("/complexity", response_model=ComplexityResponse)
async def analyze_complexity(request: ComplexityRequest):
    """
    Analyze the complexity of a user query.
    Returns the predicted complexity level and recommended model.
    """
    try:
        # Analyze complexity using the agent
        agent = get_complexity_agent()
        complexity = agent.analyze_complexity(request.query)

        if complexity is None:
            raise HTTPException(status_code=500, detail="Failed to analyze complexity")

        # Get recommended model based on complexity
        db = get_database()
        recommended_model = db.get_optimal_model_for_complexity(complexity)

        if not recommended_model:
            raise HTTPException(
                status_code=404,
                detail=f"No model found for complexity level {complexity}"
            )

        return ComplexityResponse(
            complexity_level=complexity,
            recommended_model=model_to_dict(recommended_model),
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error analyzing complexity: {str(e)}")


@app.post("/suggest-model", response_model=ModelSuggestionResponse)
async def suggest_model(request: ModelSuggestionRequest):
    """
    Check if the user's selected model is over-engineered for the task.
    If so, suggest a cheaper and more energy-efficient alternative.
    """
    try:
        # Analyze query complexity
        agent = get_complexity_agent()
        required_complexity = agent.analyze_complexity(request.query)

        if required_complexity is None:
            raise HTTPException(status_code=500, detail="Failed to analyze complexity")

        # Get the user's selected model
        db = get_database()
        current_model = db.get_model_by_id(request.selected_model_id)

        if not current_model:
            raise HTTPException(
                status_code=404,
                detail=f"Model '{request.selected_model_id}' not found"
            )

        # Check if the selected model is over-engineered or under-engineered
        # We suggest a different model if complexity difference is >= 2
        complexity_difference = current_model.complexity_level - required_complexity

        if abs(complexity_difference) >= 2:
            # Suggest a better alternative (cheaper if over-engineered, more powerful if under-engineered)
            optimal_model = db.get_optimal_model_for_complexity(required_complexity)

            if optimal_model and optimal_model.model_id != current_model.model_id:
                # Calculate savings/differences
                cost_savings_input = current_model.cost_input_tokens - optimal_model.cost_input_tokens
                cost_savings_output = current_model.cost_output_tokens - optimal_model.cost_output_tokens
                co2_savings = current_model.co2 - optimal_model.co2

                # Determine if suggesting cheaper or more powerful model
                if complexity_difference > 0:
                    # Model is over-engineered (too powerful)
                    reason = f"Your task requires complexity level {required_complexity}, but you selected a level {current_model.complexity_level} model. Consider using a more efficient model to save costs and reduce CO₂ emissions."
                else:
                    # Model is under-engineered (too simple)
                    reason = f"Your task requires complexity level {required_complexity}, but you selected a level {current_model.complexity_level} model. Consider using a more capable model for better results."

                return ModelSuggestionResponse(
                    should_change=True,
                    current_model=model_to_dict(current_model),
                    suggested_model=model_to_dict(optimal_model),
                    reason=reason,
                    savings={
                        "cost_input_tokens": round(cost_savings_input, 3),
                        "cost_output_tokens": round(cost_savings_output, 3),
                        "co2": round(co2_savings, 3),
                    }
                )

        # No suggestion needed
        return ModelSuggestionResponse(
            should_change=False,
            current_model=model_to_dict(current_model),
            reason=f"Your selected model is appropriate for this task (required complexity: {required_complexity}, model complexity: {current_model.complexity_level})."
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error suggesting model: {str(e)}")


@app.post("/chat", response_model=ChatResponse)
async def chat_completion(request: ChatRequest):
    """
    Process a chat completion request.

    If model_id is not provided, automatically selects a model based on query complexity.
    If model_id is provided and user_selected=True, checks if a cheaper model should be suggested.
    """
    try:
        if not request.messages:
            raise HTTPException(status_code=400, detail="Messages cannot be empty")

        # Get the latest user message for complexity analysis
        user_message = None
        for msg in reversed(request.messages):
            if msg.role == "user":
                user_message = msg.content
                break

        if not user_message:
            raise HTTPException(status_code=400, detail="No user message found")

        # Analyze complexity FIRST (before any model generation)
        agent = get_complexity_agent()
        complexity = agent.analyze_complexity(user_message)

        if complexity is None:
            complexity = 5  # Default to medium complexity

        db = get_database()
        model_suggestion = None

        # Check for model suggestion BEFORE generating response (to save tokens)
        # Skip if user explicitly chose to keep current model after seeing suggestion
        if request.model_id and request.user_selected and not request.skip_suggestion_check:
            # User selected a specific model - check if we should suggest an alternative
            selected_model = db.get_model_by_id(request.model_id)
            if not selected_model:
                raise HTTPException(
                    status_code=404,
                    detail=f"Model '{request.model_id}' not found"
                )

            complexity_difference = selected_model.complexity_level - complexity

            # If complexity mismatch is significant, suggest alternative WITHOUT generating
            if abs(complexity_difference) >= 2:
                optimal_model = db.get_optimal_model_for_complexity(complexity)

                if optimal_model and optimal_model.model_id != selected_model.model_id:
                    cost_savings = selected_model.cost_input_tokens - optimal_model.cost_input_tokens
                    cost_savings_output = selected_model.cost_output_tokens - optimal_model.cost_output_tokens
                    co2_savings = selected_model.co2 - optimal_model.co2

                    # Determine if suggesting cheaper or more powerful model
                    if complexity_difference > 0:
                        reason = f"This task has complexity level {complexity}, but you selected a level {selected_model.complexity_level} model. Consider using a more efficient model to save costs and reduce CO₂."
                    else:
                        reason = f"This task has complexity level {complexity}, but you selected a level {selected_model.complexity_level} model. Consider using a more capable model for better results."

                    model_suggestion = {
                        "suggested_model": model_to_dict(optimal_model),
                        "reason": reason,
                        "savings": {
                            "cost_input_tokens": round(cost_savings, 3),
                            "cost_output_tokens": round(cost_savings_output, 3),
                            "co2": round(co2_savings, 3),
                        }
                    }

                    # Return early with suggestion - don't waste tokens generating response
                    return ChatResponse(
                        message=Message(
                            role="assistant",
                            content="Please review the model suggestion below before proceeding with your request."
                        ),
                        model_used=selected_model.model_id,
                        complexity_detected=complexity,
                        model_suggestion=model_suggestion,
                    )

        # If we reach here, complexity is appropriate - proceed with generation
        # Determine which model to use
        if request.model_id:
            model_to_use = db.get_model_by_id(request.model_id)
            if not model_to_use:
                raise HTTPException(
                    status_code=404,
                    detail=f"Model '{request.model_id}' not found"
                )
        else:
            # Auto-select model based on complexity
            model_to_use = db.get_optimal_model_for_complexity(complexity)
            if not model_to_use:
                raise HTTPException(
                    status_code=404,
                    detail=f"No model found for complexity level {complexity}"
                )

        # Create the model using the factory
        factory = get_model_factory()
        llm = factory.create_model(model_to_use.model_id, provider=model_to_use.provider)

        if not llm:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to create model '{model_to_use.model_id}'"
            )

        # Convert messages to LangChain format
        langchain_messages = convert_messages(request.messages)

        # Generate response (only if we didn't return early with suggestion)
        response = llm.invoke(langchain_messages)

        # Return response with metadata
        return ChatResponse(
            message=Message(role="assistant", content=response.content),
            model_used=model_to_use.model_id,
            complexity_detected=complexity,
            model_suggestion=model_suggestion,
        )

    except HTTPException:
        raise
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        print(f"Error processing chat: {error_details}")
        raise HTTPException(status_code=500, detail=f"Error processing chat: {str(e)}")


# ============= Main =============

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
