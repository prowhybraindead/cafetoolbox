export type JsonValidationSuccess = {
  valid: true;
  value: unknown;
  formatted: string;
};

export type JsonValidationFailure = {
  valid: false;
  message: string;
  position: number | null;
  line: number;
  column: number;
  lineText: string;
};

export type JsonValidationResult = JsonValidationSuccess | JsonValidationFailure;

const ERROR_POSITION_PATTERNS = [
  /position\s+(\d+)/i,
  /line\s+(\d+)\s+column\s+(\d+)/i,
  /at\s+line\s+(\d+)\s+column\s+(\d+)/i,
];

export const formatJson = (source: string): string => {
  const parsed = JSON.parse(source);
  return JSON.stringify(parsed, null, 2);
};

export const getLineColumnFromPosition = (source: string, position: number): { line: number; column: number; lineText: string } => {
  const safePosition = Number.isFinite(position) ? Math.max(0, Math.min(position, source.length)) : 0;
  const before = source.slice(0, safePosition);
  const line = before.split('\n').length;
  const lastLineBreak = before.lastIndexOf('\n');
  const column = safePosition - (lastLineBreak + 1) + 1;
  const lineText = source.split('\n')[line - 1] ?? '';
  return { line, column, lineText };
};

const extractFailurePosition = (message: string): { position: number | null; line: number | null; column: number | null } => {
  const positionMatch = message.match(ERROR_POSITION_PATTERNS[0]);
  if (positionMatch?.[1]) {
    return { position: Number(positionMatch[1]), line: null, column: null };
  }

  const lineColumnMatch = message.match(ERROR_POSITION_PATTERNS[1]) || message.match(ERROR_POSITION_PATTERNS[2]);
  if (lineColumnMatch?.[1] && lineColumnMatch?.[2]) {
    return { position: null, line: Number(lineColumnMatch[1]), column: Number(lineColumnMatch[2]) };
  }

  return { position: null, line: null, column: null };
};

export const validateJson = (source: string): JsonValidationResult => {
  try {
    const value = JSON.parse(source);
    return {
      valid: true,
      value,
      formatted: JSON.stringify(value, null, 2),
    };
  } catch (error) {
    const rawMessage = error instanceof Error ? error.message : 'Invalid JSON.';
    const extracted = extractFailurePosition(rawMessage);

    let line = extracted.line ?? 1;
    let column = extracted.column ?? 1;
    let lineText = source.split('\n')[0] ?? '';

    if (extracted.position !== null) {
      const coords = getLineColumnFromPosition(source, extracted.position);
      line = coords.line;
      column = coords.column;
      lineText = coords.lineText;
    } else if (extracted.line !== null && extracted.column !== null) {
      line = extracted.line;
      column = extracted.column;
      lineText = source.split('\n')[Math.max(0, line - 1)] ?? '';
    }

    return {
      valid: false,
      message: rawMessage,
      position: extracted.position,
      line,
      column,
      lineText,
    };
  }
};

export const buildJsonCaret = (column: number): string => `${' '.repeat(Math.max(0, column - 1))}^`;

export const buildJsonErrorFrame = (source: string, failure: JsonValidationFailure): string => {
  const lines = source.split('\n');
  const index = Math.max(0, failure.line - 1);
  const previous = lines[index - 1];
  const current = lines[index] ?? failure.lineText;
  const next = lines[index + 1];

  return [
    previous ? `${failure.line - 1}: ${previous}` : null,
    `${failure.line}: ${current}`,
    `   ${buildJsonCaret(failure.column)}`,
    next ? `${failure.line + 1}: ${next}` : null,
  ]
    .filter(Boolean)
    .join('\n');
};