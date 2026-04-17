'use client';

import React from 'react';
import { ClipboardPaste, Loader2, Plus, Replace, Trash2, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEditorStore } from '@/features/editor/stores';
import { formatCodeSnippet } from '@/lib/format-code';

export function CodeSnippetInput() {
  const { code, setCode, language } = useEditorStore();
  const [snippet, setSnippet] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [isFormattingSnippet, setIsFormattingSnippet] = React.useState(false);

  const hasSnippet = snippet.trim().length > 0;

  const handlePasteFromClipboard = async () => {
    try {
      const clipboardText = await navigator.clipboard.readText();
      if (!clipboardText.trim()) {
        setError('Clipboard đang trống.');
        return;
      }

      setSnippet(clipboardText);
      setError(null);
    } catch {
      setError('Không thể đọc clipboard. Hãy dán bằng Ctrl+V.');
    }
  };

  const handleReplaceEditorCode = () => {
    if (!hasSnippet) {
      setError('Vui lòng nhập hoặc dán snippet trước.');
      return;
    }

    setCode(snippet);
    setError(null);
  };

  const handleAppendToEditor = () => {
    if (!hasSnippet) {
      setError('Vui lòng nhập hoặc dán snippet trước.');
      return;
    }

    const nextCode = code.trim().length > 0 ? `${code}\n\n${snippet}` : snippet;
    setCode(nextCode);
    setError(null);
  };

  const handleFormatSnippet = async () => {
    if (!hasSnippet) {
      setError('Vui lòng nhập hoặc dán snippet trước.');
      return;
    }

    setIsFormattingSnippet(true);
    setError(null);
    try {
      const formatted = await formatCodeSnippet(snippet, language);
      setSnippet(formatted);
    } catch {
      setError('Không thể format snippet này. Hãy kiểm tra ngôn ngữ hoặc cú pháp.');
    } finally {
      setIsFormattingSnippet(false);
    }
  };

  return (
    <section className="rounded-lg border border-border/60 bg-muted/20 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Code Snippet Input
        </p>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handlePasteFromClipboard}
            className="h-8 gap-1.5"
          >
            <ClipboardPaste className="h-3.5 w-3.5" />
            Paste
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setSnippet('');
              setError(null);
            }}
            className="h-8 gap-1.5"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Clear
          </Button>
        </div>
      </div>

      <textarea
        value={snippet}
        onChange={(e) => {
          setSnippet(e.target.value);
          if (error) setError(null);
        }}
        placeholder="Paste hoặc nhập code snippet tại đây..."
        className="mb-3 min-h-28 w-full resize-y rounded-md border border-border/60 bg-background p-2 font-mono text-xs outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
      />

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={handleFormatSnippet}
          disabled={!hasSnippet || isFormattingSnippet}
          className="h-8 gap-1.5"
        >
          {isFormattingSnippet ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
          Format Snippet
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={handleReplaceEditorCode}
          disabled={!hasSnippet}
          className="h-8 gap-1.5"
        >
          <Replace className="h-3.5 w-3.5" />
          Replace Editor
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={handleAppendToEditor}
          disabled={!hasSnippet}
          className="h-8 gap-1.5"
        >
          <Plus className="h-3.5 w-3.5" />
          Append to Editor
        </Button>
        {error && <span className="text-xs text-destructive">{error}</span>}
      </div>
    </section>
  );
}
