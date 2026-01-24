import { extractTOCFromText, extractTOCFromImage } from './aiService';
import { reconstructTextSpacially } from './pdfHelpers';
import * as pdfjsLib from 'pdfjs-dist';

// Heuristics for detecting headings
const MIN_HEADING_LENGTH = 4;
const MAX_HEADING_LENGTH = 100;

/**
 * main function to generate TOC from layout
 * @param {Object} pdfDocument - PDF.js document proxy
 * @param {Function} onProgress - Callback for progress (0-100)
 */
export const generateTOCFromLayout = async (pdfDocument, onProgress, shouldCancel) => {
    try {
        console.log("🔍 Starting Layout-based TOC Generation...");
        const numPages = pdfDocument.numPages;

        // 0. PRIORITY STRATEGY: Detect "Table of Contents" / "Syllabus" Page
        console.log("Detecting dedicated TOC page...");
        const detectedTOC = await detectExecutableTOC(pdfDocument, (items) => {
            if (shouldCancel && shouldCancel()) return;
            if (onProgress && typeof onProgress === 'function') {
                // If it's the specific onItemFound callback passed from Context
                onProgress(items, true); // true = isIncremental
            }
        }, shouldCancel);

        if (detectedTOC && detectedTOC.length > 3) {
            console.log("✅ Found dedicated TOC page with", detectedTOC.length, "entries.");
            return detectedTOC;
        }

        // 1. ANalyze Font Statistics (Sample first 20 pages or 10%)
        const sampleLimit = Math.min(numPages, 20);
        const fontStats = await analyzeFontStatistics(pdfDocument, sampleLimit);

        if (!fontStats.bodyFontSize) {
            console.warn("Could not determine body font size.");
            return [];
        }

        console.log("📊 Font Stats:", fontStats);

        // 2. Scan all pages for headings based on stats
        const headings = [];
        const batchSize = 10;

        for (let i = 1; i <= numPages; i += batchSize) {
            const batchPromises = [];
            const end = Math.min(i + batchSize - 1, numPages);

            for (let j = i; j <= end; j++) {
                batchPromises.push(scanPageForHeadings(pdfDocument, j, fontStats));
            }

            const batchResults = await Promise.all(batchPromises);
            headings.push(...batchResults.flat());

            if (onProgress) onProgress((end / numPages) * 100);
        }

        // 3. Post-process & Build Hierarchy
        const tocInfo = buildHierarchy(headings);
        return tocInfo;

    } catch (e) {
        console.error("Layout TOC generation failed:", e);
        return [];
    }
};

/**
 * Stage 1: Analyze Document Fonts to find Body Text vs Headings
 */
const analyzeFontStatistics = async (pdfDocument, limit) => {
    const sizeMap = new Map(); // frequency of each font size
    const textFrequency = new Map(); // Track repeated lines (headers/footers)

    for (let i = 1; i <= limit; i++) {
        const page = await pdfDocument.getPage(i);
        const textContent = await page.getTextContent();

        // Group by line to detect repeated headers
        const linesOnPage = new Set();

        textContent.items.forEach(item => {
            if (!item.str || item.str.trim().length === 0) return;

            const fontSize = Math.round(Math.abs(item.transform[3]) * 100) / 100;
            if (fontSize > 0) {
                sizeMap.set(fontSize, (sizeMap.get(fontSize) || 0) + item.str.length);
            }

            const txt = item.str.trim();
            if (txt.length > 5) linesOnPage.add(txt);
        });

        linesOnPage.forEach(line => {
            textFrequency.set(line, (textFrequency.get(line) || 0) + 1);
        });
    }

    // Find Body Text (Most frequent font size by character count)
    let bodyFontSize = 0;
    let maxCount = 0;

    for (const [size, count] of sizeMap.entries()) {
        if (count > maxCount) {
            maxCount = count;
            bodyFontSize = size;
        }
    }

    // Identify Repeated Text (Headers/Footers)
    const repeatedText = new Set();
    textFrequency.forEach((count, text) => {
        if (count > limit * 0.4) { // Appears on more than 40% of sampled pages
            repeatedText.add(text);
        }
    });

    // Identify Heading Candidates (Larger than body text)
    const largerSizes = Array.from(sizeMap.keys())
        .filter(s => s > bodyFontSize * 1.05) // at least 5% larger for books
        .sort((a, b) => b - a);

    return {
        bodyFontSize,
        repeatedText,
        headingSizes: largerSizes,
        thresholds: {
            h1: largerSizes[0] || bodyFontSize * 1.5,
            h2: largerSizes[1] || bodyFontSize * 1.2
        }
    };
};

/**
 * Stage 2: Scan a single page for potential headings
 */
const scanPageForHeadings = async (pdfDocument, pageNum, fontStats) => {
    const page = await pdfDocument.getPage(pageNum);
    const textContent = await page.getTextContent();
    const pageDisplayVal = pageNum; // or use page label if available

    // Sort items by Y (top to bottom) then X
    const items = textContent.items.sort((a, b) => {
        const yA = a.transform[5];
        const yB = b.transform[5];
        if (Math.abs(yA - yB) > 5) return yB - yA; // PDF Y is bottom-left origin
        return a.transform[4] - b.transform[4];
    });

    const potentialHeadings = [];
    let currentLine = { text: "", fontSize: 0, distinct: false, bold: false };
    let lastY = -1;

    for (const item of items) {
        if (!item.str || item.str.trim().length === 0) continue;

        const fontSize = Math.round(Math.abs(item.transform[3]) * 100) / 100;
        const y = item.transform[5];
        const isBold = item.fontName.toLowerCase().includes('bold');

        // Detect new line
        if (lastY !== -1 && Math.abs(y - lastY) > fontSize * 0.5) {
            // Process previous line
            if (isValidHeading(currentLine, fontStats)) {
                // Heuristic: If it's a very short line, it might be a header
                // Edge Case: Page headers/footers usually repeated or small
                const text = currentLine.text.trim();
                const isLikelyStructure = text.length > 0 && !stats.repeatedText?.has(text);

                if (isLikelyStructure) {
                    potentialHeadings.push({
                        title: text,
                        page: pageDisplayVal,
                        fontSize: currentLine.fontSize,
                        isBold: currentLine.bold
                    });
                }
            }
            // Reset
            currentLine = { text: "", fontSize: 0, distinct: false, bold: false };
        }

        currentLine.text += item.str;
        // Take max font size of line as representative
        if (fontSize > currentLine.fontSize) currentLine.fontSize = fontSize;
        if (isBold) currentLine.bold = true;

        lastY = y;
    }

    // Flush last line
    if (isValidHeading(currentLine, fontStats)) {
        potentialHeadings.push({
            title: currentLine.text.trim(),
            page: pageDisplayVal,
            fontSize: currentLine.fontSize,
            isBold: currentLine.bold
        });
    }

    return potentialHeadings;
};

const isValidHeading = (line, stats) => {
    const text = line.text.trim();
    if (text.length < MIN_HEADING_LENGTH || text.length > MAX_HEADING_LENGTH) return false;

    // Rule 1: Significantly larger than body
    if (line.fontSize >= stats.thresholds.h2) return true;

    // Rule 2: Slightly larger + Bold/Uppercase
    if (line.fontSize > stats.bodyFontSize * 1.05 && (line.bold || text === text.toUpperCase())) return true;

    // Rule 3: Explicit numbering pattern (e.g., "1. Introduction", "Chapter 5", "Units", "Part")
    if (line.fontSize >= stats.bodyFontSize) {
        const pattern = /^(Chapter|Unit|Section|Part|Module|Lesson|\d+\.|[IVX]+\.)\s/i;
        if (pattern.test(text)) return true;

        // Deep book scan: Patterns like "1-1", "A-1"
        const academicPattern = /^[A-Z\d]+[\.-]\d+/;
        if (academicPattern.test(text)) return true;
    }

    return false;
};

/**
 * Stage 3: Build Tree Hierarchy from list of headings
 */
const buildHierarchy = (flatHeadings) => {
    if (flatHeadings.length === 0) return [];

    // Normalize font sizes to levels
    // Find clusters or just use simple quantization
    const uniqueSizes = [...new Set(flatHeadings.map(h => h.fontSize))].sort((a, b) => b - a);

    // Map font sizes to levels (1, 2, 3...)
    const getLevel = (size) => {
        const idx = uniqueSizes.indexOf(size);
        return idx < 3 ? idx + 1 : 3; // Max depth 3 for safety
    };

    const root = [];
    const stack = []; // Stores path of [node, level]

    flatHeadings.forEach(heading => {
        const level = getLevel(heading.fontSize);
        const node = {
            title: heading.title,
            page: heading.page,
            children: [],
            // cosmetic:
            bold: level === 1,
            color: level === 1 ? [0, 0, 0] : undefined
        };

        // Find parent
        while (stack.length > 0 && stack[stack.length - 1].level >= level) {
            stack.pop();
        }

        if (stack.length === 0) {
            root.push(node);
        } else {
            stack[stack.length - 1].node.children.push(node);
        }

        stack.push({ node, level });
    });

    return root;
};

/**
 * STRATEGY 0: Dedicated TOC Page Detection
 * Scans first 15 pages for "Contents" keyword and parses the list.
 */
const detectExecutableTOC = async (pdfDocument, onItemFound, shouldCancel) => {
    try {
        const limit = Math.min(pdfDocument.numPages, 20);
        let combinedTOC = [];
        let consecutiveTOCPages = 0;

        for (let i = 1; i <= limit; i++) {
            if (shouldCancel && shouldCancel()) break;
            // We can't really "resume" a single page scan, but we can ensure 
            // the loop continues to next page if one fails.
            try {
                const page = await pdfDocument.getPage(i);
                const textContent = await page.getTextContent();

                const pageText = reconstructTextSpacially(textContent.items);
                const cleanText = pageText.toLowerCase();

                const keywords = ["contents", "table of contents", "syllabus", "chapters", "brief contents", "detailed contents", "tableofcontents"];
                const hasKeywords = keywords.some(k => cleanText.includes(k));

                let pageTOC = [];

                // 🧠 VISION UPGRADE: If page has keywords or very little text (scanned), use Vision
                if (textContent.items.length < 10 || hasKeywords) {
                    console.log(`🔍 Examining Page ${i} for Visual TOC...`);
                    try {
                        const base64Image = await renderPageToBase64(page);
                        pageTOC = await extractTOCFromImage(base64Image);
                    } catch (visionErr) {
                        console.warn(`Vision TOC failed for Page ${i}`, visionErr);
                    }
                }

                // Fallback to text-based if vision failed or wasn't triggered but hardware text exists
                if (pageTOC.length === 0 && hasKeywords) {
                    console.log(`🚀 Using AI Text Extraction for Page ${i}...`);
                    try {
                        pageTOC = await extractTOCFromText(pageText);
                    } catch (err) {
                        console.warn("AI text extraction failed, trying regex fallback...");
                        pageTOC = await parseTOCPage(textContent, i);
                    }
                }

                if (pageTOC.length > 0) {
                    console.log(`✅ Found TOC content on Page ${i} (${pageTOC.length} items)`);
                    combinedTOC = [...combinedTOC, ...pageTOC];
                    consecutiveTOCPages++;

                    // STREAMING UPDATE: Report items immediately
                    if (onItemFound) onItemFound(pageTOC);

                    // If we found a good amount of items and subsequent pages don't look like TOC, we stop.
                    // But we allow spanning up to 4 consecutive pages.
                    if (consecutiveTOCPages >= 4) break;
                } else if (combinedTOC.length > 0) {
                    // We were finding TOCs but this page isn't one. End of TOC.
                    break;
                }
            } catch (pageErr) {
                console.error(`Error processing TOC page ${i}, skipping...`, pageErr);
                continue;
            }
        }
        return combinedTOC.length >= 3 ? combinedTOC : null;
    } catch (e) {
        console.warn("Dedicated TOC detection failed:", e);
        return null;
    }
};

/**
 * Helper to render a PDF page to base64 for Vision AI
 */
export const renderPageToBase64 = async (page) => {
    const viewport = page.getViewport({ scale: 2.0 }); // High resolution for complex books
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    await page.render({ canvasContext: ctx, viewport }).promise;
    return canvas.toDataURL('image/png');
};

/**
 * Parses a specific page text content into TOC items
 * Looking for pattern: "Title ...... PageNumber"
 */
const parseTOCPage = async (textContent, pageIndexOffset) => {
    // 1. Group items into lines
    const items = textContent.items.sort((a, b) => {
        const yA = a.transform[5];
        const yB = b.transform[5];
        if (Math.abs(yA - yB) > 5) return yB - yA;
        return a.transform[4] - b.transform[4];
    });

    const lines = [];
    let currentLine = "";
    let lastY = -1;

    items.forEach(item => {
        const y = item.transform[5];
        if (lastY !== -1 && Math.abs(y - lastY) > 5) {
            lines.push(currentLine);
            currentLine = "";
        }
        currentLine += item.str; // Don't add space here to keep regex flexible, or add space if needed
        lastY = y;
    });
    if (currentLine) lines.push(currentLine);

    // 2. Extract Title and Page Number using Regex
    const tocItems = [];
    const pattern = /^(.*?)(?:\s*[\.\-…\s]{3,}\s*)(\d+)$/; // More lenient: allows spaces around dots

    lines.forEach(line => {
        const cleanLine = line.trim();
        const match = cleanLine.match(pattern);

        if (match) {
            let title = match[1].trim();
            const pageStr = match[2];
            let pageNum = parseInt(pageStr);

            // Sanity check: remove trailing dots from title if regex missed them
            title = title.replace(/\.+$/, '').trim();

            if (title.length > 2 && !isNaN(pageNum)) {
                // Heuristic: Often the printed page number is offset from PDF page index
                // Since we don't know the offset, we return the explicit number found.
                // The viewer will jump to that "label" (if supported) or index.
                // For now, let's assume direct index for simplicity, or maybe user has to adjust manually.
                tocItems.push({
                    title: title,
                    page: pageNum, // This is the target page
                    children: [],
                    bold: false // TOC entries usually usually not bold in the list itself 
                });
            }
        }
    });

    return tocItems;
};
