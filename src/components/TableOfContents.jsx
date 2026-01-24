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
    const { outline, pdfDocument } = usePDF();

    if (!pdfDocument) {
        return (
            <div style={{ padding: '40px 20px', textAlign: 'center', opacity: 0.5 }}>
                <p style={{ fontSize: '0.9rem' }}>Open a PDF to see its table of contents</p>
            </div>
        );
    }

    if (!outline || outline.length === 0) {
        return (
            <div style={{ padding: '40px 20px', textAlign: 'center', opacity: 0.5 }}>
                <Bookmark size={32} style={{ marginBottom: '12px' }} />
                <p style={{ fontSize: '0.9rem' }}>No table of contents found in this PDF</p>
            </div>
        );
    }

    return (
        <div className="table-of-contents" style={{ padding: '12px', height: '100%', overflowY: 'auto' }}>
            <div style={{
                fontSize: '0.75rem',
                fontWeight: '800',
                color: 'var(--text-secondary)',
                marginBottom: '16px',
                padding: '0 12px',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
            }}>
                <Bookmark size={14} />
                Table of Contents
            </div>
            <div className="toc-list">
                {outline.map((item, idx) => (
                    <TOCItem key={`${item.title}-${idx}`} item={item} />
                ))}
            </div>
        </div>
    );
};

export default TableOfContents;
