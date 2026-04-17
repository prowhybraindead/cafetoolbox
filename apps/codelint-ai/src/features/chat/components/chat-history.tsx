'use client';

import React from 'react';
import { MessageSquare, Trash2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useEditorStore } from '@/features/editor/stores';
import { cn } from '@/lib/utils';

export function ChatHistory() {
  const { 
    chatSessions, 
    currentChatSessionId, 
    setCurrentChatSessionId, 
    deleteChatSession 
  } = useEditorStore();

  const handleNewChat = () => {
    setCurrentChatSessionId(null);
  };

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="border-b border-border/60 p-3">
        <Button size="sm" variant="outline" onClick={handleNewChat} className="h-8 w-full gap-1.5 rounded-full border-border/70 bg-background/80">
          <Plus className="h-3.5 w-3.5" />
          New Chat
        </Button>
      </div>
      
      <ScrollArea className="flex-1 min-h-0">
        {chatSessions.length === 0 ? (
          <div className="flex h-40 flex-col items-center justify-center px-4 py-2 text-center text-sm text-muted-foreground">
            <MessageSquare className="mb-2 h-8 w-8 opacity-20" />
            <p>No chat history yet.</p>
            <p className="mt-1 text-xs opacity-70">Start a conversation in the AI Chat tab.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2 p-2">
            {chatSessions.map((session) => (
              <div 
                key={session.id}
                className={cn(
                  "group flex cursor-pointer items-center justify-between rounded-2xl border border-transparent p-3 transition-all",
                  currentChatSessionId === session.id 
                    ? "border-primary/20 bg-primary/10 text-primary shadow-sm" 
                    : "bg-background/60 text-foreground hover:border-border/70 hover:bg-muted/30"
                )}
                onClick={() => setCurrentChatSessionId(session.id)}
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <MessageSquare className={cn(
                    "h-4 w-4 shrink-0",
                    currentChatSessionId === session.id ? "text-primary" : "text-muted-foreground"
                  )} />
                  <div className="flex flex-col overflow-hidden">
                    <span className="text-sm font-medium truncate">
                      {session.title}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(session.timestamp).toLocaleString()}
                    </span>
                  </div>
                </div>
                
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0 rounded-full text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteChatSession(session.id);
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
