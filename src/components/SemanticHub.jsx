import React, { useState, useMemo } from 'react';
import { usePDF } from '../context/PDFContext';
import {
    Tag,
    Filter,
    Download,
    Trash2,
    Settings,
    CheckCircle2,
    Palette
} from 'lucide-react';

const SemanticHub = () => {
    const {
        annotations,
        colorSettings,
        setColorSettings,
        setAnnotationColor,
        annotationColor,
        numPages,
        fileName
    } = usePDF();

    const [filterColor, setFilterColor] = useState('all');
    const [isEditingSettings, setIsEditingSettings] = useState(false);

    // Flatten all annotations with color metadata
    const allHighlights = useMemo(() => {
        const list = [];
        Object.entries(annotations).forEach(([pageNum, annots]) => {
            annots.forEach(a => {
                if (a.type === 'highlight' || a.type === 'draw') {
                    list.push({ ...a, pageNum });
                }
            });
        });
        return list;
    }, [annotations]);

    const filteredList = useMemo(() => {
        if (filterColor === 'all') return allHighlights;
        return allHighlights.filter(h => h.color === filterColor);
    }, [allHighlights, filterColor]);

    const handleUpdateMeaning = (color, meaning) => {
        setColorSettings(prev => ({ ...prev, [color]: meaning }));
    };

    const handleExport = () => {
        const exportData = filteredList.map(h => ({
            page: h.pageNum,
            meaning: colorSettings[h.color] || 'Uncategorized',
            type: h.type,
            timestamp: new Date(h.timestamp || Date.now()).toLocaleString()
        }));

        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${fileName.replace('.pdf', '')}_highlights_${filterColor}.json`;
        a.click();
    };

    return (
        <div className="semantic-hub" style={{ padding: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h4 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Palette size={18} color="var(--accent-color)" />
                    Semantic Highlights
                </h4>
                <button
                    onClick={() => setIsEditingSettings(!isEditingSettings)}
                    style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
                >
                    <Settings size={16} />
                </button>
            </div>

            {/* Color Legend & Meaning Editor */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '0.75rem',
                marginBottom: '1.5rem',
                backgroundColor: 'var(--bg-secondary)',
                padding: '1rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-color)'
            }}>
                {Object.entries(colorSettings).map(([color, meaning]) => (
                    <div key={color} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div
                                onClick={() => setAnnotationColor(color)}
                                style={{
                                    width: '16px', height: '16px', borderRadius: '50%', backgroundColor: color,
                                    border: annotationColor === color ? '2px solid white' : '1px solid rgba(0,0,0,0.1)',
                                    boxShadow: annotationColor === color ? '0 0 0 2px var(--accent-color)' : 'none',
                                    cursor: 'pointer'
                                }}
                            />
                            {isEditingSettings ? (
                                <input
                                    value={meaning}
                                    onChange={(e) => handleUpdateMeaning(color, e.target.value)}
                                    style={{
                                        width: '100%', border: 'none', background: 'white',
                                        fontSize: '0.75rem', padding: '2px 4px', borderRadius: '2px'
                                    }}
                                />
                            ) : (
                                <span style={{ fontSize: '0.75rem', fontWeight: '500' }}>{meaning}</span>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <section style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <Filter size={16} color="var(--text-secondary)" />
                    <span style={{ fontSize: '0.85rem', fontWeight: '600' }}>Filter Document By</span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <button
                        onClick={() => setFilterColor('all')}
                        style={{
                            padding: '0.3rem 0.8rem', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem',
                            backgroundColor: filterColor === 'all' ? 'var(--accent-color)' : 'var(--bg-secondary)',
                            color: filterColor === 'all' ? 'white' : 'var(--text-primary)',
                            border: '1px solid var(--border-color)', cursor: 'pointer'
                        }}
                    >
                        All
                    </button>
                    {Object.keys(colorSettings).map(color => (
                        <button
                            key={color}
                            onClick={() => setFilterColor(color)}
                            style={{
                                padding: '0.3rem 0.8rem', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem',
                                backgroundColor: filterColor === color ? color : 'var(--bg-secondary)',
                                color: filterColor === color ? (['#ffff00', '#00ff00', '#00ffff'].includes(color) ? 'black' : 'white') : 'var(--text-primary)',
                                border: `1px solid ${filterColor === color ? color : 'var(--border-color)'}`,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                            }}
                        >
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: color }} />
                            {colorSettings[color]}
                        </button>
                    ))}
                </div>
            </section>

            {/* Filtered Results */}
            <div style={{
                maxHeight: '300px',
                overflowY: 'auto',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--bg-secondary)'
            }}>
                {filteredList.length > 0 ? (
                    filteredList.map((h, i) => (
                        <div key={i} style={{
                            padding: '0.75rem', borderBottom: '1px solid var(--border-color)',
                            display: 'flex', alignItems: 'flex-start', gap: '0.75rem'
                        }}>
                            <div style={{
                                width: '4px', height: '100%', minHeight: '30px',
                                backgroundColor: h.color, borderRadius: '2px'
                            }} />
                            <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                    <span style={{ fontSize: '0.7rem', color: 'var(--accent-color)', fontWeight: '600' }}>PAGE {h.pageNum}</span>
                                    <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>{colorSettings[h.color]}</span>
                                </div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-primary)', fontStyle: 'italic' }}>
                                    {h.type.toUpperCase()} Annotation
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                        No matches found for this category.
                    </div>
                )}
            </div>

            {filteredList.length > 0 && (
                <button
                    onClick={handleExport}
                    style={{
                        marginTop: '1rem', width: '100%', padding: '0.6rem',
                        backgroundColor: 'var(--bg-primary)', border: '1px solid var(--accent-color)',
                        color: 'var(--accent-color)', borderRadius: 'var(--radius-sm)',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                        fontSize: '0.85rem'
                    }}
                >
                    <Download size={16} /> Export {filterColor === 'all' ? 'All' : colorSettings[filterColor]} Insights
                </button>
            )}
        </div>
    );
};

export default SemanticHub;
