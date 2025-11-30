/**
 * API service for backend communication
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

export interface Model {
  id: string
  name: string
  provider: string
  complexity_level: number
  task_type: string
  co2: number
  cost_input_tokens: number
  cost_output_tokens: number
}

export interface Message {
  role: "user" | "assistant"
  content: string
}

export interface ChatRequest {
  messages: Message[]
  model_id?: string
  user_selected?: boolean
}

export interface ChatResponse {
  message: Message
  model_used: string
  complexity_detected: number
  model_suggestion?: {
    suggested_model: Model
    reason: string
    savings: {
      cost_input_tokens: number
      cost_output_tokens?: number
      co2: number
    }
  }
}

export interface ComplexityResponse {
  complexity_level: number
  recommended_model: Model
}

export interface ModelSuggestionRequest {
  query: string
  selected_model_id: string
}

export interface ModelSuggestionResponse {
  should_change: boolean
  current_model: Model
  suggested_model?: Model
  reason?: string
  savings?: {
    cost_input_tokens: number
    cost_output_tokens: number
    co2: number
  }
}

/**
 * Fetch all available models from the backend
 */
export async function fetchModels(): Promise<Model[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/models`)
    if (!response.ok) {
      throw new Error(`Failed to fetch models: ${response.statusText}`)
    }
    const data = await response.json()
    return data.models
  } catch (error) {
    console.error("Error fetching models:", error)
    // Return empty array on error to handle gracefully
    return []
  }
}

/**
 * Analyze complexity of a query
 */
export async function analyzeComplexity(query: string): Promise<ComplexityResponse | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/complexity`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query }),
    })
    if (!response.ok) {
      throw new Error(`Failed to analyze complexity: ${response.statusText}`)
    }
    return await response.json()
  } catch (error) {
    console.error("Error analyzing complexity:", error)
    return null
  }
}

/**
 * Get model suggestion for a query and selected model
 */
export async function getModelSuggestion(
  query: string,
  selectedModelId: string,
): Promise<ModelSuggestionResponse | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/suggest-model`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query,
        selected_model_id: selectedModelId,
      }),
    })
    if (!response.ok) {
      throw new Error(`Failed to get model suggestion: ${response.statusText}`)
    }
    return await response.json()
  } catch (error) {
    console.error("Error getting model suggestion:", error)
    return null
  }
}

/**
 * Send a chat message and get a response
 */
export async function sendChatMessage(request: ChatRequest): Promise<ChatResponse | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    })
    if (!response.ok) {
      throw new Error(`Failed to send chat message: ${response.statusText}`)
    }
    return await response.json()
  } catch (error) {
    console.error("Error sending chat message:", error)
    return null
  }
}
