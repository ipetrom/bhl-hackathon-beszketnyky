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

IMPORTANT: Be conservative with complexity ratings. Tasks that any modern LLM can easily complete should be rated 1-2. Only increase complexity when the task genuinely requires more sophisticated reasoning, multi-step processes, or domain expertise.

Complexity Level Guidelines:

1-2 (Trivial/Very Simple - Any LLM can handle):
- Trivial code snippets (hello world, simple print statements, basic one-liners)
- Simple factual questions requiring basic knowledge
- Basic greetings, simple conversational responses
- Simple recipes, straightforward instructions
- Single-step tasks with no reasoning required
- Tasks that require only direct knowledge recall or simple pattern matching
- Simple text generation (one sentence or paragraph)
- Basic definitions or explanations of common concepts

3-4 (Simple - Straightforward but requires some structure):
- Text summarization of short to medium content
- Simple multi-step instructions or explanations
- Basic code that involves a few lines or simple logic (simple calculator, basic loops)
- Simple question-answering requiring minor reasoning
- Short creative text generation with basic structure

5-6 (Moderate - Requires structured thinking):
- Longer text summarization with analysis
- Moderate code generation with multiple functions or components
- Explanation of moderately complex topics requiring synthesis
- Multi-step problem solving with clear methodology
- Creative writing with specific requirements or constraints
- Reasoning over structured data or multiple pieces of information

7-8 (Complex - Requires advanced reasoning):
- Complex code generation with architecture, design patterns, or algorithms
- Advanced debugging of non-trivial issues
- Deep analysis requiring domain expertise
- Multi-faceted problem solving with interdependent steps
- Creative content requiring sophisticated understanding and synthesis
- Tasks requiring integration of multiple knowledge domains

9-10 (Very Complex - Requires expert-level capabilities):
- Highly complex code architecture, system design, or advanced algorithms
- Advanced mathematical or scientific reasoning requiring deep expertise
- Sophisticated creative content requiring nuanced understanding
- Multi-faceted analysis requiring extensive context and expert knowledge
- Tasks requiring extensive domain expertise and complex reasoning chains

Key Principles:
- If a task can be completed by simply following a basic pattern or template, it's likely 1-2
- If a task requires only basic knowledge without complex reasoning, it's 1-2
- Trivial code requests (hello world, simple scripts) are always 1-2
- Only assign higher levels when the task genuinely requires sophisticated reasoning, multi-step problem solving, or domain expertise

CRITICAL: You must output ONLY a single integer between 1 and 10. No text, no explanation, no prefix, no suffix. Just the number.
Example outputs: "2" or "5" or "8" - nothing else.
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
            max_tokens=50,  # Increased to ensure we get a response
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

            # Invoke the model
            response = self.model.invoke(messages)
            
            # Check if response is valid
            if not response:
                print(f"Error: Model returned None response")
                return 5
            complexity_str = response.content.strip() if response.content else ""
            
            # Debug: log the raw response
            print(f"Complexity agent raw response for query '{user_query[:50]}...': '{complexity_str}'")
            print(f"Response object type: {type(response)}, has content: {hasattr(response, 'content')}")

            # Check if response is empty
            if not complexity_str:
                print(f"Error: Model returned empty response. Response object: {response}")
                # Try to get more info about the response
                if hasattr(response, 'response_metadata'):
                    print(f"Response metadata: {response.response_metadata}")
                # Default to medium complexity
                return 5

            # Extract the number from the response
            # Handle cases where the model might return "5" or "Level 5" etc.
            import re
            match = re.search(r'\b([1-9]|10)\b', complexity_str)
            if match:
                complexity = int(match.group(1))
                # Ensure it's in valid range
                if 1 <= complexity <= 10:
                    print(f"Parsed complexity: {complexity}")
                    return complexity
                else:
                    print(f"Warning: Parsed complexity {complexity} is out of range (1-10)")
            else:
                print(f"Warning: Could not parse complexity from response: '{complexity_str}'")

            # Default to medium complexity if parsing fails
            print(f"Defaulting to complexity 5 due to parsing failure")
            return 5

        except Exception as e:
            import traceback
            print(f"Error analyzing complexity: {e}")
            print(f"Traceback: {traceback.format_exc()}")
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
