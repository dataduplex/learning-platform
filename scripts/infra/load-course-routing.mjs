import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

export const COURSE_ROUTING_PATH = join(dirname(fileURLToPath(import.meta.url)), 'course-routing.js');

export function readCourseRoutingSource() {
  return readFileSync(COURSE_ROUTING_PATH, 'utf8');
}

/** Evaluates an edge-function source in a bare context and returns its globals. */
export function evaluateEdgeSource(source) {
  const context = vm.createContext({});
  vm.runInContext(source, context, { filename: 'edge-function.js' });
  return context;
}

export function loadCourseRouting() {
  return evaluateEdgeSource(readCourseRoutingSource()).routeCourse;
}
