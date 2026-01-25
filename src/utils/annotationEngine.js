/**
 * Advanced Annotation Engine
 * Production-grade annotation management with undo/redo, persistence, and export
 */

// Annotation Types Registry
export const ANNOTATION_TYPES = {
    HAND: 'hand',
    SELECT: 'select',
    TEXT: 'text',
    IMAGE: 'image',
    SHAPE_RECT: 'shape_rect',
    SHAPE_CIRCLE: 'shape_circle',
    SHAPE_ARROW: 'shape_arrow',
    SHAPE_LINE: 'shape_line',
    SHAPE_POLYGON: 'shape_polygon',
    FREEHAND: 'freehand',
    HIGHLIGHT: 'highlight',
    ERASER: 'eraser',
    STAMP: 'stamp',
    LINK: 'link',
    AUDIO: 'audio',
    VIDEO: 'video',
    BOOKMARK: 'bookmark',
    CROP: 'crop'
};

// Base annotation schema
const createBaseAnnotation = (type, pageNum, customData = {}) => ({
    id: `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type,
    pageNum,
    timestamp: Date.now(),
    author: 'User',
    ...customData
});

/**
 * Annotation Manager Class
 */
export class AnnotationManager {
    constructor() {
        this.annotations = {}; // { [pageNum]: [annotations] }
        this.undoStack = [];
        this.redoStack = [];
        this.maxHistorySize = 100;
        this.listeners = [];
    }

    /**
     * Add annotation
     */
    addAnnotation(type, pageNum, data) {
        const annotation = createBaseAnnotation(type, pageNum, data);

        if (!this.annotations[pageNum]) {
            this.annotations[pageNum] = [];
        }

        this.annotations[pageNum].push(annotation);

        // Add to undo stack
        this.pushToHistory({
            action: 'add',
            annotation,
            pageNum
        });

        // Notify listeners
        this.notifyChange();

        return annotation.id;
    }

    /**
     * Update annotation
     */
    updateAnnotation(annotationId, pageNum, updates) {
        const pageAnnotations = this.annotations[pageNum] || [];
        const index = pageAnnotations.findIndex(a => a.id === annotationId);

        if (index === -1) return false;

        const oldAnnotation = { ...pageAnnotations[index] };
        pageAnnotations[index] = { ...pageAnnotations[index], ...updates };

        this.pushToHistory({
            action: 'update',
            annotationId,
            pageNum,
            oldData: oldAnnotation,
            newData: pageAnnotations[index]
        });

        this.notifyChange();
        return true;
    }

    /**
     * Delete annotation
     */
    deleteAnnotation(annotationId, pageNum) {
        const pageAnnotations = this.annotations[pageNum] || [];
        const index = pageAnnotations.findIndex(a => a.id === annotationId);

        if (index === -1) return false;

        const deletedAnnotation = pageAnnotations[index];
        this.annotations[pageNum].splice(index, 1);

        this.pushToHistory({
            action: 'delete',
            annotation: deletedAnnotation,
            pageNum,
            index
        });

        this.notifyChange();
        return true;
    }

    /**
     * Get annotations for a page
     */
    getPageAnnotations(pageNum) {
        return this.annotations[pageNum] || [];
    }

    /**
     * Get all annotations
     */
    getAllAnnotations() {
        return this.annotations;
    }

    /**
     * Undo last action
     */
    undo() {
        if (this.undoStack.length === 0) return false;

        const historyItem = this.undoStack.pop();
        this.redoStack.push(historyItem);

        this.revertAction(historyItem);
        this.notifyChange();
        return true;
    }

    /**
     * Redo last undone action
     */
    redo() {
        if (this.redoStack.length === 0) return false;

        const historyItem = this.redoStack.pop();
        this.undoStack.push(historyItem);

        this.applyAction(historyItem);
        this.notifyChange();
        return true;
    }

    /**
     * Clear all annotations
     */
    clear() {
        this.annotations = {};
        this.undoStack = [];
        this.redoStack = [];
        this.notifyChange();
    }

    /**
     * Export annotations as JSON
     */
    exportAnnotations() {
        return {
            version: '1.0',
            timestamp: Date.now(),
            annotations: this.annotations
        };
    }

    /**
     * Import annotations from JSON
     */
    importAnnotations(data) {
        if (data.version !== '1.0') {
            throw new Error('Unsupported annotation format version');
        }

        this.annotations = data.annotations || {};
        this.undoStack = [];
        this.redoStack = [];
        this.notifyChange();
    }

    /**
     * Save to IndexedDB
     */
    async saveToStorage(pdfId) {
        try {
            const db = await this.openDB();
            const transaction = db.transaction(['annotations'], 'readwrite');
            const store = transaction.objectStore('annotations');

            await store.put({
                pdfId,
                data: this.exportAnnotations()
            });

            return true;
        } catch (err) {
            console.error('Failed to save annotations:', err);
            return false;
        }
    }

    /**
     * Load from IndexedDB
     */
    async loadFromStorage(pdfId) {
        try {
            const db = await this.openDB();
            const transaction = db.transaction(['annotations'], 'readonly');
            const store = transaction.objectStore('annotations');

            const result = await store.get(pdfId);

            if (result && result.data) {
                this.importAnnotations(result.data);
                return true;
            }

            return false
        } catch (err) {
            console.error('Failed to load annotations:', err);
            return false;
        }
    }

    /**
     * Open IndexedDB
     */
    openDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('PDFAnnotationsDB', 1);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains('annotations')) {
                    db.createObjectStore('annotations', { keyPath: 'pdfId' });
                }
            };
        });
    }

    /**
     * Subscribe to changes
     */
    subscribe(callback) {
        this.listeners.push(callback);
        return () => {
            this.listeners = this.listeners.filter(cb => cb !== callback);
        };
    }

    /**
     * Notify all listeners
     */
    notifyChange() {
        this.listeners.forEach(callback => callback(this.annotations));
    }

    /**
     * Push to history stack
     */
    pushToHistory(historyItem) {
        this.undoStack.push(historyItem);

        // Clear redo stack when new action is performed
        this.redoStack = [];

        // Limit history size
        if (this.undoStack.length > this.maxHistorySize) {
            this.undoStack.shift();
        }
    }

    /**
     * Revert an action (for undo)
     */
    revertAction(historyItem) {
        const { action, pageNum } = historyItem;

        switch (action) {
            case 'add':
                // Remove the added annotation
                const addIndex = this.annotations[pageNum]?.findIndex(
                    a => a.id === historyItem.annotation.id
                );
                if (addIndex !== -1) {
                    this.annotations[pageNum].splice(addIndex, 1);
                }
                break;

            case 'delete':
                // Restore the deleted annotation
                if (!this.annotations[pageNum]) {
                    this.annotations[pageNum] = [];
                }
                this.annotations[pageNum].splice(
                    historyItem.index,
                    0,
                    historyItem.annotation
                );
                break;

            case 'update':
                // Restore old data
                const updateIndex = this.annotations[pageNum]?.findIndex(
                    a => a.id === historyItem.annotationId
                );
                if (updateIndex !== -1) {
                    this.annotations[pageNum][updateIndex] = historyItem.oldData;
                }
                break;
        }
    }

    /**
     * Apply an action (for redo)
     */
    applyAction(historyItem) {
        const { action, pageNum } = historyItem;

        switch (action) {
            case 'add':
                if (!this.annotations[pageNum]) {
                    this.annotations[pageNum] = [];
                }
                this.annotations[pageNum].push(historyItem.annotation);
                break;

            case 'delete':
                const deleteIndex = this.annotations[pageNum]?.findIndex(
                    a => a.id === historyItem.annotation.id
                );
                if (deleteIndex !== -1) {
                    this.annotations[pageNum].splice(deleteIndex, 1);
                }
                break;

            case 'update':
                const updateIndex = this.annotations[pageNum]?.findIndex(
                    a => a.id === historyItem.annotationId
                );
                if (updateIndex !== -1) {
                    this.annotations[pageNum][updateIndex] = historyItem.newData;
                }
                break;
        }
    }
}

// Singleton instance
export const annotationManager = new AnnotationManager();
