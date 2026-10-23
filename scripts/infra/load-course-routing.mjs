import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

export const COURSE_ROUTING_PATH = join(dirname(fileURLToPath(import.meta.url)), 'course-routing.js');
const PREFIX_LINE = 'var COURSE_PREFIXES = [];';

export function readCourseRoutingTemplate() {
  return readFileSync(COURSE_ROUTING_PATH, 'utf8');
}

/** The edge source for a set of course prefixes, each with its leading slash and no trailing one. */
export function renderCourseRouting(prefixes) {
  const template = readCourseRoutingTemplate();
  if (!template.includes(PREFIX_LINE)) throw new Error(`course-routing.js lacks the line "${PREFIX_LINE}".`);
  for (const prefix of prefixes) {
    if (!prefix.startsWith('/') || prefix.endsWith('/')) {
      throw new Error(`Prefix "${prefix}" must start with "/" and not end with one.`);
    }
  }
  return template.replace(PREFIX_LINE, `var COURSE_PREFIXES = ${JSON.stringify(prefixes)};`);
}

/** Evaluates an edge-function source in a bare context and returns its globals. */
export function evaluateEdgeSource(source) {
  const context = vm.createContext({});
  vm.runInContext(source, context, { filename: 'edge-function.js' });
  return context;
}

export function loadCourseRouting(prefixes) {
  return evaluateEdgeSource(renderCourseRouting(prefixes)).routeCourse;
}
