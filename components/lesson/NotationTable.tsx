import Link from 'next/link';
import { lessonPath } from '../../lib/course/curriculum.mjs';
import type { NotationEntry } from '../../lib/course/types';
import { Katex } from '../primitives/Katex';

export function NotationTable({
  entries,
  lessonTitle,
  showIntroducedIn = true,
}: {
  entries: readonly NotationEntry[];
  /** The title of the lesson that introduces an entry; undefined when the course does not know it. */
  lessonTitle: (id: string) => string | undefined;
  /** Whether the table shows the lesson that introduces each entry. */
  showIntroducedIn?: boolean;
}) {
  return (
    <table className="notation-table">
      <caption className="sr-only">Notation used in this course</caption>
      <thead>
        <tr>
          <th scope="col">Symbol</th>
          <th scope="col">Read as</th>
          <th scope="col">Meaning</th>
          {showIntroducedIn ? <th scope="col">Introduced in</th> : null}
        </tr>
      </thead>
      <tbody>
        {entries.map((entry) => {
          const title = lessonTitle(entry.introducedIn);
          return (
            <tr id={entry.id} key={entry.id}>
              <th scope="row" className="notation-symbol">
                <Katex source={entry.symbol} label={entry.name} />
              </th>
              <td>{entry.name}</td>
              <td>
                {entry.meaning}
                {entry.shape === undefined ? null : (
                  <span className="notation-shape">{entry.shape}</span>
                )}
              </td>
              {showIntroducedIn ? (
                <td>
                  {title === undefined ? entry.introducedIn : (
                    <Link href={lessonPath(entry.introducedIn)}>{title}</Link>
                  )}
                </td>
              ) : null}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
