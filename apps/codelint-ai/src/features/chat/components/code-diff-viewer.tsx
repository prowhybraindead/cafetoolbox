'use client';

import React from 'react';
import { useEditorStore } from '@/features/editor/stores';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Copy, Check, RotateCcw } from 'lucide-react';
import { useState } from 'react';

export function CodeDiffViewer() {
  const { analysisResult, code, skill, language, setCode, addHistoryEntry } = useEditorStore();
  const [copied, setCopied] = useState(false);

  if (!analysisResult || !analysisResult.fixed_code) {
    return null;
  }

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(analysisResult.fixed_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const applyChanges = () => {
    addHistoryEntry({
      action: 'refactor_apply',
      skill,
      language,
      summary: analysisResult.diff_summary || 'Applied AI refactor to editor',
      beforeCode: code,
      afterCode: analysisResult.fixed_code,
    });
    setCode(analysisResult.fixed_code);
  };

  return (
    <Card className="flex h-full flex-col overflow-hidden border-border/70 bg-card/90">
      <CardHeader className="flex flex-row items-center justify-between gap-3 border-b border-border/60 px-4 py-4">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 animate-pulse rounded-full bg-primary" />
          <CardTitle className="text-sm uppercase tracking-[0.24em]">Fixed Code</CardTitle>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={copyToClipboard} className="h-8 gap-2 rounded-full border-border/70">
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            <span className="text-xs">{copied ? 'Copied' : 'Copy'}</span>
          </Button>
          <Button variant="default" size="sm" onClick={applyChanges} className="h-8 gap-2 rounded-full">
            <RotateCcw className="h-3.5 w-3.5" />
            <span className="text-xs">Apply to Editor</span>
          </Button>
        </div>
      </CardHeader>

      <CardContent className="min-h-0 flex-1 overflow-hidden p-4">
        <div className="h-full overflow-auto rounded-2xl border border-border/70 bg-slate-950 p-4 font-mono text-xs leading-relaxed text-slate-100">
          <pre className="text-emerald-300/90">
            <code>{analysisResult.fixed_code}</code>
          </pre>
        </div>
      </CardContent>

      <CardFooter className="border-t border-border/60 bg-muted/20 px-4 py-3">
        <div>
          <h4 className="mb-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">Diff Summary</h4>
          <p className="text-xs italic text-muted-foreground">
            {analysisResult.diff_summary || "Không có tóm tắt thay đổi."}
          </p>
        </div>
      </CardFooter>
    </Card>
  );
}
