"use client"

import { MessageSquare, FolderOpen, Plus, Trash2, ChevronUp, PanelLeftClose, PanelLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { Chat } from "@/app/page"
import { cn } from "@/lib/utils"

interface SidebarProps {
  chats: Chat[]
  activeChat: Chat | null
  onNewChat: () => void
  onSelectChat: (chat: Chat) => void
  onDeleteChat: (chatId: string) => void
  isOpen: boolean
  onToggle: () => void
}

export function Sidebar({ chats, activeChat, onNewChat, onSelectChat, onDeleteChat, isOpen, onToggle }: SidebarProps) {
  return (
    <>
      {/* Collapsed sidebar toggle */}
      {!isOpen && (
        <div className="absolute top-4 left-4 z-50">
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggle}
            className="text-muted-foreground hover:text-foreground hover:bg-secondary"
          >
            <PanelLeft className="h-5 w-5" />
          </Button>
        </div>
      )}

      <aside
        className={cn(
          "flex flex-col bg-sidebar border-r border-sidebar-border transition-all duration-300 h-screen fixed left-0 top-0 z-40",
          isOpen ? "w-72" : "w-0 overflow-hidden",
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4">
          <div />
          <div className="flex items-center gap-2">
            <Button
              onClick={onNewChat}
              size="icon"
              className="h-9 w-9 rounded-full bg-gradient-to-br from-pink-500 via-rose-500 to-orange-500 text-white hover:opacity-90 border-0"
            >
              <Plus className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggle}
              className="text-muted-foreground hover:text-foreground hover:bg-secondary"
            >
              <PanelLeftClose className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="px-3 space-y-1">
          <Button variant="ghost" className="w-full justify-start gap-3 text-foreground hover:bg-sidebar-accent">
            <MessageSquare className="h-4 w-4" />
            Chats
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground hover:bg-sidebar-accent"
          >
            <FolderOpen className="h-4 w-4" />
            Projects
          </Button>
        </nav>

        {/* Recents */}
        <div className="mt-6 px-3">
          <p className="text-xs text-muted-foreground font-medium mb-2">Recents</p>
          <ScrollArea className="flex-1 h-[calc(100vh-340px)]">
            <div className="space-y-1">
              {chats.map((chat) => (
                <div
                  key={chat.id}
                  className={cn(
                    "group flex items-center gap-2 rounded-lg px-3 py-2 cursor-pointer transition-colors",
                    activeChat?.id === chat.id
                      ? "bg-sidebar-accent text-foreground"
                      : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground",
                  )}
                  onClick={() => onSelectChat(chat)}
                >
                  <span className="flex-1 truncate text-sm">{chat.title}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 hover:bg-destructive/20 hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation()
                      onDeleteChat(chat.id)
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* User Profile */}
        <div className="mt-auto p-4 border-t border-sidebar-border">
          <div className="flex items-center gap-3 cursor-pointer hover:bg-sidebar-accent rounded-lg p-2 transition-colors">
            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-pink-500 via-rose-500 to-orange-500 flex items-center justify-center text-white font-semibold">
              V
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">Viktor</p>
              <p className="text-xs text-muted-foreground">Jet Plan</p>
            </div>
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>
      </aside>
    </>
  )
}
