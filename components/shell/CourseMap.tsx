'use client';

import Link from 'next/link';
import {
  CURRICULUM, allLessons, isAuthoredLessonId, lessonPath, lessonsInPart,
} from '@/content/curriculum';
import { useProgress } from '@/lib/progress';
import { ProgressRing } from './ProgressRing';

export function CourseMap() {
  const { snapshot } = useProgress();
  const lessons = allLessons();
  const doneCount = lessons.filter((lesson) => snapshot.lessons[lesson.id]?.completed).length;

  return (
    <div className="course-map">
      <header className="course-map-head">
        <ProgressRing done={doneCount} total={lessons.length} />
        <p className="course-map-note">
          Lessons marked planned are not written yet. They are listed anyway, so the shape of
          the whole course is visible from the start. <Link href="/notation">Notation
          reference</Link>.
        </p>
      </header>

      {CURRICULUM.map((part) => (
        <section className="course-part" key={part.id}>
          <h3>{part.title}</h3>
          <p className="course-part-blurb">{part.blurb}</p>
          <ol className="course-lessons">
            {lessonsInPart(part.id).map((lesson) => {
              const state = snapshot.lessons[lesson.id];
              const complete = state?.completed === true;
              // Authorship is per lesson, not per part: AUTHORED_LESSON_IDS is the
              // list with MDX files this cycle.
              const authored = isAuthoredLessonId(lesson.id);
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
