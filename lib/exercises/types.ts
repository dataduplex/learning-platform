interface ExerciseBase {
  id: string;
  /** Plain text or KaTeX source; the component renders it as Markdown-free prose. */
  prompt: string;
}

/** A single number, checked against an absolute tolerance. */
export interface NumericExercise extends ExerciseBase {
  kind: 'numeric';
  answer: number;
  tolerance: number;
  unit?: string;
  hint?: string;
}

/** One right option out of several. */
export interface ChoiceExercise extends ExerciseBase {
  kind: 'choice';
  options: readonly string[];
  correctIndex: number;
  /** One entry per option, shown whichever option was picked. */
  explanations?: readonly string[];
  hint?: string;
}

/** Componentwise numeric entry. */
export interface VectorExercise extends ExerciseBase {
  kind: 'vector';
  answer: readonly number[];
  tolerance: number;
  labels?: readonly string[];
  hint?: string;
}

/**
 * Commit to a prediction, then see what actually happens. The reveal is the
 * point: it lands only after the learner has something at stake.
 */
export interface PredictExercise extends ExerciseBase {
  kind: 'predict';
  options: readonly string[];
  correctIndex: number;
  reveal: string;
}

export type ExerciseSpec =
  | NumericExercise
  | ChoiceExercise
  | VectorExercise
  | PredictExercise;

/** The answer shape each kind expects. Choice indices use -1 for unanswered. */
export type AnswerFor<S extends ExerciseSpec> =
  S extends NumericExercise ? number
  : S extends VectorExercise ? readonly number[]
  : number;

export interface CheckResult {
  correct: boolean;
  /** Always present. Explains the answer given, not the answer wanted. */
  message: string;
  /** Present on a wrong answer when the spec authored a hint. */
  hint?: string;
  /** Present only for predict-then-reveal, whatever the verdict. */
  reveal?: string;
}
