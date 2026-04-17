'use client';

import React from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { json } from '@codemirror/lang-json';
import { xml } from '@codemirror/lang-xml';
import { rust } from '@codemirror/lang-rust';
import { sql } from '@codemirror/lang-sql';
import { html } from '@codemirror/lang-html';
import { css } from '@codemirror/lang-css';
import { python } from '@codemirror/lang-python';
import { cpp } from '@codemirror/lang-cpp';
import { java } from '@codemirror/lang-java';
import { php } from '@codemirror/lang-php';
import { vscodeDark } from '@uiw/codemirror-theme-vscode';
import { useEditorStore, EditorLanguage } from '@/features/editor/stores';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Wand2, Loader2, Link2, Users } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
import { formatCodeSnippet } from '@/lib/format-code';
import { useCodeCollaboration } from '@/features/editor/hooks';
import { cn } from '@/lib/utils';

const getGeminiClient = () => {
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("NEXT_PUBLIC_GEMINI_API_KEY is not set in the environment variables.");
  }
  return new GoogleGenAI({ apiKey });
};

export function CodeEditor() {
  const { code, setCode, language, setLanguage, autoSave, setAutoSave } = useEditorStore();
  const codeRef = React.useRef(code);
  const [isMounted, setIsMounted] = React.useState(false);
  const [isFormatting, setIsFormatting] = React.useState(false);
  const [formatError, setFormatError] = React.useState<string | null>(null);
  const {
    roomId,
    collaboratorCount,
    isConnected,
    lastSyncedAt,
    copyInviteLink,
  } = useCodeCollaboration(code, language, ({ code: remoteCode, language: remoteLanguage }) => {
    setLanguage(remoteLanguage);
    setCode(remoteCode);
  });

  React.useEffect(() => {
    codeRef.current = code;
  }, [code]);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  // Load from local storage on mount
  React.useEffect(() => {
    try {
      const savedCode = localStorage.getItem('codelint_saved_code');
      const savedAutoSave = localStorage.getItem('codelint_auto_save');
      
      if (savedCode) {
        setCode(savedCode);
      }
      if (savedAutoSave !== null) {
        setAutoSave(savedAutoSave === 'true');
      }
    } catch (err) {
      console.error('Failed to load from localStorage:', err);
    }
  }, [setCode, setAutoSave]);

  // Auto-save interval
  React.useEffect(() => {
    if (!autoSave) return;

    const interval = setInterval(() => {
      try {
        localStorage.setItem('codelint_saved_code', codeRef.current);
      } catch (err) {
        console.error('Failed to auto-save code to localStorage:', err);
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [autoSave]);

  const handlePaste = async (e: React.ClipboardEvent<HTMLDivElement>) => {
    const pastedText = e.clipboardData.getData('text');
    if (pastedText && pastedText.length > 20) {
      try {
        const ai = getGeminiClient();
        const prompt = `
          Analyze the following code snippet and determine its programming language.
          Return ONLY a JSON object with a single key "language" and the value being one of the following exact strings:
          "javascript", "typescript", "html", "css", "xml", "python", "java", "cpp", "php", "rust", "sql", "json".
          If you cannot determine the language or it's not in the list, default to "typescript".

          Code:
          \`\`\`
          ${pastedText.substring(0, 500)} // Only need a snippet to guess
          \`\`\`
        `;

        const result = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            temperature: 0.1,
          }
        });

        if (result.text) {
          try {
            const parsed = JSON.parse(result.text);
            if (parsed && parsed.language) {
              setLanguage(parsed.language as EditorLanguage);
            }
          } catch (parseError) {
            console.error("Failed to parse language detection JSON:", parseError);
          }
        }
      } catch (error: any) {
        if (error.message?.includes("API key not valid")) {
          console.error("Invalid Gemini API Key. Please check your API key in the AI Studio Settings/Secrets panel.");
        } else {
          console.error("Language Detection Error:", error);
        }
      }
    }
  };

  const getExtensions = () => {
    switch (language) {
      case 'javascript':
      case 'typescript':
        return [javascript({ jsx: true, typescript: true })];
      case 'json':
        return [json()];
      case 'xml':
        return [xml()];
      case 'rust':
        return [rust()];
      case 'sql':
        return [sql()];
      case 'html':
        return [html()];
      case 'css':
        return [css()];
      case 'python':
        return [python()];
      case 'cpp':
        return [cpp()];
      case 'java':
        return [java()];
      case 'php':
        return [php()];
      default:
        return [javascript({ jsx: true, typescript: true })];
    }
  };

  const formatCode = async () => {
    setIsFormatting(true);
    setFormatError(null);
    try {
      const formatted = await formatCodeSnippet(code, language);
      setCode(formatted);
    } catch (error) {
      console.error('Formatting error:', error);
      setFormatError('Không thể format đoạn code này. Hãy kiểm tra lại ngôn ngữ hoặc cú pháp.');
    } finally {
      setIsFormatting(false);
    }
  };

  return (
    <div className="relative flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden rounded-lg border border-border/60 bg-[#1e1e1e] shadow-[0_0_0_1px_rgba(255,255,255,0.02)]" onPaste={handlePaste}>
      <div className="flex h-10 items-center justify-between gap-2 border-b border-white/10 bg-white/[0.03] px-2.5 backdrop-blur-sm">
        <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden whitespace-nowrap">
          <Badge variant={isMounted && isConnected ? 'default' : 'outline'} className="h-5 gap-1 rounded-full px-2 text-[10px] bg-emerald-500/15 text-emerald-200 border-emerald-400/20">
            <span className={cn('h-1.5 w-1.5 rounded-full', isMounted && isConnected ? 'bg-emerald-400' : 'bg-amber-400')} />
            {isMounted ? (isConnected ? 'Live' : 'Connecting') : 'Syncing'}
          </Badge>
          <Badge variant="outline" className="h-5 gap-1 rounded-full px-2 text-[10px] border-white/10 bg-white/5 text-white/80">
            <Users className="h-2.5 w-2.5" />
            {isMounted ? `${collaboratorCount} online` : '0 online'}
          </Badge>
          {isMounted && roomId && (
            <Badge variant="outline" className="h-5 gap-1 rounded-full px-2 text-[10px] border-white/10 bg-white/5 text-white/80">
              Room {roomId.slice(-4)}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {isMounted && lastSyncedAt && (
            <span className="hidden text-[10px] text-white/55 md:inline-flex">
              {new Date(lastSyncedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            className="border-white/10 bg-white/5 text-white/85 hover:bg-white/10"
            onClick={copyInviteLink}
            disabled={!isMounted || !roomId}
            title="Copy invite link"
          >
            <Link2 className="h-3.5 w-3.5" />
          </Button>
          {isMounted && ['javascript', 'typescript', 'json', 'html', 'css'].includes(language) && (
            <Button
              variant="secondary"
              size="icon-sm"
              className="bg-white/10 text-white hover:bg-white/15"
              onClick={formatCode}
              disabled={isFormatting}
              title="Format Code"
            >
              {isFormatting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
            </Button>
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1">
        <CodeMirror
          value={code}
          height="100%"
          theme={vscodeDark}
          extensions={getExtensions()}
          onChange={(value) => setCode(value)}
          className="text-sm font-mono h-full"
          basicSetup={{
            lineNumbers: true,
            foldGutter: true,
            highlightActiveLine: true,
            dropCursor: true,
            allowMultipleSelections: true,
            indentOnInput: true,
          }}
        />
      </div>
      {formatError && (
        <div className="absolute bottom-2 left-3 z-10 rounded bg-red-500/15 px-2 py-1 text-[10px] text-red-200 border border-red-400/30">
          {formatError}
        </div>
      )}
    </div>
  );
}
