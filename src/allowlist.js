// Shared allowlist matching logic. Used by main process and session preload.
// Callers are responsible for URL construction and providing domainAndPath + allowlist.

function matchesEntry(domainAndPath, cleanEntry) {
  if (cleanEntry.includes('*')) {
    const escaped = cleanEntry.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
    const regexStr = '^' + escaped.replace(/\\\*/g, '.*');
    return new RegExp(regexStr).test(domainAndPath);
  }
  if (cleanEntry.includes('/')) return domainAndPath.startsWith(cleanEntry);
  return domainAndPath.split('/')[0] === cleanEntry;
}

function isAllowed(url, allowlist) {
  try {
    if (!['http:', 'https:'].includes(url.protocol)) return false;
    const domainAndPath = url.host + url.pathname;
    return allowlist.some(entry => {
      const cleanEntry = entry.replace(/^https?:\/\//, '');
      return matchesEntry(domainAndPath, cleanEntry);
    });
  } catch (e) {
    return false;
  }
}

module.exports = { isAllowed, matchesEntry };
