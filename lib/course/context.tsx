'use client';

import { createContext, useContext, type ReactNode } from 'react';
import type { Course } from './types';

const CourseContext = createContext<Course | null>(null);

export function CourseProvider({ course, children }: { course: Course; children: ReactNode }) {
  return <CourseContext.Provider value={course}>{children}</CourseContext.Provider>;
}

/** Loud without a provider: a platform component rendered outside a course is an integration error. */
export function useCourse(): Course {
  const course = useContext(CourseContext);
  if (course === null) throw new Error('useCourse needs a CourseProvider above it.');
  return course;
}
