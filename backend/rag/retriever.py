import os
from typing import List, Dict, Optional, Tuple
import chromadb
from chromadb.config import Settings
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_chroma import Chroma
from langchain_core.documents import Document
import json

class PromptRetriever:
    
    def __init__(
        self,
        persist_directory: str = "./chroma_db",
        collection_name: str = "prompts_collection",
        embedding_model: str = "sentence-transformers/all-MiniLM-L6-v2",
        similarity_threshold: float = 0.9
    ):
        self.persist_directory = persist_directory
        self.collection_name = collection_name
        self.similarity_threshold = similarity_threshold
        
        self.embeddings = HuggingFaceEmbeddings(
            model_name=embedding_model,
            model_kwargs={'device': 'cpu'},
            encode_kwargs={'normalize_embeddings': True}
        )
        
        self.chroma_client = chromadb.PersistentClient(
            path=persist_directory,
            settings=Settings(
                anonymized_telemetry=False
            )
        )
        
        self.vectorstore = self._load_vectorstore()
        
    def _load_vectorstore(self) -> Chroma:
        
        try:
            vectorstore = Chroma(
                collection_name=self.collection_name,
                embedding_function=self.embeddings,
                persist_directory=self.persist_directory,
                client=self.chroma_client
            )
            
            collection = self.chroma_client.get_collection(self.collection_name)
            
            return vectorstore
            
        except Exception as e:
            raise
    
    def retrieve(
        self,
        query: str,
        k: int = 5,
        filter_by_task_type: Optional[str] = None
    ) -> List[Dict]:
        
        filter_dict = None
        if filter_by_task_type:
            filter_dict = {"task_type": filter_by_task_type}
        
        results = self.vectorstore.similarity_search_with_score(
            query,
            k=k * 2,
            filter=filter_dict
        )
        
        filtered_results = []
        for doc, score in results:
            similarity = 1 / (1 + score)
            
            if similarity >= self.similarity_threshold:
                result = {
                    "prompt": doc.page_content,
                    "task_type": doc.metadata.get("task_type", "unknown"),
                    "answer": doc.metadata.get("answer", "No answer available"),
                    "similarity_score": round(similarity, 4),
                    "distance": round(score, 4),
                    "prompt_id": doc.metadata.get("prompt_id", -1)
                }
                filtered_results.append(result)
                
                if len(filtered_results) >= k:
                    break
        
        return filtered_results
    
    def retrieve_with_threshold(
        self,
        query: str,
        threshold: float,
        k: int = 5,
        filter_by_task_type: Optional[str] = None
    ) -> List[Dict]:
        original_threshold = self.similarity_threshold
        self.similarity_threshold = threshold
        
        results = self.retrieve(query, k, filter_by_task_type)
        
        self.similarity_threshold = original_threshold
        
        return results
    
    def get_cached_answer(
        self,
        query: str,
        strict_threshold: float = 0.95
    ) -> Optional[Dict]:
        results = self.retrieve_with_threshold(query, threshold=strict_threshold, k=1)
        
        if results:
            return results[0]
        else:
            return None
    
    def search_by_task_type(
        self,
        task_type: str,
        k: int = 10
    ) -> List[Dict]:
        
        results = self.vectorstore.similarity_search(
            "task",
            k=k,
            filter={"task_type": task_type}
        )
        
        formatted_results = []
        for doc in results:
            result = {
                "prompt": doc.page_content,
                "task_type": doc.metadata.get("task_type", "unknown"),
                "answer": doc.metadata.get("answer", "No answer available"),
                "prompt_id": doc.metadata.get("prompt_id", -1)
            }
            formatted_results.append(result)
        
        return formatted_results
    
    def format_results(self, results: List[Dict]) -> str:
        if not results:
            return "No results found."
        
        output = []
        for i, result in enumerate(results, 1):
            output.append(f"\n{'='*80}")
            output.append(f"Result #{i}")
            output.append(f"{'='*80}")
            output.append(f"Prompt: {result['prompt']}")
            output.append(f"Task Type: {result['task_type']}")
            if 'similarity_score' in result:
                output.append(f"Similarity: {result['similarity_score']:.4f}")
            output.append(f"\nAnswer:\n{result['answer']}")
        
        return '\n'.join(output)


class PromptCache:
    
    def __init__(
        self,
        retriever: PromptRetriever,
        cache_threshold: float = 0.90
    ):
        self.retriever = retriever
        self.cache_threshold = cache_threshold
        self.cache_hits = 0
        self.cache_misses = 0
    
    def get_or_compute(
        self,
        query: str,
        compute_fn=None
    ) -> Tuple[str, bool]:
        cached = self.retriever.get_cached_answer(query, self.cache_threshold)
        
        if cached:
            self.cache_hits += 1
            return cached['answer'], True
        else:
            self.cache_misses += 1
            if compute_fn:
                answer = compute_fn(query)
                return answer, False
            return "No cached answer available", False
    
    def get_stats(self) -> Dict:
        total = self.cache_hits + self.cache_misses
        hit_rate = (self.cache_hits / total * 100) if total > 0 else 0
        
        return {
            "cache_hits": self.cache_hits,
            "cache_misses": self.cache_misses,
            "total_queries": total,
            "hit_rate_percent": round(hit_rate, 2)
        }


def main():
    retriever = PromptRetriever(
        persist_directory="./chroma_db",
        collection_name="prompts_collection",
        similarity_threshold=0.9
    )
    
    test_queries = [
        "Create a Python function that reads JSON data",
        "Summarize this document for the team",
        "Explain how to configure Docker",
        "Write a SQL query to optimize database"
    ]
    
    for query in test_queries:
        results = retriever.retrieve(query, k=3)
    
    cache = PromptCache(retriever, cache_threshold=0.90)
    
    cache_test_queries = [
        "Write a Python function to send an HTTP GET request.",
        "Create a Go function that sends HTTP requests",
    ]
    
    for query in cache_test_queries:
        answer, was_cached = cache.get_or_compute(query)

if __name__ == "__main__":
    main()
