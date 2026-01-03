import React, { useState } from 'react';
import { usePDF } from '../context/PDFContext';
import {
    ChevronRight,
    ChevronDown,
    FileText,
    Pin,
    X,
    Plus,
    Folder,
    ArrowLeft,
    ArrowRight,
    Clock
} from 'lucide-react';

const TabManager = () => {
    const {
        tabs, setTabs,
        tabGroups, setTabGroups,
        loadPDF, closeTab, togglePin,
        goBack, goForward, navIndex, navHistory,
        fileName
    } = usePDF();

    const [expandedGroups, setExpandedGroups] = useState(['root']);

    const toggleGroup = (groupId) => {
        setExpandedGroups(prev =>
            prev.includes(groupId)
                ? prev.filter(id => id !== groupId)
                : [...prev, groupId]
        );
    };

    const addGroup = () => {
        const name = prompt("Enter group name:");
        if (name) {
            setTabGroups([...tabGroups, {
                id: Math.random().toString(36).substr(2, 9),
                name,
                parentId: 'root'
            }]);
        }
    };

    const renderTabsInGroup = (groupId) => {
        return tabs.filter(tab => tab.groupId === groupId).map(tab => (
            <div
                key={tab.id}
                className={`tab-item ${tab.isActive ? 'active' : ''}`}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.4rem 0.75rem 0.4rem 2.5rem',
                    cursor: 'pointer',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: tab.isActive ? 'rgba(52, 152, 219, 0.15)' : 'transparent',
                    color: tab.isActive ? 'var(--accent-color)' : 'var(--text-primary)',
                    fontSize: '0.85rem',
                    position: 'relative'
                }}
                onClick={() => loadPDF(tab.file, tab.id)}
            >
                <FileText size={14} />
                <span style={{
                    flex: 1,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    fontWeight: tab.isActive ? '600' : '400'
                }}>
                    {tab.fileName}
                </span>

                <div style={{ display: 'flex', gap: '4px' }}>
                    <button
                        onClick={(e) => { e.stopPropagation(); togglePin(tab.id); }}
                        style={{ border: 'none', background: 'none', cursor: 'pointer', color: tab.isPinned ? 'var(--accent-color)' : '#999' }}
                    >
                        <Pin size={12} fill={tab.isPinned ? 'var(--accent-color)' : 'none'} />
                    </button>
                    {!tab.isPinned && (
                        <button
                            onClick={(e) => { e.stopPropagation(); closeTab(tab.id); }}
                            style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#999' }}
                        >
                            <X size={12} />
                        </button>
                    )}
                </div>
            </div>
        ));
    };

    const renderGroup = (group) => {
        const isExpanded = expandedGroups.includes(group.id);

        return (
            <div key={group.id} className="tab-group-container">
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        padding: '0.5rem 0.75rem',
                        cursor: 'pointer',
                        color: 'var(--text-secondary)',
                        fontSize: '0.8rem',
                        fontWeight: '600',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                    }}
                    onClick={() => toggleGroup(group.id)}
                >
                    {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    <Folder size={14} />
                    <span>{group.name}</span>
                </div>

                {isExpanded && (
                    <div className="group-content">
                        {renderTabsInGroup(group.id)}
                        {/* Recursive nesting could go here if parentId logic is expanded */}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="tab-manager" style={{ padding: '0.5rem' }}>
            {/* Window History Controls */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                marginBottom: '1rem',
                padding: '0.5rem',
                backgroundColor: 'var(--bg-secondary)',
                borderRadius: 'var(--radius-md)'
            }}>
                <button
                    onClick={goBack}
                    disabled={navIndex <= 0}
                    style={{
                        padding: '0.4rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)',
                        background: 'var(--bg-primary)', cursor: navIndex > 0 ? 'pointer' : 'default',
                        opacity: navIndex > 0 ? 1 : 0.4
                    }}
                    title="Back across documents"
                >
                    <ArrowLeft size={16} />
                </button>
                <button
                    onClick={goForward}
                    disabled={navIndex >= navHistory.length - 1}
                    style={{
                        padding: '0.4rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)',
                        background: 'var(--bg-primary)', cursor: navIndex < navHistory.length - 1 ? 'pointer' : 'default',
                        opacity: navIndex < navHistory.length - 1 ? 1 : 0.4
                    }}
                    title="Forward across documents"
                >
                    <ArrowRight size={16} />
                </button>

                <div style={{ flex: 1 }}></div>

                <button
                    onClick={addGroup}
                    style={{
                        padding: '0.3rem 0.6rem', background: 'none', border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px'
                    }}
                >
                    <Plus size={12} /> Group
                </button>
            </div>

            {/* Tree Structure */}
            <div className="tab-tree" style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                {tabGroups.map(group => renderGroup(group))}
            </div>

            {/* pinned indicator / current file info */}
            <div style={{ marginTop: '2rem', padding: '1rem', borderTop: '1px solid var(--border-color)' }}>
                <h5 style={{ margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)' }}>
                    <Clock size={14} /> Session History
                </h5>
                <div style={{ maxHeight: '150px', overflowY: 'auto' }}>
                    {navHistory.map((h, i) => (
                        <div key={i} style={{
                            fontSize: '0.75rem',
                            padding: '0.3rem 0',
                            color: i === navIndex ? 'var(--accent-color)' : 'var(--text-secondary)',
                            fontWeight: i === navIndex ? '600' : '400',
                            borderLeft: i === navIndex ? '2px solid var(--accent-color)' : 'none',
                            paddingLeft: i === navIndex ? '4px' : '0'
                        }}>
                            Page {h.page} @ {new Date(h.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                    )).reverse()}
                </div>
            </div>
        </div>
    );
};

export default TabManager;
