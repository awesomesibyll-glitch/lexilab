import test from 'node:test';
import assert from 'node:assert/strict';
import { DAY, starterDeck, addWord, dueWords, reviewWord, streak, localDayKey } from './logic.js';

test('a remembered word moves through the Leitner schedule; a missed word comes back soon', () => {
  const now = 1_700_000_000_000;
  let card = starterDeck(now)[0];
  card = reviewWord(card, true, now);
  assert.equal(card.box, 1);
  assert.equal(card.dueAt, now + DAY);
  assert.equal(dueWords([card], now).length, 0);
  card = reviewWord(card, true, now + DAY);
  assert.equal(card.dueAt, now + 4 * DAY);
  card = reviewWord(card, false, now + DAY);
  assert.equal(card.box, 0);
  assert.equal(card.dueAt, now + DAY + 60_000);
  assert.equal(card.reviews, 3);
});

test('duplicate words are rejected regardless of case and whitespace', () => {
  const words = addWord([], { source: '  Hello  world ', translation: ' привет ' }, 100, 'one');
  assert.equal(words[0].source, 'Hello world');
  assert.throws(() => addWord(words, { source: 'hello world', translation: 'другое' }, 101, 'two'), /уже есть/);
});

test('streak includes yesterday when no review has happened today', () => {
  const now = new Date(2026, 8, 28, 15).getTime();
  const yesterday = new Date(2026, 8, 27, 12).getTime();
  const before = new Date(2026, 8, 26, 12).getTime();
  assert.equal(streak([localDayKey(before), localDayKey(yesterday)], now), 2);
});
