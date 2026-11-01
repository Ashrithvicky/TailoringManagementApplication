export function formatDate(iso: string, language: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(language === 'ta' ? 'ta-IN' : 'en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}
