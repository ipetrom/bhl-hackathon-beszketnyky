"use client"

import React, { useState } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { Copy, Check } from "lucide-react"
import { vscDarkPlus } from "react-syntax-highlighter/dist/cjs/styles/prism"
import { cn } from "@/lib/utils"

interface MessageContentProps {
  content: string
  isUser?: boolean
}

function CodeBlock({ code, language }: { code: string; language: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error("Failed to copy:", err)
    }
  }

  return (
    <div className="relative my-2 group">
      <div className="flex items-center justify-between px-4 py-2 bg-[#1e1e1e] border-b border-border rounded-t-lg">
        <span className="text-xs text-muted-foreground">{language}</span>
        <button
          onClick={(e) => {
            e.stopPropagation()
            e.preventDefault()
            handleCopy()
          }}
          onMouseDown={(e) => e.stopPropagation()}
          className="flex items-center gap-1.5 px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-[#2a2a2a] rounded transition-colors"
          title="Copy code"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5" />
              <span>Copied!</span>
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <div className="select-text">
        <SyntaxHighlighter
          style={vscDarkPlus}
          language={language}
          PreTag="div"
          className="rounded-b-lg !m-0"
          customStyle={{
            margin: 0,
            padding: "1rem",
            borderRadius: "0 0 0.5rem 0.5rem",
            fontSize: "0.875rem",
            lineHeight: "1.5",
            userSelect: "text",
            WebkitUserSelect: "text",
          }}
          wrapLines={true}
          wrapLongLines={true}
        >
          {code}
        </SyntaxHighlighter>
      </div>
    </div>
  )
}

export function MessageContent({ content, isUser }: MessageContentProps) {
  if (isUser) {
    return <p className="text-sm leading-relaxed whitespace-pre-wrap">{content}</p>
  }

  return (
    <div className="text-sm text-foreground select-text">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ node, inline, className, children, ...props }: any) {
            const match = /language-(\w+)/.exec(className || "")
            
            // Code blocks are not inline - handle them with syntax highlighting
            if (!inline) {
              // Handle code blocks - children can be string or array
              const codeString = Array.isArray(children)
                ? children.map((child: any) => (typeof child === "string" ? child : String(child))).join("")
                : String(children)
              
              // Remove trailing newline if present
              const cleanedCode = codeString.replace(/\n$/, "")
              const language = match ? match[1] : "text"
              
              // Return CodeBlock wrapped in a fragment to prevent p tag wrapping
              return <CodeBlock code={cleanedCode} language={language} />
            }
            
            // Inline code - must stay as <code> element (not div)
            return (
              <code
                className={cn(
                  "px-1.5 py-0.5 rounded bg-muted text-foreground text-sm font-mono",
                  className
                )}
                {...props}
              >
                {children}
              </code>
            )
          },
          pre({ children, ...props }: any) {
            // Pre tags wrap code blocks - ReactMarkdown creates <pre><code> for code blocks
            // We need to check if the child is a CodeBlock (div) and handle it properly
            const childrenArray = React.Children.toArray(children)
            
            // If children contain a CodeBlock (div), return it directly without pre wrapper
            const hasCodeBlock = childrenArray.some((child: any) => {
              return child?.type?.name === 'CodeBlock' || 
                     (typeof child === 'object' && child?.props?.children?.type?.name === 'CodeBlock')
            })
            
            if (hasCodeBlock) {
              return <>{children}</>
            }
            
            // Regular pre tag
            return <pre className="my-2">{children}</pre>
          },
          p({ children, ...props }: any) {
            // Check if this paragraph contains a code block (div element) or pre tag
            // ReactMarkdown sometimes wraps code blocks in p tags, which is invalid HTML
            const childrenArray = React.Children.toArray(children)
            
            // Check if any child is a div, pre, or CodeBlock component
            const hasBlockElement = childrenArray.some((child: any) => {
              if (typeof child === 'object' && child !== null) {
                // Check if it's a div or pre element
                if (child.type === 'div' || child.type === 'pre' || 
                    (typeof child.type === 'string' && (child.type === 'div' || child.type === 'pre'))) {
                  return true
                }
                // Check if it's our CodeBlock component
                if (child.type?.name === 'CodeBlock') {
                  return true
                }
                // Check if it's a pre tag containing CodeBlock
                if (child.type === 'pre' || child.props?.children) {
                  const nested = React.Children.toArray(child.props?.children || [])
                  if (nested.some((n: any) => n?.type?.name === 'CodeBlock' || n?.type === 'div')) {
                    return true
                  }
                }
              }
              return false
            })
            
            // If paragraph contains a block element (code block), use div wrapper instead
            if (hasBlockElement) {
              return <div className="my-1.5 leading-relaxed">{children}</div>
            }
            
            return <p className="my-1.5 leading-relaxed">{children}</p>
          },
          ul({ children }) {
            return <ul className="my-1.5 ml-4 list-disc space-y-0.5">{children}</ul>
          },
          ol({ children }) {
            return <ol className="my-1.5 ml-4 list-decimal space-y-0.5">{children}</ol>
          },
          li({ children }) {
            return <li className="my-0.5">{children}</li>
          },
          h1({ children }) {
            return <h1 className="text-xl font-semibold my-2">{children}</h1>
          },
          h2({ children }) {
            return <h2 className="text-lg font-semibold my-2">{children}</h2>
          },
          h3({ children }) {
            return <h3 className="text-base font-semibold my-2">{children}</h3>
          },
          blockquote({ children }) {
            return (
              <blockquote className="border-l-4 border-muted-foreground/30 pl-4 my-2 italic text-muted-foreground">
                {children}
              </blockquote>
            )
          },
          hr() {
            return <hr className="my-3 border-border" />
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}

export default MessageContent

