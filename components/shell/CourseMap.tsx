'use client';

import Link from 'next/link';
import { useCourse } from '../../lib/course/context';
import { allLessons, lessonPath, lessonsInPart } from '../../lib/course/curriculum.mjs';
import { useProgress } from '../../lib/progress';
import { ProgressRing } from './ProgressRing';

export function CourseMap() {
  const { identity, curriculum, authoredLessonIds } = useCourse();
  const { snapshot } = useProgress();
  const lessons = allLessons(curriculum);
  const isAuthored = (id: string) => authoredLessonIds.includes(id);
  const doneCount = lessons.filter((lesson) => snapshot.lessons[lesson.id]?.completed).length;
  const plannedCount = lessons.filter((lesson) => !isAuthored(lesson.id)).length;

  return (
    <div className="course-map">
      <header className="course-map-head">
        <ProgressRing done={doneCount} total={lessons.length} />
        <p className="course-map-note">
          {plannedCount > 0 ? (
            <>
              Lessons marked planned are not written yet. They are listed anyway, so the shape of
              the whole course is visible from the start.{' '}
            </>
          ) : null}
          <Link href={identity.reference.path}>{identity.reference.label} reference</Link>.
        </p>
      </header>

      {curriculum.map((part) => (
        <section className="course-part" key={part.id}>
          <h3>{part.title}</h3>
          <p className="course-part-blurb">{part.blurb}</p>
          <ol className="course-lessons">
            {lessonsInPart(curriculum, part.id).map((lesson) => {
              const state = snapshot.lessons[lesson.id];
              const complete = state?.completed === true;
              const authored = isAuthored(lesson.id);
              return (
                <li className="course-lesson" key={lesson.id} data-authored={authored}>
                  <Link href={lessonPath(lesson.id)}>
                    <span className="course-lesson-title">{lesson.title}</span>
                    <span className="course-lesson-goal">{lesson.goal}</span>
                    {complete ? <span className="course-lesson-state">complete</span> : null}
                    {authored ? null : <span className="course-lesson-state">planned</span>}
                  </Link>
                </li>
              );
            })}
          </ol>
        </section>
      ))}
    </div>
  );
}
