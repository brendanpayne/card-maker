// Persists the card being edited so a refresh or a discarded mobile tab doesn't lose it.
// Text fields go to localStorage; the uploaded image (a data URL, often several MB) goes to
// IndexedDB, which has far more room. Every call fails soft: storage can be blocked or full.

const DRAFT_KEY = 'card-draft';
const DB_NAME = 'card-maker';
const STORE = 'images';
const IMAGE_KEY = 'draft';

export const loadDraft = () => {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    const draft = raw ? JSON.parse(raw) : null;
    return draft && typeof draft === 'object' ? draft : null;
  } catch {
    return null;
  }
};

export const saveDraft = (draft) => {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    // Storage blocked or full: the draft just won't survive a reload.
  }
};

const openDb = () => new Promise((resolve, reject) => {
  if (!window.indexedDB) {
    reject(new Error('IndexedDB unavailable'));
    return;
  }
  const request = window.indexedDB.open(DB_NAME, 1);
  request.onupgradeneeded = () => request.result.createObjectStore(STORE);
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error);
});

const withStore = async (mode, action) => {
  const db = await openDb();
  try {
    return await new Promise((resolve, reject) => {
      const request = action(db.transaction(STORE, mode).objectStore(STORE));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } finally {
    db.close();
  }
};

export const loadDraftImage = () =>
  withStore('readonly', (store) => store.get(IMAGE_KEY)).catch(() => null);

export const saveDraftImage = (dataUrl) =>
  withStore('readwrite', (store) => store.put(dataUrl, IMAGE_KEY)).catch(() => {});

export const clearDraftImage = () =>
  withStore('readwrite', (store) => store.delete(IMAGE_KEY)).catch(() => {});
