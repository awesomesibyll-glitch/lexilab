export const DAY = 86400000;
export const INTERVALS = [0,1,3,7,14,30];
export function normalize(value) { return String(value || '').trim().replace(/\s+/g,' '); }
export function newCard(word, now = Date.now()) { return { id:word.id, source:word.source, translation:word.translation, box:0, dueAt:now, reviews:0, createdAt:now }; }
export function review(card, remembered, now = Date.now()) {
  const box = remembered ? Math.min(5, card.box + 1) : 0;
  return { ...card, box, reviews:card.reviews + 1, dueAt:remembered ? now + INTERVALS[box] * DAY : now + 60000 };
}
export function dueCards(cards, now = Date.now()) { return cards.filter(card => card.dueAt <= now).sort((a,b) => a.dueAt - b.dueAt || a.createdAt - b.createdAt); }
export function parseTei(xmlText) {
  if (!xmlText.includes('<entry')) throw new Error('В файле нет словарных статей TEI.');
  const xml = new DOMParser().parseFromString(xmlText, 'application/xml');
  if (xml.getElementsByTagName('parsererror').length) throw new Error('Не удалось прочитать XML-файл.');
  const entries = xml.getElementsByTagNameNS('*','entry');
  const words = new Map();
  for (const entry of entries) {
    const form = [...entry.children].find(child => child.localName === 'form');
    const orth = form?.getElementsByTagNameNS('*','orth')[0];
    const source = normalize(orth?.textContent).toLocaleLowerCase('en');
    if (!source || source.length > 80 || !/[a-z]/i.test(source)) continue;
    const quotes = [];
    for (const cit of entry.getElementsByTagNameNS('*','cit')) {
      if (!['trans','translation'].includes(cit.getAttribute('type'))) continue;
      for (const quote of cit.getElementsByTagNameNS('*','quote')) {
        const text = normalize(quote.textContent);
        if (text && /[а-яё]/i.test(text) && !quotes.includes(text)) quotes.push(text);
        if (quotes.length >= 3) break;
      }
      if (quotes.length >= 3) break;
    }
    if (!quotes.length) continue;
    const key = source.toLocaleLowerCase('en');
    if (!words.has(key)) words.set(key,{id:`fd:${key}`,source,translation:quotes.join('; ')});
  }
  return [...words.values()];
}
