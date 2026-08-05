/**
 * Parses the AI recommendation into structured blocks for template rendering.
 *
 * The previous approach built an HTML string with regex replaces and bound it via
 * `[innerHTML]` (P1.2). Angular's sanitiser made that survivable, but the input is model
 * output that nobody controls, and the regexes were fragile enough to emit malformed markup
 * on ordinary text.
 *
 * Producing data instead of markup removes the question entirely: the template renders
 * text nodes through interpolation, so there is no HTML to sanitise and no `[innerHTML]`.
 */

export interface TextSegment {
  text: string;
  bold: boolean;
}

export type RecommendationBlock =
  | { kind: 'paragraph'; segments: TextSegment[] }
  | { kind: 'list'; items: TextSegment[][] };

/** Splits `**bold**` runs out of a line. Everything else stays literal text. */
export function parseSegments(line: string): TextSegment[] {
  const segments: TextSegment[] = [];
  const pattern = /\*\*(.+?)\*\*/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(line)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ text: line.slice(lastIndex, match.index), bold: false });
    }
    segments.push({ text: match[1], bold: true });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < line.length) {
    segments.push({ text: line.slice(lastIndex), bold: false });
  }

  return segments.length > 0 ? segments : [{ text: line, bold: false }];
}

const NUMBERED = /^\s*\d+[.)]\s+(.*)$/;
const BULLETED = /^\s*[-*•]\s+(.*)$/;

export function parseRecommendation(raw: string | null | undefined): RecommendationBlock[] {
  if (!raw) return [];

  const blocks: RecommendationBlock[] = [];
  let pendingList: TextSegment[][] = [];

  const flushList = () => {
    if (pendingList.length > 0) {
      blocks.push({ kind: 'list', items: pendingList });
      pendingList = [];
    }
  };

  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) {
      flushList();
      continue;
    }

    const item = NUMBERED.exec(trimmed) ?? BULLETED.exec(trimmed);
    if (item) {
      pendingList.push(parseSegments(item[1]));
      continue;
    }

    flushList();
    blocks.push({ kind: 'paragraph', segments: parseSegments(trimmed) });
  }

  flushList();
  return blocks;
}
