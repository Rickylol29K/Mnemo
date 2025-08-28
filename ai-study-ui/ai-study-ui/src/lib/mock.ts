export async function processMock(input: string): Promise<{ summary: string[]; flashcards: { q: string; a: string }[] }> {
  const lines = input.split(/\n+/).map((l) => l.trim()).filter(Boolean).slice(0, 8);
  const summary = lines.map((l, i) => `• ${l.slice(0, 120)}${l.length > 120 ? '…' : ''}`);
  const flashcards = lines.slice(0, 6).map((l, i) => ({ q: `What is point ${i + 1}?`, a: l }));
  if (flashcards.length === 0) flashcards.push({ q: 'What is the core idea?', a: 'Your text was short; this is a mock.' });
  return { summary, flashcards };
}
