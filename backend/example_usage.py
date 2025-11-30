"""
Example usage of the model configuration system.
"""
import os
from dotenv import load_dotenv
from model_factory import get_model_factory
from models_config import Provider, get_models_by_complexity, get_model_config

# Load environment variables
load_dotenv()


def example_basic_usage():
    """Example: Create a model by ID."""
    print("=== Example 1: Create model by ID ===")
    factory = get_model_factory()
    
    # Create a specific model
    model = factory.create_model("gpt-4o")
    if model:
        print(f"Successfully created model: {model}")
    else:
        print("Failed to create model")
    print()


def example_complexity_based():
    """Example: Create a model based on complexity level."""
    print("=== Example 2: Create model by complexity level ===")
    factory = get_model_factory()
    
    # Create a model for a simple task (complexity 3)
    simple_model = factory.create_model_by_complexity(complexity_level=3)
    if simple_model:
        print(f"Model for simple task: {simple_model}")
    
    # Create a model for a complex task (complexity 8)
    complex_model = factory.create_model_by_complexity(complexity_level=8)
    if complex_model:
        print(f"Model for complex task: {complex_model}")
    print()


def example_provider_preference():
    """Example: Create a model with provider preference."""
    print("=== Example 3: Create model with provider preference ===")
    factory = get_model_factory()
    
    # Prefer Groq for a medium complexity task
    model = factory.create_model_by_complexity(
        complexity_level=5,
        preferred_provider=Provider.GROQ
    )
    if model:
        print(f"Model with Groq preference: {model}")
    print()


def example_list_models():
    """Example: List available models."""
    print("=== Example 4: List available models ===")
    
    # List all models for a complexity level
    models = get_models_by_complexity(complexity_level=5)
    print(f"Models available for complexity level 5:")
    for model_config in models:
        print(f"  - {model_config.name} ({model_config.model_id}) - Level {model_config.complexity_level}")
    print()


def example_provider_availability():
    """Example: Check provider availability."""
    print("=== Example 5: Check provider availability ===")
    factory = get_model_factory()
    
    for provider in Provider:
        available = factory.is_provider_available(provider)
        status = "✓ Available" if available else "✗ Not Available"
        print(f"{provider.value}: {status}")
    print()


def example_dynamic_selection():
    """
    Example: Dynamically select model based on user query complexity.
    This is a placeholder for future implementation.
    """
    print("=== Example 6: Dynamic model selection (future implementation) ===")
    
    def analyze_query_complexity(user_query: str) -> int:
        """
        Analyze user query and determine complexity level.
        This is a placeholder - actual implementation would use NLP/ML.
        """
        # Simple heuristic: longer queries or technical terms = higher complexity
        query_lower = user_query.lower()
        
        # Technical/complex keywords
        complex_keywords = ["analyze", "implement", "optimize", "debug", "architecture", "algorithm"]
        simple_keywords = ["what", "how", "explain", "define"]
        
        complexity = 3  # Default
        
        if any(keyword in query_lower for keyword in complex_keywords):
            complexity = 8
        elif any(keyword in query_lower for keyword in simple_keywords):
            complexity = 4
        
        # Adjust based on length
        if len(user_query) > 200:
            complexity = min(10, complexity + 2)
        elif len(user_query) < 50:
            complexity = max(1, complexity - 1)
        
        return complexity
    
    factory = get_model_factory()
    
    queries = [
        "What is Python?",
        "Implement a distributed caching system with Redis and explain the architecture",
        "How do I use this library?",
    ]
    
    for query in queries:
        complexity = analyze_query_complexity(query)
        model = factory.create_model_by_complexity(complexity_level=complexity)
        print(f"Query: '{query[:50]}...'")
        print(f"  Complexity: {complexity}")
        print(f"  Selected model: {model}")
        print()


if __name__ == "__main__":
    print("LangChain Model Configuration Examples\n")
    print("=" * 50)
    print()
    
    example_basic_usage()
    example_complexity_based()
    example_provider_preference()
    example_list_models()
    example_provider_availability()
    example_dynamic_selection()
    
    print("=" * 50)
    print("Examples completed!")

