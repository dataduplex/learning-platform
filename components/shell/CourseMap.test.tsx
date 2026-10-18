import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { CURRICULUM, allLessons, isAuthoredLessonId, lessonPath } from '@/content/curriculum';
import { renderWithProgress } from '@/test/render';
import { CourseMap } from './CourseMap';

describe('CourseMap', () => {
  it('renders one section per part, in order', () => {
    renderWithProgress(<CourseMap />);
    const headings = screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent);
    expect(headings).toEqual(CURRICULUM.map((part) => part.title));
  });

  // CURRICULUM is parts, so the lesson-level assertions below walk allLessons().
  // Routes come from lessonPath, the one place a lesson URL is constructed. The
  // trailing slash is compared loosely: next/link normalises it from the build
  // config, which vitest does not load, so the on-disk shape is task 28's export
  // assertion rather than this one's.
  it('lists every lesson as a link to its route', () => {
    renderWithProgress(<CourseMap />);
    const withoutSlash = (path: string) => path.replace(/\/$/, '');
    for (const lesson of allLessons()) {
      const link = screen.getByRole('link', { name: new RegExp(lesson.title, 'i') });
      expect(withoutSlash(link.getAttribute('href') ?? '')).toBe(withoutSlash(lessonPath(lesson.id)));
    }
  });

  it('marks authored lessons as available and the rest as planned', () => {
    renderWithProgress(<CourseMap />);
    const unwritten = allLessons().filter((l) => !isAuthoredLessonId(l.id)).length;
    // queryAll, not getAll: once every lesson is authored there is no planned marker to find.
    expect(screen.queryAllByText('planned').length).toBe(unwritten);
    const note = screen.queryByText(/Lessons marked planned are not written yet/);
    if (unwritten > 0) expect(note).not.toBeNull();
    else expect(note).toBeNull();
  });

  it('shows a completion mark once a lesson is complete', async () => {
    const { store } = renderWithProgress(<CourseMap />);
    const first = allLessons()[0]!;
    await Promise.resolve(store.setCompleted(first.id, true));
    expect(
      await screen.findByRole('link', { name: new RegExp(`${first.title}.*complete`, 'i') }),
    ).toBeInTheDocument();
  });

  it('links the notation reference', async () => {
    const user = userEvent.setup();
    renderWithProgress(<CourseMap />);
    const link = screen.getByRole('link', { name: /notation/i });
    expect(link).toHaveAttribute('href', '/notation');
    await user.hover(link);
  });
});
