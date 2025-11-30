"use client"

import { useState } from "react"
import { Sidebar } from "@/components/sidebar"
import { ChatArea } from "@/components/chat-area"

export interface Chat {
  id: string
  title: string
  messages: Message[]
  createdAt: Date
}

export interface Message {
  id: string
  role: "user" | "assistant"
  content: string
}

export interface ModelSuggestion {
  suggested_model: {
    id: string
    name: string
    complexity_level: number
    co2: number
    cost_input_tokens: number
    cost_output_tokens: number
  }
  reason: string
  savings: {
    cost_input_tokens: number
    cost_output_tokens?: number
    co2: number
  }
}

const initialChats: Chat[] = []

export default function Home() {
  const [chats, setChats] = useState<Chat[]>(initialChats)
  const [activeChat, setActiveChat] = useState<Chat | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const createNewChat = () => {
    setActiveChat(null)
  }

  const deleteChat = (chatId: string) => {
    setChats((prev) => prev.filter((chat) => chat.id !== chatId))
    if (activeChat?.id === chatId) {
      setActiveChat(null)
    }
  }

  const selectChat = (chat: Chat) => {
    setActiveChat(chat)
  }

  const sendMessage = (userMessage: Message, assistantMessage: Message, replaceLast?: number) => {
    if (activeChat) {
      // If replaceLast is specified, remove that many messages from the end
      const existingMessages = replaceLast && replaceLast > 0
        ? activeChat.messages.slice(0, -replaceLast)
        : activeChat.messages
      
      const updatedChat = {
        ...activeChat,
        messages: [...existingMessages, userMessage, assistantMessage],
      }
      setChats((prev) => prev.map((chat) => (chat.id === activeChat.id ? updatedChat : chat)))
      setActiveChat(updatedChat)
    } else {
      const newChat: Chat = {
        id: Date.now().toString(),
        title: userMessage.content.slice(0, 40) + (userMessage.content.length > 40 ? "..." : ""),
        messages: [userMessage, assistantMessage],
        createdAt: new Date(),
      }
      setChats((prev) => [newChat, ...prev])
      setActiveChat(newChat)
    }
  }

  const updateChatMessages = (chatId: string, messages: Message[]) => {
    setChats((prev) =>
      prev.map((chat) => {
        if (chat.id === chatId) {
          const updatedChat = { ...chat, messages }
          if (activeChat?.id === chatId) {
            setActiveChat(updatedChat)
          }
          return updatedChat
        }
        return chat
      })
    )
  }

  return (
    <div className="flex h-screen relative">
      <Sidebar
        chats={chats}
        activeChat={activeChat}
        onNewChat={createNewChat}
        onSelectChat={selectChat}
        onDeleteChat={deleteChat}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
      />
      <ChatArea activeChat={activeChat} onSendMessage={sendMessage} onDeleteChat={deleteChat} onUpdateChat={updateChatMessages} sidebarOpen={sidebarOpen} />
    </div>
  )
}
