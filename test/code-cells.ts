/** The fenced python of each code cell in a lesson's MDX source, as written. */
export function codeCells(source: string): string[] {
  const cells = [...source.matchAll(/^<CodeCell(?:\s[^>]*)?>\n```python\n([\s\S]*?)\n```\n<\/CodeCell>$/gm)]
    .map((match) => match[1] as string);
  const opened = source.split('<CodeCell').length - 1;
  if (cells.length !== opened) {
    throw new Error(`${opened - cells.length} of ${opened} code cells are not one fenced python block`);
  }
  return cells;
}
