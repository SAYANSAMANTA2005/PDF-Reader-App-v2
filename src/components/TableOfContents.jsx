import React, { useState } from 'react';
import { usePDF } from '../context/PDFContext';
import { ChevronRight, ChevronDown, Bookmark, FileText } from 'lucide-react';

const TOCItem = ({ item, depth = 0 }) => {
    const { setCurrentPage, currentPage } = usePDF();
    const [isExpanded, setIsExpanded] = useState(true);
    const hasChildren = item.children && item.children.length > 0;

    const isActive = item.page === currentPage;

    const handleClick = (e) => {
        e.stopPropagation();
        if (item.page) {
            setCurrentPage(item.page);
        } else if (hasChildren) {
            setIsExpanded(!isExpanded);
        }
    };

    const toggleExpand = (e) => {
        e.stopPropagation();
        setIsExpanded(!isExpanded);
    };

    return (
        <div className="toc-item-container" style={{ marginLeft: `${depth * 12}px` }}>
            <div
                className={`toc-item ${isActive ? 'active' : ''}`}
                onClick={handleClick}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    color: isActive ? 'var(--accent-color)' : 'var(--text-primary)',
                    background: isActive ? 'rgba(var(--accent-rgb), 0.1)' : 'transparent',
                    transition: 'all 0.2s ease',
                    userSelect: 'none',
                    marginBottom: '2px',
                    fontWeight: item.bold ? 'bold' : 'normal',
                    fontStyle: item.italic ? 'italic' : 'normal',
                }}
                onMouseEnter={(e) => {
                    if (!isActive) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                }}
                onMouseLeave={(e) => {
                    if (!isActive) e.currentTarget.style.background = 'transparent';
                }}
            >
                <div
                    onClick={hasChildren ? toggleExpand : undefined}
                    style={{
                        width: '20px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: hasChildren ? 'pointer' : 'default',
                        opacity: hasChildren ? 1 : 0
                    }}
                >
                    {hasChildren && (isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />)}
                </div>

                <div style={{ marginRight: '8px', opacity: 0.7, display: 'flex', alignItems: 'center' }}>
                    {item.page ? <FileText size={14} /> : <Bookmark size={14} />}
                </div>

                <span style={{
                    flex: 1,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    color: item.color ? `rgb(${item.color[0]}, ${item.color[1]}, ${item.color[2]})` : 'inherit'
                }}>
                    {item.title}
                </span>

                {item.page && (
                    <span style={{
                        fontSize: '0.7rem',
                        opacity: 0.5,
                        marginLeft: '8px',
                        minWidth: '20px',
                        textAlign: 'right'
                    }}>
                        {item.page}
                    </span>
                )}
            </div>

            {hasChildren && isExpanded && (
                <div className="toc-children">
                    {item.children.map((child, idx) => (
                        <TOCItem key={`${child.title}-${idx}`} item={child} depth={depth + 1} />
                    ))}
                </div>
            )}
        </div>
    );
};

const TableOfContents = () => {
    const { outline, pdfDocument, isGeneratingTOC, generateTOCFromPage, triggerAutoTOCScan } = usePDF();
    const [manualPage, setManualPage] = useState('');

    const renderManualInput = (isFloating = false) => (
        <div className="manual-toc-input" style={{
            padding: '12px',
            background: isFloating ? 'rgba(var(--accent-rgb), 0.05)' : 'var(--bg-secondary)',
            borderRadius: '8px',
            border: '1px solid var(--border-color)',
            marginBottom: '16px'
        }}>
            <p style={{ fontSize: '0.65rem', fontWeight: '800', color: 'var(--accent-color)', marginBottom: '8px', textTransform: 'uppercase' }}>
                Manual Content Extraction
            </p>
            <div style={{ display: 'flex', gap: '8px' }}>
                <input
                    type="number"
                    placeholder="Enter TOC page #"
                    value={manualPage}
                    onChange={(e) => setManualPage(e.target.value)}
                    style={{
                        flex: 1,
                        background: 'var(--bg-primary)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '4px',
                        padding: '6px 10px',
                        fontSize: '0.75rem',
                        color: 'var(--text-primary)',
                        outline: 'none'
                    }}
                />
                <button
                    onClick={() => generateTOCFromPage(manualPage)}
                    disabled={!manualPage}
                    style={{
                        background: 'var(--accent-color)',
                        color: 'white',
                        border: 'none',
                        padding: '6px 14px',
                        borderRadius: '4px',
                        fontSize: '0.7rem',
                        fontWeight: '700',
                        cursor: 'pointer',
                        transition: 'opacity 0.2s',
                        opacity: !manualPage ? 0.5 : 1
                    }}
                >
                    EXTRACT
                </button>
            </div>
        </div>
    );

    if (!pdfDocument) {
        return (
            <div style={{ padding: '40px 20px', textAlign: 'center', opacity: 0.5 }}>
                <p style={{ fontSize: '0.9rem' }}>Open a PDF to see its table of contents</p>
            </div>
        );
    }

    if (isGeneratingTOC) {
        return (
            <div style={{ padding: '20px', height: '100%', display: 'flex', flexDirection: 'column' }}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: 0.8 }}>
                    <div className="spinner" style={{
                        width: '32px', height: '32px',
                        border: '3px solid var(--border-color)',
                        borderTopColor: 'var(--accent-color)',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite',
                        marginBottom: '16px'
                    }}></div>
                    <p style={{ fontSize: '0.9rem', fontWeight: '700', marginBottom: '4px' }}>Analyzing Layout...</p>
                    <p style={{ fontSize: '0.75rem', opacity: 0.7, textAlign: 'center' }}>Searching first 20 pages for Syllabus & Chapters</p>
                </div>
                {renderManualInput(true)}
            </div>
        );
    }

    if (!outline || outline.length === 0) {
        return (
            <div style={{ padding: '20px', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <Bookmark size={48} style={{ marginBottom: '16px', opacity: 0.3 }} />
                <p style={{ fontSize: '0.95rem', fontWeight: '600', marginBottom: '8px' }}>No content detected</p>
                <p style={{ fontSize: '0.75rem', opacity: 0.6, textAlign: 'center', marginBottom: '24px' }}>
                    We couldn't find a built-in Table of Contents.
                </p>

                <button
                    onClick={() => triggerAutoTOCScan(pdfDocument)}
                    style={{
                        width: '100%',
                        marginBottom: '16px',
                        padding: '10px',
                        background: 'linear-gradient(135deg, var(--accent-color), #a855f7)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontWeight: '700',
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                    }}
                >
                    ✨ Smart AI Scan
                </button>

                <div style={{ width: '100%' }}>
                    {renderManualInput()}
                </div>
            </div>
        );
    }

    return (
        <div className="table-of-contents" style={{ padding: '16px', height: '100%', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
            <div style={{
                fontSize: '0.75rem',
                fontWeight: '800',
                color: 'var(--text-secondary)',
                marginBottom: '16px',
                padding: '0 4px',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Bookmark size={14} />
                    Table of Contents
                </div>
                <span style={{ fontSize: '0.65rem', padding: '2px 8px', background: 'rgba(var(--accent-rgb), 0.1)', color: 'var(--accent-color)', borderRadius: '12px', fontWeight: '700' }}>
                    {outline.length} Chapters
                </span>
            </div>

            {renderManualInput()}

            <div className="toc-list" style={{ flex: 1 }}>
                {outline.map((item, idx) => (
                    <TOCItem key={`${item.title}-${idx}`} item={item} />
                ))}
            </div>
        </div>
    );
};

export default TableOfContents;
