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

            // Heuristic for "sweeter" / better voice
            // Priority: "Google US English", "Microsoft Zira", or any Female voice
            const preferredVoice = availableVoices.find(v => v.name.includes("Google US English")) ||
                availableVoices.find(v => v.name.includes("Zira") || v.name.includes("Samantha")) ||
                availableVoices.find(v => v.name.toLowerCase().includes("female")) ||
                availableVoices[0];

            if (preferredVoice) {
                setSelectedVoice(preferredVoice);
            }
        };

        loadVoices();

        // Chrome loads voices asynchronously
        if (speechSynthesis.onvoiceschanged !== undefined) {
            speechSynthesis.onvoiceschanged = loadVoices;
        }
    }, [synth]);

    const getTextGap = (item1, item2, viewport) => {
        if (!viewport) return 100; // default large gap

        // Transform items to get actual positions
        const tx1 = pdfjsLib.Util.transform(viewport.transform, item1.transform);
        const tx2 = pdfjsLib.Util.transform(viewport.transform, item2.transform);

        // item1 end x (approx)
        // Note: item.width is unscaled width usually, need to scale
        // But let's use the transform[4] (translateX) difference

        const x1 = tx1[4];
        const x2 = tx2[4];
        const width1 = item1.width * (Math.sqrt((tx1[0] * tx1[0]) + (tx1[1] * tx1[1]))); // Approx scaled width

        // Gap = start of next - end of current
        // But simplified: difference in X vs font size

        // A simple robust heuristic for pdf.js items:
        // If x2 is very close to x1 + width1, it's the same word.
        // If x2 is significantly larger, it's a space.

        const endOf1 = x1 + width1;
        const gap = x2 - endOf1;

        return gap;
    };


    const readPage = async (pageNum, startIndex) => {
        if (!isReadingRef.current || !pdfDocument || pageNum > numPages) {
            setIsReading(false);
            return;
        }

        setCurrentPage(pageNum);

        try {
            const page = await pdfDocument.getPage(pageNum);
            const textContent = await page.getTextContent();

            // We need viewport to calculate positions for smart joining
            // We'll use a default scale of 1.0 for calculation
            const viewport = page.getViewport({ scale: 1.0 });

            // Smart Join Logic
            let fullText = "";
            const items = textContent.items;

            // If starting from an index, we just need to ensure we don't break the first sentence context too much,
            // but for simplicity we will process from startIndex to end.

            for (let i = startIndex; i < items.length; i++) {
                const item = items[i];
                const str = item.str;

                if (i === startIndex) {
                    fullText += str;
                    continue;
                }

                const prevItem = items[i - 1];

                // Determine separator
                // Check Y difference (new line)
                const ty1 = prevItem.transform[5];
                const ty2 = item.transform[5];

                if (Math.abs(ty1 - ty2) > 5) {
                    // Significant Y difference -> New line, add space
                    fullText += " " + str;
                } else {
                    // Same line, check X gap
                    // Calculate gap using unscaled units directly from transform matrix for simplicity? 
                    // No, viewport transform is safer.

                    // Let's rely on a simpler heuristic often used:
                    // If the previous string ends with space, no need to add.
                    // If current starts with space, no need.

                    // Calculate gap
                    const tx1 = pdfjsLib.Util.transform(viewport.transform, prevItem.transform);
                    const tx2 = pdfjsLib.Util.transform(viewport.transform, item.transform);

                    // Simple distance check
                    // If the gap is less than, say, 1/4th of the font size, assume join.
                    // Font size is roughly transform[0] (scaleX) if simpler.
                    const fontSize = Math.sqrt((tx1[0] * tx1[0]) + (tx1[1] * tx1[1]));
                    const width1 = prevItem.width * (fontSize / prevItem.transform[0]); // Normalize?
                    // actually item.width is usually in PDF point units * font scale.
                    // Let's just use the visual gap.

                    const endX1 = tx1[4] + prevItem.width; // This width is tricky in pdfjs raw.
                    const startX2 = tx2[4];

                    // pdf.js usually handles spacing by splitting items.
                    // The "word by word" issue usually means we are adding spaces where we shouldn't.
                    // OR we are NOT adding spaces where we should?
                    // User said "reading most letter word by word".
                    // Implies: "H e l l o" -> "H" "E" "L" "L" "O".
                    // This happens if I did .join(' ').
                    // If pdfjs gave us ["H", "e", "l", "l", "o"], join(' ') -> "H e l l o".
                    // WE WANT: "Hello".

                    // HEURISTIC: If item is 1 char and gap is small -> No space.

                    const gap = startX2 - (tx1[4] + (prevItem.width * (tx1[0] / prevItem.transform[0]))); // rough approx

                    // Better approach: If the gap is small (< 5px?), don't add space.
                    // If gap is large (> 5px?), add space.
                    // But we can't easily get exact width without font metrics.

                    // FALLBACK SAFE LOGIC:
                    // If the item.str is just 1 char, AND the previous was 1 char, it's likely part of a word.
                    // BUT "a" "I" are words.
                    // Let's assume if it is NOT a space char, and gap is small.

                    // Let's try checking if the string itself has space.

                    // Experimental: check if prevItem hasEOL.

                    // RE-EVALUATING "word by word":
                    // If user means "Slow", "Robotic", then it's rate/pitch.
                    // If user means "H... E... L... L... O...", it's spacing.

                    // Let's try to join with "" (empty string) effectively, 
                    // relying on the fact that if there IS a space, it's usually in the item string or a separate item?
                    // No, pdfjs strips spaces often.

                    // Let's use a standard "semantic join":
                    // If end of prev is very close to start of next -> Merge.

                    const dist = startX2 - tx1[4]; // simple distance between starts
                    // If distance is roughly the width of prev string, then it's contiguous.
                    // This is hard.

                    // Let's use a simpler known-good heuristic for TTS:
                    // If `item.str` matches /^[a-zA-Z]$/ (single letter) AND prev matches single letter -> NO SPACE.
                    // Else -> SPACE.

                    if (prevItem.str.length === 1 && item.str.length === 1 && Math.abs(ty1 - ty2) < 5) {
                        fullText += str;
                    } else if (item.str === " " || prevItem.str === " ") {
                        fullText += str;
                    } else if (item.str.match(/^[,.?!:;]$/)) {
                        // Punctuation attaches to previous
                        fullText += str;
                    } else {
                        fullText += " " + str;
                    }
                }
            }

            if (!fullText.trim()) {
                readPage(pageNum + 1, 0);
                return;
            }

            const utterance = new SpeechSynthesisUtterance(fullText);
            if (selectedVoice) {
                utterance.voice = selectedVoice;
            }

            // "Sweeter" adjustments
            utterance.pitch = 1.1; // Slightly higher
            utterance.rate = 1.0;  // Normal speed

            utterance.onend = () => {
                if (isReadingRef.current) {
                    readPage(pageNum + 1, 0);
                }
            };

            utterance.onerror = (e) => {
                console.error("Speech synthesis error:", e);
                setIsReading(false);
            };

            synth.speak(utterance);

        } catch (err) {
            console.error("Error preparing page for reading:", err);
            setIsReading(false);
        }
    };

    const startReading = (pageNum, startIndex = 0) => {
        setIsReading(true);
        if (synth.speaking) {
            synth.cancel();
        }
        readPage(pageNum, startIndex);
    };

    const stopReading = () => {
        setIsReading(false);
        if (synth.speaking) {
            synth.cancel();
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

    const loadPDF = async (file) => {
        setIsLoading(true);
        setError(null);
        setPdfDocument(null);
        setPdfFile(file);
        setNumPages(0);
        setCurrentPage(1);
        setSearchQuery('');
        setSearchResults([]);

        try {
            let loadingTask;
            if (typeof file === 'string') {
                loadingTask = pdfjsLib.getDocument(file);
                setFileName(file.split('/').pop());
            } else if (file instanceof File) {
                const arrayBuffer = await file.arrayBuffer();
                loadingTask = pdfjsLib.getDocument(arrayBuffer);
                setFileName(file.name);
            } else {
                throw new Error("Invalid file format");
            }

            const pdf = await loadingTask.promise;
            setPdfDocument(pdf);
            setNumPages(pdf.numPages);
        } catch (err) {
            console.error("Error loading PDF:", err);
            setError("Failed to load PDF. Please try again.");
        } finally {
            setIsLoading(false);
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
        synth // Exporting synth in case direct access is needed check status
    };

    async function handleDownload() {
        if (!pdfFile || !annotations) return;
        
        try {
            const { PDFDocument, rgb, degrees } = await import('pdf-lib');
            let pdfDoc;
            
            if (typeof pdfFile === 'string') {
                const response = await fetch(pdfFile);
                const arrayBuffer = await response.arrayBuffer();
                pdfDoc = await PDFDocument.load(arrayBuffer);
            } else if (pdfFile instanceof File) {
                const arrayBuffer = await pdfFile.arrayBuffer();
                pdfDoc = await PDFDocument.load(arrayBuffer);
            }

            const pages = pdfDoc.getPages();

            for (const [pageNumStr, pageAnns] of Object.entries(annotations)) {
                const pageNum = parseInt(pageNumStr);
                const pdfPage = pages[pageNum - 1];
                const { width, height } = pdfPage.getSize();

                for (const ann of pageAnns) {
                    if (ann.points && ann.points.length > 1) {
                        // For paths, we might need to draw series of lines
                        for (let i = 0; i < ann.points.length - 1; i++) {
                            const p1 = ann.points[i];
                            const p2 = ann.points[i+1];
                            
                            // Transform normalized (0-1) to PDF space
                            // PDF y-axis is bottom-up
                            pdfPage.drawLine({
                                start: { x: p1.x * width, y: (1 - p1.y) * height },
                                end: { x: p2.x * width, y: (1 - p2.y) * height },
                                thickness: ann.strokeWidth || 3,
                                color: hexToRgb(ann.color || '#ff0000', rgb),
                                opacity: ann.opacity || 1,
                            });
                        }
                    }
                }
            }

            const pdfBytes = await pdfDoc.save();
            const blob = new Blob([pdfBytes], { type: 'application/pdf' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `annotated_${fileName || 'document.pdf'}`;
            link.click();
        } catch (err) {
            console.error("Download failed:", err);
            alert("Failed to export annotated PDF. Error: " + err.message);
        }
    }

    function hexToRgb(hex, rgb) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? rgb(
            parseInt(result[1], 16) / 255,
            parseInt(result[2], 16) / 255,
            parseInt(result[3], 16) / 255
        ) : rgb(1, 0, 0);
    }

    return (
        <PDFContext.Provider value={value}>
            {children}
        </PDFContext.Provider>
    );
};
