"""
Model configuration for LangChain with support for multiple providers.
Supports Anthropic, OpenAI, and Groq models with complexity-based selection.
"""
from enum import Enum
from typing import Dict, List, Optional
from dataclasses import dataclass
from langchain_anthropic import ChatAnthropic
from langchain_openai import ChatOpenAI
from langchain_groq import ChatGroq
from langchain_core.language_models.chat_models import BaseChatModel


class Provider(str, Enum):
    """Supported LLM providers."""
    ANTHROPIC = "anthropic"
    OPENAI = "openai"
    GROQ = "groq"


@dataclass
class ModelConfig:
    """Configuration for a specific model."""
    model_id: str
    provider: Provider
    complexity_level: int  # 1-10, where 1 is simplest, 10 is most complex
    name: str
    description: Optional[str] = None
    max_tokens: Optional[int] = None
    temperature: float = 0.7


# Model configurations for each provider
MODEL_CONFIGS: Dict[str, ModelConfig] = {
    # Anthropic Models
    "claude-3-5-sonnet-20241022": ModelConfig(
        model_id="claude-3-5-sonnet-20241022",
        provider=Provider.ANTHROPIC,
        complexity_level=9,
        name="Claude 3.5 Sonnet",
        description="Most capable Anthropic model, best for complex tasks",
        max_tokens=8192,
        temperature=0.7,
    ),
    "claude-3-5-haiku-20241022": ModelConfig(
        model_id="claude-3-5-haiku-20241022",
        provider=Provider.ANTHROPIC,
        complexity_level=5,
        name="Claude 3.5 Haiku",
        description="Fast and efficient for simpler tasks",
        max_tokens=8192,
        temperature=0.7,
    ),
    "claude-3-opus-20240229": ModelConfig(
        model_id="claude-3-opus-20240229",
        provider=Provider.ANTHROPIC,
        complexity_level=10,
        name="Claude 3 Opus",
        description="Most powerful Anthropic model for highly complex tasks",
        max_tokens=4096,
        temperature=0.7,
    ),
    
    # OpenAI Models
    "gpt-4o": ModelConfig(
        model_id="gpt-4o",
        provider=Provider.OPENAI,
        complexity_level=9,
        name="GPT-4o",
        description="Most capable OpenAI model",
        max_tokens=16384,
        temperature=0.7,
    ),
    "gpt-4o-mini": ModelConfig(
        model_id="gpt-4o-mini",
        provider=Provider.OPENAI,
        complexity_level=6,
        name="GPT-4o Mini",
        description="Faster and cheaper GPT-4o variant",
        max_tokens=16384,
        temperature=0.7,
    ),
    "gpt-4-turbo": ModelConfig(
        model_id="gpt-4-turbo",
        provider=Provider.OPENAI,
        complexity_level=8,
        name="GPT-4 Turbo",
        description="High-performance GPT-4 variant",
        max_tokens=4096,
        temperature=0.7,
    ),
    "gpt-3.5-turbo": ModelConfig(
        model_id="gpt-3.5-turbo",
        provider=Provider.OPENAI,
        complexity_level=4,
        name="GPT-3.5 Turbo",
        description="Fast and cost-effective for simple tasks",
        max_tokens=4096,
        temperature=0.7,
    ),
    
    # Groq Models (Open Source)
    "llama-3.1-70b-versatile": ModelConfig(
        model_id="llama-3.1-70b-versatile",
        provider=Provider.GROQ,
        complexity_level=7,
        name="Llama 3.1 70B",
        description="High-performance open source model",
        max_tokens=8192,
        temperature=0.7,
    ),
    "llama-3.1-8b-instant": ModelConfig(
        model_id="llama-3.1-8b-instant",
        provider=Provider.GROQ,
        complexity_level=3,
        name="Llama 3.1 8B Instant",
        description="Fast open source model for simple tasks",
        max_tokens=8192,
        temperature=0.7,
    ),
    "mixtral-8x7b-32768": ModelConfig(
        model_id="mixtral-8x7b-32768",
        provider=Provider.GROQ,
        complexity_level=6,
        name="Mixtral 8x7B",
        description="Mixture of experts model, good balance",
        max_tokens=32768,
        temperature=0.7,
    ),
    "gemma-7b-it": ModelConfig(
        model_id="gemma-7b-it",
        provider=Provider.GROQ,
        complexity_level=2,
        name="Gemma 7B",
        description="Lightweight open source model",
        max_tokens=8192,
        temperature=0.7,
    ),
}


def get_models_by_complexity(complexity_level: int) -> List[ModelConfig]:
    """
    Get all models that match or exceed the required complexity level.
    
    Args:
        complexity_level: Required complexity level (1-10)
        
    Returns:
        List of ModelConfig objects sorted by complexity (ascending)
    """
    matching_models = [
        config for config in MODEL_CONFIGS.values()
        if config.complexity_level >= complexity_level
    ]
    return sorted(matching_models, key=lambda x: x.complexity_level)


def get_models_by_provider(provider: Provider) -> List[ModelConfig]:
    """
    Get all models for a specific provider.
    
    Args:
        provider: The provider to filter by
        
    Returns:
        List of ModelConfig objects for the provider
    """
    return [
        config for config in MODEL_CONFIGS.values()
        if config.provider == provider
    ]


def get_model_config(model_id: str) -> Optional[ModelConfig]:
    """
    Get configuration for a specific model by ID.
    
    Args:
        model_id: The model identifier
        
    Returns:
        ModelConfig if found, None otherwise
    """
    return MODEL_CONFIGS.get(model_id)

