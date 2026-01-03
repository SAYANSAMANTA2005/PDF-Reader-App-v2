import React from 'react';
import { usePDF } from '../context/PDFContext';
import Thumbnails from './Thumbnails';
import SummaryPanel from './SummaryPanel';
import LearningPanel from './LearningPanel';
import PublishingPanel from './PublishingPanel';
import WorkspacePanel from './WorkspacePanel';
import TabManager from './TabManager';
import SemanticHub from './SemanticHub';
import AnnotationHistory from './AnnotationHistory';
import {
    Grid,
    Bookmark,
    Sparkles,
    BookOpen,
    Share2,
    Layers,
    Layout,
    Palette,
    Database,
    Clock
} from 'lucide-react';

const Sidebar = () => {
    const { activeSidebarTab, setActiveSidebarTab, sidebarWidth, setSidebarWidth } = usePDF();

    const handleMouseDown = (e) => {
        e.preventDefault();
        const startX = e.clientX;
        const startWidth = sidebarWidth;

        const handleMouseMove = (moveEvent) => {
            const deltaX = moveEvent.clientX - startX;
            const newWidth = Math.min(Math.max(startWidth + deltaX, 200), 600);
            setSidebarWidth(newWidth);
        };

        const handleMouseUp = () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = 'default';
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = 'col-resize';
    };

    const tabs = [
        { id: 'tabmanager', icon: <Layout size={18} />, label: 'Files' },
        { id: 'thumbnails', icon: <Grid size={18} />, label: 'Nodes' },
        { id: 'summary', icon: <Sparkles size={18} />, label: 'AI' },
        { id: 'semantics', icon: <Palette size={18} />, label: 'Color' },
        { id: 'history', icon: <Database size={18} />, label: 'Log' },
        { id: 'learning', icon: <BookOpen size={18} />, label: 'Study' },
        { id: 'publishing', icon: <Share2 size={18} />, label: 'Hub' },
        { id: 'workspace', icon: <Layers size={18} />, label: 'Pro' },
    ];

    return (
        <aside className="sidebar" style={{ width: `${sidebarWidth}px`, display: 'flex', flexDirection: 'column' }}>
            <div className="sidebar-tabs" style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${tabs.length / 2}, 1fr)`,
                borderBottom: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-secondary)',
                rowGap: '2px'
            }}>
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        className={`sidebar-tab ${activeSidebarTab === tab.id ? 'active' : ''}`}
                        onClick={() => setActiveSidebarTab(tab.id)}
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '0.6rem 0',
                            gap: '2px',
                            border: 'none',
                            background: 'none',
                            color: activeSidebarTab === tab.id ? 'var(--accent-color)' : 'var(--text-secondary)',
                            cursor: 'pointer',
                            fontSize: '0.65rem',
                            borderBottom: activeSidebarTab === tab.id ? '2px solid var(--accent-color)' : '2px solid transparent',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        {tab.icon}
                        <span>{tab.label}</span>
                    </button>
                ))}
            </div>

            <div className="sidebar-content" style={{ flex: 1, overflowY: 'auto' }}>
                {activeSidebarTab === 'tabmanager' && <TabManager />}
                {activeSidebarTab === 'thumbnails' && <Thumbnails />}
                {activeSidebarTab === 'summary' && <SummaryPanel />}
                {activeSidebarTab === 'semantics' && <SemanticHub />}
                {activeSidebarTab === 'history' && <AnnotationHistory />}
                {activeSidebarTab === 'learning' && <LearningPanel />}
                {activeSidebarTab === 'publishing' && <PublishingPanel />}
                {activeSidebarTab === 'workspace' && <WorkspacePanel />}
                {activeSidebarTab === 'bookmarks' && (
                    <div className="p-4 text-center text-secondary">Bookmarks not yet implemented</div>
                )}
            </div>

            <div className="sidebar-resizer" onMouseDown={handleMouseDown} style={{
                position: 'absolute',
                right: 0,
                top: 0,
                bottom: 0,
                width: '4px',
                cursor: 'col-resize',
                backgroundColor: 'transparent',
                zIndex: 10,
                transition: 'background-color 0.2s'
            }} onMouseOver={(e) => e.target.style.backgroundColor = 'var(--accent-color)'}
                onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}>
            </div>
        </aside>
    );
};

export default Sidebar;
