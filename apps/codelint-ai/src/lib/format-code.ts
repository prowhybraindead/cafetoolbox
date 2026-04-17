import type { EditorLanguage } from '@/features/editor/stores';
import { format as formatSql } from 'sql-formatter';

type SupportedParser = 'babel' | 'typescript' | 'json' | 'html' | 'css';

type PrettierModule = typeof import('prettier/standalone');
type PrettierPlugins = Array<unknown>;

let prettierBundlePromise: Promise<{ prettier: PrettierModule; plugins: PrettierPlugins }> | null = null;

const HTML_START_REGEX = /^<!doctype\s+html/i;
const HTML_TAG_REGEX = /^<html[\s>]/i;
const XML_START_REGEX = /^<\?xml\b/i;

const formatXmlSnippet = (source: string): string => {
  const normalized = source.replace(/\r\n/g, '\n').trim();
  if (!normalized) return '';

  const tokens = normalized.match(/<[^>]+>|[^<]+/g) || [];
  let indentLevel = 0;
  const indentUnit = '  ';
  const lines: string[] = [];

  for (const token of tokens) {
    const trimmed = token.trim();
    if (!trimmed) continue;

    const isClosingTag = /^<\//.test(trimmed);
    const isOpeningTag = /^<[^!?/][^>]*>$/.test(trimmed) && !/\/>$/.test(trimmed);
    const isSelfClosingTag = /\/>$/.test(trimmed) || /^<\?/.test(trimmed) || /^<!/.test(trimmed);

    if (isClosingTag) {
      indentLevel = Math.max(0, indentLevel - 1);
    }

    const currentIndent = indentUnit.repeat(indentLevel);
    if (trimmed.startsWith('<') && trimmed.endsWith('>')) {
      lines.push(`${currentIndent}${trimmed}`);
    } else {
      lines.push(`${currentIndent}${trimmed}`);
    }

    if (!isClosingTag && isOpeningTag && !isSelfClosingTag) {
      indentLevel += 1;
    }
  }

  return lines.join('\n');
};

const formatJsonSnippet = (source: string): string => JSON.stringify(JSON.parse(source), null, 2);

function looksLikeHtml(code: string): boolean {
  const trimmed = code.trimStart();
  return HTML_START_REGEX.test(trimmed) || HTML_TAG_REGEX.test(trimmed);
}

function looksLikeXml(code: string): boolean {
  const trimmed = code.trimStart();
  return XML_START_REGEX.test(trimmed);
}

function parserFromLanguage(language: EditorLanguage): SupportedParser | null {
  switch (language) {
    case 'javascript':
      return 'babel';
    case 'typescript':
      return 'typescript';
    case 'json':
      return 'json';
    case 'html':
      return 'html';
    case 'css':
      return 'css';
    default:
      return null;
  }
}

function uniqueParsers(parsers: Array<SupportedParser | null>): SupportedParser[] {
  return parsers.filter((value): value is SupportedParser => Boolean(value)).filter((value, index, arr) => arr.indexOf(value) === index);
}

async function getPrettierBundle() {
  if (!prettierBundlePromise) {
    prettierBundlePromise = Promise.all([
      import('prettier/standalone'),
      import('prettier/plugins/babel'),
      import('prettier/plugins/estree'),
      import('prettier/plugins/html'),
      import('prettier/plugins/postcss'),
      import('prettier/plugins/typescript'),
    ]).then(([prettier, pluginBabel, pluginEstree, pluginHtml, pluginPostcss, pluginTypescript]) => ({
      prettier,
      plugins: [pluginBabel, pluginEstree, pluginHtml, pluginPostcss, pluginTypescript],
    }));
  }

  return prettierBundlePromise;
}

export async function formatCodeSnippet(code: string, language: EditorLanguage): Promise<string> {
  const source = code ?? '';
  if (!source.trim()) return source;

  if (language === 'sql') {
    return formatSql(source, {
      language: 'sql',
      keywordCase: 'upper',
      tabWidth: 2,
    });
  }

  if (language === 'xml' || looksLikeXml(source)) {
    return formatXmlSnippet(source);
  }

  if (language === 'json') {
    return formatJsonSnippet(source);
  }

  const preferredParser = looksLikeHtml(source) ? 'html' : parserFromLanguage(language);
  if (!preferredParser) {
    throw new Error('Formatting is not supported for this language.');
  }

  const parserCandidates = uniqueParsers([
    preferredParser,
    preferredParser === 'html' ? 'typescript' : 'html',
    'typescript',
    'babel',
    'json',
    'css',
  ]);

  const { prettier, plugins } = await getPrettierBundle();

  let lastError: unknown = null;
  for (const parser of parserCandidates) {
    try {
      const formatted = await prettier.format(source, {
        parser,
        plugins,
        singleQuote: true,
      });
      return formatted;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Unable to format this snippet.');
}
