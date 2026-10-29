import { Fragment } from 'react';
import { Katex } from '../primitives/Katex';

/** Display maths, then inline maths. Order matters: $$ must win over $. */
const SEGMENT = /(\$\$[^$]+\$\$|\$[^$\n]+\$)/g;

function renderSegments(text: string) {
  return text.split(SEGMENT).map((segment, index) => {
    if (segment.startsWith('$$') && segment.endsWith('$$')) {
      return <Katex key={index} display source={segment.slice(2, -2).trim()} />;
    }
    if (segment.startsWith('$') && segment.endsWith('$') && segment.length > 2) {
      return <Katex key={index} source={segment.slice(1, -1).trim()} />;
    }
    return <Fragment key={index}>{segment}</Fragment>;
  });
}

/**
 * Paragraphs, bullets, and maths. Everything else is shown as literal text,
 * which is both simpler and safer than interpreting model output as markup.
 */
export function Markdownish({ source }: { source: string }) {
  const blocks = source.split(/\n{2,}/);

  return (
    <>
      {blocks.map((block, index) => {
        const lines = block.split('\n');
        const isList = lines.every((line) => /^\s*[-*]\s+/.test(line));
        if (isList) {
          return (
            <ul key={index}>
              {lines.map((line, lineIndex) => (
                <li key={lineIndex}>{renderSegments(line.replace(/^\s*[-*]\s+/, ''))}</li>
              ))}
            </ul>
          );
        }
        return <p key={index}>{renderSegments(block)}</p>;
      })}
    </>
  );
}
