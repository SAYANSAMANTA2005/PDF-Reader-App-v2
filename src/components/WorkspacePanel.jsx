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
    History,
    RefreshCw
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
        <div className="workspace-panel p-6 space-y-8 h-full overflow-y-auto bg-primary/20">
            <header className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-extrabold gradient-text">Pro Workspace</h2>
                    <p className="text-[10px] text-secondary font-bold uppercase tracking-widest mt-1">Multi-Document Management</p>
                </div>
                <div className="bg-indigo-100/50 dark:bg-indigo-900/20 p-2 rounded-lg">
                    <Layout size={24} className="text-indigo-600" />
                </div>
            </header>

            <section className="space-y-4">
                <div className="flex items-center justify-between px-1">
                    <h3 className="text-xs font-black text-secondary uppercase tracking-widest flex items-center gap-2">
                        <Folder size={14} className="text-indigo-500" />
                        Environments
                    </h3>
                </div>

                <div className="flex gap-2">
                    <input
                        type="text"
                        value={newWsName}
                        onChange={(e) => setNewWsName(e.target.value)}
                        placeholder="Project Name..."
                        className="premium-input flex-1"
                    />
                    <button
                        type="button"
                        onClick={(e) => { e.preventDefault(); addWorkspace(); }}
                        className="premium-btn !p-2 !shadow-none"
                    >
                        <Plus size={20} />
                    </button>
                </div>

                <div className="grid gap-2">
                    {workspaces.map(ws => (
                        <div
                            key={ws.id}
                            onClick={(e) => {
                                e.preventDefault(); e.stopPropagation();
                                console.log('🔄 Clicked workspace:', ws.id);
                                switchWorkspace(ws.id);
                            }}
                            className={`group flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left cursor-pointer ${activeWorkspaceId === ws.id ? 'border-indigo-500 bg-indigo-500/5 ring-4 ring-indigo-500/5' : 'border-divider bg-bg-secondary hover:border-indigo-500/30'}`}
                        >
                            <div className={`p-2 rounded-lg transition ${activeWorkspaceId === ws.id ? 'bg-indigo-500 text-white' : 'bg-secondary text-secondary group-hover:text-indigo-500'}`}>
                                <Folder size={16} />
                            </div>
                            <span className={`flex-1 text-xs font-bold transition ${activeWorkspaceId === ws.id ? 'text-indigo-600' : 'text-primary'}`}>{ws.name}</span>
                            {activeWorkspaceId === ws.id && <Check size={16} className="text-indigo-500" />}
                        </div>
                    ))}
                </div>
            </section>

            <div className="h-px bg-divider opacity-50" />

            <section className="space-y-4">
                <h3 className="text-xs font-black text-secondary uppercase tracking-widest flex items-center gap-2 px-1">
                    <StickyNote size={14} className="text-amber-500" />
                    Universal Insights
                </h3>

                <div className="glass-card p-4 space-y-3 border-l-4 border-l-amber-500/30">
                    <textarea
                        value={noteText}
                        onChange={(e) => setNoteText(e.target.value)}
                        placeholder="Capture a thought across all PDFs..."
                        className="premium-input min-h-[100px] resize-none border-none bg-transparent !p-0 focus:ring-0"
                    />
                    <button
                        type="button"
                        onClick={(e) => { e.preventDefault(); addNote(); }}
                        className="premium-btn w-full !bg-amber-600 hover:!bg-amber-700 shadow-amber-600/20"
                    >
                        Capture Insight
                    </button>
                </div>

                <div className="space-y-3">
                    {universalNotes.map(note => (
                        <div key={note.id} className="glass-card p-4 hover:border-amber-400/50 transition border-l-4 border-l-amber-500/20">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-[9px] font-black text-amber-600 bg-amber-100 dark:bg-amber-900/40 px-2 py-0.5 rounded uppercase tracking-tighter">REF: {note.fileName}</span>
                                <span className="text-[8px] text-secondary font-bold">{note.timestamp}</span>
                            </div>
                            <p className="text-[11px] text-primary leading-relaxed font-medium">{note.text}</p>
                        </div>
                    ))}
                </div>
            </section>

            <section className="p-5 bg-gradient-to-tr from-indigo-500 to-purple-600 rounded-2xl text-white shadow-xl shadow-indigo-500/20 overflow-hidden relative">
                <div className="absolute -bottom-4 -right-4 opacity-10">
                    <History size={80} />
                </div>
                <div className="relative z-10">
                    <h4 className="text-sm font-black flex items-center gap-2">
                        <History size={16} />
                        Pro Analytics
                    </h4>
                    <p className="text-[10px] opacity-80 mt-2 font-bold leading-relaxed">Cross-document jump history and knowledge-link mapping is active.</p>
                </div>
            </section>
        </div>
    );
};

export default WorkspacePanel;
