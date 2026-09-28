const NAME = 'lexilab-dictionary-v1';
export function openDB() { return new Promise((resolve,reject) => {
  const request = indexedDB.open(NAME,1);
  request.onupgradeneeded = () => { const store = request.result.createObjectStore('words',{keyPath:'id'}); store.createIndex('source','source'); };
  request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
}); }
export function countImported(db) { return new Promise((resolve,reject) => { const tx=db.transaction('words'); const req=tx.objectStore('words').count(); req.onsuccess=()=>resolve(req.result); req.onerror=()=>reject(req.error); }); }
export async function putWords(db, words, onProgress = () => {}) {
  for (let i=0;i<words.length;i+=750) {
    await new Promise((resolve,reject)=>{ const tx=db.transaction('words','readwrite'); const store=tx.objectStore('words'); for (const word of words.slice(i,i+750)) store.put(word); tx.oncomplete=resolve; tx.onerror=()=>reject(tx.error); });
    onProgress(Math.min(i+750,words.length));
  }
}
export function searchImported(db, term, limit=80) { return new Promise((resolve,reject)=>{
  const found=[]; const tx=db.transaction('words'); const store=tx.objectStore('words');
  const scanTranslation=/[а-яё]/i.test(term);
  const request=term&&!scanTranslation ? store.index('source').openCursor(IDBKeyRange.bound(term,term+'\uffff')) : store.openCursor();
  request.onsuccess=()=>{ const cursor=request.result; if (cursor && found.length<limit) {
    if (!scanTranslation || cursor.value.translation.toLocaleLowerCase().includes(term)) found.push(cursor.value);
    cursor.continue();
  } else resolve(found); };
  request.onerror=()=>reject(request.error);
}); }
