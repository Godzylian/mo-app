// Client-side media storage using IndexedDB for seamless large file / video handling
const DB_NAME = 'MO_Media_Storage';
const DB_VERSION = 1;
const STORE_NAME = 'media_blobs';

function openDB() {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Stores a media file/blob into IndexedDB
 * @param {string} key 
 * @param {Blob|File} blob 
 */
export async function storeLocalMedia(key, blob) {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(blob, key);
      req.onsuccess = () => resolve(key);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Failed to store media in IndexedDB:', err);
    return null;
  }
}

/**
 * Retrieves a media file/blob from IndexedDB
 * @param {string} key 
 * @returns {Promise<Blob|null>}
 */
export async function getLocalMedia(key) {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Failed to get media from IndexedDB:', err);
    return null;
  }
}
