import React, { useState } from 'react';
import { usePDF } from '../context/PDFContext';
import { Search, X, ChevronUp, ChevronDown, Settings2, SlidersHorizontal } from 'lucide-react';

const SearchBar = () => {
    const {
        searchQuery, setSearchQuery,
        searchResults, setSearchResults,
        currentMatchIndex, setCurrentMatchIndex,
        pdfDocument, setCurrentPage,
        searchOperators, toggleSearchOperator
    } = usePDF();

    const [isSearching, setIsSearching] = useState(false);
    const [showOptions, setShowOptions] = useState(false);

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
        try {
            const allMatches = [];
            for (let i = 1; i <= pdfDocument.numPages; i++) {
                const page = await pdfDocument.getPage(i);
                const textContent = await page.getTextContent();
                const viewport = page.getViewport({ scale: 1.0 });

                // Join all items on page for whole-page boolean/regex matching
                const fullPageText = textContent.items.map(item => item.str).join(' ');

                if (performAdvancedSearch(fullPageText, searchQuery, searchOperators)) {
                    // For UI sake, find a specific item that matches at least part of it
                    // Or just highlight the page
                    const bestItem = textContent.items.find(item =>
                        performAdvancedSearch(item.str, searchQuery.split(/\s+/)[0], { useRegex: false, useBoolean: false })
                    ) || textContent.items[0];

                    if (bestItem) {
                        const tx = bestItem.transform;
                        allMatches.push({
                            pageNum: i,
                            x: tx[4] / viewport.width,
                            y: (viewport.height - tx[5]) / viewport.height,
                            width: (bestItem.width || 50) / viewport.width,
                            height: 20 / viewport.height,
                            text: bestItem.str
                        });
                    }
                }
            }

            setSearchResults(allMatches);
            setCurrentMatchIndex(allMatches.length > 0 ? 0 : -1);

            if (allMatches.length > 0) {
                const firstMatch = allMatches[0];
                setCurrentPage(firstMatch.pageNum);
                scrollToMatch(firstMatch);
            }
        } catch (error) {
            console.error("Search error", error);
        } finally {
            setIsSearching(false);
        }
    };

    const scrollToMatch = (match) => {
        setTimeout(() => {
            const pageEl = document.querySelector(`[data-page-number="${match.pageNum}"]`);
            if (pageEl) {
                pageEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }, 100);
    };

    const nextMatch = () => {
        if (searchResults.length === 0) return;
        const next = (currentMatchIndex + 1) % searchResults.length;
        setCurrentMatchIndex(next);
        const match = searchResults[next];
        setCurrentPage(match.pageNum);
        scrollToMatch(match);
    };

    const prevMatch = () => {
        if (searchResults.length === 0) return;
        const prev = (currentMatchIndex - 1 + searchResults.length) % searchResults.length;
        setCurrentMatchIndex(prev);
        const match = searchResults[prev];
        setCurrentPage(match.pageNum);
        scrollToMatch(match);
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

            {searchResults.length > 0 && (
                <div className="search-info" style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '4px', textAlign: 'right' }}>
                    {currentMatchIndex + 1} / {searchResults.length} {searchResults.length === 1 ? 'match' : 'matches'}
                </div>
            )}
            {isSearching && <div className="search-status" style={{ fontSize: '0.7rem', color: 'var(--accent-color)', marginTop: '4px' }}>Searching entire document...</div>}
        </div>
    );
};

export default SearchBar;
