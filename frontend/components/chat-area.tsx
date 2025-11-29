"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Plus, ArrowUp, Code, ChevronDown, Search, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { Chat } from "@/app/page"
import { cn } from "@/lib/utils"

interface ChatAreaProps {
  activeChat: Chat | null
  onSendMessage: (content: string) => void
  sidebarOpen: boolean
}

const models = [{ id: "gpt-4o", name: "GPT-4o", description: "Most capable model" }]

export function ChatArea({ activeChat, onSendMessage, sidebarOpen }: ChatAreaProps) {
  const [input, setInput] = useState("")
  const [selectedModel, setSelectedModel] = useState(models[0])
  const [isModelOpen, setIsModelOpen] = useState(false)
  const [modelSearch, setModelSearch] = useState("")
  const dropdownRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsModelOpen(false)
        setModelSearch("")
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  useEffect(() => {
    if (isModelOpen && searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [isModelOpen])

  const filteredModels = models.filter(
    (model) =>
      model.name.toLowerCase().includes(modelSearch.toLowerCase()) ||
      model.description.toLowerCase().includes(modelSearch.toLowerCase()),
  )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (input.trim()) {
      onSendMessage(input.trim())
      setInput("")
    }
  }

  const handleCodePrompt = () => {
    setInput("Help me write code for ")
  }

  const handleSelectModel = (model: (typeof models)[0]) => {
    setSelectedModel(model)
    setIsModelOpen(false)
    setModelSearch("")
  }

  return (
    <main className={cn("flex-1 flex flex-col", !sidebarOpen && "pl-16")}>
      {activeChat ? (
        <>
          {/* Chat Messages */}
          <ScrollArea className="flex-1 p-6">
            <div className="max-w-3xl mx-auto space-y-6">
              {activeChat.messages.map((message) => (
                <div key={message.id} className={cn("flex", message.role === "user" ? "justify-end" : "justify-start")}>
                  <div
                    className={cn(
                      "max-w-[80%] rounded-2xl px-4 py-3",
                      message.role === "user"
                        ? "bg-gradient-to-br from-pink-500 via-rose-500 to-orange-500 text-white"
                        : "bg-card text-card-foreground",
                    )}
                  >
                    <p className="text-sm leading-relaxed">{message.content}</p>
                  </div>
                </div>
              ))}
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
                  disabled={!input.trim()}
                  className="absolute right-3 h-9 w-9 rounded-lg bg-gradient-to-br from-pink-500 via-rose-500 to-orange-500 text-white hover:opacity-90 disabled:opacity-50 border-0"
                >
                  <ArrowUp className="h-5 w-5" />
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
                        className="h-8 gap-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary px-2"
                      >
                        <Code className="h-4 w-4" />
                        <span className="text-sm">Code</span>
                      </Button>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="relative" ref={dropdownRef}>
                        <button
                          type="button"
                          onClick={() => setIsModelOpen(!isModelOpen)}
                          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-md hover:bg-secondary"
                        >
                          {selectedModel.name}
                          <ChevronDown className={cn("h-3 w-3 transition-transform", isModelOpen && "rotate-180")} />
                        </button>

                        {isModelOpen && (
                          <div className="absolute bottom-full mb-2 right-0 w-64 bg-card border border-border rounded-xl shadow-lg overflow-hidden z-50">
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
                            <div className="max-h-64 overflow-y-auto p-1">
                              {filteredModels.length > 0 ? (
                                filteredModels.map((model) => (
                                  <button
                                    key={model.id}
                                    type="button"
                                    onClick={() => handleSelectModel(model)}
                                    className={cn(
                                      "w-full flex items-center justify-between px-3 py-2 rounded-lg text-left hover:bg-secondary transition-colors",
                                      selectedModel.id === model.id && "bg-secondary",
                                    )}
                                  >
                                    <div>
                                      <p className="text-sm font-medium text-foreground">{model.name}</p>
                                      <p className="text-xs text-muted-foreground">{model.description}</p>
                                    </div>
                                    {selectedModel.id === model.id && <Check className="h-4 w-4 text-primary" />}
                                  </button>
                                ))
                              ) : (
                                <p className="text-sm text-muted-foreground text-center py-4">No models found</p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                      <Button
                        type="submit"
                        size="icon"
                        disabled={!input.trim()}
                        className="h-9 w-9 rounded-lg bg-gradient-to-br from-pink-500 via-rose-500 to-orange-500 text-white hover:opacity-90 disabled:opacity-50 border-0"
                      >
                        <ArrowUp className="h-5 w-5" />
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
