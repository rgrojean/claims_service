// 2018 name split — exactly one comma. Do not make smarter.
export function splitName(name: string): { lastName: string; firstName: string } {
  const i = name.indexOf(',');
  if (i < 0) return { lastName: name.trim(), firstName: '' };
  return {
    lastName: name.slice(0, i).trim(),
    firstName: name.slice(i + 1).trim(),
  };
}
