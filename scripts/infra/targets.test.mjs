import { describe, expect, it } from 'vitest';
import { COURSES, basePaths, courseFromArgv, courseTarget } from './targets.mjs';

describe('the course table', () => {
  it('derives every path of a course from its prefix', () => {
    const course = courseTarget('llm-math');
    expect(course.prefix).toBe('engineer/learning/ai/math');
    expect(course.BASE_PATH).toBe('/engineer/learning/ai/math');
    expect(course.COURSE_URL).toBe('https://dev.samsungtv.plus/engineer/learning/ai/math/');
    expect(course.PATH_PATTERN).toBe('/engineer/learning/ai/math/*');
    expect(course.SAMPLE_LESSON).toBe('train-a-net');
  });

  it('lists every prefix for the edge, with its leading slash', () => {
    expect(basePaths()).toEqual(Object.values(COURSES).map((course) => `/${course.prefix}`));
    expect(basePaths()).toContain('/engineer/learning/ai/math');
  });

  it('refuses a course it does not know, naming the ones it does', () => {
    expect(() => courseTarget('no-such-course')).toThrow(/known: llm-math/);
  });

  it('reads --course from an argv and insists on it', () => {
    expect(courseFromArgv(['--profile', 'x', '--course', 'llm-math']).id).toBe('llm-math');
    expect(() => courseFromArgv(['--profile', 'x'])).toThrow(/--course <id> is required/);
  });
});
