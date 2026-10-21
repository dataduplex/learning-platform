'use client';

import dynamic from 'next/dynamic';
import { useEffect } from 'react';
import { useCourse } from '../../lib/course/context';
import { partOfLesson } from '../../lib/course/curriculum.mjs';
import type { Lesson } from '../../lib/course/types';
import { useProgress } from '../../lib/progress';
import { CompleteButton } from './CompleteButton';
import { PrevNext } from './PrevNext';

/** Client-only: the panel reads localStorage, so it must not be prerendered. */
const TutorPanel = dynamic(
  () => import('../tutor/TutorPanel').then((module) => module.TutorPanel),
  { ssr: false },
);

export function LessonShell({
  lesson,
  children,
}: {
  lesson: Lesson;
  children: React.ReactNode;
}) {
  const { curriculum } = useCourse();
  const { store } = useProgress();

  useEffect(() => { store?.markVisited(lesson.id); }, [store, lesson.id]);

  const part = partOfLesson(curriculum, lesson.id);

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
