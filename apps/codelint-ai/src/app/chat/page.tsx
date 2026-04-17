'use client';

import React, { useEffect } from 'react';
import { Navbar } from '@/features/layout/components';
import { ChatBox } from '@/features/chat/components';
import { useEditorStore } from '@/features/editor/stores';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageCircle, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function ChatPage() {
  const { loadSessionsFromSupabase } = useEditorStore();

  useEffect(() => {
    loadSessionsFromSupabase();
  }, [loadSessionsFromSupabase]);

  return (
    <div className="min-h-dvh overflow-y-auto bg-background text-foreground lg:h-dvh lg:overflow-hidden" suppressHydrationWarning>
      <Navbar />

      <main className="mx-auto flex w-full max-w-[1280px] flex-1 px-3 pb-4 pt-4 sm:px-4 lg:h-[calc(100dvh-4rem)] lg:overflow-hidden lg:px-5 lg:pb-5 lg:pt-5" suppressHydrationWarning>
        <Card className="flex min-w-0 flex-1 flex-col border-border/70 bg-card/90 shadow-sm" suppressHydrationWarning>
          <CardHeader className="flex flex-col gap-3 border-b border-border/60 px-4 py-4 sm:px-5 lg:flex-row lg:items-center lg:justify-between" suppressHydrationWarning>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <MessageCircle className="h-4 w-4 text-primary" />
                <CardTitle className="text-lg">AI Chatbox</CardTitle>
              </div>
              <CardDescription className="text-sm text-muted-foreground">
                Dedicated workspace for chatting with AI about your current code, refactors, and debugging.
              </CardDescription>
            </div>
            <Link href="/" className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'w-fit gap-2 rounded-full border-border/70')}>
              Back to workspace
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </CardHeader>
          <CardContent className="min-h-0 flex-1 p-3 sm:p-4 lg:overflow-hidden" suppressHydrationWarning>
            <div className="min-h-[520px] lg:h-full lg:min-h-0">
              <ChatBox />
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
