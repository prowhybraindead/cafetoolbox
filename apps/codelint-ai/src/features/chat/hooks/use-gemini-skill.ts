'use client';

import { useState } from 'react';
import { SKILL_PROMPTS, SYSTEM_INSTRUCTION } from '@/lib/ai-prompts';
import { useEditorStore } from '@/features/editor/stores';
import { AIAnalysisResponse } from '@/features/editor/types';
import { logUsageAction } from '@/lib/usage-actions';
import { GoogleGenAI } from '@google/genai';

const QUOTA_BLOCK_STORAGE_KEY = 'geminiQuotaBlockedUntil';
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

const formatCooldownMessage = (milliseconds: number): string => {
  const seconds = Math.max(1, Math.ceil(milliseconds / 1000));
  return `Bạn đã chạm giới hạn Gemini API. Vui lòng thử lại sau ${seconds}s hoặc nâng gói tại https://ai.google.dev/gemini-api/docs/rate-limits`;
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

const getGeminiClient = () => {
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("NEXT_PUBLIC_GEMINI_API_KEY is not set in the environment variables.");
  }
  return new GoogleGenAI({ apiKey });
};

export function useGeminiSkill() {
  const { 
    code, 
    skill, 
    language,
    isAnalyzing,
    setIsAnalyzing, 
    setAnalysisResult, 
    addHistoryEntry 
  } = useEditorStore();
  const [error, setError] = useState<string | null>(null);

  const analyzeCode = async () => {
    if (isAnalyzing) {
      return;
    }

    const blockedUntil = getPersistedQuotaBlockedUntil();
    const cooldownRemaining = blockedUntil - Date.now();
    if (cooldownRemaining > 0) {
      setError(formatCooldownMessage(cooldownRemaining));
      void logUsageAction({
        actionName: 'analysis_cooldown_blocked',
        actionSource: 'gemini_skill',
        language,
        skill,
        metadata: {
          cooldownRemainingMs: cooldownRemaining,
        },
      });
      return;
    }

    if (!code || code.trim().length < 10) {
      setError("Mã nguồn quá ngắn để phân tích.");
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    void logUsageAction({
      actionName: 'analysis_requested',
      actionSource: 'gemini_skill',
      language,
      skill,
      metadata: {
        codeLength: code.length,
      },
    });

    try {
      const ai = getGeminiClient();
      const skillPrompt = SKILL_PROMPTS[skill as keyof typeof SKILL_PROMPTS] || SKILL_PROMPTS.refactoring;
      
      const prompt = `
        Mode: ${skillPrompt}
        
        Code to analyze:
        \`\`\`
        ${code}
        \`\`\`
      `;

      const result = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          responseMimeType: "application/json",
          temperature: 0.1,
        }
      });

      let responseText = result.text;
      if (!responseText) {
        throw new Error("Không nhận được phản hồi từ AI.");
      }

      // Robust JSON extraction
      const extractJson = (text: string) => {
        // First, try to find content within markdown code blocks
        const markdownMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        const content = markdownMatch ? markdownMatch[1] : text;

        // Find the first '{' and match it with its corresponding '}'
        const firstOpen = content.indexOf('{');
        if (firstOpen === -1) return content;

        let depth = 0;
        let lastMatch = -1;
        for (let i = firstOpen; i < content.length; i++) {
          if (content[i] === '{') depth++;
          else if (content[i] === '}') {
            depth--;
            if (depth === 0) {
              lastMatch = i;
              break;
            }
          }
        }

        if (lastMatch !== -1) {
          return content.substring(firstOpen, lastMatch + 1);
        }
        return content;
      };

      const cleanJson = extractJson(responseText);

      try {
        const parsedResult: AIAnalysisResponse = JSON.parse(cleanJson.trim());
        setAnalysisResult(parsedResult);
        addHistoryEntry({
          action: 'analysis',
          skill,
          language,
          summary: parsedResult.diff_summary || `Analysis completed in ${skill} mode`,
          beforeCode: code,
          afterCode: parsedResult.fixed_code || code,
        });
        void logUsageAction({
          actionName: 'analysis_succeeded',
          actionSource: 'gemini_skill',
          language,
          skill,
          metadata: {
            hasFixedCode: Boolean(parsedResult.fixed_code),
            securityScore: parsedResult.security_score,
          },
        });
      } catch (parseErr) {
        console.error("JSON Parse Error:", parseErr, "Raw text:", responseText, "Cleaned JSON:", cleanJson);
        throw new Error("AI trả về định dạng không hợp lệ. Vui lòng thử lại.");
      }
    } catch (err: any) {
      if (isQuotaError(err)) {
        const retryDelayMs = parseRetryDelayMs(err) ?? parseRetryDelayMs(err?.message) ?? 30_000;
        setPersistedQuotaBlockedUntil(Date.now() + retryDelayMs);
        setError(formatCooldownMessage(retryDelayMs));
        console.warn('Gemini quota hit; requests are temporarily blocked.');
        void logUsageAction({
          actionName: 'analysis_quota_hit',
          actionSource: 'gemini_skill',
          language,
          skill,
          metadata: {
            retryDelayMs,
          },
        });
        return;
      }

      console.error("AI Analysis Error:", err);

      const errorMessage = err.message?.includes("API key not valid") 
        ? "Invalid Gemini API Key. Please check your API key in the AI Studio Settings/Secrets panel." 
        : err.message || "Đã xảy ra lỗi trong quá trình phân tích.";
      setError(errorMessage);
      void logUsageAction({
        actionName: 'analysis_failed',
        actionSource: 'gemini_skill',
        language,
        skill,
        metadata: {
          message: String(err?.message || 'Unknown error'),
        },
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  return { analyzeCode, error };
}
