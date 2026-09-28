import test from 'node:test';
import assert from 'node:assert/strict';
import { WORDS } from './words.js';
import { DAY, newCard, review, dueCards } from './logic.js';

test('starter dictionary has distinct and complete English-Russian pairs',()=>{
  assert.ok(WORDS.length>=350);
  assert.equal(new Set(WORDS.map(w=>w.source.toLowerCase())).size,WORDS.length);
  assert.ok(WORDS.every(w=>w.source&&w.translation));
});
test('successful reviews postpone the card while a missed card returns soon',()=>{
  const now=1_700_000_000_000;let c=newCard(WORDS[0],now);
  c=review(c,true,now);assert.equal(c.dueAt,now+DAY);assert.equal(dueCards([c],now).length,0);
  c=review(c,true,now+DAY);assert.equal(c.dueAt,now+4*DAY);
  c=review(c,false,now+DAY);assert.equal(c.box,0);assert.equal(c.dueAt,now+DAY+60000);
});
