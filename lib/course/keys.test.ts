import { describe, expect, it } from 'vitest';
import { progressStorageKey, themeStorageKey, tutorKeyStorageKey } from './keys';

describe('storage keys', () => {
  it('all sit under the course prefix', () => {
    expect(progressStorageKey('x')).toBe('x:progress:v1');
    expect(tutorKeyStorageKey('x')).toBe('x:tutor-key');
    expect(themeStorageKey('x')).toBe('x:theme');
  });
});
