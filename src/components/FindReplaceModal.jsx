/**
 * Find & Replace Modal
 * Advanced search and overlay-based replacement
 */

import React, { useState, useEffect } from 'react';
import { usePDF } from '../context/PDFContext';
import { X, Search, Replace, ChevronLeft, ChevronRight, Check } from 'lucide-react';

const FindReplaceModal = ({ isOpen, onClose }) => {
    const {
        searchQuery, setSearchQuery,
        searchResults, currentMatchIndex, setCurrentMatchIndex,
        currentPage, addAnnotation
    } = usePDF();

    const [replaceText, setReplaceText] = useState('');
    const [activeTab, setActiveTab] = useState('find');

    if (!isOpen) return null;

    const handleNext = () => {
        if (searchResults.length === 0) return;
        setCurrentMatchIndex((currentMatchIndex + 1) % searchResults.length);
    };

    const handlePrev = () => {
        if (searchResults.length === 0) return;
        setCurrentMatchIndex((currentMatchIndex - 1 + searchResults.length) % searchResults.length);
    };

    const handleReplace = () => {
        if (searchResults.length === 0 || currentMatchIndex === -1) return;

        const match = searchResults[currentMatchIndex];

        // Add a "replacement" annotation (white box + new text)
        addAnnotation(match.pageNum, {
            type: 'text',
            text: replaceText,
            x: match.x,
            y: match.y,
            width: match.width,
            height: match.height,
            color: '#000000',
            fillColor: '#FFFFFF', // White background to cover original text
            fontSize: 12, // Approximation
            points: [{ x: match.x, y: match.y }]
        });

        // Move to next
        handleNext();
    };

    const handleReplaceAll = () => {
        if (searchResults.length === 0) return;

        if (!confirm(`Are you sure you want to replace all ${searchResults.length} occurrences?`)) return;

        searchResults.forEach(match => {
            addAnnotation(match.pageNum, {
                type: 'text',
                text: replaceText,
                x: match.x,
                y: match.y,
                width: match.width,
                height: match.height,
                color: '#000000',
                fillColor: '#FFFFFF',
                fontSize: 12,
                points: [{ x: match.x, y: match.y }]
            });
        });

        onClose();
    };

    return (
        <div
            style={{
                position: 'fixed', top: '20px', right: '20px',
                width: '320px', background: 'var(--bg-primary)',
                borderRadius: '12px', padding: '16px',
                boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
                zIndex: 1001, border: '1px solid var(--border-color)'
            }}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <div style={{ display: 'flex', gap: '15px' }}>
                    <span
                        onClick={() => setActiveTab('find')}
                        style={{ cursor: 'pointer', fontWeight: activeTab === 'find' ? 700 : 400, borderBottom: activeTab === 'find' ? '2px solid var(--accent-color)' : 'none' }}
                    >
                        Find
                    </span>
                    <span
                        onClick={() => setActiveTab('replace')}
                        style={{ cursor: 'pointer', fontWeight: activeTab === 'replace' ? 700 : 400, borderBottom: activeTab === 'replace' ? '2px solid var(--accent-color)' : 'none' }}
                    >
                        Replace
                    </span>
                </div>
                <X size={18} cursor="pointer" onClick={onClose} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ position: 'relative' }}>
                    <Search size={16} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-secondary)' }} />
                    <input
                        type="text"
                        placeholder="Search text..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{
                            width: '100%', padding: '8px 8px 8px 32px', borderRadius: '6px',
                            border: '1px solid var(--border-color)', background: 'var(--bg-secondary)'
                        }}
                    />
                </div>

                {activeTab === 'replace' && (
                    <div style={{ position: 'relative' }}>
                        <Replace size={16} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-secondary)' }} />
                        <input
                            type="text"
                            placeholder="Replace with..."
                            value={replaceText}
                            onChange={(e) => setReplaceText(e.target.value)}
                            style={{
                                width: '100%', padding: '8px 8px 8px 32px', borderRadius: '6px',
                                border: '1px solid var(--border-color)', background: 'var(--bg-secondary)'
                            }}
                        />
                    </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: 'var(--text-secondary)' }}>
                    <span>{searchResults.length > 0 ? `${currentMatchIndex + 1} of ${searchResults.length}` : 'No matches'}</span>
                    <div style={{ display: 'flex', gap: '5px' }}>
                        <button onClick={handlePrev} style={{ background: 'var(--bg-secondary)', border: 'none', borderRadius: '4px', padding: '4px' }}><ChevronLeft size={16} /></button>
                        <button onClick={handleNext} style={{ background: 'var(--bg-secondary)', border: 'none', borderRadius: '4px', padding: '4px' }}><ChevronRight size={16} /></button>
                    </div>
                </div>

                {activeTab === 'replace' && (
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                            onClick={handleReplace}
                            disabled={searchResults.length === 0}
                            style={{ flex: 1, padding: '8px', background: 'var(--accent-color)', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}
                        >
                            Replace
                        </button>
                        <button
                            onClick={handleReplaceAll}
                            disabled={searchResults.length === 0}
                            style={{ flex: 1, padding: '8px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}
                        >
                            Replace All
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default FindReplaceModal;
