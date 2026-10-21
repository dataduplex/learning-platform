import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { allLessons, lessonPath } from '../../lib/course/curriculum.mjs';
import { TEST_AUTHORED, TEST_PARTS } from '../../test/fixtures';
import { renderWithProgress } from '../../test/render';
import { CourseMap } from './CourseMap';

const LESSONS = allLessons(TEST_PARTS);

describe('CourseMap', () => {
  it('renders one section per part, in order', () => {
    renderWithProgress(<CourseMap />);
    const headings = screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent);
    expect(headings).toEqual(TEST_PARTS.map((part) => part.title));
  });

  // The trailing slash is compared loosely: next/link normalises it from the build
  // config, which vitest does not load.
  it('lists every lesson as a link to its route', () => {
    renderWithProgress(<CourseMap />);
    const withoutSlash = (path: string) => path.replace(/\/$/, '');
    for (const lesson of LESSONS) {
      const link = screen.getByRole('link', { name: new RegExp(lesson.title, 'i') });
      expect(withoutSlash(link.getAttribute('href') ?? '')).toBe(withoutSlash(lessonPath(lesson.id)));
    }
  });

  it('marks authored lessons as available and the rest as planned', () => {
    renderWithProgress(<CourseMap />);
    const unwritten = LESSONS.filter((lesson) => !TEST_AUTHORED.includes(lesson.id)).length;
    expect(unwritten).toBe(1);
    expect(screen.getAllByText('planned')).toHaveLength(1);
    expect(screen.getByText(/Lessons marked planned are not written yet/)).toBeInTheDocument();
  });

  it('shows a completion mark once a lesson is complete', async () => {
    const { store } = renderWithProgress(<CourseMap />);
    const first = LESSONS[0]!;
    await Promise.resolve(store.setCompleted(first.id, true));
    expect(
      await screen.findByRole('link', { name: new RegExp(`${first.title}.*complete`, 'i') }),
    ).toBeInTheDocument();
  });

  it('links the reference page the course names', async () => {
    const user = userEvent.setup();
    renderWithProgress(<CourseMap />);
    const link = screen.getByRole('link', { name: /glossary reference/i });
    expect(link).toHaveAttribute('href', '/glossary');
    await user.hover(link);
  });
});
