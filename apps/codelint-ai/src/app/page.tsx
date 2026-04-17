'use client';

import React from 'react';
import { Navbar, Sidebar } from '@/features/layout/components';
import { SkillSelector, CodeDiffViewer, AIAssistantPanel, ChatBox } from '@/features/chat/components';
import { CodeEditor, HtmlPreview } from '@/features/editor/components';
import { Button, buttonVariants } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Play, Sparkles, LayoutPanelLeft, Split, MessageSquareCode, MessageCircle, Terminal as TerminalIcon, Activity, Users, History, ShieldCheck } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useGeminiSkill } from '@/features/chat/hooks';
import { useEditorStore } from '@/features/editor/stores';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Link from 'next/link';
import { cn } from '@/lib/utils';

const Terminal = dynamic(() => import('@/features/editor/components/terminal').then(mod => mod.Terminal), { ssr: false });

const skillLabels: Record<string, string> = {
  refactoring: 'Refactor',
  solid: 'SOLID',
  optimizer: 'Optimize',
  security: 'Security',
  vibecoding: 'Vibe',
  testgen: 'Tests',
  mockdata: 'Mock',
};

export default function HomePage() {
  const { analyzeCode } = useGeminiSkill();
  const { isAnalyzing, analysisResult, loadSessionsFromSupabase, language, skill, history, chatSessions } = useEditorStore();
  const [activeTab, setActiveTab] = React.useState('insights');
  const previewSupported = ['html', 'css', 'javascript'].includes(language);

  React.useEffect(() => {
    loadSessionsFromSupabase();
  }, [loadSessionsFromSupabase]);

  const score = analysisResult?.security_score ?? null;
  const skillLabel = skillLabels[skill] ?? skill;
  const stats = [
    { label: 'Language', value: language.toUpperCase(), helper: 'Editor mode' },
    { label: 'Skill', value: skillLabel, helper: 'AI preset' },
    { label: 'Sessions', value: String(chatSessions.length), helper: 'Synced chats' },
    { label: 'History', value: String(history.length), helper: 'Tracked changes' },
  ];
  const qualitySignals = [
    { icon: Activity, label: 'Live analysis flow' },
    { icon: ShieldCheck, label: score === null ? 'Score ready after scan' : `Security score ${score}/100` },
    { icon: Users, label: `${chatSessions.length} shared sessions` },
    { icon: History, label: `${history.length} tracked revisions` },
  ];

  return (
    <div className="flex min-h-dvh flex-col overflow-y-auto bg-background text-foreground lg:h-dvh lg:min-h-0 lg:overflow-hidden" suppressHydrationWarning>
      <Navbar />

      <div className="mx-auto flex w-full max-w-[1840px] flex-1 flex-col gap-4 overflow-visible px-3 pb-4 pt-4 sm:px-4 lg:flex-row lg:gap-5 lg:overflow-hidden lg:px-5 lg:pb-5 lg:pt-5" suppressHydrationWarning>
        <div className="hidden min-h-0 min-[1700px]:flex min-[1700px]:w-[292px] min-[1700px]:shrink-0" suppressHydrationWarning>
          <Sidebar />
        </div>

        <main className="flex min-w-0 flex-1 flex-col gap-4 overflow-visible lg:overflow-hidden" suppressHydrationWarning>
          <Card className="gap-0 overflow-hidden border-border/70 bg-card/90 py-0 shadow-sm" suppressHydrationWarning>
            <CardHeader className="relative gap-7 overflow-hidden border-b border-border/60 bg-gradient-to-br from-background to-muted/30 px-7 py-7" suppressHydrationWarning>
              <div className="pointer-events-none absolute inset-0">
                <div className="hero-orb-emerald absolute -left-16 -top-20 h-48 w-48 rounded-full blur-3xl" />
                <div className="hero-orb-amber absolute right-6 top-8 h-32 w-32 rounded-full blur-2xl" />
                <div className="hero-grid-overlay absolute inset-0" />
              </div>

              <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
                <div className="hero-entrance-left relative z-10 max-w-2xl space-y-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="rounded-full border-primary/25 bg-primary/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-primary">
                      Workspace
                    </Badge>
                    <Badge variant="outline" className="rounded-full border-foreground/15 bg-background/70 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                      Focused Mode
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <CardTitle className="max-w-3xl text-3xl tracking-tight text-foreground md:text-4xl">
                      Build, inspect, and refine code in one focused workspace.
                    </CardTitle>
                    <CardDescription className="max-w-2xl text-sm leading-6 text-muted-foreground md:text-[15px]">
                      A cleaner canvas for coding, AI chat, and validation. Panels are now easier to scan, with stronger visual rhythm and quieter background noise.
                    </CardDescription>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <Button onClick={analyzeCode} disabled={isAnalyzing} className="h-10 gap-2 rounded-full px-5">
                      {isAnalyzing ? (
                        <Sparkles className="h-4 w-4 animate-spin" />
                      ) : (
                        <Play className="h-4 w-4 fill-current" />
                      )}
                      <span className="text-[10px] font-semibold uppercase tracking-[0.22em]">Analyze</span>
                    </Button>
                    <Link href="/chat" className={cn(buttonVariants({ variant: 'outline' }), 'h-10 gap-2 rounded-full px-5')}>
                      <MessageCircle className="h-4 w-4" />
                      <span className="text-[10px] font-semibold uppercase tracking-[0.22em]">Open chat</span>
                    </Link>
                  </div>

                  <div className="space-y-2">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">Skill mode</p>
                    <SkillSelector />
                  </div>
                </div>

                <Card className="hero-entrance-right relative z-10 w-full border-border/70 bg-background/80 py-0 shadow-none backdrop-blur xl:max-w-md">
                  <CardContent className="space-y-4 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">Workspace pulse</p>
                        <p className="mt-1 text-sm font-medium text-foreground">{analysisResult ? 'Analysis complete' : 'Ready for analysis'}</p>
                      </div>
                      <Badge variant={analysisResult ? 'default' : 'outline'} className={cn('rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em]', analysisResult ? 'bg-primary text-primary-foreground' : '')}>
                        {analysisResult ? 'Live' : 'Idle'}
                      </Badge>
                    </div>

                    <div className="grid gap-2">
                      {qualitySignals.map((signal) => (
                        <div key={signal.label} className="flex items-center gap-2 rounded-xl border border-border/60 bg-card/80 px-3 py-2.5">
                          <signal.icon className="h-4 w-4 text-primary" />
                          <p className="text-xs text-foreground/90">{signal.label}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="hero-stats-grid relative z-10 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {stats.map((item) => (
                  <div key={item.label} className="hero-stat-card rounded-2xl border border-border/70 bg-card/85 p-4 shadow-sm backdrop-blur-sm">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">{item.label}</p>
                    <p className="mt-3 text-lg font-semibold tracking-tight text-foreground">{item.value}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{item.helper}</p>
                  </div>
                ))}
              </div>
            </CardHeader>
          </Card>

          <div className="grid min-h-0 flex-1 gap-4 lg:gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(420px,1fr)] 2xl:grid-cols-[minmax(0,1.05fr)_minmax(460px,0.95fr)]" suppressHydrationWarning>
            <div className="flex min-h-0 flex-col gap-3 overflow-hidden" suppressHydrationWarning>
              <div className="flex items-center justify-between px-1.5">
                <div className="flex items-center gap-2">
                  <LayoutPanelLeft className="h-4 w-4 text-primary" />
                  <h2 className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">Editor</h2>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    UTF-8
                  </Badge>
                  <Badge variant="outline" className="rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    {language.toUpperCase()}
                  </Badge>
                </div>
              </div>
              <div className="flex min-h-[360px] overflow-hidden rounded-3xl border border-border/70 bg-card/95 shadow-sm md:min-h-[440px] lg:min-h-0 lg:flex-1" suppressHydrationWarning>
                <CodeEditor />
              </div>
            </div>
            <Tabs
              value={activeTab}
              onValueChange={(value) => setActiveTab(String(value))}
              className="flex min-h-0 flex-1 flex-col"
              suppressHydrationWarning
            >
              <Card className="flex min-h-[420px] flex-1 flex-col overflow-hidden border-border/70 bg-card/95 shadow-sm md:min-h-[520px] lg:min-h-0" suppressHydrationWarning>
                <CardHeader className="flex flex-col gap-3 border-b border-border/60 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="space-y-1">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">Tools</p>
                    <CardTitle className="text-lg">Assistant panel</CardTitle>
                  </div>
                  <div className="w-full overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden lg:w-auto lg:overflow-visible lg:pb-0">
                    <TabsList variant="line" className="w-max min-w-full bg-transparent p-0 lg:min-w-0">
                      <TabsTrigger value="insights" className="gap-1.5 text-[10px] uppercase tracking-[0.16em]">
                        <MessageSquareCode className="h-3 w-3" />
                        Insights
                      </TabsTrigger>
                      <TabsTrigger value="chat" className="gap-1.5 text-[10px] uppercase tracking-[0.16em]">
                        <MessageCircle className="h-3 w-3" />
                        Chat
                      </TabsTrigger>
                      <TabsTrigger value="preview" className="gap-1.5 text-[10px] uppercase tracking-[0.16em]" disabled={!previewSupported}>
                        <LayoutPanelLeft className="h-3 w-3" />
                        Preview
                      </TabsTrigger>
                      <TabsTrigger value="diff" className="gap-1.5 text-[10px] uppercase tracking-[0.16em]" disabled={!analysisResult}>
                        <Split className="h-3 w-3" />
                        Diff
                      </TabsTrigger>
                      <TabsTrigger value="terminal" className="gap-1.5 text-[10px] uppercase tracking-[0.16em]">
                        <TerminalIcon className="h-3 w-3" />
                        Terminal
                      </TabsTrigger>
                    </TabsList>
                  </div>
                </CardHeader>

                <CardContent className="flex min-h-0 flex-1 flex-col p-0">
                  <div className="flex min-h-0 flex-1 overflow-hidden p-5 pt-2">
                    <TabsContent value="insights" className="h-full m-0 data-[state=inactive]:hidden">
                      <AIAssistantPanel />
                    </TabsContent>
                    <TabsContent value="chat" className="h-full m-0 data-[state=inactive]:hidden p-1">
                      <ChatBox />
                    </TabsContent>
                    <TabsContent value="preview" className="h-full m-0 data-[state=inactive]:hidden p-1">
                      <HtmlPreview />
                    </TabsContent>
                    <TabsContent value="diff" className="h-full m-0 data-[state=inactive]:hidden">
                      <CodeDiffViewer />
                    </TabsContent>
                    <TabsContent value="terminal" className="h-full m-0 data-[state=inactive]:hidden">
                      {activeTab === 'terminal' ? <Terminal /> : null}
                    </TabsContent>
                  </div>
                </CardContent>
              </Card>
            </Tabs>
          </div>
        </main>
      </div>

      <footer className="mt-auto hidden h-10 items-center justify-between border-t border-border/70 bg-background/85 px-6 text-[10px] font-medium text-muted-foreground backdrop-blur-xl lg:flex" suppressHydrationWarning>
        <div className="flex items-center gap-4" suppressHydrationWarning>
          <div className="flex items-center gap-1.5">
            <div className="h-1.5 w-1.5 rounded-full bg-primary" />
            <span>Beautifier Online</span>
          </div>
          <Separator orientation="vertical" className="h-3" />
          <span>JSON Validator Active</span>
        </div>
        <div className="flex items-center gap-4">
          <span>Auto format ready</span>
          <span className="uppercase">UTF-8</span>
        </div>
      </footer>
    </div>
  );
}
