import React, { useState } from 'react';
import { usePDF } from '../context/PDFContext';
import {
    Layout,
    Plus,
    Folder,
    Trash2,
    Check,
    StickyNote,
    Link as LinkIcon,
    History
} from 'lucide-react';

const WorkspacePanel = () => {
    const {
        workspaces,
        setWorkspaces,
        activeWorkspaceId,
        switchWorkspace,
        universalNotes,
        setUniversalNotes,
        fileName
    } = usePDF();

    const [newWsName, setNewWsName] = useState('');
    const [noteText, setNoteText] = useState('');

    const addWorkspace = () => {
        if (!newWsName) return;
        const newWs = {
            id: Math.random().toString(36).substr(2, 9),
            name: newWsName,
            tabs: [],
            createdAt: Date.now()
        };
        setWorkspaces([...workspaces, newWs]);
        setNewWsName('');
    };

    const addNote = () => {
        if (!noteText) return;
        const note = {
            id: Date.now(),
            text: noteText,
            fileName: fileName,
            timestamp: new Date().toLocaleString()
        };
        setUniversalNotes([...universalNotes, note]);
        setNoteText('');
    };

    return (
        <div className="workspace-panel" style={{ padding: '1rem', overflowY: 'auto', height: '100% ' }}>
            <section style={{ marginBottom: '2rem' }}>
                <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                    <Layout size={18} /> Workspaces
                </h4>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                    <input
                        type="text"
                        value={newWsName}
                        onChange={(e) => setNewWsName(e.target.value)}
                        placeholder="New Workspace Name..."
                        style={{
                            flex: 1, padding: '0.5rem', borderRadius: 'var(--radius-sm)',
                            border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)',
                            color: 'var(--text-primary)', fontSize: '0.85rem'
                        }}
                    />
                    <button onClick={addWorkspace} className="btn-primary" style={{ padding: '0.5rem 1rem' }}>
                        <Plus size={16} />
                    </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {workspaces.map(ws => (
                        <button
                            key={ws.id}
                            onClick={() => switchWorkspace(ws.id)}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem',
                                borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)',
                                backgroundColor: activeWorkspaceId === ws.id ? 'var(--accent-color)' : 'var(--bg-secondary)',
                                color: activeWorkspaceId === ws.id ? 'white' : 'var(--text-primary)',
                                cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s'
                            }}
                        >
                            <Folder size={16} />
                            <span style={{ flex: 1 }}>{ws.name}</span>
                            {activeWorkspaceId === ws.id && <Check size={16} />}
                        </button>
                    ))}
                </div>
            </section>

            <section style={{ marginBottom: '2rem' }}>
                <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                    <StickyNote size={18} /> Universal Notes
                </h4>
                <textarea
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    placeholder="Capture a thought across all PDFs..."
                    style={{
                        width: '100%', minHeight: '80px', padding: '0.75rem', borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)',
                        color: 'var(--text-primary)', fontSize: '0.85rem', marginBottom: '0.5rem',
                        resize: 'none'
                    }}
                />
                <button onClick={addNote} className="btn-primary" style={{ width: '100%', padding: '0.6rem' }}>
                    Save Note
                </button>

                <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {universalNotes.map(note => (
                        <div key={note.id} style={{
                            padding: '0.75rem', borderRadius: 'var(--radius-md)',
                            backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)'
                        }}>
                            <div style={{ fontSize: '0.7rem', color: 'var(--accent-color)', marginBottom: '0.3rem' }}>
                                Ref: {note.fileName} • {note.timestamp}
                            </div>
                            <div style={{ fontSize: '0.85rem' }}>{note.text}</div>
                        </div>
                    ))}
                </div>
            </section>

            <section>
                <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                    <History size={18} /> Pro Sessions
                </h4>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                    Tracking jump-links and history...
                </div>
            </section>
        </div>
    );
};

export default WorkspacePanel;
