'use client'

import { useChat } from '@ai-sdk/react'
import { useRouter } from 'next/navigation'
import { useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Send, Terminal } from 'lucide-react'

export function ChatInterface() {
  const router = useRouter()
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: '/api/chat',
    onToolCall({ toolCall }) {
      // Handle UI Actions executed by the Agent
      if (toolCall.toolName === 'trigger_ui_action') {
        const { action, payload } = toolCall.args as any
        
        if (action === 'navigate') {
          router.push(`/${payload}`)
        } else if (action === 'filter') {
          // This would ideally interact with a Context or State manager
          // to filter hackathons on the current page
          console.log('Filtering hackathons by', payload)
        }
      }
    }
  })

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return (
    <div className="flex flex-col h-[600px] w-full max-w-2xl mx-auto border rounded-xl overflow-hidden bg-background shadow-lg">
      <div className="bg-primary/5 border-b p-4 flex items-center gap-2">
        <Terminal className="w-5 h-5 text-primary" />
        <h2 className="font-semibold">HackBot AI</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map(m => (
          <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] p-3 rounded-xl ${
              m.role === 'user' 
                ? 'bg-primary text-primary-foreground rounded-tr-sm' 
                : 'bg-muted rounded-tl-sm'
            }`}>
              <div className="whitespace-pre-wrap text-sm">{m.content}</div>
              
              {/* Render Tool Invocations */}
              {m.toolInvocations?.map((toolInvocation) => {
                const toolCallId = toolInvocation.toolCallId;
                
                if (toolInvocation.state === 'result') {
                  return (
                    <div key={toolCallId} className="mt-2 text-xs bg-black/10 dark:bg-white/10 p-2 rounded">
                      ✓ Executed {toolInvocation.toolName}
                    </div>
                  );
                }
                return (
                  <div key={toolCallId} className="mt-2 text-xs bg-black/10 dark:bg-white/10 p-2 rounded animate-pulse">
                    Executing {toolInvocation.toolName}...
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-muted p-3 rounded-xl rounded-tl-sm flex gap-1">
              <div className="w-2 h-2 rounded-full bg-primary/50 animate-bounce" />
              <div className="w-2 h-2 rounded-full bg-primary/50 animate-bounce delay-100" />
              <div className="w-2 h-2 rounded-full bg-primary/50 animate-bounce delay-200" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="p-4 border-t bg-background flex gap-2">
        <input
          className="flex-1 px-4 py-2 bg-muted rounded-full focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-sm"
          value={input}
          placeholder="Ask HackBot about hackathons, teams, or ideas..."
          onChange={handleInputChange}
          disabled={isLoading}
        />
        <Button type="submit" size="icon" className="rounded-full shrink-0" disabled={isLoading || !input.trim()}>
          <Send className="w-4 h-4" />
        </Button>
      </form>
    </div>
  )
}
