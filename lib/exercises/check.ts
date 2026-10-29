import type {
  AnswerFor, ChoiceExercise, CheckResult, ClassifyExercise, ExerciseSpec, NumericExercise,
  PredictExercise, SequenceExercise, VectorExercise,
} from './types';

/**
 * Inclusive absolute tolerance. Deliberately NOT `Math.abs(value - expected) <= tolerance`:
 * that form rejects a boundary hit whenever the subtraction rounds up, so it accepts
 * 2.001 against 2 and rejects 0.7081 against 0.7071. Comparing against the endpoints
 * rounds both sides the same way, which is what makes the boundary genuinely inclusive.
 */
function withinTolerance(value: number, expected: number, tolerance: number): boolean {
  return value >= expected - tolerance && value <= expected + tolerance;
}

function checkNumeric(spec: NumericExercise, answer: number): CheckResult {
  if (!Number.isFinite(answer)) {
    return { correct: false, message: 'Enter a number to check your answer.' };
  }
  const difference = answer - spec.answer;
  if (withinTolerance(answer, spec.answer, spec.tolerance)) {
    return { correct: true, message: 'Correct.' };
  }
  const direction = difference < 0 ? 'too small' : 'too large';
  return {
    correct: false,
    message: `That is ${direction}.`,
    ...(spec.hint === undefined ? {} : { hint: spec.hint }),
  };
}

function checkChoice(spec: ChoiceExercise | PredictExercise, answer: number): CheckResult {
  if (!Number.isInteger(answer) || answer < 0 || answer >= spec.options.length) {
    return { correct: false, message: 'Choose one of the options.' };
  }
  const correct = answer === spec.correctIndex;
  const authored = spec.kind === 'choice' ? spec.explanations?.[answer] : undefined;
  const message = authored ?? (correct ? 'Correct.' : 'That is not right.');
  return {
    correct,
    message,
    ...(spec.kind === 'predict' ? { reveal: spec.reveal } : {}),
    ...(!correct && spec.kind === 'choice' && spec.hint !== undefined
      ? { hint: spec.hint }
      : {}),
  };
}

function checkVector(spec: VectorExercise, answer: readonly number[]): CheckResult {
  if (answer.length !== spec.answer.length) {
    return {
      correct: false,
      message: `This answer has ${spec.answer.length} components, you gave ${answer.length}.`,
    };
  }
  if (answer.some((value) => !Number.isFinite(value))) {
    return { correct: false, message: 'Fill in every component to check your answer.' };
  }
  for (let i = 0; i < answer.length; i += 1) {
    const expected = spec.answer[i] as number;
    if (!withinTolerance((answer[i] as number), expected, spec.tolerance)) {
      return {
        correct: false,
        message: `Component ${i + 1} is not right yet.`,
        ...(spec.hint === undefined ? {} : { hint: spec.hint }),
      };
    }
  }
  return { correct: true, message: 'Correct.' };
}

/** Every index from 0 to length - 1 exactly once. */
export function isPermutation(order: readonly number[], length: number): boolean {
  return order.length === length
    && new Set(order).size === length
    && order.every((index) => Number.isInteger(index) && index >= 0 && index < length);
}

function checkSequence(spec: SequenceExercise, answer: readonly number[]): CheckResult {
  if (!isPermutation(answer, spec.steps.length)) {
    return { correct: false, message: 'Put every step in order to check your answer.' };
  }
  const position = answer.findIndex((index, at) => index !== at);
  if (position === -1) return { correct: true, message: 'Correct.' };
  const placed = answer[position] as number;
  const expected = spec.steps[position] as string;
  const message = `Step ${position + 1} should be "${expected}", not "${spec.steps[placed] as string}".`;
  const hint = spec.misconceptions?.[placed] ?? spec.hint;
  return { correct: false, message, ...(hint === undefined ? {} : { hint }) };
}

function checkClassify(spec: ClassifyExercise, answer: readonly (string | null)[]): CheckResult {
  if (answer.length !== spec.items.length || answer.some((category) => category === null)) {
    return { correct: false, message: 'Place every item to check your answer.' };
  }
  const label = (id: string) => spec.categories.find((category) => category.id === id)?.label ?? id;
  const wrong = spec.items
    .map((item, index) => ({ item, chosen: answer[index] as string }))
    .filter(({ item, chosen }) => chosen !== item.category);
  if (wrong.length === 0) return { correct: true, message: 'Correct.' };
  const right = spec.items.length - wrong.length;
  const explanations = wrong.map(({ item, chosen }) => (
    `"${item.text}" belongs under ${label(item.category)}, not ${label(chosen)}.`
    + (item.misconception === undefined ? '' : ` ${item.misconception}`)
  ));
  const message = [`${right} of ${spec.items.length} placed correctly.`, ...explanations].join(' ');
  return { correct: false, message, ...(spec.hint === undefined ? {} : { hint: spec.hint }) };
}

/**
 * The single authority on whether an answer is right. Pure: no DOM, no store,
 * no network. Nothing else in the app may decide correctness.
 */
export function check<S extends ExerciseSpec>(spec: S, answer: AnswerFor<S>): CheckResult {
  switch (spec.kind) {
    case 'numeric':
      return checkNumeric(spec, answer as number);
    case 'choice':
    case 'predict':
      return checkChoice(spec, answer as number);
    case 'vector':
      return checkVector(spec, answer as readonly number[]);
    case 'sequence':
      return checkSequence(spec, answer as readonly number[]);
    case 'classify':
      return checkClassify(spec, answer as readonly (string | null)[]);
  }
}

/** True once the learner has supplied every field, correct or not. */
export function isAnswered<S extends ExerciseSpec>(spec: S, answer: AnswerFor<S>): boolean {
  switch (spec.kind) {
    case 'numeric':
      return Number.isFinite(answer as number);
    case 'choice':
    case 'predict': {
      const index = answer as number;
      return Number.isInteger(index) && index >= 0 && index < spec.options.length;
    }
    case 'vector': {
      const values = answer as readonly number[];
      return values.length === spec.answer.length
        && values.every((value) => Number.isFinite(value));
    }
    case 'sequence':
      return isPermutation(answer as readonly number[], spec.steps.length);
    case 'classify': {
      const placed = answer as readonly (string | null)[];
      return placed.length === spec.items.length && placed.every((category) => category !== null);
    }
  }
}
