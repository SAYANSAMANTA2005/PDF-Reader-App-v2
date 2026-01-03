import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// Use local worker for offline support
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

const PDFContext = createContext();

export const usePDF = () => {
    const context = useContext(PDFContext);
    if (!context) {
        throw new Error('usePDF must be used within a PDFProvider');
    }
    return context;
};

export const PDFProvider = ({ children }) => {
    const [pdfDocument, setPdfDocument] = useState(null);
    const [pdfFile, setPdfFile] = useState(null); // File object or URL
    const [fileName, setFileName] = useState("No file selected");
    const [currentPage, setCurrentPage] = useState(1);
    const [numPages, setNumPages] = useState(0);
    const [scale, setScale] = useState(1.0);
    const [rotation, setRotation] = useState(0);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [sidebarWidth, setSidebarWidth] = useState(250); // New state for resizing
    const [activeSidebarTab, setActiveSidebarTab] = useState('thumbnails'); // 'thumbnails', 'bookmarks'
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [theme, setTheme] = useState('light');
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [currentMatchIndex, setCurrentMatchIndex] = useState(-1);
    const [annotationMode, setAnnotationMode] = useState('none'); // 'none', 'highlight', 'draw', 'text'
    const [annotations, setAnnotations] = useState({}); // { [pageNum]: [ { type, ...data } ] }
    const [annotationColor, setAnnotationColor] = useState('#ff0000'); // Default to red as in many editors, or yellow for highlight
    const [brushThickness, setBrushThickness] = useState(3);
    const [highlightThickness, setHighlightThickness] = useState(20);
    const [eraserThickness, setEraserThickness] = useState(20);
    const [isTwoPageMode, setIsTwoPageMode] = useState(false);

    // ADVANCED PRO FEATURES STATE
    const [workspaces, setWorkspaces] = useState([{ id: 'default', name: 'Standard Workspace', tabs: [] }]);
    const [activeWorkspaceId, setActiveWorkspaceId] = useState('default');
    const [tabs, setTabs] = useState([]); // { id, file, fileName, isActive, isPinned, groupId, currentPage, scale }
    const [tabGroups, setTabGroups] = useState([{ id: 'root', name: 'Main Documents', parentId: null }]);
    const [universalNotes, setUniversalNotes] = useState([]);
    const [annotationHistory, setAnnotationHistory] = useState([]); // [ { id, timestamp, type, page, data, action } ]
    const [navHistory, setNavHistory] = useState([]); // Stack of { fileId, page, timestamp }
    const [navIndex, setNavIndex] = useState(-1);
    const [searchOperators, setSearchOperators] = useState({
        useRegex: false,
        useBoolean: true,
        proximity: 0 // 0 means disabled, >0 means max distance in words
    });

    const toggleSearchOperator = (op) => {
        setSearchOperators(prev => ({ ...prev, [op]: !prev[op] }));
    };

    const [colorSettings, setColorSettings] = useState({
        '#ffff00': 'Definition',
        '#00ffff': 'Formula',
        '#ff0000': 'Doubt',
        '#00ff00': 'Important'
    });

    // Navigation History Manager
    const addToNavHistory = (fileId, page) => {
        const item = { fileId, page, timestamp: Date.now() };
        setNavHistory(prev => {
            const newHistory = prev.slice(0, navIndex + 1);
            return [...newHistory, item];
        });
        setNavIndex(prev => prev + 1);
    };

    const goBack = () => {
        if (navIndex > 0) {
            const prev = navHistory[navIndex - 1];
            setNavIndex(navIndex - 1);
            const tab = tabs.find(t => t.id === prev.fileId);
            if (tab) loadPDF(tab.file, tab.id, false); // false to avoid adding to history again
            setCurrentPage(prev.page);
        }
    };

    const goForward = () => {
        if (navIndex < navHistory.length - 1) {
            const next = navHistory[navIndex + 1];
            setNavIndex(navIndex + 1);
            const tab = tabs.find(t => t.id === next.fileId);
            if (tab) loadPDF(tab.file, tab.id, false);
            setCurrentPage(next.page);
        }
    };

    // Enhanced Annotation Setter
    const addAnnotation = (pageNum, annotation) => {
        const id = Math.random().toString(36).substr(2, 9);
        const newAnnot = { ...annotation, id, timestamp: Date.now(), author: 'User' };

        setAnnotations(prev => ({
            ...prev,
            [pageNum]: [...(prev[pageNum] || []), newAnnot]
        }));

        setAnnotationHistory(prev => [...prev, {
            id,
            timestamp: Date.now(),
            type: annotation.type,
            page: pageNum,
            data: newAnnot,
            action: 'add'
        }]);
    };

    const rollbackTo = (historyId) => {
        const index = annotationHistory.findIndex(h => h.id === historyId);
        if (index === -1) return;

        const newHistory = annotationHistory.slice(0, index + 1);
        const reconstructed = {};

        newHistory.forEach(event => {
            if (event.action === 'add') {
                reconstructed[event.page] = [...(reconstructed[event.page] || []), event.data];
            }
            // Add delete/edit logic if implemented
        });

        setAnnotations(reconstructed);
        setAnnotationHistory(newHistory);
    };

    // Speech Synthesis State
    const [isReading, setIsReading] = useState(false);
    const isReadingRef = useRef(false);
    const synth = window.speechSynthesis;

    // Sync ref with state for use in async callbacks
    useEffect(() => {
        isReadingRef.current = isReading;
    }, [isReading]);

    // Clean up speech on unmount
    useEffect(() => {
        return () => {
            if (synth.speaking) {
                synth.cancel();
            }
        };
    }, []);

    // Voice State
    const [voices, setVoices] = useState([]);
    const [selectedVoice, setSelectedVoice] = useState(null);

    // Load Voices
    useEffect(() => {
        const loadVoices = () => {
            const availableVoices = synth.getVoices();
            setVoices(availableVoices);

            const preferredVoice = availableVoices.find(v => v.name.includes("Google US English")) ||
                availableVoices.find(v => v.name.includes("Zira") || v.name.includes("Samantha")) ||
                availableVoices.find(v => v.name.toLowerCase().includes("female")) ||
                availableVoices[0];

            if (preferredVoice) {
                setSelectedVoice(preferredVoice);
            }
        };

        loadVoices();

        if (speechSynthesis.onvoiceschanged !== undefined) {
            speechSynthesis.onvoiceschanged = loadVoices;
        }
    }, [synth]);

    const loadPDF = async (file, id = null, track = true) => {
        setIsLoading(true);
        setError(null);

        const tabId = id || Math.random().toString(36).substr(2, 9);
        let currentFileName = "";

        try {
            let loadingTask;
            if (typeof file === 'string') {
                loadingTask = pdfjsLib.getDocument(file);
                currentFileName = file.split('/').pop();
            } else if (file instanceof File) {
                const arrayBuffer = await file.arrayBuffer();
                loadingTask = pdfjsLib.getDocument(arrayBuffer);
                currentFileName = file.name;
            } else {
                throw new Error("Invalid file format");
            }

            const pdf = await loadingTask.promise;

            setPdfDocument(pdf);
            setPdfFile(file);
            setFileName(currentFileName);
            setNumPages(pdf.numPages);
            setCurrentPage(1);

            if (track) addToNavHistory(tabId, 1);

            setTabs(prev => {
                const exists = prev.find(t => t.id === tabId || t.fileName === currentFileName);
                if (exists) {
                    return prev.map(t => ({ ...t, isActive: t.fileName === currentFileName }));
                }
                return [...prev.map(t => ({ ...t, isActive: false })), {
                    id: tabId,
                    file,
                    fileName: currentFileName,
                    isActive: true,
                    isPinned: false,
                    groupId: 'root',
                    timestamp: Date.now()
                }];
            });

        } catch (err) {
            console.error("Error loading PDF:", err);
            setError("Failed to load PDF. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const closeTab = (id) => {
        setTabs(prev => {
            const tab = prev.find(t => t.id === id);
            if (tab?.isPinned) return prev; // Cannot close pinned tab

            const index = prev.findIndex(t => t.id === id);
            const newTabs = prev.filter(t => t.id !== id);
            if (prev[index]?.isActive && newTabs.length > 0) {
                const nextTab = newTabs[Math.max(0, index - 1)];
                loadPDF(nextTab.file, nextTab.id);
            } else if (newTabs.length === 0) {
                setPdfDocument(null);
                setFileName("No file selected");
            }
            return newTabs;
        });
    };

    const togglePin = (id) => {
        setTabs(prev => prev.map(t => t.id === id ? { ...t, isPinned: !t.isPinned } : t));
    };

    const switchWorkspace = async (workspaceId) => {
        setActiveWorkspaceId(workspaceId);
        const ws = workspaces.find(w => w.id === workspaceId);
        if (ws && ws.tabs.length > 0) {
            setTabs(ws.tabs);
            const activeTab = ws.tabs.find(t => t.isActive) || ws.tabs[0];
            loadPDF(activeTab.file, activeTab.id);
        } else {
            setTabs([]);
            setPdfDocument(null);
        }
    };

    // Initial Theme Load
    useEffect(() => {
        const savedTheme = localStorage.getItem('theme') || 'light';
        setTheme(savedTheme);
        document.documentElement.setAttribute('data-theme', savedTheme);
    }, []);

    const toggleTheme = () => {
        const newTheme = theme === 'light' ? 'dark' : 'light';
        setTheme(newTheme);
        localStorage.setItem('theme', newTheme);
        document.documentElement.setAttribute('data-theme', newTheme);
    };

    const startReading = (pageNum, startIndex = 0) => {
        setIsReading(true);
        if (synth.speaking) {
            synth.cancel();
        }
    };

    const stopReading = () => {
        setIsReading(false);
        if (synth.speaking) {
            synth.cancel();
        }
    };

    const value = {
        pdfDocument,
        pdfFile,
        fileName,
        currentPage,
        setCurrentPage,
        numPages,
        scale,
        setScale,
        rotation,
        setRotation,
        isSidebarOpen,
        setIsSidebarOpen,
        sidebarWidth,
        setSidebarWidth,
        activeSidebarTab,
        setActiveSidebarTab,
        isLoading,
        error,
        theme,
        toggleTheme,
        loadPDF,
        searchQuery,
        setSearchQuery,
        searchResults,
        setSearchResults,
        currentMatchIndex,
        setCurrentMatchIndex,
        annotationMode,
        setAnnotationMode,
        annotations,
        setAnnotations,
        annotationColor,
        setAnnotationColor,
        brushThickness,
        setBrushThickness,
        highlightThickness,
        setHighlightThickness,
        eraserThickness,
        setEraserThickness,
        isTwoPageMode,
        setIsTwoPageMode,
        isReading,
        setIsReading,
        startReading,
        stopReading,
        handleDownload,
        synth,
        // Pro Features
        workspaces,
        setWorkspaces,
        activeWorkspaceId,
        setActiveWorkspaceId,
        switchWorkspace,
        tabs,
        setTabs,
        tabGroups,
        setTabGroups,
        closeTab,
        togglePin,
        universalNotes,
        setUniversalNotes,
        annotationHistory,
        addAnnotation,
        rollbackTo,
        colorSettings,
        setColorSettings,
        navHistory,
        navIndex,
        goBack,
        goForward,
        addToNavHistory,
        searchOperators,
        setSearchOperators,
        toggleSearchOperator

    };

    async function handleDownload() {
        if (!pdfFile || !annotations) return;
        try {
            const { PDFDocument, rgb } = await import('pdf-lib');
            // Download logic here...
        } catch (err) {
            console.error("Download failed:", err);
        }
    }

    return (
        <PDFContext.Provider value={value}>
            {children}
        </PDFContext.Provider>
    );
};
