import { describe, expect, it } from 'vitest';
import { stripMdx, buildContext } from './build-lesson-context.mjs';

describe('stripMdx', () => {
  it('drops import lines', () => {
    expect(stripMdx("import { X } from '../x';\n\nHello.")).toBe('Hello.');
  });

  it('keeps prose inside a JSX block but drops the tags', () => {
    const source = '<Aside kind="intuition">\nA vector has direction.\n</Aside>';
    expect(stripMdx(source)).toBe('A vector has direction.');
  });

  it('drops a self-closing widget entirely', () => {
    expect(stripMdx('Before.\n\n<VectorPlayground />\n\nAfter.')).toBe('Before.\n\nAfter.');
  });

  it('drops a multi-line self-closing element with props, such as an exercise', () => {
    const source = [
      'Before.',
      '',
      '<Exercise',
      '  spec={{',
      "    kind: 'numeric',",
      "    prompt: 'What is the norm?',",
      '  }}',
      '/>',
      '',
      'After.',
    ].join('\n');
    expect(stripMdx(source)).toBe('Before.\n\nAfter.');
  });

  it('drops a fenced code block, which the tutor does not need verbatim', () => {
    const source = 'Text.\n\n```python\nprint(1)\n```\n\nMore.';
    expect(stripMdx(source)).toBe('Text.\n\nMore.');
  });

  it('replaces a Sym element with the symbol it names', () => {
    expect(stripMdx('A <Sym id="vector" /> is a list.')).toBe('A [vector] is a list.');
  });

  it('keeps display and inline math verbatim, because the tutor must discuss it', () => {
    const source = 'The norm is\n\n$$\\lVert a \\rVert = \\sqrt{a \\cdot a}$$\n\nwhich is $\\ge 0$.';
    expect(stripMdx(source)).toContain('\\sqrt{a \\cdot a}');
    expect(stripMdx(source)).toContain('$\\ge 0$');
  });

  it('collapses runs of blank lines left behind by removals', () => {
    expect(stripMdx('A.\n\n<Widget />\n\n<Widget />\n\nB.')).toBe('A.\n\nB.');
  });

  it('leaves markdown headings, which carry the lesson structure', () => {
    expect(stripMdx('## Where the basis lands\n\nText.')).toBe('## Where the basis lands\n\nText.');
  });
});

describe('buildContext', () => {
  const lesson = {
    id: 'vectors-as-meaning',
    title: 'Vectors as meaning',
    goal: 'Read a vector as a point and an arrow',
    prerequisites: [],
    estimatedMinutes: 25,
  };

  it('carries the identifying fields the tutor prompt needs', () => {
    const context = buildContext(lesson, 'Body text.', 'Foundations', []);
    expect(context).toMatchObject({
      lessonId: 'vectors-as-meaning',
      title: 'Vectors as meaning',
      partTitle: 'Foundations',
      objectives: ['Read a vector as a point and an arrow'],
      body: 'Body text.',
    });
  });

  // NotationEntry's field is `symbol`, not `latex`: destructuring `latex` off a real
  // entry yields undefined, and only a hand-written fixture would hide it.
  it('includes only the notation the lesson is allowed to have met', () => {
    const notation = [
      { id: 'vector', symbol: '\\mathbf{v}', meaning: 'a vector', introducedIn: 'vectors-as-meaning' },
      { id: 'svd', symbol: '\\mathbf{U}', meaning: 'a decomposition', introducedIn: 'eigen-and-svd' },
    ];
    const context = buildContext(lesson, 'Body.', 'Foundations', notation);
    expect(context.notation.map((entry) => entry.id)).toEqual(['vector']);
    expect(context.notation[0].symbol).toBe('\\mathbf{v}');
  });

  it('records the word count, so an oversized lesson is visible at build time', () => {
    expect(buildContext(lesson, 'one two three', 'Foundations', []).wordCount).toBe(3);
  });
});
