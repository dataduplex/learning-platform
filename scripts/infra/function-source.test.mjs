import { describe, expect, it } from 'vitest';
import {
  COMBINED_HANDLER, DENIED_ADDRESS, EDGE_SIZE_LIMIT, firstAllowedAddress, functionChecks,
  mismatch, runLocally, spliceRouting, viewerEvent,
} from './function-source.mjs';
import { renderCourseRouting } from './load-course-routing.mjs';
import { courseTarget } from './targets.mjs';

const { BASE_PATH } = courseTarget('llm-math');

const LIVE = `var ALLOWED = ['203.0.113.', '198.51.100.7'];

function handler(event) {
  var ip = event.viewer.ip;
  for (var i = 0; i < ALLOWED.length; i++) {
    if (ip.startsWith(ALLOWED[i])) return event.request;
  }
  return { statusCode: 403, statusDescription: 'Forbidden', body: 'Forbidden: ' + ip };
}
`;

const combined = spliceRouting(LIVE, renderCourseRouting([BASE_PATH]));

describe('spliceRouting', () => {
  it('keeps every byte before the handler', () => {
    expect(combined.startsWith(LIVE.slice(0, LIVE.indexOf('function handler(')))).toBe(true);
  });

  it('keeps the handler body under a new name and adds exactly one handler', () => {
    expect(combined.match(/function allowlistHandler\(/g)).toHaveLength(1);
    expect(combined.match(/function handler\(/g)).toHaveLength(1);
    expect(combined).toContain("return { statusCode: 403, statusDescription: 'Forbidden', body: 'Forbidden: ' + ip };");
    expect(combined.trimEnd().endsWith(COMBINED_HANDLER)).toBe(true);
  });

  it('refuses a source with no handler or with two', () => {
    expect(() => spliceRouting('var x = 1;', '')).toThrow(/no "function handler\("/);
    expect(() => spliceRouting('function handler(e) {}\nfunction handler(e) {}', '')).toThrow(/more than once/);
  });

  it('refuses a source that already carries the routing', () => {
    expect(() => spliceRouting(combined, renderCourseRouting([BASE_PATH]))).toThrow(/already carries/);
  });

  it('stays far inside the runtime limit', () => {
    expect(Buffer.byteLength(combined, 'utf8')).toBeLessThan(EDGE_SIZE_LIMIT / 2);
  });
});

describe('firstAllowedAddress', () => {
  it('completes a dotted prefix to a full address that starts with it', () => {
    expect(firstAllowedAddress(LIVE)).toBe('203.0.113.1');
  });

  it('keeps a full address, and pads a prefix without a trailing dot', () => {
    expect(firstAllowedAddress("var A = ['198.51.100.7'];\nfunction handler() {}")).toBe('198.51.100.7');
    expect(firstAllowedAddress("var A = ['198.51.100'];\nfunction handler() {}")).toBe('198.51.100.1');
  });

  it('passes over a quoted literal with too few octets to be an address', () => {
    const source = "var VERSION = '1.0';\nvar A = ['203.0.113.'];\nfunction handler() {}";
    expect(firstAllowedAddress(source)).toBe('203.0.113.1');
  });

  it('refuses a source with nothing that looks like an address', () => {
    expect(() => firstAllowedAddress("var A = ['nope'];\nfunction handler() {}")).toThrow(/No quoted IPv4/);
  });
});

describe('the combined handler', () => {
  const checks = functionChecks({ allowed: firstAllowedAddress(LIVE), denied: DENIED_ADDRESS, basePaths: [BASE_PATH] });

  it('has six checks: an allowed root, a denied page, and the four course rows', () => {
    expect(checks.map((check) => check.name)).toEqual([
      'allowed address, dashboard root', `denied address, course page ${BASE_PATH}`, `bare prefix ${BASE_PATH}`,
      `directory URL ${BASE_PATH}`, `unslashed page ${BASE_PATH}`, `file ${BASE_PATH}`,
    ]);
  });

  it('passes every check when run locally', () => {
    for (const check of checks) {
      expect(mismatch(runLocally(combined, check.event), check.expect), check.name).toBeNull();
    }
  });

  it("denies with the live code's own 403, naming the address", () => {
    const { response } = runLocally(combined, viewerEvent(DENIED_ADDRESS, `${BASE_PATH}/`));
    expect(response.statusCode).toBe(403);
    expect(response.body).toBe(`Forbidden: ${DENIED_ADDRESS}`);
  });

  it('routes an allowed request', () => {
    const { request } = runLocally(combined, viewerEvent('203.0.113.9', `${BASE_PATH}/lessons/train-a-net/`));
    expect(request.uri).toBe(`${BASE_PATH}/lessons/train-a-net/index.html`);
  });
});

describe('mismatch', () => {
  it('reports the wrong kind, the wrong uri, the wrong status and the wrong location', () => {
    expect(mismatch({ response: { statusCode: 301 } }, { request: '/' })).toMatch(/expected a request/);
    expect(mismatch({ request: { uri: '/a' } }, { request: '/b' })).toBe('expected uri /b, got /a');
    expect(mismatch({ request: { uri: '/' } }, { response: 403 })).toMatch(/expected a response/);
    expect(mismatch({ response: { statusCode: 302 } }, { response: 301 })).toBe('expected status 301, got 302');
    expect(mismatch({ response: { statusCode: 301, headers: {} } }, { response: 301, location: '/x/' }))
      .toBe('expected location /x/, got undefined');
  });

  it('accepts a 403 without caring about its headers', () => {
    expect(mismatch({ response: { statusCode: 403, body: 'no' } }, { response: 403 })).toBeNull();
  });
});
