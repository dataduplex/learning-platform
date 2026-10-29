'use client';

import { useEffect, useId, useRef, useState } from 'react';
import type { LessonId } from '../../lib/course/types';
import {
  check, isAnswered,
  type AnswerFor, type CheckResult, type ExerciseSpec,
} from '../../lib/exercises';
import { isPermutation } from '../../lib/exercises/check';
import { useLessonProgress } from '../../lib/progress';

type AnyAnswer = number | number[] | (string | null)[];

function initialAnswer(spec: ExerciseSpec): AnyAnswer {
  switch (spec.kind) {
    case 'numeric':
      return Number.NaN;
    case 'vector':
      return spec.answer.map(() => Number.NaN);
    case 'choice':
    case 'predict':
      return -1;
    case 'sequence':
      if (!isPermutation(spec.presented, spec.steps.length) || spec.presented.every((step, at) => step === at)) {
        throw new Error(`The sequence "${spec.id}" must present every step once, out of the solved order.`);
      }
      return [...spec.presented];
    case 'classify':
      return spec.items.map(() => null);
  }
}

/** Empty input reads as unanswered rather than zero. */
function parseField(raw: string): number {
  return raw.trim() === '' ? Number.NaN : Number(raw);
}

function fieldValue(value: number): string | number {
  return Number.isFinite(value) ? value : '';
}

/** The order with the step at `from` moved to `to`. */
function moved(order: readonly number[], from: number, to: number): number[] {
  const next = [...order];
  const [step] = next.splice(from, 1);
  next.splice(to, 0, step as number);
  return next;
}

type Move = 'up' | 'down';

function SequenceOrder({ steps, order, onChange }: {
  steps: readonly string[];
  order: readonly number[];
  onChange: (next: number[]) => void;
}) {
  const controls = useRef(new Map<string, HTMLButtonElement>());
  const focusAfterMove = useRef<{ step: number; move: Move } | null>(null);

  useEffect(() => {
    const target = focusAfterMove.current;
    if (target === null) return;
    focusAfterMove.current = null;
    const same = controls.current.get(`${target.step} ${target.move}`);
    const other = controls.current.get(`${target.step} ${target.move === 'up' ? 'down' : 'up'}`);
    (same?.disabled ? other : same)?.focus();
  }, [order]);

  const control = (key: string) => (button: HTMLButtonElement | null) => {
    if (button === null) controls.current.delete(key);
    else controls.current.set(key, button);
  };

  function move(position: number, direction: Move): void {
    focusAfterMove.current = { step: order[position] as number, move: direction };
    onChange(moved(order, position, direction === 'up' ? position - 1 : position + 1));
  }

  return (
    <ol className="exercise-sequence" aria-label="The steps, in your order">
      {order.map((stepIndex, position) => {
        const step = steps[stepIndex] as string;
        return (
          <li key={stepIndex}>
            <span className="exercise-sequence-step">{step}</span>
            <button
              type="button"
              ref={control(`${stepIndex} up`)}
              aria-label={`Move "${step}" up`}
              disabled={position === 0}
              onClick={() => move(position, 'up')}
            >
              Up
            </button>
            <button
              type="button"
              ref={control(`${stepIndex} down`)}
              aria-label={`Move "${step}" down`}
              disabled={position === order.length - 1}
              onClick={() => move(position, 'down')}
            >
              Down
            </button>
          </li>
        );
      })}
    </ol>
  );
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
    <section
      className="exercise"
      data-exercise-kind={spec.kind}
      aria-labelledby={`${groupId}-prompt`}
    >
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

      {spec.kind === 'sequence' && (
        <SequenceOrder steps={spec.steps} order={answer as number[]} onChange={setAnswer} />
      )}

      {spec.kind === 'classify' && (
        <div className="exercise-classify">
          {spec.items.map((item, index) => (
            <label className="exercise-classify-item" key={item.text}>
              <span>{item.text}</span>
              <select
                value={(answer as (string | null)[])[index] ?? ''}
                onChange={(event) => {
                  const next = [...(answer as (string | null)[])];
                  next[index] = event.target.value === '' ? null : event.target.value;
                  setAnswer(next);
                }}
              >
                <option value="">Choose a category</option>
                {spec.categories.map((category) => (
                  <option key={category.id} value={category.id}>{category.label}</option>
                ))}
              </select>
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
