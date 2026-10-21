import Link from 'next/link';
import type { NotationEntry } from '../../lib/course/types';
import { Katex } from '../primitives/Katex';

export interface SymOptions {
  /** Finds an entry by id; undefined for a miss. */
  readonly lookup: (id: string) => NotationEntry | undefined;
  /** The reference page's path; the entry id becomes the fragment. */
  readonly referencePath: string;
}

/**
 * Builds a course's inline symbol: one that always links to its definition.
 */
export function createSym({ lookup, referencePath }: SymOptions) {
  return function Sym({ id }: { id: string }) {
    const entry = lookup(id);
    // Loud on a miss: a dangling symbol reference is an authoring error.
    if (!entry) throw new Error(`No notation entry with id "${id}".`);
    return (
      <Link className="sym" href={`${referencePath}#${entry.id}`} title={entry.meaning}>
        <Katex source={entry.symbol} label={entry.name} />
      </Link>
    );
  };
}
