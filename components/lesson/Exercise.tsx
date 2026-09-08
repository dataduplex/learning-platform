'use client';

import { useId, useState } from 'react';
import type { LessonId } from '@/content/curriculum';
import {
  check, isAnswered,
  type AnswerFor, type CheckResult, type ExerciseSpec,
} from '@/lib/exercises';
import { useLessonProgress } from '@/lib/progress';

type AnyAnswer = number | number[];

function initialAnswer(spec: ExerciseSpec): AnyAnswer {
  switch (spec.kind) {
    case 'numeric':
      return Number.NaN;
    case 'vector':
      return spec.answer.map(() => Number.NaN);
    case 'choice':
    case 'predict':
      return -1;
  }
}

/** Empty input reads as unanswered rather than zero. */
function parseField(raw: string): number {
  return raw.trim() === '' ? Number.NaN : Number(raw);
}

function fieldValue(value: number): string | number {
  return Number.isFinite(value) ? value : '';
}

export function Exercise({ spec, lesson }: { spec: ExerciseSpec; lesson: LessonId }) {
  const groupId = useId();
  const { store } = useLessonProgress(lesson);
  const [answer, setAnswer] = useState<AnyAnswer>(() => initialAnswer(spec));
  const [result, setResult] = useState<CheckResult | null>(null);

  const ready = isAnswered(spec, answer as AnswerFor<typeof spec>);

  function submit(): void {
    const verdict = check(spec, answer as AnswerFor<typeof spec>);
    setResult(verdict);
    store?.recordAttempt(lesson, {
      exerciseId: spec.id,
      correct: verdict.correct,
      revealed: verdict.reveal !== undefined,
    });
  }

  return (
    <section className="exercise" aria-labelledby={`${groupId}-prompt`}>
      <h4 className="exercise-kicker">
        {spec.kind === 'predict' ? 'Predict, then check' : 'Exercise'}
      </h4>
      <p className="exercise-prompt" id={`${groupId}-prompt`}>{spec.prompt}</p>

      {spec.kind === 'numeric' && (
        <p className="exercise-field">
          <label htmlFor={`${groupId}-numeric`}>Your answer</label>
          <input
            id={`${groupId}-numeric`}
            type="number"
            step="any"
            inputMode="decimal"
            value={fieldValue(answer as number)}
            onChange={(event) => setAnswer(parseField(event.target.value))}
          />
          {spec.unit ? <span className="exercise-unit">{spec.unit}</span> : null}
        </p>
      )}

      {spec.kind === 'vector' && (
        <div className="exercise-vector">
          {(answer as number[]).map((component, index) => {
            const label = spec.labels?.[index] ?? `component ${index + 1}`;
            return (
              <p className="exercise-field" key={index}>
                <label htmlFor={`${groupId}-v${index}`}>{label}</label>
                <input
                  id={`${groupId}-v${index}`}
                  type="number"
                  step="any"
                  inputMode="decimal"
                  value={fieldValue(component)}
                  onChange={(event) => {
                    const next = [...(answer as number[])];
                    next[index] = parseField(event.target.value);
                    setAnswer(next);
                  }}
                />
              </p>
            );
          })}
        </div>
      )}

      {(spec.kind === 'choice' || spec.kind === 'predict') && (
        <div className="exercise-options" role="radiogroup" aria-labelledby={`${groupId}-prompt`}>
          {spec.options.map((option, index) => (
            <label className="exercise-option" key={option}>
              <input
                type="radio"
                name={`${groupId}-options`}
                checked={(answer as number) === index}
                onChange={() => setAnswer(index)}
              />
              <span>{option}</span>
            </label>
          ))}
        </div>
      )}

      <p className="exercise-actions">
        <button type="button" disabled={!ready} onClick={submit}>Check</button>
      </p>

      {/* Words carry the verdict; the data attribute only adds color and an icon. */}
      <div className="exercise-feedback" role="status" data-verdict={verdictOf(result)}>
        {result ? result.message : ''}
      </div>

      {result?.hint ? <p className="exercise-hint">{result.hint}</p> : null}

      {result?.reveal ? (
        <aside className="exercise-reveal">
          <h5>What actually happens</h5>
          <p>{result.reveal}</p>
        </aside>
      ) : null}
    </section>
  );
}

function verdictOf(result: CheckResult | null): 'correct' | 'incorrect' | 'none' {
  if (!result) return 'none';
  return result.correct ? 'correct' : 'incorrect';
}
