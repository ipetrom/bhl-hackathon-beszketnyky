import os
import pandas as pd
from typing import List, Dict
import chromadb
from chromadb.config import Settings
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_chroma import Chroma
from langchain_core.documents import Document


class VectorDBBuilder:
    
    def __init__(
        self,
        data_path: str,
        persist_directory: str = "./chroma_db",
        collection_name: str = "prompts_collection",
        embedding_model: str = "sentence-transformers/all-MiniLM-L6-v2"
    ):
        self.data_path = data_path
        self.persist_directory = persist_directory
        self.collection_name = collection_name
        
        self.embeddings = HuggingFaceEmbeddings(
            model_name=embedding_model,
            model_kwargs={'device': 'cpu'},
            encode_kwargs={'normalize_embeddings': True}
        )
        
        self.chroma_client = chromadb.PersistentClient(
            path=persist_directory,
            settings=Settings(
                anonymized_telemetry=False,
                allow_reset=True
            )
        )
        
        self.vectorstore = None
        
    def load_data(self) -> pd.DataFrame:
        df = pd.read_csv(self.data_path)
        return df
    
    def generate_answers(self, prompt: str, task_type: str) -> str:

        answer_templates = {
            "code_task": f"Here's a solution for '{prompt}':\n\n```python\n# Implementation code here\ndef solution():\n    pass\n```\n\nThis code implements the requested functionality.",
            
            "text_summarization": f"Summary: {prompt[:50]}... The key points are: 1) Main topic, 2) Important details, 3) Conclusion.",
            
            "text_generation": f"Generated text for '{prompt}':\n\nDear Team,\n\nThis is a professional response addressing your request. Best regards.",
            
            "explanation_task": f"Explanation: To accomplish '{prompt}', follow these steps:\n1. Understanding the concept\n2. Implementation details\n3. Best practices\n\nThis provides a comprehensive guide."
        }
        
        return answer_templates.get(task_type, f"Response to: {prompt}")
    
    def prepare_documents(self, df: pd.DataFrame) -> List[Document]:
        documents = []
        
        for idx, row in df.iterrows():
            prompt = row['prompt']
            task_type = row['task_type']
            
            answer = self.generate_answers(prompt, task_type)
            
            doc = Document(
                page_content=prompt,
                metadata={
                    'task_type': task_type,
                    'answer': answer,
                    'prompt_id': idx,
                    'prompt_text': prompt
                }
            )
            documents.append(doc)
            
        return documents
    
    def build_vector_db(self, documents: List[Document]) -> Chroma:
        
        try:
            self.chroma_client.delete_collection(self.collection_name)
        except Exception as e:
            pass
        
        vectorstore = Chroma.from_documents(
            documents=documents,
            embedding=self.embeddings,
            collection_name=self.collection_name,
            persist_directory=self.persist_directory,
            client=self.chroma_client
        )
        
        return vectorstore
    
    def build(self) -> Chroma:
        df = self.load_data()
        
        documents = self.prepare_documents(df)
        
        self.vectorstore = self.build_vector_db(documents)
        
        return self.vectorstore
    
    def get_stats(self) -> Dict:
        if self.vectorstore is None:
            return {"error": "Vector database not built yet"}
        
        collection = self.chroma_client.get_collection(self.collection_name)
        count = collection.count()
        
        return {
            "collection_name": self.collection_name,
            "total_documents": count,
            "persist_directory": self.persist_directory,
            "embedding_model": self.embeddings.model_name
        }


def main():

    data_path = "../../ml_analysis/data.csv"
    persist_directory = "./chroma_db"
    
    builder = VectorDBBuilder(
        data_path=data_path,
        persist_directory=persist_directory,
        collection_name="prompts_collection"
    )
    
    vectorstore = builder.build()
    
    stats = builder.get_stats()
    
    test_query = "Write a Python function to parse JSON"
    results = vectorstore.similarity_search(test_query, k=3)


if __name__ == "__main__":
    main()
