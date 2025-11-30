from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from .retriever import PromptRetriever

DEFAULT_SIMILARITY_THRESHOLD = 0.8

router = APIRouter(
    prefix="/rag",
    tags=["rag"]
)

try:
    retriever = PromptRetriever(
        persist_directory="./rag/chroma_db",
        similarity_threshold=DEFAULT_SIMILARITY_THRESHOLD
    )
except Exception:
    retriever = None

class RetrieveRequest(BaseModel):
    query: str
    threshold: Optional[float] = DEFAULT_SIMILARITY_THRESHOLD

class RetrieveResponse(BaseModel):
    success: bool
    query: Optional[str] = None
    answer: Optional[str] = None
    similarity: Optional[float] = None
    message: Optional[str] = None

@router.post("/retrieve", response_model=RetrieveResponse)
async def retrieve_prompt(request: RetrieveRequest):
    if not retriever:
        raise HTTPException(status_code=503, detail="RAG system not initialized")

    try:
        results = retriever.retrieve_with_threshold(
            query=request.query,
            threshold=request.threshold,
            k=1
        )

        if results:
            best_match = results[0]
            return RetrieveResponse(
                success=True,
                query=best_match['prompt'],
                answer=best_match['answer'],
                similarity=best_match['similarity_score']
            )
        else:
            return RetrieveResponse(
                success=False,
                message="No relevant prompt found above threshold"
            )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
