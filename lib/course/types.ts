export type LessonId = string;

export interface Lesson {
  readonly id: LessonId;
  readonly title: string;
  /** One sentence: what the learner can do afterwards. */
  readonly goal: string;
  /** Shown as the lesson kicker when present. */
  readonly payoff?: string;
  /** Every entry MUST appear earlier in the spine. */
  readonly prerequisites: readonly LessonId[];
  readonly estimatedMinutes: number;
}

export interface Part {
  readonly id: string;
  readonly title: string;
  readonly blurb: string;
  /** 'available' parts have lesson files and are navigable. */
  readonly status: 'available' | 'upcoming';
  readonly lessons: readonly Lesson[];
}

export interface NotationEntry {
  /** Stable id referenced from a lesson as <Sym id="..." />. */
  readonly id: string;
  /** KaTeX source, no delimiters. */
  readonly symbol: string;
  readonly name: string;
  readonly meaning: string;
  /** Present only for symbols that carry a tensor shape. */
  readonly shape?: string;
  readonly introducedIn: LessonId;
}

/** The reference page a course links from its header and course map. */
export interface ReferenceLink {
  readonly label: string;
  /** Absolute path within the site, without a trailing slash; links normalise it. */
  readonly path: string;
}

/** The two sentences that open the tutor's system prompt. */
export interface TutorPersona {
  /** What the course is about, completing "an interactive course on ...". */
  readonly subject: string;
  /** Who the learner is, completing "The learner is ...". */
  readonly learner: string;
}

export interface CourseIdentity {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  /** Prefix of every localStorage key the course writes. */
  readonly storageKeyPrefix: string;
  /** The path prefix the site is built for. Empty at the root. */
  readonly basePath: string;
  readonly reference: ReferenceLink;
  readonly tutor: TutorPersona;
}

/** Everything the platform needs to know about a course, supplied by the course. */
export interface Course {
  readonly identity: CourseIdentity;
  readonly curriculum: readonly Part[];
  /** The lessons with files; the rest render as planned. */
  readonly authoredLessonIds: readonly LessonId[];
}
