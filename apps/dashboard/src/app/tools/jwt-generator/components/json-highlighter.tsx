'use client';

import React from 'react';

interface JsonHighlighterProps {
  json: string;
  className?: string;
}

/**
 * Syntax highlight JSON by wrapping tokens in colored spans
 * Follows DESIGN.md — charcoal (keys), neon-green (strings), charcoalMuted (punctuation/numbers)
 */
export function JsonHighlighter({ json, className = '' }: JsonHighlighterProps) {
  const highlighted = React.useMemo(() => {
    // Tokenize and colorize
    const html = json.replace(
      /("(?:\\.|[^"\\])*")\s*:/g,
      '<span class="text-charcoal font-semibold">$1</span>:' // keys
    ).replace(
      /:\s*("(?:\\.|[^"\\])*")/g,
      ': <span class="text-neon">$1</span>' // string values
    ).replace(
      /:\s*(\d+\.?\d*)/g,
      ': <span class="text-blue-500">$1</span>' // numbers
    ).replace(
      /:\s*(true|false)/g,
      ': <span class="text-yellow-600 font-medium">$1</span>' // booleans
    ).replace(
      /:\s*(null)/g,
      ': <span class="text-charcoalMuted italic">$1</span>' // null
    );

    return html;
  }, [json]);

  return (
    <pre
      className={`font-mono text-sm leading-relaxed whitespace-pre-wrap break-all ${className}`}
      dangerouslySetInnerHTML={{ __html: highlighted }}
    />
  );
}
