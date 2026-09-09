import Link from 'next/link';
import { notationById } from '@/content/notation';
import { Katex } from '@/components/primitives/Katex';

/**
 * An inline symbol that always links to its definition. Lessons use this on
 * first mention, which is what makes the notation table load-bearing rather
 * than decorative.
 */
export function Sym({ id }: { id: string }) {
  const entry = notationById(id);
  // Loud on a miss: a dangling symbol reference is an authoring error, and
  // silently rendering nothing would hide it until a reader hit the gap.
  if (!entry) throw new Error(`No notation entry with id "${id}".`);
  return (
    <Link className="sym" href={`/notation#${entry.id}`} title={entry.meaning}>
      <Katex source={entry.symbol} label={entry.name} />
    </Link>
  );
}
