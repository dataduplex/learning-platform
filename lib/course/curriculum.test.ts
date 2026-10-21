import { describe, expect, it } from 'vitest';
import { TEST_PARTS } from '../../test/fixtures';
import {
  allLessons, lessonById, lessonPath, lessonsInPart, neighbours, partById, partOfLesson,
} from './curriculum.mjs';

describe('curriculum lookups', () => {
  it('flatten the parts into the spine, in order', () => {
    expect(allLessons(TEST_PARTS).map((lesson) => lesson.id)).toEqual(['alpha', 'beta', 'gamma', 'delta']);
  });

  it('find a lesson and its part by id', () => {
    expect(lessonById(TEST_PARTS, 'gamma')?.title).toBe('Gamma');
    expect(partOfLesson(TEST_PARTS, 'gamma')?.id).toBe('two');
    expect(lessonById(TEST_PARTS, 'omega')).toBeUndefined();
    expect(partOfLesson(TEST_PARTS, 'omega')).toBeUndefined();
  });

  it('list the lessons of a part, and nothing for an unknown part', () => {
    expect(partById(TEST_PARTS, 'one')?.title).toBe('Part one');
    expect(lessonsInPart(TEST_PARTS, 'two').map((lesson) => lesson.id)).toEqual(['gamma', 'delta']);
    expect(lessonsInPart(TEST_PARTS, 'three')).toEqual([]);
  });

  it('give both neighbours, and none at the ends or for an unknown lesson', () => {
    expect(neighbours(TEST_PARTS, 'beta')).toEqual({
      previous: lessonById(TEST_PARTS, 'alpha'),
      next: lessonById(TEST_PARTS, 'gamma'),
    });
    expect(neighbours(TEST_PARTS, 'alpha').previous).toBeUndefined();
    expect(neighbours(TEST_PARTS, 'delta').next).toBeUndefined();
    expect(neighbours(TEST_PARTS, 'omega')).toEqual({ previous: undefined, next: undefined });
  });

  it('build every lesson URL with its trailing slash', () => {
    expect(lessonPath('alpha')).toBe('/lessons/alpha/');
  });
});
