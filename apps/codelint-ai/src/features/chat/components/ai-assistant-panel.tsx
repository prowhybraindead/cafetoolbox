'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { motion, AnimatePresence } from 'motion/react';
import { 
  AlertCircle, 
  CheckCircle2, 
  Lightbulb, 
  ShieldAlert,
  Loader2,
  Copy,
  Check
} from 'lucide-react';
import { useEditorStore } from '@/features/editor/stores';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';

export function AIAssistantPanel() {
  const { analysisResult, isAnalyzing } = useEditorStore();
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  if (isAnalyzing) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-8 space-y-4 text-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        >
          <Loader2 className="h-10 w-10 text-primary" />
        </motion.div>
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Kernel Processing...</h3>
          <p className="max-w-[250px] text-sm text-muted-foreground">
            Đang phân tích mã nguồn và áp dụng các nguyên tắc tối ưu hóa.
          </p>
        </div>
      </div>
    );
  }

  if (!analysisResult) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-8 space-y-4 text-center opacity-60">
        <Lightbulb className="h-12 w-12 text-muted-foreground" />
        <div className="space-y-1">
          <h3 className="text-lg font-medium">Ready for Analysis</h3>
          <p className="text-sm text-muted-foreground">
            Chọn một Skill Mode và nhấn Analyze để bắt đầu.
          </p>
        </div>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full min-h-0">
      <div className="space-y-6 p-2 pr-3 md:p-4">
        {/* Security Score */}
        <Card className="border-border/70 bg-card/80">
          <CardContent className="flex items-center justify-between gap-4 p-4">
            <div className="flex items-center gap-3">
              <div className={cn(
                "rounded-2xl p-2",
                (analysisResult.security_score || 0) > 80 ? "bg-emerald-500/10 text-emerald-500" : 
                (analysisResult.security_score || 0) > 50 ? "bg-amber-500/10 text-amber-500" : "bg-red-500/10 text-red-500"
              )}>
                <ShieldAlert className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">Security Score</p>
                <p className="text-xl font-semibold tracking-tight">{(analysisResult.security_score || 0)}/100</p>
              </div>
            </div>
            <Badge variant={(analysisResult.security_score || 0) > 80 ? "outline" : "destructive"}>
              {(analysisResult.security_score || 0) > 80 ? "Secure" : "Warning"}
            </Badge>
          </CardContent>
        </Card>

        {/* Analysis Section */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 text-primary">
            <AlertCircle className="h-4 w-4" />
            <h3 className="text-sm font-semibold uppercase tracking-[0.24em]">Analysis</h3>
          </div>
          <div className="prose prose-sm max-w-none leading-relaxed text-muted-foreground">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {analysisResult.analysis || "Không có nội dung phân tích."}
            </ReactMarkdown>
          </div>
        </section>

        <Separator className="opacity-50" />

        {/* Suggestions Section */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-primary">
            <CheckCircle2 className="h-4 w-4" />
            <h3 className="text-sm font-semibold uppercase tracking-[0.24em]">Suggestions</h3>
          </div>
          <div className="grid gap-3">
            {(Array.isArray(analysisResult.suggestions) ? analysisResult.suggestions : []).map((suggestion: string, idx: number) => (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
                key={idx}
                className="flex items-start gap-3 rounded-2xl border border-border/60 bg-muted/20 p-3 transition-colors hover:bg-muted/30"
              >
                <div className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                <p className="text-sm">{suggestion}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Test Cases Section */}
        {analysisResult.test_cases && (
          <>
            <Separator className="opacity-50" />
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-primary">
                  <CheckCircle2 className="h-4 w-4" />
                  <h3 className="text-sm font-semibold uppercase tracking-[0.24em]">Test Cases</h3>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => copyToClipboard(analysisResult.test_cases)}
                  className="h-8 w-8 rounded-full"
                >
                  {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <div className="overflow-hidden rounded-2xl border border-border/70 bg-slate-950 text-slate-100">
                <pre className="overflow-x-auto p-4 text-xs font-mono text-slate-300">
                  <code>{analysisResult.test_cases}</code>
                </pre>
              </div>
            </section>
          </>
        )}
      </div>
    </ScrollArea>
  );
}
