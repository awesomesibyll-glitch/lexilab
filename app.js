import { STORAGE_KEY, starterDeck, addWord, dueWords, reviewWord, localDayKey, streak, validState } from './logic.js';

const $ = id => document.getElementById(id);
let state;
try {
  const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
  state = validState(saved) ? saved : { words: starterDeck(), reviewDays: [] };
} catch {
  state = { words: starterDeck(), reviewDays: [] };
}
let revealed = false;
let activeId = null;

function persist() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
  catch { $('formMessage').textContent = 'Не удалось сохранить данные в браузере. Проверьте свободное место и настройки хранения.'; }
}

function node(tag, className, value) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (value !== undefined) element.textContent = value;
  return element;
}

function button(label, className, onClick) {
  const element = node('button', className, label);
  element.type = 'button'; element.addEventListener('click', onClick);
  return element;
}

function render() {
  const due = dueWords(state.words);
  $('totalCount').textContent = state.words.length;
  $('dueCount').textContent = due.length;
  $('reviewCount').textContent = state.words.reduce((sum, word) => sum + word.reviews, 0);
  $('streakCount').textContent = streak(state.reviewDays);
  $('queueBadge').textContent = `${due.length} к повторению`;
  $('libraryCount').textContent = `${state.words.length} слов`;
  renderPractice(due);
  renderLibrary();
}

function renderPractice(due) {
  const area = $('practiceArea'); area.replaceChildren();
  const card = due.find(word => word.id === activeId) ?? due[0];
  if (!card) {
    activeId = null; revealed = false;
    const empty = node('div', 'empty-practice');
    empty.append(node('span', 'empty-icon', '✳'), node('h3', '', 'На сегодня всё!'), node('p', '', 'Вы повторили все слова. Возвращайтесь позже или добавьте новое слово.'));
    area.append(empty); return;
  }
  if (activeId !== card.id) { activeId = card.id; revealed = false; }
  const cardEl = node('div', 'flashcard');
  cardEl.append(node('span', 'card-label', `Карточка · уровень ${card.box + 1} из 6`), node('h3', 'card-word', card.source));
  if (revealed) {
    cardEl.append(node('p', 'card-translation', card.translation));
    if (card.example) cardEl.append(node('p', 'card-example', card.example));
    const actions = node('div', 'card-actions');
    actions.append(button('Повторить ↺', 'button secondary', () => grade(false)), button('Помню ✓', 'button primary', () => grade(true)));
    cardEl.append(actions);
  } else {
    cardEl.append(node('p', 'card-hint', 'Вспомните перевод, затем проверьте себя.'));
    cardEl.append(button('Показать перевод', 'button primary reveal', () => { revealed = true; renderPractice(dueWords(state.words)); }));
  }
  area.append(cardEl);
}

function grade(remembered) {
  if (!revealed || !activeId) return;
  const index = state.words.findIndex(word => word.id === activeId);
  if (index < 0) return;
  const now = Date.now();
  state.words[index] = reviewWord(state.words[index], remembered, now);
  const today = localDayKey(now);
  if (!state.reviewDays.includes(today)) state.reviewDays.push(today);
  activeId = null; revealed = false;
  persist(); render();
}

function renderLibrary() {
  const list = $('wordList'); list.replaceChildren();
  if (!state.words.length) { list.append(node('p', 'list-empty', 'Здесь пока пусто. Добавьте первое слово.')); return; }
  for (const word of state.words) {
    const row = node('div', 'word-row');
    const main = node('div', 'word-main');
    main.append(node('strong', '', word.source), node('span', '', word.translation));
    const side = node('div', 'word-side');
    side.append(node('span', 'level', word.box ? `Уровень ${word.box + 1}` : 'Новое'));
    const remove = button('Удалить', 'remove', () => {
      if (!window.confirm(`Удалить «${word.source}» из коллекции?`)) return;
      state.words = state.words.filter(item => item.id !== word.id);
      if (activeId === word.id) activeId = null;
      persist(); render();
    });
    remove.setAttribute('aria-label', `Удалить слово ${word.source}`);
    side.append(remove); row.append(main, side); list.append(row);
  }
}

$('wordForm').addEventListener('submit', event => {
  event.preventDefault();
  const form = event.currentTarget;
  const data = new FormData(form);
  try {
    state.words = addWord(state.words, Object.fromEntries(data));
    $('formMessage').textContent = 'Слово добавлено — оно уже ждёт вас в тренировке.';
    form.reset(); persist(); render();
  } catch (error) { $('formMessage').textContent = error.message; }
});

document.addEventListener('keydown', event => {
  if (event.target instanceof HTMLElement && (event.target.matches('input, textarea, button') || event.target.isContentEditable)) return;
  if (event.code === 'Space' && activeId && !revealed) { event.preventDefault(); revealed = true; renderPractice(dueWords(state.words)); }
  if (revealed && event.key === '1') grade(false);
  if (revealed && event.key === '2') grade(true);
});

render();
