import { WORDS } from './words.js';
import { normalize, newCard, review, dueCards, parseTei } from './logic.js';
import { openDB, countImported, putWords, searchImported } from './db.js';

const $ = id => document.getElementById(id);
const STORAGE = 'lexilab-mobile-v1';
const initial = WORDS.slice(0,12).map(word => newCard(word));
let cards, db=null, importedCount=0, showing=false, currentId=null, searchTimer;
try { const saved=JSON.parse(localStorage.getItem(STORAGE)); cards=Array.isArray(saved) ? saved.filter(validCard) : initial; }
catch { cards=initial; }
if (!localStorage.getItem(STORAGE)) {
  try { const older=JSON.parse(localStorage.getItem('lexilab-v1')); if (Array.isArray(older?.words)) cards=older.words.filter(validCard); }
  catch { /* no previous deck */ }
}
function validCard(c) { return c && typeof c.id==='string' && typeof c.source==='string' && typeof c.translation==='string' && Number.isFinite(c.dueAt) && Number.isInteger(c.box); }
function save() { try { localStorage.setItem(STORAGE,JSON.stringify(cards)); } catch { $('addStatus').textContent='Не удалось сохранить прогресс. Проверьте настройки браузера.'; } }
function el(tag,className,text) { const e=document.createElement(tag); if(className)e.className=className; if(text!==undefined)e.textContent=text; return e; }
function btn(text,className,fn) { const b=el('button',className,text);b.type='button';b.addEventListener('click',fn);return b; }
function showView(view) {
  for(const section of document.querySelectorAll('.view')) section.classList.toggle('active',section.id===`${view}View`);
  for(const b of document.querySelectorAll('.tabbar button')) b.classList.toggle('selected',b.dataset.view===view);
  window.scrollTo({top:0,behavior:'instant'});
  if(view==='dictionary') renderDictionary(); if(view==='mine') renderMine();
}
document.querySelectorAll('.tabbar button').forEach(b=>b.addEventListener('click',()=>showView(b.dataset.view)));
function renderStudy() {
  const due=dueCards(cards), area=$('cardArea'); area.replaceChildren();
  $('activeCount').textContent=cards.length; $('dueCount').textContent=due.length;
  $('reviewCount').textContent=cards.reduce((n,c)=>n+c.reviews,0);
  $('queueLabel').textContent=`${due.length} сейчас`;
  const card=due.find(c=>c.id===currentId)??due[0];
  if(!card) { currentId=null;showing=false;const box=el('div','empty');box.append(el('div','empty-star','✳'),el('h3','',cards.length?'На сегодня всё!':'Начните с первого слова'),el('p','',cards.length?'Карточки вернутся в нужный день. Можно выбрать новые слова в словаре.':'Откройте словарь и добавьте слова для тренировки.'));box.append(btn('Открыть словарь','primary',()=>showView('dictionary')));area.append(box);return; }
  if(currentId!==card.id){currentId=card.id;showing=false;}
  const tile=el('div','card');tile.setAttribute('role','button');tile.tabIndex=0;tile.setAttribute('aria-label',showing?`${card.source} — ${card.translation}`:`Показать перевод слова ${card.source}`);
  tile.append(el('span','card-top',`КАРТОЧКА · УРОВЕНЬ ${card.box+1} ИЗ 6`),el('strong','card-word',card.source));
  if(showing){tile.append(el('span','translation',card.translation));const row=el('div','actions');row.append(btn('Повторить ↺','secondary',()=>grade(false)),btn('Помню ✓','primary',()=>grade(true)));tile.append(row);}
  else {tile.append(el('span','hint','Нажмите, чтобы увидеть перевод'));tile.addEventListener('click',reveal);tile.addEventListener('keydown',event=>{if(['Enter',' '].includes(event.key)){event.preventDefault();reveal();}});}
  area.append(tile);
}
function reveal(){showing=true;renderStudy();}
function grade(remembered){const i=cards.findIndex(c=>c.id===currentId);if(!showing||i<0)return;cards[i]=review(cards[i],remembered);currentId=null;showing=false;save();renderStudy();renderMine();}
function addToStudy(word){if(cards.some(c=>c.source.toLocaleLowerCase()===word.source.toLocaleLowerCase()))return;cards.push(newCard(word));save();renderStudy();renderMine();renderDictionary();}
function wordRow(word){const row=el('div','word-row');const text=el('div','word-info');text.append(el('strong','',word.source),el('span','',word.translation));row.append(text);
  const selected=cards.some(c=>c.source.toLocaleLowerCase()===word.source.toLocaleLowerCase());
  row.append(btn(selected?'✓':'＋',`add-word ${selected?'added':''}`,()=>addToStudy(word)));row.lastChild.disabled=selected;row.lastChild.setAttribute('aria-label',selected?'Уже в изучении':`Добавить ${word.source} в изучение`);return row;}
async function renderDictionary(){const query=normalize($('searchInput').value).toLocaleLowerCase();let results=WORDS.filter(w=>!query||w.source.includes(query)||w.translation.toLocaleLowerCase().includes(query)).slice(0,80);
  if(db&&importedCount){try{const extra=await searchImported(db,query,80);const seen=new Set(results.map(w=>w.source.toLocaleLowerCase()));for(const word of extra){if(!seen.has(word.source.toLocaleLowerCase()))results.push(word);if(results.length>=80)break;}}catch{ /* built-in words still available */ }}
  if(query!==normalize($('searchInput').value).toLocaleLowerCase())return;
  const list=$('dictionaryList');list.replaceChildren(...results.map(wordRow));
  $('resultCount').textContent=`${WORDS.length+importedCount} слов в словаре · показано ${results.length}${query?' по запросу':''}`;
  if(!results.length)list.append(el('p','empty-list','Ничего не найдено. Попробуйте английское слово.'));
}
$('searchInput').addEventListener('input',()=>{clearTimeout(searchTimer);searchTimer=setTimeout(renderDictionary,160);});
function renderMine(){const list=$('mineList');list.replaceChildren();$('mineCount').textContent=cards.length;
  for(const card of cards){const row=el('div','word-row');const info=el('div','word-info');info.append(el('strong','',card.source),el('span','',card.translation));row.append(info);
    const remove=btn('×','remove',()=>{if(!confirm(`Убрать «${card.source}» из изучения?`))return;cards=cards.filter(c=>c.id!==card.id);if(currentId===card.id)currentId=null;save();renderMine();renderStudy();});remove.setAttribute('aria-label',`Убрать ${card.source}`);row.append(remove);list.append(row);}
  if(!cards.length)list.append(el('p','empty-list','Здесь пока нет слов. Добавьте своё слово или выберите его в словаре.'));
}
$('addForm').addEventListener('submit',event=>{event.preventDefault();const source=normalize($('wordInput').value),translation=normalize($('translationInput').value);
  if(!source||!translation)return;
  if(cards.some(c=>c.source.toLocaleLowerCase()===source.toLocaleLowerCase())){$('addStatus').textContent='Это слово уже есть в изучении.';return;}
  const id=`own:${crypto.randomUUID?.()??Date.now()}`;cards.unshift(newCard({id,source,translation}));save();event.target.reset();$('addStatus').textContent='Готово — слово появилось в тренировке.';renderStudy();renderMine();});
$('dictionaryFile').addEventListener('change',async event=>{const file=event.target.files?.[0];if(!file)return;const status=$('importStatus');
  if(file.size>100*1024*1024){status.textContent='Файл слишком большой (максимум 100 МБ).';return;}
  status.textContent='Читаю словарь… На телефоне это может занять около минуты.';
  try{await new Promise(resolve=>setTimeout(resolve,50));const words=parseTei(await file.text());if(!words.length)throw new Error('В файле не найдены пары английский — русский.');
    db??=await openDB();status.textContent=`Сохраняю ${words.length} слов на устройстве…`;
    await putWords(db,words,n=>{status.textContent=`Сохранено ${n} из ${words.length} слов…`;});importedCount=await countImported(db);
    status.textContent=`Готово: ${importedCount} словарных статей доступны без сети.`;renderDictionary();
  }catch(error){status.textContent=`Не удалось импортировать: ${error.message}`;}
  event.target.value='';
});
let installPrompt;
window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();installPrompt=event;$('installBtn').hidden=false;});
$('installBtn').addEventListener('click',async()=>{if(installPrompt){installPrompt.prompt();await installPrompt.userChoice;installPrompt=null;$('installBtn').hidden=true;}});
if('serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});
openDB().then(async database=>{db=database;importedCount=await countImported(db);renderDictionary();}).catch(()=>{ $('importStatus').textContent='Хранилище словаря недоступно в этом браузере.'; });
renderStudy();renderMine();renderDictionary();
