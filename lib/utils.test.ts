/**
 * @jest-environment jsdom
 */
import { cn } from './utils';

describe('Utils - cn function', () => {
  it('merges class names correctly', () => {
    const result = cn('foo', 'bar');
    expect(result).toContain('foo');
    expect(result).toContain('bar');
  });

  it('handles conditional classes', () => {
    const result = cn('foo', false && 'bar', 'baz');
    expect(result).toContain('foo');
    expect(result).toContain('baz');
    expect(result).not.toContain('bar');
  });

  it('merges tailwind classes correctly', () => {
    const result = cn('px-2 py-1', 'px-4');
    expect(result).toContain('px-4');
    expect(result).toContain('py-1');
  });

  it('handles empty input', () => {
    const result = cn();
    expect(typeof result).toBe('string');
  });

  it('handles undefined and null values', () => {
    const result = cn('foo', undefined, null, 'bar');
    expect(result).toContain('foo');
    expect(result).toContain('bar');
  });

  it('handles array of classes', () => {
    const result = cn(['foo', 'bar']);
    expect(result).toContain('foo');
    expect(result).toContain('bar');
  });

  it('handles objects with boolean values', () => {
    const result = cn({
      foo: true,
      bar: false,
      baz: true,
    });
    expect(result).toContain('foo');
    expect(result).toContain('baz');
    expect(result).not.toContain('bar');
  });
});
