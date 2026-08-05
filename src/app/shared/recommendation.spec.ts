import { parseRecommendation, parseSegments } from './recommendation';

describe('recommendation parsing', () => {
  it('splits bold runs out of a line', () => {
    expect(parseSegments('Try **box breathing** today')).toEqual([
      { text: 'Try ', bold: false },
      { text: 'box breathing', bold: true },
      { text: ' today', bold: false },
    ]);
  });

  it('leaves plain text alone', () => {
    expect(parseSegments('Just breathe')).toEqual([{ text: 'Just breathe', bold: false }]);
  });

  /** Markup characters must survive as literal text — they are never interpreted as HTML. */
  it('treats angle brackets as ordinary characters', () => {
    const blocks = parseRecommendation('Avoid <script>alert(1)</script> stress');
    expect(blocks).toEqual([
      { kind: 'paragraph', segments: [{ text: 'Avoid <script>alert(1)</script> stress', bold: false }] },
    ]);
  });

  it('groups consecutive numbered items into one list', () => {
    const blocks = parseRecommendation('Try these:\n1. Breathe in\n2. Breathe out');
    expect(blocks.length).toBe(2);
    expect(blocks[0].kind).toBe('paragraph');
    expect(blocks[1]).toEqual({
      kind: 'list',
      items: [[{ text: 'Breathe in', bold: false }], [{ text: 'Breathe out', bold: false }]],
    });
  });

  it('handles bulleted lists and blank-line separated paragraphs', () => {
    const blocks = parseRecommendation('First\n\n- one\n- two\n\nLast');
    expect(blocks.map((b) => b.kind)).toEqual(['paragraph', 'list', 'paragraph']);
  });

  it('returns nothing for empty input', () => {
    expect(parseRecommendation('')).toEqual([]);
    expect(parseRecommendation(null)).toEqual([]);
  });
});
