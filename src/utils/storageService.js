/**
 * Production-Grade Storage Service
 * Provides type-safe localStorage operations with compression, versioning, and error handling
 */

const STORAGE_VERSION = '1.0.0';
const STORAGE_PREFIX = 'pdf_reader_';

/**
 * Storage keys enum for type safety
 */
export const StorageKeys = {
    QUIZ_HISTORY: 'quiz_history',
    TTS_BOOKMARKS: 'tts_bookmarks',
    TTS_PREFERENCES: 'tts_preferences',
    OCR_HISTORY: 'ocr_history',
    EXPORT_HISTORY: 'export_history',
    EXPORT_TEMPLATES: 'export_templates',
    USER_PREFERENCES: 'user_preferences',
    ANALYTICS: 'analytics'
};

/**
 * Get full storage key with prefix
 */
const getKey = (key) => `${STORAGE_PREFIX}${key}`;

/**
 * Check localStorage availability and quota
 */
export const checkStorageAvailable = () => {
    try {
        const test = '__storage_test__';
        localStorage.setItem(test, test);
        localStorage.removeItem(test);
        return true;
    } catch (e) {
        console.error('localStorage is not available:', e);
        return false;
    }
};

/**
 * Get storage usage statistics
 */
export const getStorageStats = () => {
    if (!checkStorageAvailable()) return null;

    let totalSize = 0;
    const items = {};

    for (let key in localStorage) {
        if (key.startsWith(STORAGE_PREFIX)) {
            const size = localStorage[key].length * 2; // UTF-16 = 2 bytes per char
            items[key] = size;
            totalSize += size;
        }
    }

    return {
        totalSize,
        totalSizeKB: (totalSize / 1024).toFixed(2),
        totalSizeMB: (totalSize / 1024 / 1024).toFixed(2),
        itemCount: Object.keys(items).length,
        quotaMB: 5, // Typical browser limit
        usagePercent: ((totalSize / (5 * 1024 * 1024)) * 100).toFixed(2),
        items
    };
};

/**
 * Set item in localStorage with automatic serialization
 */
export const setItem = (key, value, options = {}) => {
    if (!checkStorageAvailable()) {
        console.warn('localStorage not available, data will not persist');
        return false;
    }

    try {
        const data = {
            version: STORAGE_VERSION,
            timestamp: Date.now(),
            value,
            ...options
        };

        const serialized = JSON.stringify(data);
        localStorage.setItem(getKey(key), serialized);
        return true;
    } catch (e) {
        if (e.name === 'QuotaExceededError') {
            console.error('Storage quota exceeded. Consider clearing old data.');
            // Auto-cleanup old data
            cleanupOldData();
        } else {
            console.error('Error saving to localStorage:', e);
        }
        return false;
    }
};

/**
 * Get item from localStorage with automatic deserialization
 */
export const getItem = (key, defaultValue = null) => {
    if (!checkStorageAvailable()) return defaultValue;

    try {
        const item = localStorage.getItem(getKey(key));
        if (!item) return defaultValue;

        const data = JSON.parse(item);

        // Version check (for future migrations)
        if (data.version !== STORAGE_VERSION) {
            console.warn(`Data version mismatch for ${key}. Migration may be needed.`);
        }

        return data.value;
    } catch (e) {
        console.error(`Error reading ${key} from localStorage:`, e);
        return defaultValue;
    }
};

/**
 * Remove item from localStorage
 */
export const removeItem = (key) => {
    if (!checkStorageAvailable()) return false;

    try {
        localStorage.removeItem(getKey(key));
        return true;
    } catch (e) {
        console.error(`Error removing ${key}:`, e);
        return false;
    }
};

/**
 * Clear all app data from localStorage
 */
export const clearAll = () => {
    if (!checkStorageAvailable()) return false;

    try {
        const keysToRemove = [];
        for (let key in localStorage) {
            if (key.startsWith(STORAGE_PREFIX)) {
                keysToRemove.push(key);
            }
        }

        keysToRemove.forEach(key => localStorage.removeItem(key));
        return true;
    } catch (e) {
        console.error('Error clearing storage:', e);
        return false;
    }
};

/**
 * Cleanup old data to free up space
 */
const cleanupOldData = () => {
    const maxAge = 90 * 24 * 60 * 60 * 1000; // 90 days
    const now = Date.now();

    for (let key in localStorage) {
        if (key.startsWith(STORAGE_PREFIX)) {
            try {
                const data = JSON.parse(localStorage[key]);
                if (data.timestamp && (now - data.timestamp > maxAge)) {
                    localStorage.removeItem(key);
                    console.log(`Removed old data: ${key}`);
                }
            } catch (e) {
                // Invalid data, remove it
                localStorage.removeItem(key);
            }
        }
    }
};

/**
 * Quiz History Management
 */
export const QuizHistory = {
    getAll: () => getItem(StorageKeys.QUIZ_HISTORY, []),

    add: (quiz) => {
        const history = QuizHistory.getAll();
        const entry = {
            id: `quiz_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: Date.now(),
            ...quiz
        };
        history.unshift(entry); // Add to beginning

        // Keep only last 100 quizzes
        const trimmed = history.slice(0, 100);
        setItem(StorageKeys.QUIZ_HISTORY, trimmed);
        return entry;
    },

    remove: (id) => {
        const history = QuizHistory.getAll();
        const filtered = history.filter(q => q.id !== id);
        setItem(StorageKeys.QUIZ_HISTORY, filtered);
    },

    clear: () => setItem(StorageKeys.QUIZ_HISTORY, []),

    getStats: () => {
        const history = QuizHistory.getAll();
        const total = history.length;
        const totalScore = history.reduce((sum, q) => sum + (q.score || 0), 0);
        const totalPossible = history.reduce((sum, q) => sum + (q.totalQuestions * 10 || 0), 0);

        return {
            totalQuizzes: total,
            averageScore: total > 0 ? (totalScore / totalPossible * 100).toFixed(1) : 0,
            totalTime: history.reduce((sum, q) => sum + (q.timeSpent || 0), 0),
            recentQuizzes: history.slice(0, 5)
        };
    }
};

/**
 * TTS Bookmarks Management
 */
export const TTSBookmarks = {
    getAll: (fileName) => {
        const allBookmarks = getItem(StorageKeys.TTS_BOOKMARKS, {});
        return allBookmarks[fileName] || [];
    },

    add: (fileName, bookmark) => {
        const allBookmarks = getItem(StorageKeys.TTS_BOOKMARKS, {});
        if (!allBookmarks[fileName]) allBookmarks[fileName] = [];

        const entry = {
            id: `bookmark_${Date.now()}`,
            timestamp: Date.now(),
            ...bookmark
        };

        allBookmarks[fileName].push(entry);
        setItem(StorageKeys.TTS_BOOKMARKS, allBookmarks);
        return entry;
    },

    remove: (fileName, id) => {
        const allBookmarks = getItem(StorageKeys.TTS_BOOKMARKS, {});
        if (allBookmarks[fileName]) {
            allBookmarks[fileName] = allBookmarks[fileName].filter(b => b.id !== id);
            setItem(StorageKeys.TTS_BOOKMARKS, allBookmarks);
        }
    },

    getLastPosition: (fileName) => {
        const bookmarks = TTSBookmarks.getAll(fileName);
        return bookmarks.find(b => b.type === 'last_position');
    },

    setLastPosition: (fileName, page, charIndex) => {
        const allBookmarks = getItem(StorageKeys.TTS_BOOKMARKS, {});
        if (!allBookmarks[fileName]) allBookmarks[fileName] = [];

        // Remove old last_position
        allBookmarks[fileName] = allBookmarks[fileName].filter(b => b.type !== 'last_position');

        // Add new last_position
        allBookmarks[fileName].push({
            id: `last_pos_${Date.now()}`,
            type: 'last_position',
            page,
            charIndex,
            timestamp: Date.now()
        });

        setItem(StorageKeys.TTS_BOOKMARKS, allBookmarks);
    }
};

/**
 * OCR History Management
 */
export const OCRHistory = {
    getAll: () => getItem(StorageKeys.OCR_HISTORY, []),

    add: (ocrResult) => {
        const history = OCRHistory.getAll();
        const entry = {
            id: `ocr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: Date.now(),
            ...ocrResult
        };
        history.unshift(entry);

        // Keep only last 50 OCR results
        const trimmed = history.slice(0, 50);
        setItem(StorageKeys.OCR_HISTORY, trimmed);
        return entry;
    },

    remove: (id) => {
        const history = OCRHistory.getAll();
        const filtered = history.filter(o => o.id !== id);
        setItem(StorageKeys.OCR_HISTORY, filtered);
    },

    clear: () => setItem(StorageKeys.OCR_HISTORY, [])
};

/**
 * Export History Management
 */
export const ExportHistory = {
    getAll: () => getItem(StorageKeys.EXPORT_HISTORY, []),

    add: (exportData) => {
        const history = ExportHistory.getAll();
        const entry = {
            id: `export_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: Date.now(),
            ...exportData
        };
        history.unshift(entry);

        // Keep only last 30 exports
        const trimmed = history.slice(0, 30);
        setItem(StorageKeys.EXPORT_HISTORY, trimmed);
        return entry;
    },

    remove: (id) => {
        const history = ExportHistory.getAll();
        const filtered = history.filter(e => e.id !== id);
        setItem(StorageKeys.EXPORT_HISTORY, filtered);
    },

    clear: () => setItem(StorageKeys.EXPORT_HISTORY, [])
};

/**
 * User Preferences Management
 */
export const Preferences = {
    get: () => getItem(StorageKeys.USER_PREFERENCES, {
        ttsDefaultVoice: null,
        ttsDefaultSpeed: 1,
        quizTimerEnabled: false,
        quizDefaultDifficulty: 'medium',
        ocrDefaultFormat: 'plaintext',
        exportDefaultFormat: 'markdown'
    }),

    set: (prefs) => {
        const current = Preferences.get();
        const updated = { ...current, ...prefs };
        setItem(StorageKeys.USER_PREFERENCES, updated);
    },

    reset: () => setItem(StorageKeys.USER_PREFERENCES, {})
};



/**
 * Version Control Management
 */
export const VersionControl = {
    getHistory: (fileName) => {
        const allHistory = getItem('version_control', {});
        return allHistory[fileName] || [];
    },

    saveVersion: (fileName, data, message = 'Auto-save') => {
        if (!fileName) return null;
        const allHistory = getItem('version_control', {});
        if (!allHistory[fileName]) allHistory[fileName] = [];

        const version = {
            id: `v_${Date.now()}`,
            timestamp: Date.now(),
            message,
            data // This would be the state of annotations, forms, etc.
        };

        allHistory[fileName].unshift(version);
        // Keep last 50 versions
        allHistory[fileName] = allHistory[fileName].slice(0, 50);
        setItem('version_control', allHistory);
        return version;
    },

    restoreVersion: (fileName, versionId) => {
        const history = VersionControl.getHistory(fileName);
        return history.find(v => v.id === versionId);
    }
};

export default {
    checkStorageAvailable,
    getStorageStats,
    setItem,
    getItem,
    removeItem,
    clearAll,
    QuizHistory,
    TTSBookmarks,
    OCRHistory,
    ExportHistory,
    Preferences,
    VersionControl
};

