"""
Model factory for creating LangChain chat models dynamically based on provider and configuration.
"""
import os
from typing import Optional
from langchain_core.language_models.chat_models import BaseChatModel
from langchain_anthropic import ChatAnthropic
from langchain_openai import ChatOpenAI
from langchain_groq import ChatGroq

from models_config import ModelConfig, Provider, get_model_config


class ModelFactory:
    """Factory for creating LangChain chat models."""
    
    def __init__(self):
        """Initialize the factory with API keys from environment variables."""
        self.anthropic_api_key = os.getenv("ANTHROPIC_API_KEY")
        self.openai_api_key = os.getenv("OPENAI_API_KEY")
        self.groq_api_key = os.getenv("GROQ_API_KEY")
        
        # Validate that API keys are present
        self._validate_api_keys()
    
    def _validate_api_keys(self):
        """Validate that required API keys are set."""
        missing_keys = []
        if not self.anthropic_api_key:
            missing_keys.append("ANTHROPIC_API_KEY")
        if not self.openai_api_key:
            missing_keys.append("OPENAI_API_KEY")
        if not self.groq_api_key:
            missing_keys.append("GROQ_API_KEY")
        
        if missing_keys:
            print(f"Warning: Missing API keys: {', '.join(missing_keys)}")
            print("Some providers may not be available.")
    
    def create_model(
        self,
        model_id: str,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
        provider: Optional[str] = None,
    ) -> Optional[BaseChatModel]:
        """
        Create a LangChain chat model based on model ID.
        
        Args:
            model_id: The model identifier (e.g., "gpt-4o", "claude-3-5-sonnet-20241022")
            temperature: Optional temperature override
            max_tokens: Optional max tokens override
            provider: Optional provider name (used if model not in config)
            
        Returns:
            BaseChatModel instance or None if model not found or API key missing
        """
        config = get_model_config(model_id)
        
        # If model not in config but provider is provided, try to create it directly
        if not config and provider:
            return self._create_model_from_provider(model_id, provider, temperature, max_tokens)
        
        if not config:
            print(f"Error: Model '{model_id}' not found in configuration.")
            return None
        
        # Use provided values or fall back to config defaults
        temp = temperature if temperature is not None else config.temperature
        max_toks = max_tokens if max_tokens is not None else config.max_tokens
        
        try:
            if config.provider == Provider.ANTHROPIC:
                if not self.anthropic_api_key:
                    print(f"Error: ANTHROPIC_API_KEY not set. Cannot create {model_id}.")
                    return None
                return ChatAnthropic(
                    model=config.model_id,
                    anthropic_api_key=self.anthropic_api_key,
                    temperature=temp,
                    max_tokens=max_toks,
                )
            
            elif config.provider == Provider.OPENAI:
                if not self.openai_api_key:
                    print(f"Error: OPENAI_API_KEY not set. Cannot create {model_id}.")
                    return None
                return ChatOpenAI(
                    model=config.model_id,
                    openai_api_key=self.openai_api_key,
                    temperature=temp,
                    max_tokens=max_toks,
                )
            
            elif config.provider == Provider.GROQ:
                if not self.groq_api_key:
                    print(f"Error: GROQ_API_KEY not set. Cannot create {model_id}.")
                    return None
                return ChatGroq(
                    model=config.model_id,
                    groq_api_key=self.groq_api_key,
                    temperature=temp,
                    max_tokens=max_toks,
                )
            
            else:
                print(f"Error: Unknown provider '{config.provider}' for model '{model_id}'.")
                return None
                
        except Exception as e:
            print(f"Error creating model '{model_id}': {str(e)}")
            return None
    
    def _create_model_from_provider(
        self,
        model_id: str,
        provider: str,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
    ) -> Optional[BaseChatModel]:
        """Create a model directly from provider info when not in config."""
        temp = temperature if temperature is not None else 0.7
        max_toks = max_tokens if max_tokens is not None else 4096
        
        try:
            provider_lower = provider.lower()
            if provider_lower == "anthropic":
                if not self.anthropic_api_key:
                    print(f"Error: ANTHROPIC_API_KEY not set. Cannot create {model_id}.")
                    return None
                return ChatAnthropic(
                    model=model_id,
                    anthropic_api_key=self.anthropic_api_key,
                    temperature=temp,
                    max_tokens=max_toks,
                )
            elif provider_lower == "openai":
                if not self.openai_api_key:
                    print(f"Error: OPENAI_API_KEY not set. Cannot create {model_id}.")
                    return None
                return ChatOpenAI(
                    model=model_id,
                    openai_api_key=self.openai_api_key,
                    temperature=temp,
                    max_tokens=max_toks,
                )
            elif provider_lower == "groq":
                if not self.groq_api_key:
                    print(f"Error: GROQ_API_KEY not set. Cannot create {model_id}.")
                    return None
                return ChatGroq(
                    model=model_id,
                    groq_api_key=self.groq_api_key,
                    temperature=temp,
                    max_tokens=max_toks,
                )
            else:
                print(f"Error: Unknown provider '{provider}' for model '{model_id}'.")
                return None
        except Exception as e:
            print(f"Error creating model '{model_id}' from provider '{provider}': {str(e)}")
            return None
    
    def create_model_by_complexity(
        self,
        complexity_level: int,
        preferred_provider: Optional[Provider] = None,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
    ) -> Optional[BaseChatModel]:
        """
        Create a model based on complexity level and optional provider preference.
        Selects the model with the lowest complexity level that meets the requirement.
        
        Args:
            complexity_level: Required complexity level (1-10)
            preferred_provider: Optional preferred provider
            temperature: Optional temperature override
            max_tokens: Optional max tokens override
            
        Returns:
            BaseChatModel instance or None if no suitable model found
        """
        from models_config import get_models_by_complexity
        
        if complexity_level < 1 or complexity_level > 10:
            print(f"Error: Complexity level must be between 1 and 10, got {complexity_level}.")
            return None
        
        # Get models that meet the complexity requirement
        suitable_models = get_models_by_complexity(complexity_level)
        
        if not suitable_models:
            print(f"Error: No models found for complexity level {complexity_level}.")
            return None
        
        # Filter by preferred provider if specified
        if preferred_provider:
            suitable_models = [
                m for m in suitable_models if m.provider == preferred_provider
            ]
            if not suitable_models:
                print(f"Warning: No models found for provider {preferred_provider} at complexity {complexity_level}.")
                # Fall back to any provider
                suitable_models = get_models_by_complexity(complexity_level)
        
        # Select the model with the lowest complexity (most efficient)
        selected_model = suitable_models[0]
        
        return self.create_model(
            selected_model.model_id,
            temperature=temperature,
            max_tokens=max_tokens,
        )
    
    def is_provider_available(self, provider: Provider) -> bool:
        """
        Check if a provider is available (has API key).
        
        Args:
            provider: The provider to check
            
        Returns:
            True if provider is available, False otherwise
        """
        if provider == Provider.ANTHROPIC:
            return bool(self.anthropic_api_key)
        elif provider == Provider.OPENAI:
            return bool(self.openai_api_key)
        elif provider == Provider.GROQ:
            return bool(self.groq_api_key)
        return False


# Global factory instance
_factory_instance: Optional[ModelFactory] = None


def get_model_factory() -> ModelFactory:
    """
    Get or create the global model factory instance.
    
    Returns:
        ModelFactory instance
    """
    global _factory_instance
    if _factory_instance is None:
        _factory_instance = ModelFactory()
    return _factory_instance

