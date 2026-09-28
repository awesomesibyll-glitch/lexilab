export const DAY = 24 * 60 * 60 * 1000;
export const STORAGE_KEY = 'lexilab-v1';

export const STARTER_WORDS = [
  ['curiosity', 'любопытство', 'Curiosity makes learning more interesting.'],
  ['journey', 'путешествие', 'Every journey begins with a first step.'],
  ['discover', 'открывать', 'We discover something new every day.'],
  ['challenge', 'вызов', 'A challenge is a chance to grow.'],
  ['kindness', 'доброта', 'Kindness can change someone’s day.'],
  ['wonder', 'удивление', 'Never lose your sense of wonder.']
];

export function starterDeck(now = Date.now()) {
  return STARTER_WORDS.map(([source, translation, example], index) => ({
    id: `starter-${index}`, source, translation, example,
    box: 0, dueAt: now, reviews: 0, createdAt: now
  }));
}

export function normalizeWord(value) { return value.trim().replace(/\s+/g, ' '); }

export function addWord(words, input, now = Date.now(), id = globalThis.crypto?.randomUUID?.() ?? `word-${now}-${Math.random()}`) {
  const source = normalizeWord(input.source ?? '');
  const translation = normalizeWord(input.translation ?? '');
  const example = normalizeWord(input.example ?? '');
  if (!source || !translation) throw new Error('Заполните слово и перевод.');
  if (source.length > 80 || translation.length > 120 || example.length > 240) throw new Error('Слишком длинная запись.');
  if (words.some(word => word.source.toLocaleLowerCase() === source.toLocaleLowerCase())) throw new Error('Это слово уже есть в коллекции.');
  return [{ id, source, translation, example, box: 0, dueAt: now, reviews: 0, createdAt: now }, ...words];
}

export function dueWords(words, now = Date.now()) {
  return words.filter(word => word.dueAt <= now).sort((a, b) => a.dueAt - b.dueAt || a.createdAt - b.createdAt);
}

// Five Leitner levels: a successful answer moves a card forward;
// a missed answer returns it to the first level for another attempt.
export function reviewWord(word, remembered, now = Date.now()) {
  const box = remembered ? Math.min(word.box + 1, 5) : 0;
  const intervals = [0, 1, 3, 7, 14, 30];
  return { ...word, box, reviews: word.reviews + 1, dueAt: remembered ? now + intervals[box] * DAY : now + 60_000 };
}

export function localDayKey(timestamp) {
  const d = new Date(timestamp);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function streak(reviewDays, now = Date.now()) {
  const days = new Set(reviewDays);
  const cursor = new Date(now);
  cursor.setHours(12, 0, 0, 0);
  if (!days.has(localDayKey(cursor.getTime()))) cursor.setDate(cursor.getDate() - 1);
  let count = 0;
  while (days.has(localDayKey(cursor.getTime()))) {
    count++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return count;
}

export function validState(data) {
  return data && Array.isArray(data.words) && Array.isArray(data.reviewDays) &&
    data.words.every(w => typeof w.id === 'string' && typeof w.source === 'string' &&
      typeof w.translation === 'string' && typeof w.example === 'string' &&
      Number.isInteger(w.box) && w.box >= 0 && w.box <= 5 &&
      Number.isFinite(w.dueAt) && Number.isInteger(w.reviews) && Number.isFinite(w.createdAt)) &&
    data.reviewDays.every(day => typeof day === 'string');
}
