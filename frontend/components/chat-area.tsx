"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { createPortal } from "react-dom"
import { Plus, ArrowUp, Code, ChevronDown, Search, Check, Loader2, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { Chat } from "@/app/page"
import { cn } from "@/lib/utils"
import { fetchModels, sendChatMessage, type Model } from "@/lib/api"
import type { Message as ChatMessage, ModelSuggestion } from "@/app/page"
import { MessageContent } from "@/components/message-content"

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
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; right: number } | null>(null)
  const [ragSavings, setRagSavings] = useState<{ cost: number; co2: number } | null>(null)
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
    setRagSavings(null)

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

        // Show model suggestion if available
        if (response.model_suggestion) {
          setModelSuggestion(response.model_suggestion)
          // Store the query in case user wants to switch models
          setPendingQuery(userContent)
          // Store the originally selected model
          setOriginalModel(selectedModel)
        }

        // Check for RAG cache hit
        if (response.model_used === "rag-cache") {
          // Calculate savings based on the selected model (or default if none selected)
          // We assume the savings are equal to the cost of running the selected model
          // since RAG cache is effectively free compared to LLM
          const modelToCompare = selectedModel || models[0]
          if (modelToCompare) {
            setRagSavings({
              cost: modelToCompare.cost_input_tokens,
              co2: modelToCompare.co2
            })
          }
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
    }
  }

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
                        Cheaper model can handle this task would you like to switch it? Consider using a more efficient model to save costs and reduce CO₂.
                      </p>
                      <div className="flex items-center gap-4 text-xs text-amber-700 dark:text-amber-300 mb-3">
                        <div>
                          <span className="font-semibold">Suggested: </span>
                          {modelSuggestion.suggested_model.name}
                        </div>
                      </div>
                      {modelSuggestion.savings && (
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
                      <p className="text-sm text-green-800 dark:text-green-200 mb-3">
                        We found a similar answer in our database. By using the cached response instead of calling the LLM, you saved resources!
                      </p>
                      <div className="flex gap-4 text-xs text-green-700 dark:text-green-400">
                        {ragSavings.cost > 0 && (
                          <div>💰 Saved ${ragSavings.cost.toFixed(2)}/1K tokens</div>
                        )}
                        {ragSavings.co2 > 0 && (
                          <div>🌱 Saved {ragSavings.co2.toFixed(2)}g CO₂</div>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => setRagSavings(null)}
                      className="text-green-500 hover:text-green-700 dark:text-green-400 dark:hover:text-green-200"
                    >
                      <span className="sr-only">Dismiss</span>
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
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
              <h1 className="text-5xl font-serif text-foreground">Hi, Viktor</h1>
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
