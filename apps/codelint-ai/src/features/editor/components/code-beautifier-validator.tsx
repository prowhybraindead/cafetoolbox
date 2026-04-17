'use client';

import React from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { css } from '@codemirror/lang-css';
import { html } from '@codemirror/lang-html';
import { javascript } from '@codemirror/lang-javascript';
import { json } from '@codemirror/lang-json';
import { sql } from '@codemirror/lang-sql';
import { xml } from '@codemirror/lang-xml';
import { vscodeDark } from '@uiw/codemirror-theme-vscode';
import { GoogleGenAI } from '@google/genai';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { formatCodeSnippet } from '@/lib/format-code';
import { buildJsonErrorFrame, validateJson } from '@/lib/json-validator';
import { useEditorStore } from '@/features/editor/stores';
import type { EditorLanguage } from '@/features/editor/stores';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ClipboardPaste,
  Copy,
  FileCode2,
  Languages,
  Loader2,
  Sparkles,
  Wand2,
} from 'lucide-react';

type BeautifierLanguage = Extract<EditorLanguage, 'javascript' | 'typescript' | 'json' | 'xml' | 'html' | 'css' | 'sql'>;

type JsonAiPayload = {
  explanation: string;
  corrected_json?: string;
};

const LANGUAGE_OPTIONS: Array<{ value: BeautifierLanguage; label: string }> = [
  { value: 'json', label: 'JSON' },
  { value: 'html', label: 'HTML' },
  { value: 'css', label: 'CSS' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'xml', label: 'XML' },
  { value: 'sql', label: 'SQL' },
];

const getExtensions = (language: BeautifierLanguage) => {
  switch (language) {
    case 'javascript':
      return [javascript({ jsx: true, typescript: false })];
    case 'typescript':
      return [javascript({ jsx: true, typescript: true })];
    case 'json':
      return [json()];
    case 'xml':
      return [xml()];
    case 'html':
      return [html()];
    case 'css':
      return [css()];
    case 'sql':
      return [sql()];
    default:
      return [javascript({ jsx: true, typescript: true })];
  }
};

const getGeminiClient = () => {
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({ apiKey });
};

const readClipboardText = async (): Promise<string> => {
  try {
    if (navigator.clipboard && navigator.clipboard.readText) {
      return await navigator.clipboard.readText();
    }
  } catch (error) {
    console.warn('Clipboard read failed:', error);
  }
  return '';
};

const parseJsonAiPayload = (raw: string): JsonAiPayload | null => {
  const trimmed = raw.trim();
  const codeBlockMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const body = codeBlockMatch ? codeBlockMatch[1] : trimmed;
  const firstBrace = body.indexOf('{');
  const lastBrace = body.lastIndexOf('}');
  const candidate = firstBrace >= 0 && lastBrace > firstBrace ? body.slice(firstBrace, lastBrace + 1) : body;

  try {
    const parsed = JSON.parse(candidate);
    return {
      explanation: String(parsed.explanation || parsed.message || '').trim(),
      corrected_json: typeof parsed.corrected_json === 'string' ? parsed.corrected_json : undefined,
    };
  } catch {
    return null;
  }
};

export function CodeBeautifierValidator() {
  const { code: editorCode, setCode: setEditorCode, language: editorLanguage, setLanguage: setEditorLanguage } = useEditorStore();
  const [activeTab, setActiveTab] = React.useState<'beautify' | 'validate'>('beautify');
  const [language, setLanguage] = React.useState<BeautifierLanguage>('json');
  const [sourceCode, setSourceCode] = React.useState('');
  const [formattedCode, setFormattedCode] = React.useState('');
  const [isFormatting, setIsFormatting] = React.useState(false);
  const [isValidating, setIsValidating] = React.useState(false);
  const [validationError, setValidationError] = React.useState<string | null>(null);
  const [validationSuccess, setValidationSuccess] = React.useState<string | null>(null);
  const [jsonFrame, setJsonFrame] = React.useState('');
  const [jsonAiExplanation, setJsonAiExplanation] = React.useState('');
  const [jsonAiFix, setJsonAiFix] = React.useState('');
  const [copyLabel, setCopyLabel] = React.useState('Copy');

  React.useEffect(() => {
    if (LANGUAGE_OPTIONS.some((option) => option.value === editorLanguage)) {
      setLanguage(editorLanguage as BeautifierLanguage);
    }
  }, [editorLanguage]);

  React.useEffect(() => {
    setFormattedCode('');
  }, [language]);

  React.useEffect(() => {
    if (!sourceCode) {
      setSourceCode(editorCode);
    }
  }, [editorCode, sourceCode]);

  const copyToClipboard = async (text: string, label = 'Copied') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopyLabel(label);
      window.setTimeout(() => setCopyLabel('Copy'), 1600);
    } catch (error) {
      console.error('Failed to copy to clipboard', error);
    }
  };

  const importFromEditor = () => {
    setSourceCode(editorCode);
    setFormattedCode('');
    setValidationError(null);
    setValidationSuccess(null);
    setJsonFrame('');
    setJsonAiExplanation('');
    setJsonAiFix('');
    if (LANGUAGE_OPTIONS.some((option) => option.value === editorLanguage)) {
      setLanguage(editorLanguage as BeautifierLanguage);
    }
  };

  const importFromClipboard = async () => {
    try {
      const clipboardText = await readClipboardText();
      if (!clipboardText) {
        setValidationError('Vui lòng sao chép code vào clipboard trước.');
        return;
      }
      setSourceCode(clipboardText);
      setFormattedCode('');
      setValidationError(null);
      setValidationSuccess(null);
      setJsonFrame('');
      setJsonAiExplanation('');
      setJsonAiFix('');
    } catch (error) {
      console.error('Failed to read clipboard', error);
      setValidationError('Không thể đọc clipboard. Vui lòng thử lại.');
      setValidationSuccess(null);
      setJsonFrame('');
      setJsonAiExplanation('');
      setJsonAiFix('');
    }
  };

  const beautifyCurrentSource = async () => {
    if (!sourceCode.trim()) return;

    setIsFormatting(true);
    try {
      const formatted = await formatCodeSnippet(sourceCode, language);
      setFormattedCode(formatted);
      setValidationSuccess('Format hoàn tất.');
      setValidationError(null);
    } catch (error) {
      setValidationError('Không thể định dạng đoạn mã này. Hãy kiểm tra lại cú pháp hoặc ngôn ngữ.');
      console.error('Beautify error', error);
    } finally {
      setIsFormatting(false);
    }
  };

  const validateJsonSource = React.useCallback(async (value: string) => {
    if (!value.trim()) {
      setValidationError('Hãy dán JSON cần kiểm tra.');
      setValidationSuccess(null);
      setJsonFrame('');
      setJsonAiExplanation('');
      setJsonAiFix('');
      return;
    }

    setIsValidating(true);
    try {
      const result = validateJson(value);
      if (result.valid) {
        setValidationError(null);
        setValidationSuccess('JSON hợp lệ.');
        setJsonFrame('');
        setJsonAiExplanation('');
        setJsonAiFix(result.formatted);
        setFormattedCode(result.formatted);
        return;
      }

      const frame = buildJsonErrorFrame(value, result);
      setValidationError(`JSON không hợp lệ tại dòng ${result.line}, cột ${result.column}.`);
      setValidationSuccess(null);
      setJsonFrame(frame);
      setJsonAiFix('');

      const ai = getGeminiClient();
      if (!ai) {
        setJsonAiExplanation('Thiếu dấu / ký tự cú pháp JSON ở vị trí báo lỗi. Hãy sửa theo dòng và cột hiển thị phía trên.');
        setJsonAiFix('');
        return;
      }

      const prompt = `
Bạn là trợ lý sửa JSON.
Hãy giải thích lỗi bằng tiếng Việt tự nhiên, ngắn gọn, rõ ràng.
Hãy trả về JSON thuần với cấu trúc:
{
  "explanation": "...",
  "corrected_json": "..."
}

Yêu cầu:
- explanation: nêu đúng lỗi cú pháp và vị trí dòng/cột nếu có.
- corrected_json: chỉ trả về JSON hợp lệ đã sửa nếu có thể, giữ nguyên ý nghĩa dữ liệu.
- Không thêm markdown ngoài JSON.

JSON gốc:
${value}

Thông báo lỗi máy phân tích:
${result.message}

Vị trí lỗi:
Line ${result.line}, Column ${result.column}

Khung lỗi:
${frame}
`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.2,
        },
      });

      const payload = response.text ? parseJsonAiPayload(response.text) : null;
      if (payload?.explanation) {
        setJsonAiExplanation(payload.explanation);
      } else {
        setJsonAiExplanation('Bạn đang có lỗi cú pháp JSON. Hãy kiểm tra lại dấu phẩy, dấu ngoặc kép và dấu ngoặc nhọn ở dòng được đánh dấu.');
      }

      if (payload?.corrected_json) {
        setJsonAiFix(payload.corrected_json);
      } else {
        setJsonAiFix('');
      }
    } catch (error) {
      console.error('JSON validation error', error);
      setValidationError('Đã xảy ra lỗi khi kiểm tra JSON.');
      setValidationSuccess(null);
    } finally {
      setIsValidating(false);
    }
  }, []);

  React.useEffect(() => {
    if (activeTab !== 'validate') return;

    const handle = window.setTimeout(() => {
      void validateJsonSource(sourceCode);
    }, 450);

    return () => window.clearTimeout(handle);
  }, [activeTab, sourceCode, validateJsonSource]);

  const mainOutput = formattedCode || sourceCode;
  const beautifierStatus = language === 'json' ? 'JSON' : language.toUpperCase();

  return (
    <Card className="overflow-hidden border-border/60 bg-card/95 shadow-[0_20px_80px_rgba(15,23,42,0.12)] flex flex-col max-h-[360px]">
      <div className="flex flex-col gap-2 border-b border-border/60 bg-muted/20 p-3 flex-shrink-0">
<div className="flex flex-wrap items-center justify-between gap-2">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5">
                <Badge variant="secondary" className="gap-1.5 rounded-full px-2 py-0.5 text-[9px] uppercase tracking-[0.2em]">
                  <FileCode2 className="h-2.5 w-2.5" />
                  Beautify
                </Badge>
                <Badge variant="outline" className="gap-1.5 rounded-full px-2 py-0.5 text-[9px] uppercase tracking-[0.2em]">
                  <CheckCircle2 className="h-2.5 w-2.5" />
                  Validate
                </Badge>
              </div>
              <h2 className="text-sm font-semibold leading-tight">Code Beautifier & JSON Validator</h2>
            </div>

            <div className="flex items-center gap-1">
              <Button type="button" variant="outline" size="sm" className="h-7 gap-1 text-[11px]" onClick={importFromClipboard}>
                <ClipboardPaste className="h-3 w-3" />
                Paste
              </Button>
              <Button type="button" variant="outline" size="sm" className="h-7 gap-1 text-[11px]" onClick={importFromEditor}>
                <Languages className="h-3 w-3" />
                Load
              </Button>
            </div>
          </div>

        <div className="flex items-center gap-2">
          <Select value={language} onValueChange={(value) => setLanguage(value as BeautifierLanguage)}>
            <SelectTrigger size="sm" className="w-32 h-7 text-xs">
              <SelectValue placeholder="Language" />
            </SelectTrigger>
            <SelectContent>
              {LANGUAGE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value} className="text-xs">
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'beautify' | 'validate')} className="flex-1">
            <TabsList className="bg-background/80 p-0.5 h-7">
              <TabsTrigger value="beautify" className="gap-1 text-xs py-1 px-2 h-6">
                <Wand2 className="h-3 w-3" />
                Beautify
              </TabsTrigger>
              <TabsTrigger value="validate" className="gap-1 text-xs py-1 px-2 h-6">
                <AlertTriangle className="h-3 w-3" />
                Validate
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      <div className="flex flex-col gap-2 p-3 flex-1 overflow-y-auto min-h-0">
        <div className="space-y-2 flex flex-col min-h-0 flex-1">
          <div className="flex items-center justify-between gap-2 flex-shrink-0">
            <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              <span>Input</span>
              <Badge variant="outline" className="rounded-full px-1.5 py-0 text-[8px]">
                {beautifierStatus}
              </Badge>
            </div>
            <Button type="button" variant="ghost" size="sm" className="h-6 gap-1 text-[10px]" onClick={() => copyToClipboard(sourceCode, 'Copied')}>
              <Copy className="h-3 w-3" />
              Copy
            </Button>
          </div>

          <div className="overflow-hidden rounded-lg border border-border/60 bg-[#1e1e1e] shadow-sm flex-1">
            <CodeMirror
              value={sourceCode}
              theme={vscodeDark}
              height="100%"
              extensions={getExtensions(language)}
              onChange={(value) => {
                setSourceCode(value);
                setFormattedCode('');
                setValidationError(null);
                setValidationSuccess(null);
                setJsonFrame('');
                setJsonAiExplanation('');
                setJsonAiFix('');
              }}
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

          <div className="flex flex-wrap items-center gap-1.5 flex-shrink-0">
            <Button type="button" className="h-7 gap-1 text-xs" onClick={beautifyCurrentSource} disabled={isFormatting || !sourceCode.trim()}>
              {isFormatting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
              Beautify
            </Button>
            <Button type="button" variant="outline" className="h-7 gap-1 text-xs" onClick={() => copyToClipboard(mainOutput, 'Copied')} disabled={!mainOutput.trim()}>
              <Copy className="h-3 w-3" />
              Output
            </Button>
            <Button type="button" variant="secondary" className="h-7 gap-1 text-xs" onClick={() => setEditorCode(mainOutput)} disabled={!mainOutput.trim()}>
              Apply
            </Button>
          </div>
        </div>

        <div className="space-y-2 flex flex-col min-h-0 max-h-[140px]">
          {activeTab === 'beautify' ? (
            <div className="space-y-2 rounded-lg border border-border/60 bg-muted/20 p-3 flex flex-col min-h-0 h-full">
              <div className="flex items-center justify-between gap-2 flex-shrink-0">
                <h3 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Output</h3>
                <Button type="button" variant="outline" size="sm" className="h-6 gap-1 text-[10px]" onClick={() => copyToClipboard(mainOutput, 'Copied')} disabled={!mainOutput.trim()}>
                  <Copy className="h-3 w-3" />
                  Copy
                </Button>
              </div>
              <pre className="flex-1 overflow-auto whitespace-pre-wrap break-words rounded-lg border border-border/50 bg-background/80 p-2.5 text-xs leading-5 text-foreground min-h-0">
                <code>{mainOutput || 'Kết quả sẽ xuất hiện ở đây.'}</code>
              </pre>
            </div>
          ) : (
            <div className="space-y-2 rounded-lg border border-border/60 bg-muted/20 p-3 flex flex-col min-h-0 h-full overflow-y-auto">
              <div className="flex items-center justify-between gap-2 flex-shrink-0">
                <h3 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">JSON Validator</h3>
                <Button type="button" variant="outline" size="sm" className="h-6 gap-1 text-[10px]" onClick={() => void validateJsonSource(sourceCode)} disabled={isValidating}>
                  {isValidating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                  Validate
                </Button>
              </div>

              <div className={cn('rounded-lg border p-2 text-xs flex-shrink-0', validationError ? 'border-red-500/30 bg-red-500/10' : validationSuccess ? 'border-emerald-500/30 bg-emerald-500/10' : 'border-border/50 bg-background/60')}>
                {validationError ? validationError : validationSuccess || 'Nhập JSON để kiểm tra.'}
              </div>

              {validationError && jsonFrame && (
                <pre className="overflow-auto rounded-lg border border-border/50 bg-[#111827] p-2 text-xs leading-5 text-red-200 flex-shrink-0 max-h-[60px]">
                  <code>{jsonFrame}</code>
                </pre>
              )}

              {jsonAiExplanation && (
                <div className="rounded-lg border border-border/50 bg-background/80 p-2 text-xs leading-5 flex-shrink-0">
                  <p className="mb-1 text-[9px] font-bold uppercase tracking-widest text-muted-foreground">AI Giải thích</p>
                  <p className="line-clamp-2">{jsonAiExplanation}</p>
                </div>
              )}

              {jsonAiFix && (
                <div className="space-y-1 flex-shrink-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Sữa chữa</p>
                    <Button type="button" variant="outline" size="sm" className="h-6 gap-1 text-[10px]" onClick={() => copyToClipboard(jsonAiFix, 'Copied')}>
                      <Copy className="h-3 w-3" />
                      Copy
                    </Button>
                  </div>
                  <pre className="overflow-auto rounded-lg border border-border/50 bg-background/80 p-2 text-xs leading-5 max-h-[60px]">
                    <code>{jsonAiFix}</code>
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}