import React, { useState } from 'react';
import { usePDF } from '../context/PDFContext';
import { Search, X, ChevronUp, ChevronDown } from 'lucide-react';

const SearchBar = () => {
    const { 
        searchQuery, setSearchQuery, 
        searchResults, setSearchResults, 
        currentMatchIndex, setCurrentMatchIndex, 
        pdfDocument, setCurrentPage 
    } = usePDF();

    const [isSearching, setIsSearching] = useState(false);

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

                // Simple search logic: join text items and find index
                // For exact coordinates, we need to map indices back to items
                // This is a bit complex, but let's try a heuristic: 
                // if searchQuery is in item.str, use its transform.
                
                textContent.items.forEach((item) => {
                    const str = item.str.toLowerCase();
                    const query = searchQuery.toLowerCase();
                    
                    if (str.includes(query)) {
                        // More sophisticated logic would handle word breaks across items, 
                        // but this covers most cases.
                        const tx = item.transform; // [scaleX, skewY, skewX, scaleY, tx, ty]
                        
                        allMatches.push({
                            pageNum: i,
                            x: tx[4] / viewport.width,
                            y: (viewport.height - tx[5]) / viewport.height, // Flip Y for normalized CSS top
                            width: item.width / viewport.width,
                            height: Math.sqrt(tx[0]*tx[0] + tx[1]*tx[1]) / viewport.height, // Approx font size
                            text: item.str
                        });
                    }
                });
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
        // Find the page container and scroll to it
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
        <div className="search-bar">
            <div className="search-input-wrapper">
                <Search size={16} className="search-icon" />
                <input
                    type="text"
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSearch(e);
                    }}
                />
                <div className="search-actions">
                    {searchQuery && (
                        <button onClick={() => { setSearchQuery(''); setSearchResults([]); setCurrentMatchIndex(-1); }} className="clear-btn">
                            <X size={14} />
                        </button>
                    )}
                    {searchResults.length > 0 && (
                        <>
                            <div className="search-divider"></div>
                            <button onClick={prevMatch} title="Previous Match" className="nav-btn">
                                <ChevronUp size={16} />
                            </button>
                            <button onClick={nextMatch} title="Next Match" className="nav-btn">
                                <ChevronDown size={16} />
                            </button>
                        </>
                    )}
                </div>
            </div>
            {searchResults.length > 0 && (
                <div className="search-info">
                    {currentMatchIndex + 1} / {searchResults.length} matches (pages)
                </div>
            )}
            {isSearching && <div className="search-status">Searching...</div>}
        </div>
    );
};

export default SearchBar;
