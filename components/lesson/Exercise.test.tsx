import userEvent from '@testing-library/user-event';
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { NumericExercise, PredictExercise, VectorExercise } from '@/lib/exercises';
import { renderWithProgress } from '@/test/render';
import { Exercise } from './Exercise';

const LESSON = 'dot-product-similarity' as const;

const numeric: NumericExercise = {
  kind: 'numeric',
  id: 'cosine-of-45',
  prompt: 'What is the cosine similarity of (1, 0) and (1, 1)?',
  answer: 0.7071,
  tolerance: 0.001,
  hint: 'Divide the dot product by the product of the lengths.',
};

const vector: VectorExercise = {
  kind: 'vector',
  id: 'project-onto-x',
  prompt: 'Project (2, 2) onto the x axis.',
  answer: [2, 0],
  tolerance: 0.001,
  labels: ['x', 'y'],
};

const predict: PredictExercise = {
  kind: 'predict',
  id: 'predict-doubling',
  prompt: 'If you double both vectors, what happens to the cosine?',
  options: ['It doubles.', 'It stays the same.', 'It halves.'],
  correctIndex: 1,
  reveal: 'Cosine divides out both lengths, so scale cannot reach it.',
};

describe('Exercise, numeric', () => {
  it('renders the prompt and an accessible input', async () => {
    renderWithProgress(<Exercise spec={numeric} lesson={LESSON} />);
    expect(screen.getByText(numeric.prompt)).toBeInTheDocument();
    expect(screen.getByLabelText(/your answer/i)).toBeInTheDocument();
  });

  it('keeps the check button disabled until something is entered', async () => {
    const user = userEvent.setup();
    renderWithProgress(<Exercise spec={numeric} lesson={LESSON} />);
    const button = screen.getByRole('button', { name: /check/i });
    expect(button).toBeDisabled();
    await user.type(screen.getByLabelText(/your answer/i), '0.7071');
    expect(button).toBeEnabled();
  });

  it('announces a correct verdict in a status region', async () => {
    const user = userEvent.setup();
    renderWithProgress(<Exercise spec={numeric} lesson={LESSON} />);
    await user.type(screen.getByLabelText(/your answer/i), '0.7071');
    await user.click(screen.getByRole('button', { name: /check/i }));
    expect(screen.getByRole('status')).toHaveTextContent(/correct/i);
  });

  it('shows the hint on a wrong answer and keeps the entered value', async () => {
    const user = userEvent.setup();
    renderWithProgress(<Exercise spec={numeric} lesson={LESSON} />);
    const input = screen.getByLabelText(/your answer/i);
    await user.type(input, '0.5');
    await user.click(screen.getByRole('button', { name: /check/i }));
    expect(screen.getByRole('status')).toHaveTextContent(/too small/i);
    expect(screen.getByText(numeric.hint as string)).toBeInTheDocument();
    expect(input).toHaveValue(0.5);
  });

  it('records every submission as an attempt, wrong ones included', async () => {
    const user = userEvent.setup();
    const { store } = renderWithProgress(<Exercise spec={numeric} lesson={LESSON} />);
    const input = screen.getByLabelText(/your answer/i);
    await user.type(input, '0.5');
    await user.click(screen.getByRole('button', { name: /check/i }));
    await user.clear(input);
    await user.type(input, '0.7071');
    await user.click(screen.getByRole('button', { name: /check/i }));

    const attempts = store.load().lessons[LESSON]?.attempts ?? [];
    expect(attempts.map((a) => a.correct)).toEqual([false, true]);
    expect(attempts.every((a) => a.exerciseId === numeric.id)).toBe(true);
  });
});

describe('Exercise, vector', () => {
  it('labels each component input from the spec', () => {
    renderWithProgress(<Exercise spec={vector} lesson={LESSON} />);
    expect(screen.getByLabelText('x')).toBeInTheDocument();
    expect(screen.getByLabelText('y')).toBeInTheDocument();
  });

  it('stays unsubmittable until every component is filled', async () => {
    const user = userEvent.setup();
    renderWithProgress(<Exercise spec={vector} lesson={LESSON} />);
    await user.type(screen.getByLabelText('x'), '2');
    expect(screen.getByRole('button', { name: /check/i })).toBeDisabled();
    await user.type(screen.getByLabelText('y'), '0');
    expect(screen.getByRole('button', { name: /check/i })).toBeEnabled();
  });

  it('names the wrong component', async () => {
    const user = userEvent.setup();
    renderWithProgress(<Exercise spec={vector} lesson={LESSON} />);
    await user.type(screen.getByLabelText('x'), '2');
    await user.type(screen.getByLabelText('y'), '3');
    await user.click(screen.getByRole('button', { name: /check/i }));
    expect(screen.getByRole('status')).toHaveTextContent(/component 2/i);
  });
});

describe('Exercise, predict-then-reveal', () => {
  it('offers the options as radios in a group named by the prompt', () => {
    renderWithProgress(<Exercise spec={predict} lesson={LESSON} />);
    expect(screen.getByRole('radiogroup', { name: predict.prompt })).toBeInTheDocument();
    expect(screen.getAllByRole('radio')).toHaveLength(3);
  });

  it('hides the reveal until a prediction is submitted', async () => {
    const user = userEvent.setup();
    renderWithProgress(<Exercise spec={predict} lesson={LESSON} />);
    expect(screen.queryByText(predict.reveal)).not.toBeInTheDocument();
    await user.click(screen.getByRole('radio', { name: predict.options[1] as string }));
    expect(screen.queryByText(predict.reveal)).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /check/i }));
    expect(screen.getByText(predict.reveal)).toBeInTheDocument();
  });

  it('reveals after a wrong prediction too', async () => {
    const user = userEvent.setup();
    renderWithProgress(<Exercise spec={predict} lesson={LESSON} />);
    await user.click(screen.getByRole('radio', { name: predict.options[0] as string }));
    await user.click(screen.getByRole('button', { name: /check/i }));
    expect(screen.getByText(predict.reveal)).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(/not right/i);
  });

  it('marks the attempt as revealed so the record distinguishes it', async () => {
    const user = userEvent.setup();
    const { store } = renderWithProgress(<Exercise spec={predict} lesson={LESSON} />);
    await user.click(screen.getByRole('radio', { name: predict.options[1] as string }));
    await user.click(screen.getByRole('button', { name: /check/i }));
    expect(store.load().lessons[LESSON]?.attempts[0]?.revealed).toBe(true);
  });

  it('is fully keyboard operable', async () => {
    const user = userEvent.setup();
    renderWithProgress(<Exercise spec={predict} lesson={LESSON} />);
    await user.tab();
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('radio', { name: predict.options[1] as string })).toBeChecked();
    await user.tab();
    await user.keyboard('{Enter}');
    expect(screen.getByRole('status')).toHaveTextContent(/correct/i);
  });
});
