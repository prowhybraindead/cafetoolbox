'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, Paperclip, X, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useEditorStore, ChatMessage, ChatSession } from '@/features/editor/stores';
import { cn } from '@/lib/utils';
import Markdown from 'react-markdown';
import { GoogleGenAI } from '@google/genai';

const QUOTA_BLOCK_STORAGE_KEY = 'geminiChatQuotaBlockedUntil';
let quotaBlockedUntil = 0;

const parseRetryDelayMs = (raw: unknown): number | null => {
  const text =
    typeof raw === 'string'
      ? raw
      : raw instanceof Error
        ? raw.message
        : (() => {
            try {
              return JSON.stringify(raw);
            } catch {
              return String(raw ?? '');
            }
          })();

  if (!text) return null;

  const retryInfoMatch = text.match(/"retryDelay"\s*:\s*"([\d.]+)s"/i);
  if (retryInfoMatch?.[1]) {
    return Math.ceil(Number(retryInfoMatch[1]) * 1000);
  }

  const messageMatch = text.match(/retry in\s+([\d.]+)s/i);
  if (messageMatch?.[1]) {
    return Math.ceil(Number(messageMatch[1]) * 1000);
  }

  return null;
};

const isQuotaError = (err: unknown): boolean => {
  const text =
    typeof err === 'string'
      ? err
      : err instanceof Error
        ? err.message
        : (() => {
            try {
              return JSON.stringify(err);
            } catch {
              return String(err ?? '');
            }
          })();

  return /resource_exhausted|quota exceeded|\"code\"\s*:\s*429/i.test(text);
};

const getPersistedQuotaBlockedUntil = (): number => {
  if (typeof window === 'undefined') return quotaBlockedUntil;

  if (quotaBlockedUntil > Date.now()) return quotaBlockedUntil;

  const raw = window.localStorage.getItem(QUOTA_BLOCK_STORAGE_KEY);
  const parsed = raw ? Number(raw) : 0;
  if (!Number.isFinite(parsed) || parsed <= Date.now()) {
    window.localStorage.removeItem(QUOTA_BLOCK_STORAGE_KEY);
    quotaBlockedUntil = 0;
    return 0;
  }

  quotaBlockedUntil = parsed;
  return parsed;
};

const setPersistedQuotaBlockedUntil = (blockedUntil: number) => {
  quotaBlockedUntil = blockedUntil;
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(QUOTA_BLOCK_STORAGE_KEY, String(blockedUntil));
};

const formatCooldownMessage = (milliseconds: number): string => {
  const seconds = Math.max(1, Math.ceil(milliseconds / 1000));
  return `Bạn đã chạm giới hạn Gemini API. Vui lòng thử lại sau ${seconds}s hoặc nâng gói tại https://ai.google.dev/gemini-api/docs/rate-limits`;
};

const getGeminiClient = () => {
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("NEXT_PUBLIC_GEMINI_API_KEY is not set in the environment variables.");
  }
  return new GoogleGenAI({ apiKey });
};

type UploadedChatFile = {
  id: string;
  name: string;
  size: number;
  content: string;
};

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

const readFileAsText = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(new Error('Cannot read file'));
    reader.readAsText(file);
  });

export function ChatBox() {
  const { 
    code, 
    language,
    skill,
    analysisResult,
    chatSessions,
    currentChatSessionId,
    addChatSession,
    updateChatSession,
    setCurrentChatSessionId
  } = useEditorStore();

  const currentSession = chatSessions.find(s => s.id === currentChatSessionId);
  const messages: ChatMessage[] = React.useMemo(() => currentSession?.messages || [
    {
      id: '1',
      role: 'assistant',
      content: 'Xin chào. Tôi có thể giúp bạn đọc code, refactor, giải thích logic, debug và đề xuất cải tiến theo skill bạn đang chọn.'
    }
  ], [currentSession?.messages]);

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedChatFile[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSend = async () => {
    if ((!input.trim() && uploadedFiles.length === 0) || isLoading) return;

    const attachmentBlock = uploadedFiles.length
      ? uploadedFiles
          .map((file) => `Nội dung file ${file.name}:\n\`\`\`\n${file.content}\n\`\`\``)
          .join('\n\n')
      : '';
    const composedUserContent = [input.trim(), attachmentBlock].filter(Boolean).join('\n\n');

    const cooldownRemaining = getPersistedQuotaBlockedUntil() - Date.now();
    if (cooldownRemaining > 0) {
      const quotaMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: formatCooldownMessage(cooldownRemaining)
      };

      const sessionId = currentChatSessionId;
      if (sessionId) {
        updateChatSession(sessionId, [...messages, quotaMessage]);
      }
      return;
    }

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: composedUserContent
    };

    let sessionId = currentChatSessionId;
    let newMessages = [...messages, userMessage];

    if (!sessionId) {
      sessionId = Date.now().toString();
      const newSession: ChatSession = {
        id: sessionId,
        title: (input.trim() || uploadedFiles[0]?.name || 'New chat').substring(0, 40),
        timestamp: Date.now(),
        messages: newMessages
      };
      addChatSession(newSession);
      setCurrentChatSessionId(sessionId);
    } else {
      updateChatSession(sessionId, newMessages);
    }

    setInput('');
    setUploadedFiles([]);
    setUploadError(null);
    setIsLoading(true);

    try {
      const ai = getGeminiClient();
      const codeContext = code?.trim()
        ? `\`\`\`${language}\n${code.slice(0, 4000)}\n\`\`\``
        : 'No code is currently available in the editor.';

      const lastAnalysisContext = analysisResult
        ? `
Latest analysis snapshot:
- analysis: ${String(analysisResult.analysis ?? '').slice(0, 600)}
- suggestions: ${Array.isArray(analysisResult.suggestions) ? analysisResult.suggestions.slice(0, 5).join('; ') : 'N/A'}
- security_score: ${analysisResult.security_score ?? 'N/A'}
`
        : 'No prior static analysis available.';

      const prompt = `
You are CodeLint AI Chat, an expert software engineering assistant.
Primary goals:
1) Explain code clearly.
2) Suggest practical refactors.
3) Help debug issues with minimal assumptions.
4) Keep answers concise and actionable.

Current skill mode: ${skill}
Current editor language: ${language}

Current editor code:
${codeContext}

${lastAnalysisContext}

User message:
${userMessage.content}

Response rules:
- Answer in Vietnamese.
- Use Markdown.
- If suggesting changes, include a short "Why" and an example patch/code block.
- If the request is ambiguous, ask one focused clarifying question.
`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          temperature: 0.7,
        }
      });
      
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.text || 'Xin lỗi, tôi không thể trả lời lúc này.'
      };

      updateChatSession(sessionId, [...newMessages, assistantMessage]);
    } catch (error: any) {
      if (isQuotaError(error)) {
        const retryDelayMs = parseRetryDelayMs(error) ?? parseRetryDelayMs(error?.message) ?? 30_000;
        setPersistedQuotaBlockedUntil(Date.now() + retryDelayMs);

        const quotaMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: formatCooldownMessage(retryDelayMs)
        };

        updateChatSession(sessionId, [...newMessages, quotaMessage]);
        console.warn('Gemini chat quota hit; requests are temporarily blocked.');
        return;
      }

      console.error("Chat Error:", error);
      const errorMessageText = error.message?.includes("API key not valid")
        ? "Invalid Gemini API Key. Please check your API key in the AI Studio Settings/Secrets panel."
        : error.message || 'Đã xảy ra lỗi khi kết nối với AI.';
        
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: errorMessageText
      };
      updateChatSession(sessionId, [...newMessages, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const maxSizeInBytes = 1024 * 1024; // 1MB
    const validFiles = files.filter((file) => file.size <= maxSizeInBytes);
    const oversizedFiles = files.filter((file) => file.size > maxSizeInBytes);

    if (validFiles.length === 0) {
      setUploadError('Tất cả file vượt quá 1MB. Vui lòng chọn file nhỏ hơn.');
      e.target.value = '';
      return;
    }

    try {
      const nextUploaded = await Promise.all(
        validFiles.map(async (file) => ({
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          name: file.name,
          size: file.size,
          content: await readFileAsText(file),
        }))
      );

      setUploadedFiles((prev) => [...prev, ...nextUploaded].slice(0, 5));
      setUploadError(
        oversizedFiles.length > 0
          ? `${oversizedFiles.length} file bị bỏ qua vì lớn hơn 1MB.`
          : null
      );
    } catch {
      setUploadError('Không thể đọc file. Vui lòng thử file text khác.');
    } finally {
      e.target.value = '';
    }
  };

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-3xl border border-border/70 bg-card/90 shadow-sm">
      <ScrollArea className="flex-1 min-h-0">
        <div className="flex flex-col gap-4 p-4">
          {messages.map((msg) => (
            <div 
              key={msg.id} 
              className={cn(
                "flex gap-3 max-w-[85%]",
                msg.role === 'user' ? "self-end flex-row-reverse" : "self-start"
              )}
            >
              <div className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                msg.role === 'user' ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              )}>
                {msg.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
              </div>
              <div className={cn(
                "overflow-hidden rounded-2xl p-3 text-sm",
                msg.role === 'user' 
                  ? "bg-primary text-primary-foreground rounded-tr-sm" 
                  : "rounded-tl-sm border border-border/70 bg-muted/40"
              )}>
                <div className="markdown-body text-sm overflow-x-auto max-w-full">
                  <Markdown>{msg.content}</Markdown>
                </div>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex gap-3 max-w-[85%] self-start">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <Bot className="h-4 w-4" />
              </div>
              <div className="flex items-center gap-2 rounded-2xl rounded-tl-sm border border-border/70 bg-muted/40 p-3">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                <span className="text-xs text-muted-foreground">AI đang suy nghĩ...</span>
              </div>
            </div>
          )}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>
      
      <div className="border-t border-border/70 bg-background/70 p-3">
        {uploadedFiles.length > 0 && (
          <div className="mb-2 flex flex-wrap items-center gap-2">
            {uploadedFiles.map((file) => (
              <div
                key={file.id}
                className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-card px-2.5 py-1 text-[11px]"
              >
                <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="max-w-[180px] truncate" title={file.name}>{file.name}</span>
                <span className="text-muted-foreground">({formatFileSize(file.size)})</span>
                <button
                  type="button"
                  className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                  onClick={() => setUploadedFiles((prev) => prev.filter((item) => item.id !== file.id))}
                  aria-label={`Remove ${file.name}`}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-[11px]"
              onClick={() => setUploadedFiles([])}
            >
              Clear files
            </Button>
          </div>
        )}
        <div className="flex items-center gap-2">
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            multiple
            accept=".txt,.md,.json,.js,.jsx,.ts,.tsx,.css,.html,.py,.java,.php,.rs,.sql,text/*,application/json"
            onChange={handleFileChange} 
          />
          <Button 
            variant="outline" 
            size="sm" 
            className="shrink-0 gap-1.5 rounded-full border-border/70" 
            title="Upload file"
            onClick={() => fileInputRef.current?.click()}
          >
            <Paperclip className="h-4 w-4" />
            Upload file
          </Button>
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Hỏi AI về refactor, giải thích code hoặc debug..."
            className="flex-1 rounded-full bg-background"
          />
          <Button 
            size="icon" 
            onClick={handleSend} 
            disabled={(!input.trim() && uploadedFiles.length === 0) || isLoading}
            className="shrink-0 rounded-full"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        {uploadError && <p className="mt-2 text-xs text-destructive">{uploadError}</p>}
      </div>
    </div>
  );
}
