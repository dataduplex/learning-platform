import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const LESSON_DIR = 'content/lessons';
const OUTPUT_DIR = 'public/lesson-context';

/** Elements whose tags go but whose inner prose stays. */
const PROSE_WRAPPERS = new Set(['Aside', 'Callout', 'Figure']);

/**
 * Reduce MDX to the prose a tutor can reason about. Deliberately a line-oriented
 * pass rather than a real parser: the input is a small set of files this repo
 * authors, and a parser would pull the whole MDX toolchain into a build script.
 */
export function stripMdx(source) {
  const lines = source.split('\n');
  const output = [];
  let inFence = false;
  let jsxDepth = 0; // Inside a multi-line self-closing element, waiting for "/>".

  for (const rawLine of lines) {
    const line = rawLine;
    const trimmed = line.trim();

    if (trimmed.startsWith('```')) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;

    if (jsxDepth > 0) {
      if (trimmed.endsWith('/>') || trimmed === '>') jsxDepth = 0;
      continue;
    }

    if (trimmed.startsWith('import ') || trimmed.startsWith('export ')) continue;

    // A complete self-closing element on one line, with no prose beside it.
    if (/^<[A-Z][\w.]*(\s[^>]*)?\/>$/.test(trimmed)) continue;

    // The opening line of a multi-line self-closing element.
    if (/^<[A-Z][\w.]*$/.test(trimmed) || /^<[A-Z][\w.]*\s[^>]*$/.test(trimmed)) {
      jsxDepth = 1;
      continue;
    }

    // An opening or closing tag for a wrapper whose contents are prose.
    const wrapper = trimmed.match(/^<\/?([A-Z][\w.]*)(\s[^>]*)?>$/);
    if (wrapper !== null && PROSE_WRAPPERS.has(wrapper[1])) continue;

    // Inline elements: keep the sentence, replace the element.
    const cleaned = line
      .replace(/<Sym\s+id="([^"]+)"\s*\/>/g, '[$1]')
      .replace(/<\/?[A-Z][\w.]*(\s[^>]*)?\/?>/g, '');

    output.push(cleaned);
  }

  return output
    .join('\n')
    .replace(/[ \t]+$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function buildContext(lesson, body, partTitle, notation) {
  return {
    lessonId: lesson.id,
    title: lesson.title,
    partTitle,
    objectives: [lesson.goal],
    prerequisites: lesson.prerequisites,
    // `symbol`, the field NotationEntry actually declares.
    notation: notation
      .filter((entry) => entry.introducedIn === lesson.id)
      .map(({ id, symbol, meaning }) => ({ id, symbol, meaning })),
    body,
    wordCount: body.split(/\s+/).filter(Boolean).length,
  };
}

async function main() {
  // Imported from the course's own files in the working directory.
  const { allLessons, partOfLesson } = await import(pathToFileURL(resolve('content/curriculum.ts')).href);
  const { NOTATION } = await import(pathToFileURL(resolve('content/notation.ts')).href);

  await mkdir(OUTPUT_DIR, { recursive: true });
  const present = new Set(await readdir(LESSON_DIR));
  let written = 0;

  for (const lesson of allLessons()) {
    const file = `${lesson.id}.mdx`;
    if (!present.has(file)) continue; // Not authored yet: the tutor simply has no context.

    const source = await readFile(join(LESSON_DIR, file), 'utf8');
    const part = partOfLesson(lesson.id);
    const context = buildContext(lesson, stripMdx(source), part?.title ?? '', NOTATION);

    if (context.wordCount > 4000) {
      throw new Error(
        `Lesson ${lesson.id} strips to ${context.wordCount} words, over the 4000 budget. `
        + 'Split it or trim it: an oversized context inflates every tutor request.',
      );
    }

    await writeFile(join(OUTPUT_DIR, `${lesson.id}.json`), `${JSON.stringify(context)}\n`);
    written += 1;
  }

  console.log(`Wrote ${written} lesson context files to ${OUTPUT_DIR}.`);
}

// Only run I/O when invoked as a script, so the tests can import the pure functions.
if (process.argv[1]?.endsWith('build-lesson-context.mjs')) {
  await main();
}
