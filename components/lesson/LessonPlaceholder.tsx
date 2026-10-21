import Link from 'next/link';

/** Shown for a curriculum lesson that has no content yet. */
export function LessonPlaceholder({ title }: { title: string }) {
  return (
    <div className="lesson-placeholder">
      <p>
        <strong>{title}</strong> is planned but not written yet. Its place in the
        sequence is fixed, so the course map shows the whole arc rather than only the
        finished part.
      </p>
      <p><Link href="/">Back to the course map</Link></p>
    </div>
  );
}
