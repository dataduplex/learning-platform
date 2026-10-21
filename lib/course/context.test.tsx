import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { TEST_COURSE } from '../../test/fixtures';
import { CourseProvider, useCourse } from './context';

function Title() {
  return <h1>{useCourse().identity.title}</h1>;
}

describe('CourseProvider', () => {
  it('hands the course to anything below it', () => {
    render(<CourseProvider course={TEST_COURSE}><Title /></CourseProvider>);
    expect(screen.getByRole('heading')).toHaveTextContent('A test course');
  });

  it('is required: a component rendered outside a course is an integration error', () => {
    expect(() => render(<Title />)).toThrow(/CourseProvider/);
  });
});
