'use client';

import React, { useState } from 'react';
import { MessageSquare, History, Code2, LayoutList, Search, Filter, RotateCcw, Eye, EyeOff } from 'lucide-react';
import { ChatHistory } from '@/features/chat/components';
import { useEditorStore } from '@/features/editor/stores';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export function Sidebar() {
  const [activeTab, setActiveTab] = useState<'chats' | 'tasks'>('chats');
  const [expandedEntryId, setExpandedEntryId] = useState<string | null>(null);
  const { history, setCode, revertToHistoryEntry } = useEditorStore();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredHistory = history.filter((item) => {
    const query = searchQuery.toLowerCase();
    return (
      item.summary.toLowerCase().includes(query) ||
      item.beforeCode.toLowerCase().includes(query) ||
      item.afterCode.toLowerCase().includes(query) ||
      item.action.toLowerCase().includes(query)
    );
  });

  const actionLabel: Record<string, string> = {
    analysis: 'Analysis',
    refactor_apply: 'Refactor',
    revert: 'Revert',
  };

  const actionTone: Record<string, string> = {
    analysis: 'bg-sky-500/10 text-sky-300 border-sky-400/20',
    refactor_apply: 'bg-emerald-500/10 text-emerald-300 border-emerald-400/20',
    revert: 'bg-amber-500/10 text-amber-300 border-amber-400/20',
  };

  return (
    <aside className="flex w-full min-h-0 flex-col overflow-hidden rounded-3xl border border-border/70 bg-card/80 shadow-sm backdrop-blur-sm" suppressHydrationWarning>
      <div className="border-b border-border/60 p-4">
        <div className="flex items-center gap-2 text-primary">
          <LayoutList className="h-5 w-5" />
          <h2 className="text-sm font-semibold tracking-tight text-foreground">Task Management</h2>
        </div>
        
        <div className="mt-4 flex rounded-2xl border border-border/70 bg-muted/40 p-1">
          <button
            onClick={() => setActiveTab('chats')}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 rounded-xl py-2 text-xs font-medium transition-all",
              activeTab === 'chats' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <MessageSquare className="h-3.5 w-3.5" />
            Chats
          </button>
          <button
            onClick={() => setActiveTab('tasks')}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 rounded-xl py-2 text-xs font-medium transition-all",
              activeTab === 'tasks' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <History className="h-3.5 w-3.5" />
            History
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden p-2">
        {activeTab === 'chats' ? (
          <div className="h-full rounded-2xl border border-border/60 bg-background/60 [&>div]:border-0 [&>div]:rounded-none [&>div]:bg-transparent">
            <ChatHistory />
          </div>
        ) : (
          <div className="flex flex-col h-full">
            <div className="flex gap-2 border-b border-border/60 bg-background/40 p-3">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input 
                  placeholder="Search history..." 
                  className="h-8 rounded-full border-border/70 bg-background pl-8 text-xs"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Button variant="outline" size="icon" className="h-8 w-8 shrink-0 rounded-full border-border/70 bg-background/70">
                <Filter className="h-3.5 w-3.5 text-muted-foreground" />
              </Button>
            </div>
            <ScrollArea className="flex-1 min-h-0 p-2">
              {filteredHistory.length === 0 ? (
                <div className="flex h-40 flex-col items-center justify-center rounded-2xl border border-dashed border-border/60 bg-muted/20 px-4 text-center text-sm text-muted-foreground">
                  <Code2 className="mb-2 h-8 w-8 opacity-20" />
                  <p className="font-medium">No analysis history yet.</p>
                  <p className="mt-1 text-xs opacity-70">Run an analysis or apply a refactor to build your timeline.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {filteredHistory.map((item, index) => (
                    <div 
                      key={item.id}
                      className="group rounded-2xl border border-border/60 bg-card/80 p-3 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="outline" className={cn('h-5 rounded-full px-2 text-[10px] font-semibold', actionTone[item.action] || 'bg-muted/20 text-muted-foreground border-border/50')}>
                              <Code2 className="mr-1 h-3 w-3" />
                              {actionLabel[item.action] || 'History'}
                            </Badge>
                            <span className="text-[10px] text-muted-foreground">#{history.length - index}</span>
                          </div>
                          <p className="mt-2 line-clamp-2 text-xs font-medium leading-5 text-foreground">
                            {item.summary}
                          </p>
                          <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground/80">
                            {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 gap-1.5 rounded-full border-border/70 text-[10px]"
                          onClick={() => setCode(item.afterCode)}
                        >
                          <Eye className="mr-1 h-3 w-3" />
                          Open After
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 gap-1.5 rounded-full border-border/70 text-[10px]"
                          onClick={() => setCode(item.beforeCode)}
                        >
                          <EyeOff className="mr-1 h-3 w-3" />
                          Open Before
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 gap-1.5 rounded-full text-[10px] text-destructive hover:text-destructive"
                          onClick={() => revertToHistoryEntry(item.id)}
                        >
                          <RotateCcw className="mr-1 h-3 w-3" />
                          Revert
                        </Button>
                        <span className="ml-auto text-[10px] text-muted-foreground">
                          {item.language.toUpperCase()}
                        </span>
                      </div>

                      <button
                        onClick={() => setExpandedEntryId((prev) => (prev === item.id ? null : item.id))}
                        className="mt-2 inline-flex text-left text-[10px] font-medium text-muted-foreground transition-colors hover:text-foreground"
                      >
                        {expandedEntryId === item.id ? 'Hide details' : 'Show details'}
                      </button>

                      {expandedEntryId === item.id && (
                        <div className="mt-3 grid gap-2 md:grid-cols-2">
                          <div className="rounded-xl border border-border/60 bg-background/70 p-2.5">
                            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Before</p>
                            <pre className="max-h-32 overflow-auto whitespace-pre-wrap break-words font-mono text-[10px] leading-5 text-muted-foreground">
                              {item.beforeCode}
                            </pre>
                          </div>
                          <div className="rounded-xl border border-border/60 bg-background/70 p-2.5">
                            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">After</p>
                            <pre className="max-h-32 overflow-auto whitespace-pre-wrap break-words font-mono text-[10px] leading-5 text-muted-foreground">
                              {item.afterCode}
                            </pre>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        )}
      </div>
    </aside>
  );
}
