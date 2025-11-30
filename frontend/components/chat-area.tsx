"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { createPortal } from "react-dom"
import { Plus, ArrowUp, Code, ChevronDown, Search, Check, Loader2, Trash2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { Chat } from "@/app/page"
import { cn } from "@/lib/utils"
import { fetchModels, sendChatMessage, recordSavings, type Model } from "@/lib/api"
import type { Message as ChatMessage, ModelSuggestion } from "@/app/page"
import { MessageContent } from "@/components/message-content"
import Image from "next/image"
import PyCharmIcon from "@/images/PyCharm_Icon.png"

interface ChatAreaProps {
  activeChat: Chat | null
  onSendMessage: (userMessage: ChatMessage, assistantMessage: ChatMessage, replaceLast?: number) => void
  onDeleteChat?: (chatId: string) => void
  onUpdateChat?: (chatId: string, messages: ChatMessage[]) => void
  sidebarOpen: boolean
}

export function ChatArea({ activeChat, onSendMessage, onDeleteChat, onUpdateChat, sidebarOpen }: ChatAreaProps) {
  const [input, setInput] = useState("")
  const [models, setModels] = useState<Model[]>([])
  const [selectedModel, setSelectedModel] = useState<Model | null>(null)
  const [isModelOpen, setIsModelOpen] = useState(false)
  const [modelSearch, setModelSearch] = useState("")
  const [isCodeMode, setIsCodeMode] = useState(false)
  const [isLoadingModels, setIsLoadingModels] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [modelSuggestion, setModelSuggestion] = useState<ModelSuggestion | null>(null)
  const [pendingQuery, setPendingQuery] = useState<string | null>(null)
  const [originalModel, setOriginalModel] = useState<Model | null>(null)
  const [showJetBrainsPopup, setShowJetBrainsPopup] = useState(false)
  const [showJetBrainsLoading, setShowJetBrainsLoading] = useState(false)
  const [jetBrainsStep, setJetBrainsStep] = useState<1 | 2>(1)
  const [jetBrainsSelectedModel, setJetBrainsSelectedModel] = useState<Model | null>(null)
  const jetBrainsTimerRef = useRef<NodeJS.Timeout | null>(null)
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; right: number } | null>(null)
  const [ragSavings, setRagSavings] = useState<{ 
    cost: number
    co2: number
    modelName?: string
  } | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const dropdownPortalRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Fetch models on component mount
  useEffect(() => {
    async function loadModels() {
      setIsLoadingModels(true)
      const fetchedModels = await fetchModels()
      setModels(fetchedModels)
      // Set default model (lowest complexity)
      if (fetchedModels.length > 0) {
        const defaultModel = fetchedModels.sort((a, b) => a.complexity_level - b.complexity_level)[0]
        setSelectedModel(defaultModel)
      }
      setIsLoadingModels(false)
    }
    loadModels()
  }, [])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node
      const isClickInsideButton = buttonRef.current?.contains(target)
      const isClickInsideDropdown = dropdownPortalRef.current?.contains(target)

      if (!isClickInsideButton && !isClickInsideDropdown) {
        setIsModelOpen(false)
        setModelSearch("")
      }
    }
    if (isModelOpen) {
      document.addEventListener("mousedown", handleClickOutside)
      return () => document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isModelOpen])

  useEffect(() => {
    if (isModelOpen && searchInputRef.current) {
      searchInputRef.current.focus()
    }
    if (isModelOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setDropdownPosition({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right,
      })
    } else {
      setDropdownPosition(null)
    }
  }, [isModelOpen])

  const filteredModels = models.filter(
    (model) =>
      model.name.toLowerCase().includes(modelSearch.toLowerCase()) ||
      model.provider.toLowerCase().includes(modelSearch.toLowerCase()) ||
      model.id.toLowerCase().includes(modelSearch.toLowerCase()),
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isSending || !selectedModel) return

    const userContent = input.trim()
    setInput("")
    setIsSending(true)
    setModelSuggestion(null)
    setShowJetBrainsPopup(false)

    // Clear any existing timer
    if (jetBrainsTimerRef.current) {
      clearTimeout(jetBrainsTimerRef.current)
      jetBrainsTimerRef.current = null
    }

    // Show JetBrains popup after 3 seconds if in code mode
    if (isCodeMode) {
      jetBrainsTimerRef.current = setTimeout(() => {
        setShowJetBrainsPopup(true)
      }, 3000)
    }

    try {
      // Prepare messages for API
      const messages = activeChat
        ? [...activeChat.messages.map(msg => ({ role: msg.role, content: msg.content })), { role: "user" as const, content: userContent }]
        : [{ role: "user" as const, content: userContent }]

      // Send to backend
      const response = await sendChatMessage({
        messages,
        model_id: selectedModel.id,
        user_selected: true, // User manually selected model
      })

      if (response) {
        // Create user and assistant messages
        const userMessage: ChatMessage = {
          id: Date.now().toString(),
          role: "user",
          content: userContent,
        }

        const assistantMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: response.message.content,
        }

        // Update chat
        onSendMessage(userMessage, assistantMessage)

        // Clear JetBrains popup timer if response arrived
        if (jetBrainsTimerRef.current) {
          clearTimeout(jetBrainsTimerRef.current)
          jetBrainsTimerRef.current = null
        }
        setShowJetBrainsPopup(false)

        // Show model suggestion if available
        if (response.model_suggestion) {
          setModelSuggestion(response.model_suggestion)
          // Store the query in case user wants to switch models
          setPendingQuery(userContent)
          // Store the originally selected model
          setOriginalModel(selectedModel)
        }

        // Check for RAG cache hit - use savings from backend response
        if (response.model_used === "rag-cache" && response.cache_savings) {
          setRagSavings({
            cost: response.cache_savings.cost_saved,
            co2: response.cache_savings.co2_saved,
            modelName: response.cache_savings.model_that_would_be_used.name
          })
        } else {
          setRagSavings(null)
        }
      } else {
        // Fallback error message
        const userMessage: ChatMessage = {
          id: Date.now().toString(),
          role: "user",
          content: userContent,
        }

        const assistantMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: "Sorry, there was an error processing your request. Please try again.",
        }

        onSendMessage(userMessage, assistantMessage)
      }
    } catch (error) {
      console.error("Error sending message:", error)

      // Fallback error message
      const userMessage: ChatMessage = {
        id: Date.now().toString(),
        role: "user",
        content: userContent,
      }

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Sorry, there was an error processing your request. Please make sure the backend server is running.",
      }

      onSendMessage(userMessage, assistantMessage)
    } finally {
      setIsSending(false)
      // Clear JetBrains popup timer
      if (jetBrainsTimerRef.current) {
        clearTimeout(jetBrainsTimerRef.current)
        jetBrainsTimerRef.current = null
      }
      setShowJetBrainsPopup(false)
    }
  }

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (jetBrainsTimerRef.current) {
        clearTimeout(jetBrainsTimerRef.current)
      }
    }
  }, [])

  const handleCodePrompt = () => {
    setIsCodeMode(!isCodeMode)
  }

  const handleSelectModel = (model: Model) => {
    setSelectedModel(model)
    setIsModelOpen(false)
    setModelSearch("")
  }

  return (
    <main className={cn("flex-1 flex flex-col h-screen ml-0 transition-all duration-300", sidebarOpen && "ml-72")}>
      {/* JetBrains Loading State */}
      {showJetBrainsLoading && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
          <div className="bg-card border border-border rounded-xl shadow-xl p-8">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
          </div>
        </div>
      )}

      {/* JetBrains Integration Popup - Outside conditional so it can be shown from anywhere */}
      {showJetBrainsPopup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
          <div className="bg-card border border-border rounded-xl shadow-xl max-w-2xl w-full p-8 relative">
            {/* Close button */}
            <button
              onClick={() => {
                setShowJetBrainsPopup(false)
                setJetBrainsStep(1)
                setJetBrainsSelectedModel(null)
                if (jetBrainsTimerRef.current) {
                  clearTimeout(jetBrainsTimerRef.current)
                  jetBrainsTimerRef.current = null
                }
              }}
              className="absolute top-4 right-4 p-2 hover:bg-secondary rounded-lg transition-colors"
              aria-label="Close"
            >
              <X className="h-5 w-5 text-muted-foreground" />
            </button>

            {jetBrainsStep === 1 ? (
              <>
                <div className="flex items-start gap-4 mb-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                    <Code className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      Try JetBrains Integration
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      This looks like a complex coding task. Would you like to try our JetBrains integration? Our AI assistant will help you write accurate, energy-efficient code with minimal wasted tokens and lower CO₂ emissions.
                    </p>
                  </div>
                </div>
                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => {
                      setJetBrainsStep(2)
                      // Set default model to first Anthropic model if available
                      const anthropicModels = models.filter(m => m.provider.toLowerCase() === "anthropic")
                      if (anthropicModels.length > 0 && !jetBrainsSelectedModel) {
                        setJetBrainsSelectedModel(anthropicModels[0])
                      }
                    }}
                    className="flex-1 px-4 py-2 bg-gradient-to-br from-blue-500 to-indigo-600 hover:opacity-90 text-white rounded-lg font-medium transition-opacity"
                  >
                    Yes, let's try it
                  </button>
                  <button
                    onClick={() => {
                      setShowJetBrainsPopup(false)
                      setJetBrainsStep(1)
                      if (jetBrainsTimerRef.current) {
                        clearTimeout(jetBrainsTimerRef.current)
                        jetBrainsTimerRef.current = null
                      }
                    }}
                    className="flex-1 px-4 py-2 bg-secondary hover:bg-secondary/80 text-foreground rounded-lg font-medium transition-colors"
                  >
                    No, continue here
                  </button>
                </div>
              </>
            ) : (
              <>
                {/* Step 2: Chatbox with models */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-foreground mb-4">
                    JetBrains Integration
                  </h3>
                  
                  {/* Chatbox with pre-filled text */}
                  <div className="bg-secondary rounded-lg border border-border p-4">
                    <textarea
                      value="I want to make a simple snake pygame"
                      readOnly
                      className="w-full bg-transparent resize-none text-foreground text-sm focus:outline-none"
                      rows={3}
                    />
                  </div>

                  {/* Model Selector - Only Anthropic models */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Select Model</label>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {models
                        .filter(m => m.provider.toLowerCase() === "anthropic")
                        .map((model) => (
                          <button
                            key={model.id}
                            onClick={() => setJetBrainsSelectedModel(model)}
                            className={cn(
                              "w-full text-left p-3 rounded-lg border transition-colors",
                              jetBrainsSelectedModel?.id === model.id
                                ? "bg-primary/10 border-primary"
                                : "bg-secondary border-border hover:bg-secondary/80"
                            )}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-medium text-foreground">{model.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {model.provider} • CO₂: {model.co2}g
                                </p>
                              </div>
                              {jetBrainsSelectedModel?.id === model.id && (
                                <Check className="h-4 w-4 text-primary" />
                              )}
                            </div>
                          </button>
                        ))}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={() => {
                        // Try to open PyCharm on Mac using URL scheme
                        // PyCharm registers pycharm:// URL scheme on macOS
                        try {
                          // Attempt to open PyCharm via URL scheme
                          window.location.href = "pycharm://"
                          
                          // Fallback: if PyCharm doesn't open, show website after delay
                          setTimeout(() => {
                            // This will only execute if user is still on the page
                            // (if PyCharm opened, user likely navigated away)
                            window.open("https://www.jetbrains.com/pycharm/", "_blank")
                          }, 2000)
                        } catch (error) {
                          // If URL scheme fails, open website directly
                          window.open("https://www.jetbrains.com/pycharm/", "_blank")
                        }
                      }}
                      className="flex-1 px-4 py-2 bg-gradient-to-br from-blue-500 to-indigo-600 hover:opacity-90 text-white rounded-lg font-medium transition-opacity flex items-center justify-center gap-2"
                    >
                      <Image src={PyCharmIcon} alt="PyCharm" width={20} height={20} className="object-contain" />
                      Go to PyCharm
                    </button>
                    <button
                      onClick={() => {
                        // TODO: Implement Download PyCharm
                        window.open("https://www.jetbrains.com/pycharm/download/", "_blank")
                      }}
                      className="flex-1 px-4 py-2 bg-secondary hover:bg-secondary/80 text-foreground rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                    >
                      <Image src={PyCharmIcon} alt="PyCharm" width={20} height={20} className="object-contain" />
                      Download PyCharm
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
      {activeChat ? (
        <>
          {/* Chat Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <h2 className="text-lg font-semibold text-foreground">{activeChat.title}</h2>
            {onDeleteChat && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onDeleteChat(activeChat.id)}
                className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                title="Delete chat"
              >
                <Trash2 className="h-5 w-5" />
              </Button>
            )}
          </div>

          {/* Chat Messages */}
          <ScrollArea className="flex-1 p-6">
            <div className="max-w-3xl mx-auto space-y-4">
              {activeChat.messages.map((message) => (
                <div key={message.id} className={cn("flex", message.role === "user" ? "justify-end" : "justify-start")}>
                  <div
                    className={cn(
                      "max-w-[85%] rounded-2xl px-4 py-3 select-text",
                      message.role === "user"
                        ? "bg-gradient-to-br from-pink-500 via-rose-500 to-orange-500 text-white"
                        : "bg-card text-card-foreground border border-border",
                    )}
                  >
                    <MessageContent content={message.content} isUser={message.role === "user"} />
                  </div>
                </div>
              ))}

              {/* Model Suggestion Alert */}
              {modelSuggestion && (
                <div className="mt-4 p-4 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border border-amber-200 dark:border-amber-800 rounded-xl">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center">
                      <span className="text-lg">💡</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-semibold text-amber-900 dark:text-amber-100 mb-1">
                        Model Suggestion
                      </h4>
                      <p className="text-sm text-amber-800 dark:text-amber-200 mb-3">
                        {modelSuggestion.is_under_engineered
                          ? "Seems like you better need a better model for this task."
                          : "Cheaper model can handle this task would you like to switch it? Consider using a more efficient model to save costs and reduce CO₂."}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-amber-700 dark:text-amber-300 mb-3">
                        <div>
                          <span className="font-semibold">Suggested: </span>
                          {modelSuggestion.suggested_model.name}
                        </div>
                      </div>
                      {modelSuggestion.savings && !modelSuggestion.is_under_engineered && (
                        <div className="flex gap-4 text-xs text-green-700 dark:text-green-400 mb-3">
                          {modelSuggestion.savings.cost_input_tokens > 0 && (
                            <div>💰 Save ${modelSuggestion.savings.cost_input_tokens.toFixed(2)}/1K tokens</div>
                          )}
                          {modelSuggestion.savings.co2 > 0 && (
                            <div>🌱 Save {modelSuggestion.savings.co2.toFixed(2)}g CO₂</div>
                          )}
                        </div>
                      )}
                      <div className="flex gap-2">
                        <button
                          onClick={async () => {
                            const suggested = models.find(m => m.id === modelSuggestion.suggested_model.id)
                            if (suggested && pendingQuery) {
                              // Clear the suggestion UI immediately
                              setModelSuggestion(null)

                              // Remove placeholder message immediately (keep user message)
                              const placeholderText = "Please review the model suggestion below before proceeding with your request."
                              let messagesWithoutPlaceholder: ChatMessage[] = []

                              if (activeChat) {
                                // Remove only the placeholder message if it exists (keep user message)
                                const lastMessage = activeChat.messages[activeChat.messages.length - 1]
                                if (lastMessage.content === placeholderText) {
                                  // Remove only the placeholder message (keep user message)
                                  messagesWithoutPlaceholder = activeChat.messages.slice(0, -1)
                                  if (onUpdateChat) {
                                    onUpdateChat(activeChat.id, messagesWithoutPlaceholder)
                                  }
                                } else {
                                  messagesWithoutPlaceholder = activeChat.messages
                                }
                              }

                              // Switch to suggested model
                              setSelectedModel(suggested)

                              // Re-send the query with the new model
                              setIsSending(true)

                              try {
                                // Prepare messages for API - use all messages without placeholder
                                // The user message is already in messagesWithoutPlaceholder
                                const contextMessages = messagesWithoutPlaceholder.map(msg => ({
                                  role: msg.role,
                                  content: msg.content
                                }))

                                // Ensure the pending query is the last message
                                const lastContextMessage = contextMessages[contextMessages.length - 1]
                                if (!lastContextMessage || lastContextMessage.role !== "user" || lastContextMessage.content !== pendingQuery) {
                                  contextMessages.push({ role: "user" as const, content: pendingQuery })
                                }

                                // Send to backend with new model
                                // Skip suggestion check since user explicitly chose this model
                                const response = await sendChatMessage({
                                  messages: contextMessages,
                                  model_id: suggested.id,
                                  user_selected: true,
                                  skip_suggestion_check: true,
                                })

                                if (response) {
                                  // Create assistant message (user message already exists in chat)
                                  const assistantMessage: ChatMessage = {
                                    id: (Date.now() + 1).toString(),
                                    role: "assistant",
                                    content: response.message.content,
                                  }

                                  // Add the assistant message to the chat (user message is already there)
                                  const updatedMessages = [...messagesWithoutPlaceholder, assistantMessage]
                                  if (onUpdateChat) {
                                    onUpdateChat(activeChat!.id, updatedMessages)
                                  }

                                  // Record savings when user switches to cheaper model
                                  if (originalModel && modelSuggestion.savings && !modelSuggestion.is_under_engineered) {
                                    await recordSavings({
                                      original_model_id: originalModel.id,
                                      original_model_name: originalModel.name,
                                      suggested_model_id: suggested.id,
                                      suggested_model_name: suggested.name,
                                      cost_saved_input: modelSuggestion.savings.cost_input_tokens,
                                      cost_saved_output: modelSuggestion.savings.cost_output_tokens || 0,
                                      co2_saved: modelSuggestion.savings.co2,
                                      complexity_level: response.complexity_detected || 5,
                                      query_preview: pendingQuery.substring(0, 100),
                                    })
                                  }

                                  // Clear pending query and original model
                                  // Don't show suggestions again - user explicitly chose this model
                                  setPendingQuery(null)
                                  setOriginalModel(null)
                                }
                              } catch (error) {
                                console.error("Error sending message with new model:", error)
                              } finally {
                                setIsSending(false)
                              }
                            }
                          }}
                          disabled={isSending}
                          className="px-3 py-1.5 text-xs font-medium bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isSending ? "Switching..." : `Switch to ${modelSuggestion.suggested_model.name}`}
                        </button>
                        <button
                          onClick={async () => {
                            if (originalModel && pendingQuery) {
                              // Clear the suggestion UI immediately
                              setModelSuggestion(null)

                              // Remove placeholder message immediately (keep user message)
                              const placeholderText = "Please review the model suggestion below before proceeding with your request."
                              let messagesWithoutPlaceholder: ChatMessage[] = []

                              if (activeChat) {
                                // Remove only the placeholder message if it exists (keep user message)
                                const lastMessage = activeChat.messages[activeChat.messages.length - 1]
                                if (lastMessage.content === placeholderText) {
                                  // Remove only the placeholder message (keep user message)
                                  messagesWithoutPlaceholder = activeChat.messages.slice(0, -1)
                                  if (onUpdateChat) {
                                    onUpdateChat(activeChat.id, messagesWithoutPlaceholder)
                                  }
                                } else {
                                  messagesWithoutPlaceholder = activeChat.messages
                                }
                              }

                              // Switch back to original model
                              setSelectedModel(originalModel)

                              // Generate response with original model
                              setIsSending(true)

                              try {
                                // Prepare messages for API - use all messages without placeholder
                                const contextMessages = messagesWithoutPlaceholder.map(msg => ({
                                  role: msg.role,
                                  content: msg.content
                                }))

                                // Ensure the pending query is the last message
                                const lastContextMessage = contextMessages[contextMessages.length - 1]
                                if (!lastContextMessage || lastContextMessage.role !== "user" || lastContextMessage.content !== pendingQuery) {
                                  contextMessages.push({ role: "user" as const, content: pendingQuery })
                                }

                                // Send to backend with original model
                                // Skip suggestion check since user explicitly chose to keep current model
                                const response = await sendChatMessage({
                                  messages: contextMessages,
                                  model_id: originalModel.id,
                                  user_selected: true,
                                  skip_suggestion_check: true,
                                })

                                if (response) {
                                  // Create assistant message (user message already exists in chat)
                                  const assistantMessage: ChatMessage = {
                                    id: (Date.now() + 1).toString(),
                                    role: "assistant",
                                    content: response.message.content,
                                  }

                                  // Add the assistant message to the chat (user message is already there)
                                  const updatedMessages = [...messagesWithoutPlaceholder, assistantMessage]
                                  if (onUpdateChat) {
                                    onUpdateChat(activeChat!.id, updatedMessages)
                                  }

                                  // Clear pending query and original model
                                  // Don't show suggestions again - user explicitly chose to keep current model
                                  setPendingQuery(null)
                                  setOriginalModel(null)
                                }
                              } catch (error) {
                                console.error("Error sending message with original model:", error)
                              } finally {
                                setIsSending(false)
                              }
                            } else {
                              // Fallback: just clear the suggestion
                              setModelSuggestion(null)
                              setPendingQuery(null)
                              setOriginalModel(null)
                            }
                          }}
                          disabled={isSending}
                          className="px-3 py-1.5 text-xs font-medium bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-amber-900 dark:text-amber-100 border border-amber-200 dark:border-amber-800 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Keep Current
                        </button>
                        <button
                          onClick={() => {
                            // TODO: Implement logic to disable suggestions
                          }}
                          className="px-3 py-1.5 text-xs font-medium bg-transparent hover:bg-amber-100/50 dark:hover:bg-amber-900/20 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700 rounded-lg transition-colors"
                        >
                          Don't show me suggestions anymore
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* RAG Savings Alert */}
              {ragSavings && (
                <div className="mt-4 p-4 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border border-green-200 dark:border-green-800 rounded-xl">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center">
                      <span className="text-lg">⚡</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-semibold text-green-900 dark:text-green-100 mb-1">
                        Smart Cache Hit!
                      </h4>
                      <p className="text-sm text-green-800 dark:text-green-200 mb-2">
                        We found a similar answer in our database. By using the cached response instead of calling the LLM, you saved resources!
                      </p>
                      {ragSavings.modelName && (
                        <p className="text-xs text-green-700 dark:text-green-300 mb-3">
                          Model that would have been used: <span className="font-semibold">{ragSavings.modelName}</span>
                        </p>
                      )}
                      <div className="flex flex-wrap gap-4 text-xs text-green-700 dark:text-green-400">
                        {ragSavings.cost > 0 && (
                          <div className="flex items-center gap-1">
                            <span>💰</span>
                            <span>Saved ${ragSavings.cost.toFixed(2)} (estimated)</span>
                          </div>
                        )}
                        {ragSavings.co2 > 0 && (
                          <div className="flex items-center gap-1">
                            <span>🌱</span>
                            <span>Saved {ragSavings.co2.toFixed(2)}g CO₂</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => setRagSavings(null)}
                      className="text-green-500 hover:text-green-700 dark:text-green-400 dark:hover:text-green-200 transition-colors"
                      aria-label="Dismiss"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}

            </div>
          </ScrollArea>

          {/* Input Area */}
          <div className="p-6 border-t border-border">
            <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
              <div className="relative flex items-center bg-card rounded-2xl border border-border overflow-hidden">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Reply to the conversation..."
                  rows={1}
                  className="flex-1 bg-transparent resize-none text-foreground placeholder:text-muted-foreground px-4 py-4 focus:outline-none"
                />
                <Button
                  type="submit"
                  size="icon"
                  disabled={!input.trim() || isSending}
                  className="absolute right-3 h-9 w-9 rounded-lg bg-gradient-to-br from-pink-500 via-rose-500 to-orange-500 text-white hover:opacity-90 disabled:opacity-50 border-0"
                >
                  {isSending ? <Loader2 className="h-5 w-5 animate-spin" /> : <ArrowUp className="h-5 w-5" />}
                </Button>
              </div>
            </form>
          </div>
        </>
      ) : (
        <>
          {/* Welcome Screen */}
          <div className="flex-1 flex flex-col items-center justify-center px-6">
            <div className="text-center mb-8">
              <button
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  console.log("Hi Viktor clicked, showing loading then popup")
                  setShowJetBrainsLoading(true)
                  // Show popup after 3 seconds
                  setTimeout(() => {
                    setShowJetBrainsLoading(false)
                    setShowJetBrainsPopup(true)
                  }, 3000)
                }}
                className="cursor-pointer inline-block"
                style={{ background: 'transparent', border: 'none', padding: 0, outline: 'none' }}
                aria-label="Show JetBrains integration popup"
                type="button"
              >
                <h1 className="text-5xl font-serif text-foreground pointer-events-none">Hi, Viktor</h1>
              </button>
            </div>

            {/* Input Box */}
            <div className="w-full max-w-2xl">
              <form onSubmit={handleSubmit}>
                <div className="bg-card rounded-2xl border border-border overflow-hidden">
                  {/* Text input area */}
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="How can I help you today?"
                    rows={1}
                    className="w-full bg-transparent resize-none text-foreground placeholder:text-muted-foreground px-4 pt-4 pb-2 focus:outline-none"
                  />
                  {/* Bottom toolbar with action buttons */}
                  <div className="flex items-center justify-between px-3 pb-3">
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-secondary"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={handleCodePrompt}
                        className={cn(
                          "h-8 gap-1.5 px-2 transition-all",
                          isCodeMode
                            ? "bg-gradient-to-br from-pink-500 via-rose-500 to-orange-500 text-white hover:opacity-90 border-0"
                            : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                        )}
                      >
                        <Code className="h-4 w-4" />
                        <span className="text-sm">Code</span>
                      </Button>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="relative" ref={dropdownRef}>
                        <button
                          ref={buttonRef}
                          type="button"
                          onClick={() => setIsModelOpen(!isModelOpen)}
                          disabled={isLoadingModels}
                          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-md hover:bg-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isLoadingModels ? (
                            <>
                              <Loader2 className="h-3 w-3 animate-spin" />
                              <span>Loading...</span>
                            </>
                          ) : selectedModel ? (
                            selectedModel.name
                          ) : (
                            "No models"
                          )}
                          {!isLoadingModels && (
                            <ChevronDown className={cn("h-3 w-3 transition-transform", isModelOpen && "rotate-180")} />
                          )}
                        </button>

                        {isModelOpen && dropdownPosition && typeof window !== "undefined" && createPortal(
                          <div
                            ref={dropdownPortalRef}
                            className="fixed w-64 bg-card border border-border rounded-xl shadow-lg overflow-hidden z-50"
                            style={{
                              top: `${dropdownPosition.top}px`,
                              right: `${dropdownPosition.right}px`,
                            }}
                          >
                            {/* Search input */}
                            <div className="p-2 border-b border-border">
                              <div className="relative">
                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <input
                                  ref={searchInputRef}
                                  type="text"
                                  value={modelSearch}
                                  onChange={(e) => setModelSearch(e.target.value)}
                                  placeholder="Search models..."
                                  className="w-full bg-secondary rounded-lg pl-8 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                                />
                              </div>
                            </div>
                            {/* Model list */}
                            <div className="max-h-96 overflow-y-auto p-1">
                              {filteredModels.length > 0 ? (
                                filteredModels.map((model) => (
                                  <button
                                    key={model.id}
                                    type="button"
                                    onClick={() => handleSelectModel(model)}
                                    className={cn(
                                      "w-full flex items-center justify-between px-3 py-2 rounded-lg text-left hover:bg-secondary transition-colors",
                                      selectedModel?.id === model.id && "bg-secondary",
                                    )}
                                  >
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium text-foreground">{model.name}</p>
                                      <p className="text-xs text-muted-foreground">
                                        {model.provider} • CO₂: {model.co2}g
                                      </p>
                                    </div>
                                    {selectedModel?.id === model.id && <Check className="h-4 w-4 text-primary flex-shrink-0 ml-2" />}
                                  </button>
                                ))
                              ) : (
                                <p className="text-sm text-muted-foreground text-center py-4">No models found</p>
                              )}
                            </div>
                          </div>,
                          document.body
                        )}
                      </div>
                      <Button
                        type="submit"
                        size="icon"
                        disabled={!input.trim() || isSending}
                        className="h-9 w-9 rounded-lg bg-gradient-to-br from-pink-500 via-rose-500 to-orange-500 text-white hover:opacity-90 disabled:opacity-50 border-0"
                      >
                        {isSending ? <Loader2 className="h-5 w-5 animate-spin" /> : <ArrowUp className="h-5 w-5" />}
                      </Button>
                    </div>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </>
      )}
    </main>
  )
}
