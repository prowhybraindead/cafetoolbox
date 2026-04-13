'use client';

import React, { useState, useCallback, useEffect } from 'react';
import {
  parseJWT,
  validateJWT,
  formatTimestamp,
  prettyJSON,
  copyToClipboard,
  type DecodedJWT,
  type JWTValidation,
} from '../lib/jwt-utils';
import { JsonHighlighter } from './json-highlighter';

/* ─── Copy Button ─── */
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

/* ─── Claims Badges ─── */
function ClaimsBadges({ payload }: { payload: Record<string, unknown> }) {
  const now = Math.floor(Date.now() / 1000);
  const claims: { label: string; value: string; type: 'info' | 'warning' | 'success' }[] = [];

  if (typeof payload.iat === 'number') {
    claims.push({ label: 'iat', value: formatTimestamp(payload.iat), type: 'info' });
  }
  if (typeof payload.exp === 'number') {
    const isExpired = payload.exp < now;
    claims.push({
      label: 'exp',
      value: formatTimestamp(payload.exp),
      type: isExpired ? 'warning' : 'success',
    });
  }
  if (typeof payload.nbf === 'number') {
    claims.push({ label: 'nbf', value: formatTimestamp(payload.nbf), type: 'info' });
  }
  if (typeof payload.iss === 'string') {
    claims.push({ label: 'iss', value: payload.iss, type: 'info' });
  }
  if (typeof payload.sub === 'string') {
    claims.push({ label: 'sub', value: payload.sub, type: 'info' });
  }
  if (typeof payload.aud === 'string') {
    claims.push({ label: 'aud', value: payload.aud, type: 'info' });
  }

  if (claims.length === 0) return null;

  const colorMap = {
    info: 'bg-neonGhost text-charcoalMuted border-borderMain',
    warning: 'bg-red-50 text-red-600 border-red-200',
    success: 'bg-neonGhostMid text-neon border-neon/30',
  };

  return (
    <div className="flex flex-wrap gap-2">
      {claims.map((c) => (
        <span
          key={c.label}
          className={`font-mono text-[11px] px-2 py-0.5 rounded border ${colorMap[c.type]}`}
        >
          {c.label}: {c.value}
        </span>
      ))}
    </div>
  );
}

/* ─── Status Badge ─── */
function StatusBadge({ validation }: { validation: JWTValidation }) {
  const config = {
    valid: { dot: 'bg-neon', text: 'text-neon', label: 'Valid' },
    expired: { dot: 'bg-yellow-400', text: 'text-yellow-600', label: 'Expired' },
    invalid: { dot: 'bg-red-400', text: 'text-red-500', label: 'Invalid' },
  };

  const { dot, text, label } = config[validation.status];

  return (
    <div className="flex items-center gap-2">
      <span className={`w-2 h-2 ${dot} rounded-full`} />
      <span className={`font-mono text-[11px] ${text} font-medium`}>{label}</span>
      {validation.message && validation.status !== 'valid' && (
        <span className="text-[11px] text-charcoalMuted">— {validation.message}</span>
      )}
    </div>
  );
}

/* ─── Section Card ─── */
function SectionCard({
  title,
  json,
  copyText,
}: {
  title: string;
  json: string;
  copyText: string;
}) {
  return (
    <div className="border border-borderMain rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 bg-white/50 border-b border-borderLight">
        <span className="font-mono text-xs font-semibold uppercase tracking-wider text-charcoalMuted">
          {title}
        </span>
        <CopyButton text={copyText} />
      </div>
      <div className="p-4 bg-white/30">
        <JsonHighlighter json={json} />
      </div>
    </div>
  );
}

/* ─── Decoder Component ─── */
export function JwtDecoder() {
  const [input, setInput] = useState('');
  const [decoded, setDecoded] = useState<DecodedJWT | null>(null);
  const [validation, setValidation] = useState<JWTValidation | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!input.trim()) {
      setDecoded(null);
      setValidation(null);
      setError(null);
      return;
    }

    try {
      const result = parseJWT(input);
      setDecoded(result);
      setError(null);
      try {
        setValidation(validateJWT(result));
      } catch {
        setValidation({ status: 'invalid', message: 'Cannot validate claims' });
      }
    } catch (e) {
      setDecoded(null);
      setValidation(null);
      setError(e instanceof Error ? e.message : 'Invalid token');
    }
  }, [input]);

  return (
    <div className="space-y-6">
      {/* Input */}
      <div>
        <label className="block text-sm font-semibold uppercase tracking-wider text-charcoalMuted mb-2">
          Paste JWT Token
        </label>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c"
          className="w-full h-32 px-4 py-3 rounded-lg border border-borderMain bg-white/50 font-mono text-sm text-charcoal placeholder:text-charcoalMuted/40 focus:outline-none focus:ring-2 focus:ring-neon/30 focus:border-neon resize-y transition-all"
          spellCheck={false}
        />
      </div>

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

      {/* Decoded Result */}
      {decoded && validation && (
        <div className="space-y-4">
          {/* Status */}
          <div className="flex items-center justify-between bg-white/50 border border-borderMain rounded-lg px-4 py-3">
            <StatusBadge validation={validation} />
            <CopyButton text={input.trim()} label="Copy Token" />
          </div>

          {/* Claims */}
          <ClaimsBadges payload={decoded.payload} />

          {/* Header */}
          <SectionCard
            title="Header"
            json={prettyJSON(decoded.header)}
            copyText={prettyJSON(decoded.header)}
          />

          {/* Payload */}
          <SectionCard
            title="Payload"
            json={prettyJSON(decoded.payload)}
            copyText={prettyJSON(decoded.payload)}
          />

          {/* Signature */}
          <div className="border border-borderMain rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 bg-white/50 border-b border-borderLight">
              <span className="font-mono text-xs font-semibold uppercase tracking-wider text-charcoalMuted">
                Signature
              </span>
              <CopyButton text={decoded.raw.signature} label="Copy" />
            </div>
            <div className="p-4 bg-white/30">
              <p className="font-mono text-sm text-charcoalMuted break-all select-all">
                {decoded.raw.signature}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
