/**
 * Global Keyboard Shortcuts for Editing Tools
 * Handles Ctrl+Z (undo), Ctrl+Y (redo), Tool shortcuts
 */

import { useEffect } from 'react';
import { annotationManager } from '../utils/annotationEngine';

export const useEditingKeyboardShortcuts = () => {
    useEffect(() => {
        const handleKeyDown = (e) => {
            // Check if user is typing in an input
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) {
                return;
            }

            // Undo: Ctrl+Z or Cmd+Z
            if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
                e.preventDefault();
                if (annotationManager.undo()) {
                    window.dispatchEvent(new CustomEvent('annotations-updated'));
                }
            }

            // Redo: Ctrl+Y or Ctrl+Shift+Z or Cmd+Shift+Z
            if (((e.ctrlKey || e.metaKey) && e.key === 'y') ||
                ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'z')) {
                e.preventDefault();
                if (annotationManager.redo()) {
                    window.dispatchEvent(new CustomEvent('annotations-updated'));
                }
            }

            // Tool shortcuts (only if not in input)
            if (!e.ctrlKey && !e.metaKey && !e.altKey) {
                let tool = null;

                switch (e.key.toLowerCase()) {
                    case 'h':
                        tool = 'hand';
                        break;
                    case 'v':
                        tool = 'select';
                        break;
                    case 't':
                        tool = 'text';
                        break;
                    case 'i':
                        tool = 'image';
                        break;
                    case 'e':
                        tool = 'eraser';
                        break;
                    case 'd':
                        tool = 'freehand';
                        break;
                    case 'r':
                        tool = 'shape_rect';
                        break;
                    case 'c':
                        tool = 'shape_circle';
                        break;
                    default:
                        break;
                }

                if (tool) {
                    e.preventDefault();
                    window.dispatchEvent(new CustomEvent('editing-tool-changed', {
                        detail: { tool }
                    }));
                }
            }
        };

        document.addEventListener('keydown', handleKeyDown);

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, []);
};
