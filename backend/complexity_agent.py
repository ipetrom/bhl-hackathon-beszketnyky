"""
Complexity classification agent using a low-cost OpenAI model.
Analyzes user queries and predicts complexity level from 1-10.
"""
import os
from typing import Optional
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, SystemMessage
from dotenv import load_dotenv

load_dotenv()


class ComplexityAgent:
    """Agent for classifying query complexity using a low-cost model."""

    # Complexity level descriptions for the AI to understand
    COMPLEXITY_GUIDE = """
You are a task complexity analyzer. Your job is to analyze user queries and determine their complexity level from 1-10.

Complexity Level Guidelines:

1-2 (Very Simple):
- Simple factual questions ("What is X?", "Define Y")
- Basic greetings or simple responses
- Minimal text generation or simple explanations

3-4 (Simple):
- Text summarization of short content
- Simple explanations or clarifications
- Basic question-answering
- Short text generation

5-6 (Moderate):
- Longer text summarization
- Moderate text generation or creative writing
- Explanation of moderately complex topics
- Basic code-related questions
- Reasoning over moderate data

7-8 (Complex):
- Complex code generation or debugging
- Advanced reasoning tasks
- Analysis of complex topics
- Multi-step problem solving
- Creative content generation requiring deep thinking

9-10 (Very Complex):
- Highly complex code architecture or implementation
- Advanced mathematical or scientific reasoning
- Creative and sophisticated content generation
- Multi-faceted analysis requiring deep expertise
- Tasks requiring extensive context understanding

Output ONLY a single integer from 1 to 10 representing the complexity level.
Do NOT include any explanation, just the number.
"""

    def __init__(self, model_id: str = "gpt-4o-mini"):
        """
        Initialize the complexity agent.

        Args:
            model_id: The model to use for complexity analysis (default: gpt-4o-mini)
        """
        self.openai_api_key = os.getenv("OPENAI_API_KEY")
        if not self.openai_api_key:
            raise ValueError("OPENAI_API_KEY environment variable is required")

        self.model = ChatOpenAI(
            model=model_id,
            openai_api_key=self.openai_api_key,
            temperature=0.1,  # Low temperature for consistent predictions
            max_tokens=10,  # We only need a single digit
        )

    def analyze_complexity(self, user_query: str) -> Optional[int]:
        """
        Analyze the complexity of a user query.

        Args:
            user_query: The user's question or prompt

        Returns:
            Complexity level from 1-10, or None if analysis fails
        """
        try:
            messages = [
                SystemMessage(content=self.COMPLEXITY_GUIDE),
                HumanMessage(content=f"Analyze this query:\n\n{user_query}"),
            ]

            response = self.model.invoke(messages)
            complexity_str = response.content.strip()

            # Extract the number from the response
            # Handle cases where the model might return "5" or "Level 5" etc.
            import re
            match = re.search(r'\b([1-9]|10)\b', complexity_str)
            if match:
                complexity = int(match.group(1))
                # Ensure it's in valid range
                if 1 <= complexity <= 10:
                    return complexity

            print(f"Warning: Could not parse complexity from response: {complexity_str}")
            # Default to medium complexity if parsing fails
            return 5

        except Exception as e:
            print(f"Error analyzing complexity: {e}")
            # Default to medium complexity on error
            return 5


# Global agent instance
_agent_instance: Optional[ComplexityAgent] = None


def get_complexity_agent() -> ComplexityAgent:
    """Get or create the global complexity agent instance."""
    global _agent_instance
    if _agent_instance is None:
        _agent_instance = ComplexityAgent()
    return _agent_instance
