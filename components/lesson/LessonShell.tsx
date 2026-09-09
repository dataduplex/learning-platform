'use client';

import { useEffect } from 'react';
import type { Lesson } from '@/content/curriculum';
import { partOfLesson } from '@/content/curriculum';
import { useProgress } from '@/lib/progress';
import { CompleteButton } from './CompleteButton';
import { PrevNext } from './PrevNext';

export function LessonShell({
  lesson,
  children,
}: {
  lesson: Lesson;
  children: React.ReactNode;
}) {
  const { store } = useProgress();

  // Visiting is progress too: the course map should show where you have been.
  useEffect(() => { store?.markVisited(lesson.id); }, [store, lesson.id]);

  const part = partOfLesson(lesson.id);

  return (
    <article className="page page-narrow lesson">
      {part === undefined ? null : <p className="lesson-part">{part.title}</p>}
      <h1>{lesson.title}</h1>
      <p className="lede">{lesson.goal}</p>
      {lesson.payoff === undefined ? null : (
        <p className="lesson-payoff">{lesson.payoff}</p>
      )}
      <div className="lesson-body">{children}</div>
      <CompleteButton lessonId={lesson.id} />
      <PrevNext lessonId={lesson.id} />
    </article>
  );
}
