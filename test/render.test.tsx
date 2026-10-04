import { describe, expect, it } from 'vitest';
import { pathVertices } from './render';

function path(d: string): Element {
  const element = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  element.setAttribute('d', d);
  return element;
}

describe('pathVertices', () => {
  it('reads each M and L point and an arc\'s end point, and closes on Z', () => {
    expect(pathVertices(path('M1,2 L3,4 A4,4 0 0 1 5,6 L7,8 Z'))).toEqual([[1, 2], [3, 4], [5, 6], [7, 8]]);
  });

  it('throws on a command it does not read, naming it', () => {
    expect(() => pathVertices(path('M0,0 H10 V10 Z'))).toThrow('uses the H command');
    expect(() => pathVertices(path('M0,0 l10,10'))).toThrow('uses the l command');
    expect(() => pathVertices(path('M0,0 C1,1 2,2 3,3'))).toThrow('uses the C command');
  });

  it('throws on a command that carries the wrong count of numbers', () => {
    expect(() => pathVertices(path('M0,0 1,1'))).toThrow('gives M 4 numbers where it takes 2');
    expect(() => pathVertices(path('M0,0 A4,4 0 0 1 5'))).toThrow('gives A 6 numbers where it takes 7');
  });

  it('throws on a coordinate that is not finite', () => {
    expect(() => pathVertices(path('M0,NaN L1,1'))).toThrow('has a coordinate that is not finite');
    expect(() => pathVertices(path('M0,0 L1,Infinity'))).toThrow('has a coordinate that is not finite');
  });
});
