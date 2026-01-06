import React, { useState, useEffect } from 'react';
import { usePDF } from '../context/PDFContext';
import { Search, X, ChevronUp, ChevronDown, Settings2, SlidersHorizontal, Clock } from 'lucide-react';
import { motion } from 'framer-motion';

const SearchBar = () => {
    const {
        searchQuery, setSearchQuery,
        searchResults, setSearchResults,
        currentMatchIndex, setCurrentMatchIndex,
        pdfDocument, setCurrentPage, numPages,
        searchOperators, toggleSearchOperator
    } = usePDF();

    const [isSearching, setIsSearching] = useState(false);
    const [showOptions, setShowOptions] = useState(false);
    const [searchProgress, setSearchProgress] = useState(0);
    const [pageRange, setPageRange] = useState({ start: 1, end: numPages || 1, active: false });

    // Sync pageRange end when numPages loaded
    useEffect(() => {
        if (numPages > 0) {
            setPageRange(prev => ({ ...prev, end: numPages }));
        }
    }, [numPages]);

    const performAdvancedSearch = (text, query, ops) => {
        if (ops.useRegex) {
            try {
                const regex = new RegExp(query, 'gi');
                return regex.test(text);
            } catch (e) {
                return false;
            }
        }

        if (ops.useBoolean) {
            const tokens = query.split(/\s+/);
            const textLower = text.toLowerCase();
            let match = true;
            let currentOp = 'AND';

            for (let i = 0; i < tokens.length; i++) {
                const token = tokens[i].toUpperCase();

                if (token === 'OR') {
                    currentOp = 'OR';
                    continue;
                }
                if (token === 'NOT') {
                    currentOp = 'NOT';
                    continue;
                }
                if (token === 'AND') {
                    currentOp = 'AND';
                    continue;
                }

                const term = tokens[i].toLowerCase();
                const termMatch = textLower.includes(term);

                if (currentOp === 'AND') {
                    match = match && termMatch;
                } else if (currentOp === 'OR') {
                    match = match || termMatch;
                } else if (currentOp === 'NOT') {
                    if (termMatch) return false;
                }

                currentOp = 'AND';
            }
            return match;
        }

        return text.toLowerCase().includes(query.toLowerCase());
    };

    const handleSearch = async (e) => {
        if (e) e.preventDefault();
        if (!searchQuery.trim() || !pdfDocument) {
            setSearchResults([]);
            return;
        }

        setIsSearching(true);
        setSearchProgress(0);
        const allMatches = [];

        try {
            const chunkSize = 20; // Smaller batch for coordinate calculation
            const totalPages = pdfDocument.numPages;

            const chunks = [];
            for (let i = 1; i <= totalPages; i += chunkSize) {
                chunks.push(i);
            }

            for (let i = 0; i < chunks.length; i++) {
                const chunkStart = chunks[i];
                const chunkEnd = Math.min(chunkStart + chunkSize - 1, totalPages);

                for (let pageNum = chunkStart; pageNum <= chunkEnd; pageNum++) {
                    // Respect Page Range if active
                    if (pageRange.active && (pageNum < pageRange.start || pageNum > pageRange.end)) {
                        continue;
                    }

                    const page = await pdfDocument.getPage(pageNum);
                    const textContent = await page.getTextContent();
                    const viewport = page.getViewport({ scale: 1.0 });

                    // Use OUR advanced logic for filtering, but keep coordinate calculation for simple search
                    const fullText = textContent.items.map(item => item.str).join(' ');
                    const isMatch = performAdvancedSearch(fullText, searchQuery, searchOperators);

                    if (isMatch) {
                        const query = searchQuery.toLowerCase();

                        // If it's a complex Regex search, we fall back to page-level result
                        // But for Boolean or Simple search, we want full highlighting
                        if (searchOperators.useRegex) {
                            allMatches.push({
                                pageNum,
                                text: fullText.substring(0, 100) + '...',
                            });
                        } else {
                            // Extract terms to highlight (supports boolean tokens)
                            const queryTerms = searchQuery.toLowerCase()
                                .split(/\s+/)
                                .filter(t => !['AND', 'OR', 'NOT'].includes(t.toUpperCase()))
                                .filter(t => t.length > 0);

                            textContent.items.forEach((item) => {
                                if (!item.str) return;
                                const itemText = item.str.toLowerCase();

                                queryTerms.forEach(term => {
                                    let startIndex = 0;
                                    while ((startIndex = itemText.indexOf(term, startIndex)) !== -1) {
                                        const [tx_a, tx_b, tx_c, tx_d, tx_e, tx_f] = item.transform;
                                        const totalWidth = item.width || 0;
                                        const charWidth = item.str.length > 0 ? totalWidth / item.str.length : 0;
                                        const matchXOffset = startIndex * charWidth;
                                        const matchWidth = term.length * charWidth;

                                        allMatches.push({
                                            pageNum,
                                            x: (tx_e + matchXOffset) / viewport.width,
                                            y: (viewport.height - tx_f) / viewport.height,
                                            width: matchWidth / viewport.width,
                                            height: Math.abs(tx_d) / viewport.height,
                                            text: term
                                        });
                                        startIndex += term.length;
                                    }
                                });
                            });
                        }
                    }
                }

                setSearchProgress(Math.round((chunkEnd / totalPages) * 100));
                await new Promise(resolve => setTimeout(resolve, 0));
            }

            setSearchResults(allMatches);
            setCurrentMatchIndex(allMatches.length > 0 ? 0 : -1);

            if (allMatches.length > 0) {
                setCurrentPage(allMatches[0].pageNum);
            }
        } catch (error) {
            console.error("Search engine error:", error);
        } finally {
            setIsSearching(false);
            setSearchProgress(0);
        }
    };

    const scrollToMatch = (match) => {
        setCurrentPage(match.pageNum);
    };

    const nextMatch = () => {
        if (searchResults.length === 0) return;
        const next = (currentMatchIndex + 1) % searchResults.length;
        setCurrentMatchIndex(next);
        const match = searchResults[next];
        setCurrentPage(match.pageNum);
    };

    const prevMatch = () => {
        if (searchResults.length === 0) return;
        const prev = (currentMatchIndex - 1 + searchResults.length) % searchResults.length;
        setCurrentMatchIndex(prev);
        const match = searchResults[prev];
        setCurrentPage(match.pageNum);
    };

    return (
        <div className="search-bar" style={{ position: 'relative' }}>
            <div className="search-input-wrapper" style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', padding: '2px 8px' }}>
                <Search size={16} className="search-icon" style={{ color: 'var(--text-secondary)' }} />
                <input
                    type="text"
                    placeholder={searchOperators.useRegex ? "Regex Search..." : "Search (use AND, OR, NOT)..."}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSearch(e);
                    }}
                    style={{ flex: 1, border: 'none', background: 'transparent', padding: '8px', fontSize: '0.9rem', color: 'var(--text-primary)', outline: 'none' }}
                />
                <div className="search-actions" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <button
                        onClick={() => setShowOptions(!showOptions)}
                        style={{ background: 'none', border: 'none', color: showOptions ? 'var(--accent-color)' : 'var(--text-secondary)', cursor: 'pointer', padding: '4px' }}
                        title="Search Options"
                    >
                        <SlidersHorizontal size={14} />
                    </button>
                    {searchQuery && (
                        <button onClick={() => { setSearchQuery(''); setSearchResults([]); setCurrentMatchIndex(-1); }} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                            <X size={14} />
                        </button>
                    )}
                    {searchResults.length > 0 && (
                        <>
                            <div style={{ width: '1px', height: '16px', background: 'var(--border-color)', margin: '0 4px' }}></div>
                            <button onClick={prevMatch} className="nav-btn"><ChevronUp size={16} /></button>
                            <button onClick={nextMatch} className="nav-btn"><ChevronDown size={16} /></button>
                        </>
                    )}
                </div>
            </div>

            {showOptions && (
                <div style={{
                    position: 'absolute', top: '100%', right: 0, marginTop: '8px',
                    backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)', padding: '12px', zIndex: 100,
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                    width: '200px'
                }}>
                    <h5 style={{ margin: '0 0 8px 0', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Advanced Operators</h5>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', cursor: 'pointer' }}>
                            <input type="checkbox" checked={searchOperators.useRegex} onChange={() => toggleSearchOperator('useRegex')} disabled={searchOperators.useBoolean} />
                            Regex
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', cursor: 'pointer' }}>
                            <input type="checkbox" checked={searchOperators.useBoolean} onChange={() => toggleSearchOperator('useBoolean')} disabled={searchOperators.useRegex} />
                            Boolean (AND/OR/NOT)
                        </label>
                    </div>
                </div>
            )}

            {/* Range Filter - Visible when focused or has query */}
            {(showOptions || searchQuery || isSearching) && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 mt-2 px-1"
                >
                    <button
                        onClick={() => setPageRange(prev => ({ ...prev, active: !prev.active }))}
                        className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-black uppercase transition-all ${pageRange.active ? 'bg-accent text-white' : 'bg-bg-secondary text-secondary'
                            }`}
                    >
                        <Clock size={12} /> Range
                    </button>

                    {pageRange.active && (
                        <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2">
                            <input
                                type="number"
                                min="1"
                                max={pageRange.end}
                                value={pageRange.start}
                                onChange={(e) => setPageRange(prev => ({ ...prev, start: Math.max(1, parseInt(e.target.value)) }))}
                                className="w-12 premium-input !py-1 !px-2 !text-[10px] text-center"
                            />
                            <span className="text-secondary text-[10px]">to</span>
                            <input
                                type="number"
                                min={pageRange.start}
                                max={numPages}
                                value={pageRange.end}
                                onChange={(e) => setPageRange(prev => ({ ...prev, end: Math.min(numPages, parseInt(e.target.value)) }))}
                                className="w-12 premium-input !py-1 !px-2 !text-[10px] text-center"
                            />
                        </div>
                    )}
                </motion.div>
            )}

            {searchResults.length > 0 && (
                <div className="search-info" style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '4px', textAlign: 'right' }}>
                    {currentMatchIndex + 1} / {searchResults.length} {searchResults.length === 1 ? 'match' : 'matches'}
                </div>
            )}
            {isSearching && (
                <div className="flex items-center gap-2 mt-2" style={{ fontSize: '0.7rem', color: 'var(--accent-color)', marginTop: '4px' }}>
                    Scanning document: {searchProgress}%
                    <div style={{ height: '2px', background: '#eee', marginTop: '2px', overflow: 'hidden', flex: 1 }}>
                        <div style={{ height: '100%', width: `${searchProgress}%`, background: 'var(--accent-color)', transition: 'width 0.2s' }}></div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SearchBar;
