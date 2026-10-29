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

/** Commit to a prediction, then see what actually happens. */
export interface PredictExercise extends ExerciseBase {
  kind: 'predict';
  options: readonly string[];
  correctIndex: number;
  reveal: string;
}

/** Steps shown out of order; the learner restores the order. */
export interface SequenceExercise extends ExerciseBase {
  kind: 'sequence';
  /** In the correct order. */
  steps: readonly string[];
  /** The order the steps are first shown in: a permutation of the step indices, fixed by the author. */
  presented: readonly number[];
  /** Keyed by step index: what placing that step where it does not belong usually means. */
  misconceptions?: Readonly<Record<number, string>>;
  hint?: string;
}

/** Each item belongs to one category; the learner places every item. */
export interface ClassifyExercise extends ExerciseBase {
  kind: 'classify';
  categories: readonly { id: string; label: string }[];
  items: readonly { text: string; category: string; misconception?: string }[];
  hint?: string;
}

export type ExerciseSpec =
  | NumericExercise
  | ChoiceExercise
  | VectorExercise
  | PredictExercise
  | SequenceExercise
  | ClassifyExercise;

/**
 * The answer shape each kind expects. Choice indices use -1 for unanswered; a
 * sequence is the step indices in the learner's order; a classification is one
 * category id per item, null while unplaced.
 */
export type AnswerFor<S extends ExerciseSpec> =
  S extends NumericExercise ? number
  : S extends VectorExercise ? readonly number[]
  : S extends SequenceExercise ? readonly number[]
  : S extends ClassifyExercise ? readonly (string | null)[]
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
