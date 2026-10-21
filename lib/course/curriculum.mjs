// MUST stay plain JavaScript, typed by curriculum.d.mts: Node imports it without a transform.

export function allLessons(parts) {
  return parts.flatMap((part) => part.lessons);
}

export function lessonById(parts, id) {
  return allLessons(parts).find((lesson) => lesson.id === id);
}

export function partOfLesson(parts, id) {
  return parts.find((part) => part.lessons.some((lesson) => lesson.id === id));
}

export function partById(parts, id) {
  return parts.find((part) => part.id === id);
}

export function lessonsInPart(parts, id) {
  return partById(parts, id)?.lessons ?? [];
}

export function neighbours(parts, id) {
  const lessons = allLessons(parts);
  const index = lessons.findIndex((lesson) => lesson.id === id);
  if (index === -1) return { previous: undefined, next: undefined };
  return { previous: lessons[index - 1], next: lessons[index + 1] };
}

/** The single place a lesson URL is constructed. */
export function lessonPath(id) {
  return `/lessons/${id}/`;
}
