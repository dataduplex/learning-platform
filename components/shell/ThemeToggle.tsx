'use client';

import { useId } from 'react';
import { useCourse } from '../../lib/course/context';
import { themeStorageKey } from '../../lib/course/keys';
import { applyTheme, type ThemeChoice } from '../../lib/theme';
import { useThemeChoice } from '../../lib/theme-client';

const OPTIONS: readonly { value: ThemeChoice; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
];

export function ThemeToggle() {
  const id = useId();
  const choice = useThemeChoice();
  const key = themeStorageKey(useCourse().identity.storageKeyPrefix);

  function pick(next: ThemeChoice): void {
    applyTheme(next, document.documentElement, window.localStorage, key);
  }

  return (
    <fieldset className="theme-toggle" role="radiogroup" aria-labelledby={`${id}-label`}>
      <legend className="sr-only" id={`${id}-label`}>Theme</legend>
      {OPTIONS.map((option) => (
        <label className="theme-option" key={option.value}>
          <input
            type="radio"
            name={`${id}-theme`}
            value={option.value}
            checked={choice === option.value}
            onChange={() => pick(option.value)}
          />
          <span>{option.label}</span>
        </label>
      ))}
    </fieldset>
  );
}
