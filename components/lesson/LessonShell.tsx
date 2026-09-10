'use client';

import dynamic from 'next/dynamic';
import { useEffect } from 'react';
import type { Lesson } from '@/content/curriculum';
import { partOfLesson } from '@/content/curriculum';
import { useProgress } from '@/lib/progress';
import { CompleteButton } from './CompleteButton';
import { PrevNext } from './PrevNext';

/**
 * Client-only: the panel reads localStorage to decide whether a key is present, so
 * it must not be prerendered. This defers the panel itself, not the API SDK - the
 * transport handles that, because a dynamic component still loads on mount.
 */
const TutorPanel = dynamic(
  () => import('@/components/tutor/TutorPanel').then((module) => module.TutorPanel),
  { ssr: false },
);

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
      <TutorPanel lessonId={lesson.id} />
    </article>
  );
}
