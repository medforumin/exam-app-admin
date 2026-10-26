import { initializeApp } from 'firebase/app';
import { addDoc, collection, doc, getDoc, getDocs, deleteDoc, query, orderBy, limit, serverTimestamp, setDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyC-qVqLhxs8EbC1CpB-t5Wa7ZDMKJ8pU64',
  authDomain: 'dnbpediain.firebaseapp.com',
  projectId: 'dnbpediain',
  storageBucket: 'dnbpediain.firebasestorage.app',
  messagingSenderId: '960945553986',
  appId: '1:960945553986:web:f9b82bafb0391591ed23db',
  measurementId: 'G-R9TFX56KXV'
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, 'default');
export const auth = getAuth(app);

export const logAdminAudit = async (eventType, details = {}, adminEmail = 'unknown') => {
  if (!db) return;
  try {
    await addDoc(collection(db, 'adminLogs'), {
      eventType,
      adminEmail,
      details,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Admin audit log failed:', error);
  }
};

export const fetchAdminLogs = async (maxLogs = 50) => {
  if (!db) return [];
  try {
    const q = query(collection(db, 'adminLogs'), orderBy('createdAt', 'desc'), limit(maxLogs));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (err) {
    try {
      const fallbackSnap = await getDocs(collection(db, 'adminLogs'));
      const list = fallbackSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      return list.sort((a, b) => {
        const timeA = a.createdAt?.seconds ? a.createdAt.seconds * 1000 : new Date(a.createdAt || 0).getTime();
        const timeB = b.createdAt?.seconds ? b.createdAt.seconds * 1000 : new Date(b.createdAt || 0).getTime();
        return timeB - timeA;
      }).slice(0, maxLogs);
    } catch (fallbackErr) {
      console.warn('Could not fetch admin logs:', fallbackErr);
      return [];
    }
  }
};

export const deleteAdminLog = async (logId) => {
  if (!db || !logId) return;
  await deleteDoc(doc(db, 'adminLogs', logId));
};

export const clearAllAdminLogs = async () => {
  if (!db) return;
  const snap = await getDocs(collection(db, 'adminLogs'));
  const deletePromises = snap.docs.map(docSnap => deleteDoc(doc(db, 'adminLogs', docSnap.id)));
  await Promise.all(deletePromises);
};

export const saveExportMeta = async (meta, adminEmail) => {
  if (!db) return;
  try {
    await setDoc(doc(db, 'settings', 'exportMeta'), { lastUserExport: meta, updatedAt: serverTimestamp(), adminEmail }, { merge: true });
  } catch (error) {
    console.error('Save export metadata failed:', error);
  }
};

const sheetWebhookUrl = '';

export const sendSheetUpdate = async (rows) => {
  if (!sheetWebhookUrl) return;
  try {
    await fetch(sheetWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rows }),
    });
  } catch (err) {
    console.error('Send to sheet failed:', err);
  }
};

export const getLastExportMeta = async () => {
  if (!db) return null;
  try {
    const snap = await getDoc(doc(db, 'settings', 'exportMeta'));
    return snap.exists() ? snap.data().lastUserExport || null : null;
  } catch (error) {
    console.error('Could not fetch export metadata from Firestore:', error);
    return null;
  }
};
