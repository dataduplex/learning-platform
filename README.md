# @learning/platform

The lesson platform shared by the learning courses: the lesson shell, exercises, progress, the tutor, the Layer 0 primitives, the site shell, the test helpers, the platform stylesheet, and the deploy and infrastructure scripts.
A course supplies a `Course` object and its lessons; the platform renders them.

## Consuming it

The package ships TypeScript source and has no build step.
A course pins it to a release tag as a git dependency:

```json
"dependencies": {
  "@learning/platform": "git+ssh://git@github.com/dataduplex/learning-platform.git#vX.Y.Z"
}
```

Then:

- `next.config.ts`: `transpilePackages: ['@learning/platform']`.
- `vitest.config.mts`: `test.server.deps.inline: [/@learning\/platform/]`, and a `test/setup.ts` that imports `@learning/platform/test/setup`.
- `app/globals.css`: `@import "@learning/platform/styles/platform.css";` right after `@import "tailwindcss";`, and `@source "../node_modules/@learning/platform/components";`.
- `app/layout.tsx`: wrap the tree in `CourseProvider` from `lib/course/context` with the course's `Course`, then `ProgressProvider`; render `SiteHeader` with the course title and reference link; inline `themeBootstrapScript(themeStorageKey(prefix))`.
- Course spine modules that Node scripts or Playwright load import platform types with `import type` and runtime code only from `.mjs` modules such as `lib/course/curriculum.mjs`.

Imports mirror the tree: `@learning/platform/components/primitives/Plot`, `@learning/platform/lib/exercises`, `@learning/platform/test/render`.

## Scripts

Run from the course directory, which holds `content/`, `out/` and the npm scripts:

- `node --experimental-strip-types node_modules/@learning/platform/scripts/build-lesson-context.mjs`
- `node node_modules/@learning/platform/scripts/deploy/deploy.mjs --course <id> --profile <name> [--dry-run]`
- `node node_modules/@learning/platform/scripts/infra/check-live.mjs --course <id>`
- `node node_modules/@learning/platform/scripts/deploy/serve-prefixed.mjs --course <id> --port <port>`
- `node node_modules/@learning/platform/scripts/infra/<create-bucket|create-oac|create-cache-policy|update-distribution|update-function>.mjs --profile <name> (--dry-run | --yes)`

The course table is `scripts/infra/targets.mjs`; a new course is a new row.

## Releasing

1. `npm run check` here.
2. Bump `version` in package.json to the tag you are about to cut.
3. In every consuming course, pin the candidate commit hash and run the course's full gate.
4. Tag (`git tag -a vX.Y.Z -m "..."`, `git push origin main --tags`); courses pin the tag.

A change that alters a signature a course uses is a major version.
