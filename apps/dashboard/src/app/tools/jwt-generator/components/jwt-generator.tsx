'use client';

import React, { useState, useCallback } from 'react';
import { SignJWT } from 'jose';
import {
  DEFAULT_PAYLOAD,
  DEFAULT_HEADER,
  copyToClipboard,
  parseJWT,
  validateJWT,
  prettyJSON,
  type JWTValidation,
} from '../lib/jwt-utils';
import { JsonHighlighter } from './json-highlighter';

type Algorithm = 'HS256' | 'HS384' | 'HS512' | 'RS256' | 'RS384' | 'RS512' | 'ES256' | 'ES384' | 'ES512' | 'PS256' | 'PS384' | 'PS512' | 'none';

const ALGORITHMS: { value: Algorithm; label: string; type: 'HMAC' | 'RSA' | 'EC' | 'none' }[] = [
  { value: 'HS256', label: 'HS256', type: 'HMAC' },
  { value: 'HS384', label: 'HS384', type: 'HMAC' },
  { value: 'HS512', label: 'HS512', type: 'HMAC' },
  { value: 'RS256', label: 'RS256', type: 'RSA' },
  { value: 'RS384', label: 'RS384', type: 'RSA' },
  { value: 'RS512', label: 'RS512', type: 'RSA' },
  { value: 'ES256', label: 'ES256', type: 'EC' },
  { value: 'ES384', label: 'ES384', type: 'EC' },
  { value: 'ES512', label: 'ES512', type: 'EC' },
  { value: 'none', label: 'none (insecure)', type: 'none' },
];

const EXP_OPTIONS = [
  { label: '+1 giờ', seconds: 3600 },
  { label: '+6 giờ', seconds: 21600 },
  { label: '+1 ngày', seconds: 86400 },
  { label: '+7 ngày', seconds: 604800 },
  { label: '+30 ngày', seconds: 2592000 },
];

function CopyButton({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [text]);

  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1.5 text-xs font-mono text-charcoalMuted hover:text-neon transition-colors px-2 py-1 rounded border border-borderMain hover:border-neon"
    >
      {copied ? (
        <>
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6 9 17l-5-5" />
          </svg>
          Copied!
        </>
      ) : (
        <>
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
          {label}
        </>
      )}
    </button>
  );
}

export function JwtGenerator() {
  const [algorithm, setAlgorithm] = useState<Algorithm>('HS256');
  const [secret, setSecret] = useState('your-256-bit-secret');
  const [payloadStr, setPayloadStr] = useState(JSON.stringify(DEFAULT_PAYLOAD, null, 2));
  const [generatedToken, setGeneratedToken] = useState('');
  const [validation, setValidation] = useState<JWTValidation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const selectedAlg = ALGORITHMS.find((a) => a.value === algorithm)!;
  const needsSecret = selectedAlg.type === 'HMAC';
  const needsKey = selectedAlg.type === 'RSA' || selectedAlg.type === 'EC';

  const addClaim = useCallback(
    (claim: string, value: unknown) => {
      try {
        const payload = JSON.parse(payloadStr);
        payload[claim] = value;
        setPayloadStr(JSON.stringify(payload, null, 2));
      } catch {
        // ignore parse error
      }
    },
    [payloadStr]
  );

  const handleGenerate = useCallback(async () => {
    setError(null);
    setGeneratedToken('');
    setValidation(null);
    setIsGenerating(true);

    try {
      let payload: Record<string, unknown>;
      try {
        payload = JSON.parse(payloadStr);
      } catch {
        throw new Error('Payload JSON không hợp lệ');
      }

      if (algorithm === 'none') {
        // Manual encoding for alg:none
        const header = { alg: 'none', typ: 'JWT' };
        const headerB64 = btoa(JSON.stringify(header))
          .replace(/=/g, '')
          .replace(/\+/g, '-')
          .replace(/\//g, '_');
        const payloadB64 = btoa(JSON.stringify(payload))
          .replace(/=/g, '')
          .replace(/\+/g, '-')
          .replace(/\//g, '_');
        const token = `${headerB64}.${payloadB64}.`;
        setGeneratedToken(token);
        const decoded = parseJWT(token);
        setValidation(validateJWT(decoded));
        return;
      }

      if (needsKey) {
        throw new Error(`Thuật toán ${algorithm} yêu cầu private key (PEM). Hiện chỉ hỗ trợ HMAC & none trên browser.`);
      }

      if (!secret.trim()) {
        throw new Error('Vui lòng nhập Secret Key');
      }

      // Encode secret as Uint8Array
      const encoder = new TextEncoder();
      const secretBytes = encoder.encode(secret);

      const token = await new SignJWT(payload as Record<string, string | number | boolean>)
        .setProtectedHeader({ alg: algorithm } as { alg: string })
        .sign(secretBytes);

      setGeneratedToken(token);

      // Validate the generated token structure
      try {
        const decoded = parseJWT(token);
        setValidation(validateJWT(decoded));
      } catch {
        setValidation({ status: 'valid', message: 'Token đã được tạo thành công' });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Lỗi không xác định');
    } finally {
      setIsGenerating(false);
    }
  }, [algorithm, secret, payloadStr, needsKey]);

  return (
    <div className="space-y-6">
      {/* Algorithm */}
      <div>
        <label className="block text-sm font-semibold uppercase tracking-wider text-charcoalMuted mb-2">
          Algorithm
        </label>
        <select
          value={algorithm}
          onChange={(e) => setAlgorithm(e.target.value as Algorithm)}
          className="w-full md:w-auto px-4 py-2.5 rounded-lg border border-borderMain bg-white/50 font-mono text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-neon/30 focus:border-neon transition-all cursor-pointer"
        >
          {ALGORITHMS.map((alg) => (
            <option key={alg.value} value={alg.value}>
              {alg.label} {alg.type !== 'none' ? `(${alg.type})` : ''}
            </option>
          ))}
        </select>
      </div>

      {/* Secret / Key */}
      {(needsSecret || needsKey) && (
        <div>
          <label className="block text-sm font-semibold uppercase tracking-wider text-charcoalMuted mb-2">
            {needsSecret ? 'Secret Key' : 'Private Key (PEM)'}
          </label>
          {needsKey ? (
            <textarea
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              placeholder="-----BEGIN PRIVATE KEY-----&#10;...&#10;-----END PRIVATE KEY-----"
              className="w-full h-32 px-4 py-3 rounded-lg border border-borderMain bg-white/50 font-mono text-sm text-charcoal placeholder:text-charcoalMuted/40 focus:outline-none focus:ring-2 focus:ring-neon/30 focus:border-neon resize-y transition-all"
              spellCheck={false}
            />
          ) : (
            <input
              type="text"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              placeholder="your-256-bit-secret"
              className="w-full px-4 py-2.5 rounded-lg border border-borderMain bg-white/50 font-mono text-sm text-charcoal placeholder:text-charcoalMuted/40 focus:outline-none focus:ring-2 focus:ring-neon/30 focus:border-neon transition-all"
              spellCheck={false}
            />
          )}
        </div>
      )}

      {/* Payload */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-semibold uppercase tracking-wider text-charcoalMuted">
            Payload (JSON)
          </label>
          <span className="font-mono text-[10px] text-charcoalMuted/50 border border-borderMain px-2 py-0.5 rounded">
            JSON
          </span>
        </div>
        <textarea
          value={payloadStr}
          onChange={(e) => setPayloadStr(e.target.value)}
          className="w-full h-48 px-4 py-3 rounded-lg border border-borderMain bg-white/50 font-mono text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-neon/30 focus:border-neon resize-y transition-all"
          spellCheck={false}
        />
      </div>

      {/* Quick Claims */}
      <div>
        <label className="block text-sm font-semibold uppercase tracking-wider text-charcoalMuted mb-3">
          Quick Add Claims
        </label>
        <div className="flex flex-wrap gap-2">
          {/* Exp claims */}
          {EXP_OPTIONS.map((opt) => {
            const expValue = Math.floor(Date.now() / 1000) + opt.seconds;
            return (
              <button
                key={opt.label}
                onClick={() => addClaim('exp', expValue)}
                className="text-[11px] font-mono border border-borderMain px-2.5 py-1 rounded text-charcoalMuted cursor-default hover:bg-neon hover:text-charcoal hover:border-neon transition-all"
              >
                exp {opt.label}
              </button>
            );
          })}
          <button
            onClick={() => addClaim('iat', Math.floor(Date.now() / 1000))}
            className="text-[11px] font-mono border border-borderMain px-2.5 py-1 rounded text-charcoalMuted cursor-default hover:bg-neon hover:text-charcoal hover:border-neon transition-all"
          >
            iat now
          </button>
          <button
            onClick={() => addClaim('iss', 'cafetoolbox')}
            className="text-[11px] font-mono border border-borderMain px-2.5 py-1 rounded text-charcoalMuted cursor-default hover:bg-neon hover:text-charcoal hover:border-neon transition-all"
          >
            iss cafetoolbox
          </button>
          <button
            onClick={() => addClaim('sub', 'user-123')}
            className="text-[11px] font-mono border border-borderMain px-2.5 py-1 rounded text-charcoalMuted cursor-default hover:bg-neon hover:text-charcoal hover:border-neon transition-all"
          >
            sub user-123
          </button>
          <button
            onClick={() => addClaim('aud', 'api.example.com')}
            className="text-[11px] font-mono border border-borderMain px-2.5 py-1 rounded text-charcoalMuted cursor-default hover:bg-neon hover:text-charcoal hover:border-neon transition-all"
          >
            aud api
          </button>
        </div>
      </div>

      {/* Generate Button */}
      <button
        onClick={handleGenerate}
        disabled={isGenerating || needsKey}
        className="neon-btn border border-charcoal text-charcoal font-medium px-6 py-3 rounded-lg text-sm w-full md:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span className="flex items-center gap-2">
          {isGenerating ? (
            <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
          ) : (
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0 3 3L22 7l-3-3m-3.5 3.5L19 4" />
            </svg>
          )}
          {isGenerating ? 'Đang tạo...' : 'Generate JWT'}
        </span>
      </button>

      {needsKey && (
        <p className="text-xs text-charcoalMuted">
          Thuật toán RSA/EC yêu cầu private key — hiện chỉ hỗ trợ HMAC & none trên browser.
        </p>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          <svg className="w-5 h-5 text-red-500 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="m15 9-6 6" />
            <path d="m9 9 6 6" />
          </svg>
          <p className="text-sm text-red-600 font-medium">{error}</p>
        </div>
      )}

      {/* Generated Token */}
      {generatedToken && (
        <div className="space-y-4">
          {/* Status */}
          {validation && (
            <div className="flex items-center gap-2 bg-white/50 border border-borderMain rounded-lg px-4 py-3">
              <span
                className={`w-2 h-2 rounded-full ${
                  validation.status === 'valid'
                    ? 'bg-neon'
                    : validation.status === 'expired'
                    ? 'bg-yellow-400'
                    : 'bg-red-400'
                }`}
              />
              <span
                className={`font-mono text-[11px] font-medium ${
                  validation.status === 'valid'
                    ? 'text-neon'
                    : validation.status === 'expired'
                    ? 'text-yellow-600'
                    : 'text-red-500'
                }`}
              >
                {validation.status === 'valid' ? 'Token hợp lệ' : validation.message}
              </span>
            </div>
          )}

          {/* Token Display */}
          <div className="border border-borderMain rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 bg-white/50 border-b border-borderLight">
              <span className="font-mono text-xs font-semibold uppercase tracking-wider text-charcoalMuted">
                Generated Token
              </span>
              <CopyButton text={generatedToken} label="Copy Token" />
            </div>
            <div className="p-4 bg-white/30">
              <p className="font-mono text-sm text-charcoal break-all select-all leading-relaxed">
                {generatedToken}
              </p>
            </div>
          </div>

          {/* Decoded View */}
          {(() => {
            try {
              const decoded = parseJWT(generatedToken);
              return (
                <div className="space-y-3">
                  <div className="border border-borderMain rounded-lg overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-2 bg-white/50 border-b border-borderLight">
                      <span className="font-mono text-xs font-semibold uppercase tracking-wider text-charcoalMuted">
                        Decoded Header
                      </span>
                      <CopyButton text={prettyJSON(decoded.header)} />
                    </div>
                    <div className="p-4 bg-white/30">
                      <JsonHighlighter json={prettyJSON(decoded.header)} />
                    </div>
                  </div>
                  <div className="border border-borderMain rounded-lg overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-2 bg-white/50 border-b border-borderLight">
                      <span className="font-mono text-xs font-semibold uppercase tracking-wider text-charcoalMuted">
                        Decoded Payload
                      </span>
                      <CopyButton text={prettyJSON(decoded.payload)} />
                    </div>
                    <div className="p-4 bg-white/30">
                      <JsonHighlighter json={prettyJSON(decoded.payload)} />
                    </div>
                  </div>
                </div>
              );
            } catch {
              return null;
            }
          })()}
        </div>
      )}
    </div>
  );
}
