'use client';

import Link from 'next/link';
import { lessonPath, neighbours } from '@/content/curriculum';

export function PrevNext({ lessonId }: { lessonId: string }) {
  const { previous, next } = neighbours(lessonId);
  return (
    <nav className="prev-next" aria-label="Lesson">
      {previous ? (
        <Link className="prev-next-link" href={lessonPath(previous.id)} rel="prev">
          <span className="prev-next-role">Previous</span>
          <span className="prev-next-title">{previous.title}</span>
        </Link>
      ) : <span className="prev-next-role">Previous</span>}
      {next ? (
        <Link className="prev-next-link prev-next-forward" href={lessonPath(next.id)} rel="next">
          <span className="prev-next-role">Next</span>
          <span className="prev-next-title">{next.title}</span>
        </Link>
      ) : <span className="prev-next-role">Next</span>}
    </nav>
  );
}
