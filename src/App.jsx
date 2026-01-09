import React, { useState } from 'react';
import { usePDF } from './context/PDFContext';
import Toolbar from './components/Toolbar';
import Sidebar from './components/Sidebar';
import PDFViewer from './components/PDFViewer';
import { ToastProvider } from './components/ToastNotification';
import { Upload, FileText, AlertCircle, XCircle, Zap } from 'lucide-react';

const App = () => {
    const {
        pdfDocument, loadPDF, isSidebarOpen, setIsSidebarOpen,
        isLoading, error, cognitiveLoad, setCognitiveLoad,
        setActiveSidebarTab
    } = usePDF();
    const [isDragging, setIsDragging] = useState(false);

    // Keyboard Shortcuts
    React.useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.altKey) {
                switch (e.key.toLowerCase()) {
                    case 'o':
                        setActiveSidebarTab('store');
                        setIsSidebarOpen(true);
                        break;
                    case 'p':
                        setActiveSidebarTab('store');
                        setIsSidebarOpen(true);
                        break;
                    case 'h':
                        setActiveSidebarTab('store');
                        setIsSidebarOpen(true);
                        break;
                    default:
                        break;
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [setActiveSidebarTab, setIsSidebarOpen]);


    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file && file.type === 'application/pdf') {
            loadPDF(file);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file && file.type === 'application/pdf') {
            loadPDF(file);
        }
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    return (
        <ToastProvider>
            <div
                className={`app-container ${isDragging ? 'dragging' : ''}`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
            >
                <div className="main-layout">
                    <header className="header">
                        <div className="logo-area">
                            <FileText className="logo-icon" />
                            <span className="logo-text">PDF Reader</span>
                        </div>
                        <Toolbar />
                    </header>

                    <div className="content-area">
                        <div style={{
                            display: (pdfDocument && isSidebarOpen) ? 'flex' : 'none',
                            flexShrink: 0,
                            height: '100%'
                        }}>
                            <Sidebar />
                        </div>

                        <main className="viewer-area">
                            {!pdfDocument && (
                                <div className="upload-container">
                                    <div className="upload-box">
                                        <Upload size={48} className="upload-icon" />
                                        <h2>Open a PDF to start reading</h2>
                                        <p>Drag and drop a file here, or click to select</p>
                                        <label className="upload-btn">
                                            Select PDF
                                            <input type="file" accept="application/pdf" onChange={handleFileChange} hidden />
                                        </label>
                                    </div>
                                    {isLoading && <p className="loading-text">Loading PDF...</p>}
                                    {error && <p className="error-text">{error}</p>}
                                </div>
                            )}

                            {pdfDocument && <PDFViewer />}
                        </main>
                    </div>
                </div>

                {/* Cognitive/Stuck Alert Notification */}
                {(cognitiveLoad.stuckDetected || cognitiveLoad.fatigueLevel > 70) && (
                    <div className="fixed bottom-6 right-6 z-[3000] w-80 bg-primary border-2 border-accent shadow-2xl rounded-2xl p-4 animate-in slide-in-from-right-10">
                        <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-2 text-accent">
                                <AlertCircle size={18} />
                                <span className="font-bold text-xs">Mentor Support</span>
                            </div>
                            <button onClick={() => setCognitiveLoad({ fatigueLevel: 0, stuckDetected: false })} className="text-secondary"><XCircle size={14} /></button>
                        </div>
                        <p className="text-xs text-primary font-medium leading-relaxed">
                            {cognitiveLoad.stuckDetected
                                ? `It looks like you've re-read this section multiple times. You might be missing a prerequisite. Want a 5-minute primer?`
                                : `I've detected some fatigue in your reading patterns. Take a 2-minute break to stay sharp?`}
                        </p>
                        <div className="flex gap-2 mt-4">
                            <button className="flex-1 bg-accent text-white text-[10px] font-bold py-2 rounded-lg flex items-center justify-center gap-1">
                                <Zap size={10} /> {cognitiveLoad.stuckDetected ? 'Yes, Explain it' : 'Take Break'}
                            </button>
                            <button onClick={() => setCognitiveLoad({ fatigueLevel: 0, stuckDetected: false })} className="flex-1 bg-secondary text-secondary text-[10px] font-bold py-2 rounded-lg border">Dismiss</button>
                        </div>
                        <div className="mt-3 flex items-center gap-2">
                            <div className="flex-1 h-1 bg-secondary rounded-full overflow-hidden">
                                <div className="h-full bg-accent transition-all" style={{ width: `${cognitiveLoad.fatigueLevel}%` }} />
                            </div>
                            <span className="text-[8px] text-secondary font-bold uppercase tracking-widest">Cognitive Load</span>
                        </div>
                    </div>
                )}
            </div>
        </ToastProvider>
    );
};

export default App;
