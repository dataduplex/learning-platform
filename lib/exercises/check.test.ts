import { describe, expect, it } from 'vitest';
import type { ChoiceExercise, NumericExercise, PredictExercise, VectorExercise } from './types';
import { check, isAnswered } from './check';

const numeric: NumericExercise = {
  kind: 'numeric',
  id: 'cosine-of-45',
  prompt: 'What is the cosine similarity of (1, 0) and (1, 1)?',
  answer: 0.7071,
  tolerance: 0.001,
  hint: 'Divide the dot product by the product of the lengths.',
};

const choice: ChoiceExercise = {
  kind: 'choice',
  id: 'what-rank-means',
  prompt: 'A 3 by 3 matrix has rank 2. What does that tell you?',
  options: [
    'It maps space onto a plane.',
    'It has three independent columns.',
    'It is invertible.',
  ],
  correctIndex: 0,
  explanations: [
    'Right: the image is two-dimensional, so a plane.',
    'Rank 2 means exactly two independent columns.',
    'A rank-deficient square matrix has no inverse.',
  ],
};

const vector: VectorExercise = {
  kind: 'vector',
  id: 'project-onto-x',
  prompt: 'Project (2, 2) onto the x axis.',
  answer: [2, 0],
  tolerance: 0.001,
};

const predict: PredictExercise = {
  kind: 'predict',
  id: 'predict-doubling',
  prompt: 'If you double both vectors, what happens to the cosine?',
  options: ['It doubles.', 'It stays the same.', 'It halves.'],
  correctIndex: 1,
  reveal: 'Cosine divides out both lengths, so scale cannot reach it.',
};

describe('numeric exercises', () => {
  it('accepts an answer inside the tolerance', () => {
    expect(check(numeric, 0.7075).correct).toBe(true);
    expect(check(numeric, 0.7071).correct).toBe(true);
  });

  it('rejects an answer outside the tolerance and says which way it is off', () => {
    const low = check(numeric, 0.5);
    expect(low.correct).toBe(false);
    expect(low.message).toMatch(/too small/i);
    expect(check(numeric, 0.9).message).toMatch(/too large/i);
  });

  it('treats the tolerance as inclusive', () => {
    expect(check(numeric, 0.7071 + 0.001).correct).toBe(true);
  });

  it('treats the tolerance as inclusive on the low side too', () => {
    expect(check(numeric, 0.7071 - 0.001).correct).toBe(true);
  });

  it('rejects NaN with a message about the input, not the maths', () => {
    expect(check(numeric, Number.NaN).message).toMatch(/number/i);
  });

  it('offers the hint only on a wrong answer', () => {
    expect(check(numeric, 0.5).hint).toBe(numeric.hint);
    expect(check(numeric, 0.7071).hint).toBeUndefined();
  });
});

describe('choice exercises', () => {
  it('accepts the correct option and returns its explanation', () => {
    const result = check(choice, 0);
    expect(result.correct).toBe(true);
    expect(result.message).toBe(choice.explanations?.[0]);
  });

  it('rejects a wrong option and explains that option, not the right one', () => {
    const result = check(choice, 2);
    expect(result.correct).toBe(false);
    expect(result.message).toBe(choice.explanations?.[2]);
  });

  it('falls back to a generic message when no explanation is authored', () => {
    const { explanations, ...withoutExplanations } = choice;
    const bare: ChoiceExercise = withoutExplanations;
    expect(check(bare, 1).message).toMatch(/not right/i);
    expect(check(bare, 0).message).toMatch(/correct/i);
  });

  it('rejects an out-of-range index', () => {
    expect(check(choice, 9).correct).toBe(false);
    expect(check(choice, -1).message).toMatch(/choose/i);
  });
});

describe('vector exercises', () => {
  it('accepts componentwise agreement inside the tolerance', () => {
    expect(check(vector, [2, 0]).correct).toBe(true);
    expect(check(vector, [2.0005, -0.0005]).correct).toBe(true);
  });

  it('names the first component that is wrong', () => {
    const result = check(vector, [2, 3]);
    expect(result.correct).toBe(false);
    expect(result.message).toMatch(/component 2/i);
  });

  it('rejects the wrong length, naming both lengths', () => {
    expect(check(vector, [2]).message).toMatch(/2 components[\s\S]*1/);
  });

  it('rejects a blank component', () => {
    expect(check(vector, [2, Number.NaN]).message).toMatch(/every component/i);
  });

  it('treats a component exactly on the tolerance boundary as correct', () => {
    const fractional: VectorExercise = { ...vector, answer: [0.7071, 0.3], tolerance: 0.001 };
    expect(check(fractional, [0.7081, 0.301]).correct).toBe(true);
  });
});

describe('predict-then-reveal exercises', () => {
  it('returns the reveal whether the prediction was right or wrong', () => {
    expect(check(predict, 1).reveal).toBe(predict.reveal);
    expect(check(predict, 0).reveal).toBe(predict.reveal);
  });

  it('still reports correctness, because a prediction is a real answer', () => {
    expect(check(predict, 1).correct).toBe(true);
    expect(check(predict, 0).correct).toBe(false);
  });

  it('never returns a reveal for the other kinds', () => {
    expect(check(numeric, 0.7071).reveal).toBeUndefined();
    expect(check(choice, 0).reveal).toBeUndefined();
    expect(check(vector, [2, 0]).reveal).toBeUndefined();
  });
});

describe('isAnswered', () => {
  it('is false for an unstarted answer of every kind', () => {
    expect(isAnswered(numeric, Number.NaN)).toBe(false);
    expect(isAnswered(choice, -1)).toBe(false);
    expect(isAnswered(vector, [Number.NaN, Number.NaN])).toBe(false);
    expect(isAnswered(predict, -1)).toBe(false);
  });

  it('is true once every field carries a value, right or wrong', () => {
    expect(isAnswered(numeric, 0)).toBe(true);
    expect(isAnswered(choice, 2)).toBe(true);
    expect(isAnswered(vector, [0, 0])).toBe(true);
    expect(isAnswered(predict, 0)).toBe(true);
  });

  it('is false when a vector is partly filled in', () => {
    expect(isAnswered(vector, [2, Number.NaN])).toBe(false);
  });
});
