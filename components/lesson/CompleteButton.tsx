'use client';

import { useLessonProgress } from '@/lib/progress';

export function CompleteButton({ lessonId }: { lessonId: string }) {
  // useLessonProgress returns the pair, so the state comes from `progress`. Reading
  // the hook's own result as a LessonProgress would leave `done` false forever.
  const { progress, store } = useLessonProgress(lessonId);
  const done = progress.completed;

  return (
    <div className="complete-block">
      <button
        type="button"
        className="complete-button"
        data-done={done}
        onClick={() => store?.setCompleted(lessonId, !done)}
      >
        {done ? 'Mark as not complete' : 'Mark this lesson complete'}
      </button>
      <p className="complete-status" role="status">
        {done ? 'Marked complete.' : ''}
      </p>
    </div>
  );
}
