const { isAllowed, matchesEntry } = require('../src/allowlist');

describe('matchesEntry', () => {
  describe('exact domain', () => {
    test('matches domain with path', () => {
      expect(matchesEntry('github.com/foo/bar', 'github.com')).toBe(true);
    });
    test('matches domain only', () => {
      expect(matchesEntry('github.com', 'github.com')).toBe(true);
    });
    test('does not match different domain', () => {
      expect(matchesEntry('notgithub.com/foo', 'github.com')).toBe(false);
    });
    test('does not match subdomain', () => {
      expect(matchesEntry('api.github.com/foo', 'github.com')).toBe(false);
    });
  });

  describe('path prefix', () => {
    test('matches matching prefix', () => {
      expect(matchesEntry('docs.python.org/3/library/os.html', 'docs.python.org/3/')).toBe(true);
    });
    test('matches exact prefix', () => {
      expect(matchesEntry('docs.python.org/3/', 'docs.python.org/3/')).toBe(true);
    });
    test('does not match different version path', () => {
      expect(matchesEntry('docs.python.org/2/library/os.html', 'docs.python.org/3/')).toBe(false);
    });
    test('does not match shorter path', () => {
      expect(matchesEntry('docs.python.org/', 'docs.python.org/3/')).toBe(false);
    });
  });

  describe('wildcard', () => {
    test('matches subdomain', () => {
      expect(matchesEntry('en.wikipedia.org/wiki/Foo', '*.wikipedia.org')).toBe(true);
    });
    test('matches nested subdomain', () => {
      expect(matchesEntry('sub.en.wikipedia.org/wiki/Foo', '*.wikipedia.org')).toBe(true);
    });
    test('does not match bare domain (no subdomain)', () => {
      expect(matchesEntry('wikipedia.org/wiki/Foo', '*.wikipedia.org')).toBe(false);
    });
  });
});

describe('isAllowed', () => {
  const allowlist = ['github.com', 'docs.python.org/3/', '*.wikipedia.org'];

  describe('protocol filtering', () => {
    test('allows http', () => {
      expect(isAllowed(new URL('http://github.com/foo'), allowlist)).toBe(true);
    });
    test('allows https', () => {
      expect(isAllowed(new URL('https://github.com/foo'), allowlist)).toBe(true);
    });
    test('blocks file:', () => {
      expect(isAllowed(new URL('file:///etc/passwd'), allowlist)).toBe(false);
    });
    test('blocks data:', () => {
      expect(isAllowed(new URL('data:text/html,hi'), allowlist)).toBe(false);
    });
  });

  describe('allowlist matching', () => {
    test('allows matching domain', () => {
      expect(isAllowed(new URL('https://github.com/kenrinzero/pericarp'), allowlist)).toBe(true);
    });
    test('blocks non-matching domain', () => {
      expect(isAllowed(new URL('https://twitter.com'), allowlist)).toBe(false);
    });
    test('allows matching path prefix', () => {
      expect(isAllowed(new URL('https://docs.python.org/3/library/os.html'), allowlist)).toBe(true);
    });
    test('blocks non-matching path prefix', () => {
      expect(isAllowed(new URL('https://docs.python.org/2/library/os.html'), allowlist)).toBe(false);
    });
    test('allows wildcard subdomain', () => {
      expect(isAllowed(new URL('https://en.wikipedia.org/wiki/Electron'), allowlist)).toBe(true);
    });
    test('blocks bare domain when only wildcard entry exists', () => {
      expect(isAllowed(new URL('https://wikipedia.org/wiki/Electron'), allowlist)).toBe(false);
    });
  });

  describe('allowlist entry normalisation', () => {
    test('strips https:// prefix from entry', () => {
      expect(isAllowed(new URL('https://github.com/foo'), ['https://github.com'])).toBe(true);
    });
    test('strips http:// prefix from entry', () => {
      expect(isAllowed(new URL('https://github.com/foo'), ['http://github.com'])).toBe(true);
    });
    test('empty allowlist blocks everything', () => {
      expect(isAllowed(new URL('https://github.com'), [])).toBe(false);
    });
  });
});
