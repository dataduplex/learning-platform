import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { allLessons } from '../../lib/course/curriculum.mjs';
import { TEST_PARTS } from '../../test/fixtures';
import { renderWithProgress } from '../../test/render';
import { PrevNext } from './PrevNext';

const LESSONS = allLessons(TEST_PARTS);

describe('PrevNext', () => {
  it('links both neighbours in the middle of the course', () => {
    renderWithProgress(<PrevNext lessonId="beta" />);
    expect(screen.getByRole('link', { name: /alpha/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /gamma/i })).toBeInTheDocument();
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
    renderWithProgress(<PrevNext lessonId="beta" />);
    expect(screen.getByRole('navigation', { name: /lesson/i })).toBeInTheDocument();
  });
});
