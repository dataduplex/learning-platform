import type { Course, NotationEntry, Part } from '../lib/course/types';

/** Two parts, four lessons: enough spine for every navigation case. */
export const TEST_PARTS: readonly Part[] = [
  {
    id: 'one',
    title: 'Part one',
    blurb: 'The first part.',
    status: 'available',
    lessons: [
      { id: 'alpha', title: 'Alpha', goal: 'Learn alpha.', payoff: 'Alpha pays off.', prerequisites: [], estimatedMinutes: 10 },
      { id: 'beta', title: 'Beta', goal: 'Learn beta.', prerequisites: ['alpha'], estimatedMinutes: 15 },
    ],
  },
  {
    id: 'two',
    title: 'Part two',
    blurb: 'The second part.',
    status: 'available',
    lessons: [
      { id: 'gamma', title: 'Gamma', goal: 'Learn gamma.', prerequisites: ['beta'], estimatedMinutes: 20 },
      { id: 'delta', title: 'Delta', goal: 'Learn delta.', prerequisites: ['gamma'], estimatedMinutes: 25 },
    ],
  },
];

/** Three of the four lessons have files; delta renders as planned. */
export const TEST_AUTHORED: readonly string[] = ['alpha', 'beta', 'gamma'];

export const TEST_NOTATION: readonly NotationEntry[] = [
  {
    id: 'vec', symbol: '\\mathbf{v}', name: 'Vector',
    meaning: 'An ordered list of numbers.', shape: '(n,)', introducedIn: 'alpha',
  },
  {
    id: 'dot', symbol: '\\mathbf{a} \\cdot \\mathbf{b}', name: 'Dot product',
    meaning: 'The sum of entrywise products.', introducedIn: 'beta',
  },
];

export function testNotationById(id: string): NotationEntry | undefined {
  return TEST_NOTATION.find((entry) => entry.id === id);
}

export const TEST_COURSE: Course = {
  identity: {
    id: 'test-course',
    title: 'A test course',
    description: 'A course that exists only inside the test suite.',
    storageKeyPrefix: 'test-course',
    basePath: '',
    reference: { label: 'Glossary', path: '/glossary' },
    tutor: { subject: 'a test subject', learner: 'a test learner' },
  },
  curriculum: TEST_PARTS,
  authoredLessonIds: TEST_AUTHORED,
};
