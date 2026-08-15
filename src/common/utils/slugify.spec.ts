import { slugify } from './slugify';

describe('slugify', () => {
  it('converts names to kebab-case', () => {
    expect(slugify('Payments API')).toBe('payments-api');
  });

  it('trims and collapses separators', () => {
    expect(slugify('  Foo---Bar  ')).toBe('foo-bar');
  });
});
