export function safeNextPath(value) {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || value.includes('\\') || /[\u0000-\u001f]/.test(value)) return null;
  try {
    const parsed = new URL(value, 'http://homestaydorm.local');
    if (parsed.origin !== 'http://homestaydorm.local') return null;
    return parsed.pathname + parsed.search + parsed.hash;
  } catch { return null; }
}
