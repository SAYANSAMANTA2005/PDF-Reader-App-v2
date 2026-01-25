import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { extractTextWithCitations, reconstructTextSpacially, getSpatialTextAndMap } from '../utils/pdfHelpers';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { generateTOCFromLayout, renderPageToBase64 } from '../utils/pdfStructureAnalysis';
import { extractTOCFromImage } from '../utils/aiService';
import { ocrService } from '../utils/OCRService';
import { Capacitor } from '@capacitor/core';
// Mobile-aware PDF vision scope
const isMobilePlatform = Capacitor.isNativePlatform();
let pdfvision = isMobilePlatform ? 5 : 10;
// pdf vision scope --> mobile: 11 pages (currentPage ± 5), desktop: 21 pages (currentPage ± 10)
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
    const [activeToolId, setActiveToolId] = useState(null); // Global control for Elite Tools
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
    const [visiblePageRange, setVisiblePageRange] = useState({ start: 1, end: 21 }); // Pages within currentPage ± 10

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

    // Advanced Academic Features State
    const [examConfig, setExamConfig] = useState(null);
    const [masteryMetrics, setMasteryMetrics] = useState({});
    const [studyPlan, setStudyPlan] = useState(null);
    const [crossPDFInsights, setCrossPDFInsights] = useState([]);
    const [equationInsights, setEquationInsights] = useState(null);
    const [isMathMode, setIsMathMode] = useState(false);
    const [activeEquation, setActiveEquation] = useState(null);

    // LEARNING INTELLIGENCE & ELITE FEATURES
    const [knowledgeGraph, setKnowledgeGraph] = useState({ nodes: [], links: [] });
    const [conceptMastery, setConceptMastery] = useState({}); // { [conceptName]: masteryScore }
    const [isActiveRecallMode, setIsActiveRecallMode] = useState(false);
    const [mentorPersona, setMentorPersona] = useState('Friendly Tutor'); // 'Strict Coach', 'Research Advisor', etc.
    const [cognitiveLoad, setCognitiveLoad] = useState({ fatigueLevel: 0, stuckDetected: false });
    const [masteryEstimates, setMasteryEstimates] = useState({ timeToMaster: 0, decayNextAlert: null });
    const [citations, setCitations] = useState([]);
    const [flashcards, setFlashcards] = useState([]);
    const [references, setReferences] = useState([]);
    const [pdfText, setPdfText] = useState("");
    const [pdfPagesData, setPdfPagesData] = useState([]); // For RAG Engine
    const [outline, setOutline] = useState([]); // PDF Bookmarks/Table of Contents
    const [isGeneratingTOC, setIsGeneratingTOC] = useState(false);



    // Growth & Viral Mechanics
    const [referralPoints, setReferralPoints] = useState(0);
    const [referralCount, setReferralCount] = useState(0);
    const [leaderboardData, setLeaderboardData] = useState([
        { name: 'Alex', points: 2500, avatar: 'A', rank: 1, badge: '🏆 Campus Lead' },
        { name: 'Sarah', points: 2100, avatar: 'S', rank: 2, badge: '🔥 Hot Streak' },
        { name: 'Mike', points: 1800, avatar: 'M', rank: 3, badge: '🥈 Top Contributor' }
    ]);
    const [studySessions, setStudySessions] = useState([]);
    const [activeCall, setActiveCall] = useState(null);

    const [colorSettings, setColorSettings] = useState({
        '#ffff00': 'Definition',
        '#00ffff': 'Formula',
        '#ff0000': 'Doubt',
        '#00ff00': 'Important'
    });

    const [isPremium, setIsPremium] = useState(false);

    // PERSISTENT AUDIO ENGINE STATE
    const [audioActiveMode, setAudioActiveMode] = useState('ambient');
    const [audioActiveSound, setAudioActiveSound] = useState(null);
    const [audioVolume, setAudioVolume] = useState(0.5);
    const [audioIsMuted, setAudioIsMuted] = useState(false);
    const [audioActiveInternetTrack, setAudioActiveInternetTrack] = useState(null);
    const [isTtsSelecting, setIsTtsSelecting] = useState(false);
    const [ttsSelectionPoints, setTtsSelectionPoints] = useState([]); // [{ pageNum, index, text }]

    // TTS Highlighting State
    const [ttsHighlightItemIndex, setTtsHighlightItemIndex] = useState(-1);
    const [ttsTextMap, setTtsTextMap] = useState([]); // Map of current page text items

    useEffect(() => {
        if (!isTtsSelecting) {
            setTtsSelectionPoints([]);
        }
    }, [isTtsSelecting]);

    const activeScanId = useRef(0);

    const audioContextRef = useRef(null);
    const audioNodesRef = useRef({});
    const internetAudioRef = useRef(new Audio());

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
        return id;
    };

    const addImageAnnotation = (pageNum, imageSrc, x, y, width, height) => {
        const id = `img_${Math.random().toString(36).substr(2, 9)}`;
        const newAnnot = {
            type: 'image',
            id,
            src: imageSrc,
            x, y, width, height,
            timestamp: Date.now(),
            author: 'User'
        };

        setAnnotations(prev => ({
            ...prev,
            [pageNum]: [...(prev[pageNum] || []), newAnnot]
        }));

        setAnnotationHistory(prev => [...prev, {
            id,
            timestamp: Date.now(),
            type: 'image',
            page: pageNum,
            data: newAnnot,
            action: 'add'
        }]);
        return id;
    };

    const updateAnnotation = (pageNum, id, newData) => {
        setAnnotations(prev => {
            const pageAnns = prev[pageNum] || [];
            return {
                ...prev,
                [pageNum]: pageAnns.map(ann => ann.id === id ? { ...ann, ...newData } : ann)
            };
        });
    };

    const processTtsRange = useCallback(async (p1, p2) => {
        if (!pdfDocument) {
            console.error("TTS: No PDF document available");
            return;
        }
        try {
            console.log("TTS: Processing range...", p1, p2);
            let start = p1;
            let end = p2;
            if (p1.pageNum > p2.pageNum || (p1.pageNum === p2.pageNum && p1.index > p2.index)) {
                start = p2;
                end = p1;
            }

            let combinedItems = [];
            for (let i = start.pageNum; i <= end.pageNum; i++) {
                const page = await pdfDocument.getPage(i);
                const textContent = await page.getTextContent();
                const items = textContent.items;

                const startIdx = i === start.pageNum ? start.index : 0;
                const endIdx = i === end.pageNum ? end.index : items.length - 1;

                const rangeItems = items.slice(startIdx, endIdx + 1);
                combinedItems.push(...rangeItems);
            }

            const cleanText = reconstructTextSpacially(combinedItems);
            console.log("TTS: Capture complete. Length:", cleanText.length, "Start:", cleanText.substring(0, 50));

            if (!cleanText) {
                console.warn("TTS: Captured text is empty!");
                window.dispatchEvent(new CustomEvent('tts-range-error', { detail: { message: "No text found in this area. Try selecting a larger range." } }));
                return;
            }

            window.dispatchEvent(new CustomEvent('tts-range-selected', { detail: { text: cleanText } }));
        } catch (err) {
            console.error("TTS: Error processing range:", err);
            window.dispatchEvent(new CustomEvent('tts-range-error', { detail: { message: "Failed to extract text. Please try again." } }));
        }
    }, [pdfDocument]);

    const handleTtsPointClick = useCallback(async (pageNum, index, text) => {
        if (!isTtsSelecting) return;

        setTtsSelectionPoints(prev => {
            const newPoints = [...prev, { pageNum, index, text }];
            console.log(`TTS Point selected: Page ${pageNum}, Index ${index}. Points count: ${newPoints.length}`);

            if (newPoints.length === 2) {
                console.log("TTS: Two points captured. Triggering process...");
                // Note: We use setTimeout to escape the state update cycle
                setTimeout(() => {
                    window.dispatchEvent(new CustomEvent('tts-range-processing'));
                    processTtsRange(newPoints[0], newPoints[1]);
                    setIsTtsSelecting(false);
                }, 0);
                return [];
            }
            return newPoints;
        });
    }, [isTtsSelecting, processTtsRange]);



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

    // Update visible page range for lazy loading (±10 pages from currentPage)
    useEffect(() => {
        const pageRangeOffset = pdfvision;
        const start = Math.max(1, currentPage - pageRangeOffset);
        const end = Math.min(numPages, currentPage + pageRangeOffset);
        setVisiblePageRange({ start, end });
    }, [currentPage, numPages]);

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

    // Cleanup function to release PDF resources
    const cleanupPDFResources = useCallback(() => {
        if (pdfDocument) {
            try {
                // Destroy all PDF.js resources
                pdfDocument.destroy();
                console.log('✅ PDF resources cleaned up');
            } catch (err) {
                console.warn('⚠️ Error cleaning up PDF:', err);
            }
        }

        // Reset state
        setPdfDocument(null);
        setPdfFile(null);
        setPdfText("");
        setAnnotations({});
        setSearchResults([]);
        setCurrentPage(1);
        setNumPages(0);
    }, [pdfDocument]);

    /**
     * Intelligently get text from a page (OCR Fallback)
     */
    async function getPageTextAndMap(pageNum) {
        if (!pdfDocument) return null;
        try {
            const page = await pdfDocument.getPage(pageNum);
            const textContent = await page.getTextContent();

            // Use the spatial mapper
            const { text, itemMap } = getSpatialTextAndMap(textContent.items);

            // OCR Fallback
            if (text.trim().length < 20 && textContent.items.length < 5) {
                console.log(`🔍 TTS: Page ${pageNum} appears scanned. Triggering OCR...`);
                const base64 = await renderPageToBase64(page);
                const ocrResult = await ocrService.recognize(base64);
                const ocrText = typeof ocrResult === 'string' ? ocrResult : ocrResult.text;
                // For OCR, we don't have a good item map yet, just return text
                setTtsTextMap([]);
                return { text: ocrText, map: [] };
            }

            setTtsTextMap(itemMap);
            return { text, map: itemMap };
        } catch (err) {
            console.warn(`Failed to get text map for page ${pageNum}`, err);
            return null;
        }
    }

    /**
     * Legacy wrapper for backward compatibility
     */
    const getPageText = async (pageNum) => {
        const result = await getPageTextAndMap(pageNum);
        return result ? result.text : "";
    };

    const triggerAutoTOCScan = useCallback((pdf) => {
        if (!pdf) return;
        setIsGeneratingTOC(true);
        const scanId = ++activeScanId.current;
        console.log("⚠️ Starting Smart Layout Classification (Scan ID:", scanId, ")...");

        generateTOCFromLayout(pdf, (update, isIncremental) => {
            if (scanId !== activeScanId.current) return; // Stale scan
            if (isIncremental) {
                setOutline(prev => [...prev, ...update]);
                setActiveSidebarTab('bookmarks');
            }
        }, () => scanId !== activeScanId.current).then(layoutOutline => {
            if (scanId !== activeScanId.current) return;
            if (layoutOutline && layoutOutline.length > 0) {
                console.log(`✅ Final Smart TOC with ${layoutOutline.length} entries`);
                setOutline(layoutOutline);
            }
        }).finally(() => {
            if (scanId === activeScanId.current) {
                setIsGeneratingTOC(false);
            }
        });
    }, []);

    const loadPDF = async (file, options = {}) => {
        const { tabId: customTabId, track = true, initialPage = 1, customFileName = null } = options;
        setIsLoading(true);
        setError(null);

        const tabId = customTabId || Math.random().toString(36).substr(2, 9);
        let currentFileName = "";

        try {
            let loadingTask;
            if (typeof file === 'string') {
                loadingTask = pdfjsLib.getDocument({
                    url: file,
                    enableWebGL: true,
                    disableRange: false,
                    disableAutoFetch: true,
                    disableStream: false
                });
                currentFileName = file.split('/').pop();
            } else if (file instanceof File) {
                const arrayBuffer = await file.arrayBuffer();
                loadingTask = pdfjsLib.getDocument({
                    data: arrayBuffer,
                    enableWebGL: true
                });
                currentFileName = file.name;
            } else if (file instanceof Uint8Array || file instanceof ArrayBuffer) {
                loadingTask = pdfjsLib.getDocument({
                    data: file,
                    enableWebGL: true
                });
                currentFileName = customFileName || fileName || "edited_document.pdf";
            } else {
                throw new Error("Invalid file format");
            }

            const pdf = await loadingTask.promise;

            setPdfDocument(pdf);
            setPdfFile(file);
            setFileName(currentFileName);
            setNumPages(pdf.numPages);
            setCurrentPage(initialPage);

            // ALWAYS skip initial text extraction for performance
            // Text will be extracted lazily as user scrolls to pages
            setPdfText("");
            setPdfPagesData([]); // Reset RAG data
            console.log(`📄 PDF loaded (${pdf.numPages} pages) - Text extraction deferred for performance`);

            // Extract Outline (Table of Contents)
            try {
                const rawOutline = await pdf.getOutline();
                if (rawOutline) {
                    const processItems = async (items) => {
                        const results = [];
                        for (const item of items) {
                            let pageNum = null;
                            try {
                                if (item.dest) {
                                    let dest = item.dest;
                                    if (typeof dest === 'string') {
                                        dest = await pdf.getDestination(dest);
                                    }
                                    if (Array.isArray(dest)) {
                                        const ref = dest[0];
                                        if (ref && typeof ref === 'object') {
                                            pageNum = (await pdf.getPageIndex(ref)) + 1;
                                        }
                                    }
                                }
                            } catch (e) {
                                console.warn("Failed to get page index for outline item", e);
                            }

                            const children = item.items && item.items.length > 0
                                ? await processItems(item.items)
                                : [];

                            results.push({
                                title: item.title,
                                page: pageNum,
                                children: children,
                                bold: item.bold,
                                italic: item.italic,
                                color: item.color
                            });
                        }
                        return results;
                    };
                    const processedOutline = await processItems(rawOutline);
                    setOutline(processedOutline);
                    if (processedOutline.length > 0) {
                        setOutline(processedOutline);
                        setActiveSidebarTab('bookmarks');
                    } else {
                        // FALLBACK: Generate TOC from Layout
                        // triggerAutoTOCScan(pdf); // DISABLED: Now manual
                        toast.info("No Table of Contents found. You can scan for it AI in the 'Content' tab.", { duration: 5000 });
                    }
                } else {
                    // FALLBACK: Generate TOC from Layout (Same logic)
                    // triggerAutoTOCScan(pdf); // DISABLED: Now manual
                    toast.info("No Table of Contents found. You can scan for it AI in the 'Content' tab.", { duration: 5000 });
                }
            } catch (outlineErr) {
                console.warn("Failed to extract outline:", outlineErr);
                setOutline([]);
            }

            // Start background extraction for RAG engine (True AI)
            extractTextWithCitations(pdf).then(data => {
                setPdfPagesData(data);
                console.log('✅ RAG Engine: Grounding data ready');
            }).catch(console.error);


            if (track) addToNavHistory(tabId, initialPage);

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

    const generateTOCFromPage = async (pageNum) => {
        if (!pdfDocument || !pageNum) return;
        setIsGeneratingTOC(true);
        const scanId = ++activeScanId.current; // Override auto-scan

        try {
            console.log(`🎯 Manually extracting TOC from Page ${pageNum}...`);
            const page = await pdfDocument.getPage(parseInt(pageNum));
            const base64Image = await renderPageToBase64(page);
            const visionTOC = await extractTOCFromImage(base64Image);

            if (scanId !== activeScanId.current) return; // User started another manual scan

            if (visionTOC && visionTOC.length > 0) {
                setOutline(visionTOC);
                setIsGeneratingTOC(false);
                return true;
            } else {
                toast.info("No content found on that page. Resuming automatic scan...");
                triggerAutoTOCScan(pdfDocument);
                return false;
            }
        } catch (err) {
            if (scanId !== activeScanId.current) return;
            console.error("Manual TOC extraction failed:", err);
            toast.error("Error analyzing page. Resuming automatic scan...");
            triggerAutoTOCScan(pdfDocument);
            return false;
        }
    };

    const closeTab = (id) => {
        setTabs(prev => {
            const tab = prev.find(t => t.id === id);
            if (tab?.isPinned) return prev; // Cannot close pinned tab

            // Cleanup PDF resources if closing active tab
            if (tab?.isActive && pdfDocument) {
                cleanupPDFResources();
            }

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
        const themes = ['light', 'dark', 'sepia', 'sepia-ui', 'forest', 'ocean', 'paper'];
        const currentIndex = themes.indexOf(theme);
        const nextIndex = (currentIndex + 1) % themes.length;
        const newTheme = themes[nextIndex];

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
        activeToolId,
        setActiveToolId,
        isLoading,
        error,
        theme,
        setTheme,
        toggleTheme,
        loadPDF,
        cleanupPDFResources,
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
        visiblePageRange,
        setVisiblePageRange,
        isReading,
        setIsReading,
        isGeneratingTOC,
        generateTOCFromPage,
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
        addAnnotation,
        addImageAnnotation,
        updateAnnotation,
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
        toggleSearchOperator,
        // Advanced Academic Features
        examConfig, setExamConfig,
        masteryMetrics, setMasteryMetrics,
        studyPlan, setStudyPlan,
        crossPDFInsights, setCrossPDFInsights,
        equationInsights, setEquationInsights,
        isMathMode, setIsMathMode,
        activeEquation, setActiveEquation,
        // Elite Features
        knowledgeGraph, setKnowledgeGraph,
        conceptMastery, setConceptMastery,
        isActiveRecallMode, setIsActiveRecallMode,
        mentorPersona, setMentorPersona,
        cognitiveLoad, setCognitiveLoad,
        masteryEstimates, setMasteryEstimates,
        citations, setCitations,
        flashcards, setFlashcards,
        references, setReferences,
        pdfText, setPdfText,
        pdfPagesData, setPdfPagesData,
        outline, setOutline,

        // Growth & Viral States
        referralPoints, setReferralPoints,
        referralCount, setReferralCount,
        leaderboardData, setLeaderboardData,
        studySessions, setStudySessions, // { id, title, start, end, type }
        activeCall, setActiveCall, // { roomId, participants, isRecording }
        isPremium, setIsPremium,
        // Global Audio Persistence
        audioActiveMode, setAudioActiveMode,
        audioActiveSound, setAudioActiveSound,
        audioVolume, setAudioVolume,
        isTtsSelecting,
        setIsTtsSelecting,
        ttsSelectionPoints,
        handleTtsPointClick,
        audioIsMuted, setAudioIsMuted,
        audioActiveInternetTrack, setAudioActiveInternetTrack,
        audioContextRef, audioNodesRef, internetAudioRef,
        getPageText, getPageTextAndMap,
        triggerAutoTOCScan,
        ttsHighlightItemIndex, setTtsHighlightItemIndex,
        ttsTextMap
    };

    async function handleDownload() {
        if (!pdfDocument || !annotations) return;
        try {
            const { PDFDocument, rgb } = await import('pdf-lib');

            // Optimized: Use direct bytes from the loaded document instead of re-fetching
            const existingPdfBytes = await pdfDocument.getData();

            const pdfDoc = await PDFDocument.load(existingPdfBytes);
            const pages = pdfDoc.getPages();

            const hexToRgb = (hex) => {
                if (!hex) return { r: 0, g: 0, b: 0 };
                const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
                return result ? {
                    r: parseInt(result[1], 16) / 255,
                    g: parseInt(result[2], 16) / 255,
                    b: parseInt(result[3], 16) / 255
                } : { r: 0, g: 0, b: 0 };
            };

            for (let i = 0; i < pages.length; i++) {
                const pageNum = i + 1;
                const page = pages[i];
                const { width, height } = page.getSize();
                const pageAnns = annotations[pageNum] || [];

                for (const ann of pageAnns) {
                    const color = hexToRgb(ann.color || '#000000');
                    const rColor = rgb(color.r, color.g, color.b);

                    if (ann.type === 'draw' || ann.type === 'highlight') {
                        if (ann.points && ann.points.length > 1) {
                            for (let j = 0; j < ann.points.length - 1; j++) {
                                const p1 = ann.points[j];
                                const p2 = ann.points[j + 1];
                                page.drawLine({
                                    start: { x: p1.x * width, y: height - (p1.y * height) },
                                    end: { x: p2.x * width, y: height - (p2.y * height) },
                                    thickness: (ann.strokeWidth || 3),
                                    color: rColor,
                                    opacity: ann.opacity || 1
                                });
                            }
                        }
                    } else if (ann.type === 'image') {
                        try {
                            const isDataUrl = ann.src.startsWith('data:');
                            let imageBytes;
                            if (isDataUrl) {
                                // Extract base64 from data URL
                                const base64 = ann.src.split(',')[1];
                                imageBytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
                            } else {
                                imageBytes = await fetch(ann.src).then(res => res.arrayBuffer());
                            }

                            let pdfImage;
                            if (ann.src.toLowerCase().includes('png') || ann.src.startsWith('data:image/png')) {
                                pdfImage = await pdfDoc.embedPng(imageBytes);
                            } else {
                                pdfImage = await pdfDoc.embedJpg(imageBytes);
                            }

                            page.drawImage(pdfImage, {
                                x: ann.x * width,
                                y: height - (ann.y * height) - (ann.height * height),
                                width: ann.width * width,
                                height: ann.height * height,
                            });
                        } catch (imageErr) {
                            console.warn("Failed to embed image in PDF:", imageErr);
                        }
                    }
                }
            }

            const pdfBytes = await pdfDoc.save();
            const blob = new Blob([pdfBytes], { type: 'application/pdf' });

            // Try File System Access API first (Chrome, Edge, Opera)
            if ('showSaveFilePicker' in window) {
                try {
                    const handle = await window.showSaveFilePicker({
                        suggestedName: `annotated_${fileName || 'document.pdf'}`,
                        types: [{
                            description: 'PDF Document',
                            accept: { 'application/pdf': ['.pdf'] },
                        }],
                    });
                    const writable = await handle.createWritable();
                    await writable.write(blob);
                    await writable.close();
                    return; // Success, exit
                } catch (pickerErr) {
                    if (pickerErr.name !== 'AbortError') {
                        console.warn("File picker failed, falling back:", pickerErr);
                    } else {
                        return; // User cancelled picker
                    }
                }
            }

            // Fallback to standard download
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `annotated_${fileName || 'document.pdf'}`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error("Download failed:", err);
            alert("Failed to generate annotated PDF. Check console for details.");
        }
    }

    // ==================== RECOVERY HANDSHAKE ENGINE ====================
    // 1. Check for pending downloads on mount/load
    useEffect(() => {
        if (pdfDocument && localStorage.getItem('RELOAD_PENDING_DOWNLOAD')) {
            console.log("🔄 Recovery Handshake: Triggering post-reload download...");
            localStorage.removeItem('RELOAD_PENDING_DOWNLOAD');
            // Give the UI a moment to settle
            setTimeout(() => {
                handleDownload();
            }, 1500);
        }
    }, [pdfDocument]);

    // 2. Persist annotations to local storage for recovery
    useEffect(() => {
        if (Object.keys(annotations).length > 0) {
            localStorage.setItem('cached_annotations', JSON.stringify(annotations));
        }
    }, [annotations]);

    // 3. Browser Event Listeners (Enhanced)
    useEffect(() => {
        const handleAutoDownload = (e) => {
            const totalAnns = Object.values(annotations).reduce((acc, curr) => acc + curr.length, 0);

            if (totalAnns > 0) {
                // Set the flag for post-reload download in case sync download is blocked
                localStorage.setItem('RELOAD_PENDING_DOWNLOAD', 'true');

                // Attempt immediate download (may be blocked)
                handleDownload();

                // Standard browser prompt
                const msg = "We're preparing your download. Don't worry, your work is saved and will auto-download after the refresh!";
                e.preventDefault();
                e.returnValue = msg;
                return msg;
            }
        };

        const handleKeys = (e) => {
            if (e.key === 'F5' || (e.ctrlKey && e.key === 'r')) {
                const totalAnns = Object.values(annotations).reduce((acc, curr) => acc + curr.length, 0);
                if (totalAnns > 0) {
                    localStorage.setItem('RELOAD_PENDING_DOWNLOAD', 'true');
                    handleDownload();
                }
            }
        };

        window.addEventListener('beforeunload', handleAutoDownload);
        window.addEventListener('keydown', handleKeys);

        return () => {
            window.removeEventListener('beforeunload', handleAutoDownload);
            window.removeEventListener('keydown', handleKeys);
        };
    }, [annotations, pdfDocument, fileName]);

    return (
        <PDFContext.Provider value={value}>
            {children}
        </PDFContext.Provider>
    );
};
