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

  const sendMessage = (content: string) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content,
    }

    if (activeChat) {
      const updatedChat = {
        ...activeChat,
        messages: [...activeChat.messages, newMessage],
      }
      setChats((prev) => prev.map((chat) => (chat.id === activeChat.id ? updatedChat : chat)))
      setActiveChat(updatedChat)

      // Simulate assistant response
      setTimeout(() => {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: `I'll help you with: "${content}". This is a mocked response demonstrating the chat functionality.`,
        }
        const chatWithResponse = {
          ...updatedChat,
          messages: [...updatedChat.messages, assistantMessage],
        }
        setChats((prev) => prev.map((chat) => (chat.id === activeChat.id ? chatWithResponse : chat)))
        setActiveChat(chatWithResponse)
      }, 1000)
    } else {
      const newChat: Chat = {
        id: Date.now().toString(),
        title: content.slice(0, 40) + (content.length > 40 ? "..." : ""),
        messages: [newMessage],
        createdAt: new Date(),
      }
      setChats((prev) => [newChat, ...prev])
      setActiveChat(newChat)

      // Simulate assistant response
      setTimeout(() => {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: `I'll help you with: "${content}". This is a mocked response demonstrating the chat functionality.`,
        }
        const chatWithResponse = {
          ...newChat,
          messages: [...newChat.messages, assistantMessage],
        }
        setChats((prev) => prev.map((chat) => (chat.id === newChat.id ? chatWithResponse : chat)))
        setActiveChat(chatWithResponse)
      }, 1000)
    }
  }

  return (
    <div className="flex h-screen">
      <Sidebar
        chats={chats}
        activeChat={activeChat}
        onNewChat={createNewChat}
        onSelectChat={selectChat}
        onDeleteChat={deleteChat}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
      />
      <ChatArea activeChat={activeChat} onSendMessage={sendMessage} sidebarOpen={sidebarOpen} />
    </div>
  )
}
