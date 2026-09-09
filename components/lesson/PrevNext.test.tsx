import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { allLessons } from '@/content/curriculum';
import { renderWithProgress } from '@/test/render';
import { PrevNext } from './PrevNext';

// CURRICULUM is parts; neighbours() walks lessons, so these index allLessons().
const LESSONS = allLessons();

describe('PrevNext', () => {
  it('links both neighbours in the middle of the course', () => {
    const middle = LESSONS[2]!;
    renderWithProgress(<PrevNext lessonId={middle.id} />);
    expect(screen.getByRole('link', { name: new RegExp(LESSONS[1]!.title, 'i') })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: new RegExp(LESSONS[3]!.title, 'i') })).toBeInTheDocument();
  });

  it('omits the previous link on the first lesson', () => {
    renderWithProgress(<PrevNext lessonId={LESSONS[0]!.id} />);
    expect(screen.getAllByRole('link')).toHaveLength(1);
    expect(screen.getByText(/next/i)).toBeInTheDocument();
  });

  it('omits the next link on the last lesson', () => {
    renderWithProgress(<PrevNext lessonId={LESSONS[LESSONS.length - 1]!.id} />);
    expect(screen.getAllByRole('link')).toHaveLength(1);
    expect(screen.getByText(/previous/i)).toBeInTheDocument();
  });

  it('labels itself as lesson navigation', () => {
    renderWithProgress(<PrevNext lessonId={LESSONS[1]!.id} />);
    expect(screen.getByRole('navigation', { name: /lesson/i })).toBeInTheDocument();
  });
});
