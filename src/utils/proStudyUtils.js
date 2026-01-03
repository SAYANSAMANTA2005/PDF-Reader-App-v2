/**
 * PRO STUDY UTILITIES
 * Logic for rule-based extraction and spaced repetition
 */

// 1. RULE-BASED EXTRACTION
export const extractDefinitions = (text) => {
    const definitions = [];
    // Matches "Term : Description" or "Term - Description"
    const regex = /^([^:.]{2,25})\s*[:\-]\s*(.{10,200})$/gm;
    let match;
    while ((match = regex.exec(text)) !== null) {
        definitions.push({
            question: match[1].trim(),
            answer: match[2].trim(),
            type: 'definition'
        });
    }
    return definitions;
};

export const extractFormulas = (text) => {
    const formulas = [];
    // Rough heuristic for formulas: lines with =, +, -, *, /, or common math symbols
    const mathRegex = /.*[=+\-*/∑∫√πθλΔ].*/g;
    const matches = text.match(mathRegex);
    if (matches) {
        matches.forEach(m => {
            if (m.length > 5 && m.length < 150) {
                formulas.push(m.trim());
            }
        });
    }
    return [...new Set(formulas)]; // Unique results
};

// 2. SM-2 SPACED REPETITION ALGORITHM
// Quality: 0 (forgot) to 5 (perfect recall)
export const calculateSM2 = (card, quality) => {
    let { iterations, interval, easeFactor } = card;

    if (quality >= 3) {
        if (iterations === 0) {
            interval = 1;
        } else if (iterations === 1) {
            interval = 6;
        } else {
            interval = Math.round(interval * easeFactor);
        }
        iterations += 1;
    } else {
        iterations = 0;
        interval = 1;
    }

    // New ease factor
    easeFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
    if (easeFactor < 1.3) easeFactor = 1.3;

    const nextReview = Date.now() + interval * 24 * 60 * 60 * 1000;

    return {
        ...card,
        iterations,
        interval,
        easeFactor,
        nextReview,
        lastQuality: quality
    };
};

// 3. COLOR-SEMANTIC FILTERING
export const filterBySemanticColor = (annotations, colorMap, activeFilter) => {
    if (!activeFilter) return annotations;

    const filtered = {};
    Object.keys(annotations).forEach(page => {
        filtered[page] = annotations[page].filter(ann => {
            const semanticType = colorMap[ann.color];
            return semanticType === activeFilter;
        });
    });
    return filtered;
};
