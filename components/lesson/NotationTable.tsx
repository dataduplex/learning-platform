import { NOTATION, type NotationEntry } from '@/content/notation';
import { Katex } from '@/components/primitives/Katex';
import { lessonById, lessonPath } from '@/content/curriculum';

export function NotationTable({
  entries = NOTATION,
  showIntroducedIn = true,
}: {
  entries?: readonly NotationEntry[];
  /** Off when the caller already groups by lesson, so the column is not repeated. */
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
          const lesson = lessonById(entry.introducedIn);
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
                  {lesson === undefined ? entry.introducedIn : (
                    <a href={lessonPath(lesson.id)}>{lesson.title}</a>
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
