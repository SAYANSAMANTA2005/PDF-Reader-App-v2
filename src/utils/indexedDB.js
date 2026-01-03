import { openDB } from 'idb';

const DB_NAME = 'pdf-reader-pro-db';
const DB_VERSION = 2; // Incremented for new stores

export const initDB = async () => {
    return openDB(DB_NAME, DB_VERSION, {
        upgrade(db, oldVersion, newVersion) {
            // General settings and progress
            if (!db.objectStoreNames.contains('learningProgress')) {
                db.createObjectStore('learningProgress', { keyPath: 'id', autoIncrement: true });
            }
            if (!db.objectStoreNames.contains('annotations')) {
                db.createObjectStore('annotations', { keyPath: 'pdfName' });
            }

            // NEW STORES for advanced features
            if (!db.objectStoreNames.contains('workspaces')) {
                db.createObjectStore('workspaces', { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains('universalNotes')) {
                db.createObjectStore('universalNotes', { keyPath: 'id', autoIncrement: true });
            }
            if (!db.objectStoreNames.contains('annotationVersions')) {
                db.createObjectStore('annotationVersions', { keyPath: 'id', autoIncrement: true });
            }
            if (!db.objectStoreNames.contains('spacedRepetition')) {
                db.createObjectStore('spacedRepetition', { keyPath: 'id' });
            }
        },
    });
};

// --- LEARNING ENGINE (SM-2 & PROGRESS) ---

export const saveProgress = async (pdfName, type, mastery) => {
    const db = await initDB();
    const id = `${pdfName}-${type}`;
    await db.put('learningProgress', { id, pdfName, type, mastery, updatedAt: Date.now() });
};

export const getProgress = async (pdfName) => {
    const db = await initDB();
    const all = await db.getAll('learningProgress');
    return all.filter(p => p.pdfName === pdfName);
};

export const saveSRCard = async (card) => {
    const db = await initDB();
    await db.put('spacedRepetition', {
        ...card,
        nextReview: card.nextReview || Date.now()
    });
};

export const getSRCards = async () => {
    const db = await initDB();
    return db.getAll('spacedRepetition');
};

// --- ANNOTATIONS & VERSION CONTROL ---

export const saveAnnotations = async (pdfName, annotations, author = 'User') => {
    const db = await initDB();
    // Save current version
    await db.put('annotations', { pdfName, data: annotations, updatedAt: Date.now() });

    // Save to history (Version Control)
    await db.add('annotationVersions', {
        pdfName,
        data: annotations,
        author,
        timestamp: Date.now(),
        changeSummary: 'Update annotations'
    });
};

export const getAnnotationHistory = async (pdfName) => {
    const db = await initDB();
    const all = await db.getAll('annotationVersions');
    return all.filter(v => v.pdfName === pdfName).sort((a, b) => b.timestamp - a.timestamp);
};

export const getAnnotations = async (pdfName) => {
    const db = await initDB();
    const result = await db.get('annotations', pdfName);
    return result ? result.data : null;
};

// --- WORKSPACES ---

export const saveWorkspace = async (workspace) => {
    const db = await initDB();
    await db.put('workspaces', { ...workspace, updatedAt: Date.now() });
};

export const getWorkspaces = async () => {
    const db = await initDB();
    return db.getAll('workspaces');
};

export const deleteWorkspace = async (id) => {
    const db = await initDB();
    await db.delete('workspaces', id);
};

// --- UNIVERSAL NOTES ---

export const saveUniversalNote = async (note) => {
    const db = await initDB();
    return db.put('universalNotes', { ...note, updatedAt: Date.now() });
};

export const getUniversalNotes = async () => {
    const db = await initDB();
    return db.getAll('universalNotes');
};
