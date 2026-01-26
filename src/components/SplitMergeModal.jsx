/**
 * Split & Merge Modal
 * Page manipulation using pdf-lib
 */

import React, { useState } from 'react';
import { usePDF } from '../context/PDFContext';
import { X, Files, Scissors, Plus, Trash2, Download, Loader } from 'lucide-react';
import { PDFDocument } from 'pdf-lib';

const SplitMergeModal = ({ isOpen, onClose }) => {
    const { pdfDocument, pdfFile, numPages, fileName } = usePDF();
    const [activeTab, setActiveTab] = useState('split');
    const [pageRange, setPageRange] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    // Merge state
    const [mergeFiles, setMergeFiles] = useState([]);

    if (!isOpen) return null;

    const handleSplit = async () => {
        if (!pdfDocument || !pageRange) return;
        setIsProcessing(true);
        try {
            // Parse page range (e.g., 1-5, 10, 15)
            const indices = [];
            const parts = pageRange.split(',').map(p => p.trim());

            for (const part of parts) {
                if (part.includes('-')) {
                    const [start, end] = part.split('-').map(Number);
                    for (let i = start; i <= end; i++) indices.push(i - 1);
                } else {
                    indices.push(Number(part) - 1);
                }
            }

            const srcBytes = await pdfDocument.getData();
            const srcDoc = await PDFDocument.load(srcBytes);
            const newDoc = await PDFDocument.create();

            const copiedPages = await newDoc.copyPages(srcDoc, indices);
            copiedPages.forEach(p => newDoc.addPage(p));

            const pdfBytes = await newDoc.save();
            const blob = new Blob([pdfBytes], { type: 'application/pdf' });

            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `${fileName.replace('.pdf', '')}_split.pdf`;
            link.click();

            onClose();
        } catch (err) {
            console.error('Split failed:', err);
            alert('Page range invalid or processing failed.');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleMerge = async () => {
        if (mergeFiles.length === 0) return;
        setIsProcessing(true);
        try {
            const mergedDoc = await PDFDocument.create();

            // Add original first if in list
            const currentPdfBytes = await pdfDocument.getData();
            const currentDoc = await PDFDocument.load(currentPdfBytes);
            const currentPages = await mergedDoc.copyPages(currentDoc, currentDoc.getPageIndices());
            currentPages.forEach(p => mergedDoc.addPage(p));

            for (const file of mergeFiles) {
                const bytes = await file.arrayBuffer();
                const doc = await PDFDocument.load(bytes);
                const pages = await mergedDoc.copyPages(doc, doc.getPageIndices());
                pages.forEach(p => mergedDoc.addPage(p));
            }

            const pdfBytes = await mergedDoc.save();
            const blob = new Blob([pdfBytes], { type: 'application/pdf' });

            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `merged_document.pdf`;
            link.click();

            onClose();
        } catch (err) {
            console.error('Merge failed:', err);
            alert('File processing failed.');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div
            className="modal-overlay"
            style={{
                position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                background: 'rgba(0,0,0,0.5)', display: 'flex',
                alignItems: 'center', justifyContent: 'center', zIndex: 1000
            }}
            onClick={onClose}
        >
            <div
                className="modal-content"
                style={{
                    background: 'var(--bg-primary)', borderRadius: '12px',
                    padding: '24px', width: '90%', maxWidth: '500px',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Files size={24} />
                        Page Manipulation
                    </h2>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
                        <X size={20} />
                    </button>
                </div>

                <div style={{ display: 'flex', marginBottom: '20px', gap: '10px' }}>
                    <button
                        onClick={() => setActiveTab('split')}
                        style={{
                            flex: 1, padding: '10px', borderRadius: '8px',
                            background: activeTab === 'split' ? 'var(--accent-color)' : 'var(--bg-secondary)',
                            color: activeTab === 'split' ? 'white' : 'var(--text-primary)',
                            border: 'none', cursor: 'pointer', fontWeight: 600
                        }}
                    >
                        Split / Extract
                    </button>
                    <button
                        onClick={() => setActiveTab('merge')}
                        style={{
                            flex: 1, padding: '10px', borderRadius: '8px',
                            background: activeTab === 'merge' ? 'var(--accent-color)' : 'var(--bg-secondary)',
                            color: activeTab === 'merge' ? 'white' : 'var(--text-primary)',
                            border: 'none', cursor: 'pointer', fontWeight: 600
                        }}
                    >
                        Merge PDF
                    </button>
                </div>

                {activeTab === 'split' ? (
                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Page Range (Total {numPages} pages):</label>
                        <input
                            type="text"
                            placeholder="e.g. 1-5, 8, 11-14"
                            value={pageRange}
                            onChange={(e) => setPageRange(e.target.value)}
                            style={{
                                width: '100%', padding: '12px', borderRadius: '8px',
                                border: '1px solid var(--border-color)', background: 'var(--bg-secondary)',
                                marginBottom: '20px'
                            }}
                        />
                        <button
                            onClick={handleSplit}
                            disabled={isProcessing || !pageRange}
                            style={{
                                width: '100%', padding: '12px', borderRadius: '8px',
                                background: isProcessing ? 'var(--border-color)' : 'var(--accent-color)',
                                color: 'white', border: 'none', cursor: 'pointer',
                                fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                            }}
                        >
                            {isProcessing ? <Loader size={18} className="spin" /> : <Scissors size={18} />}
                            Extract Pages
                        </button>
                    </div>
                ) : (
                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Add PDF files to merge with current:</label>
                        <div style={{ marginBottom: '15px' }}>
                            <input
                                type="file"
                                multiple
                                accept="application/pdf"
                                onChange={(e) => setMergeFiles([...mergeFiles, ...Array.from(e.target.files)])}
                                id="pdf-merge-input"
                                style={{ display: 'none' }}
                            />
                            <label
                                htmlFor="pdf-merge-input"
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '8px',
                                    padding: '12px', border: '2px dashed var(--border-color)',
                                    borderRadius: '8px', cursor: 'pointer', justifyContent: 'center'
                                }}
                            >
                                <Plus size={18} />
                                Choose Additional Files
                            </label>
                        </div>

                        <div style={{ maxHeight: '150px', overflowY: 'auto', marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', background: 'var(--bg-secondary)', borderRadius: '4px', fontSize: '13px' }}>
                                <span>📄 {fileName} (Original)</span>
                            </div>
                            {mergeFiles.map((file, idx) => (
                                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', background: 'var(--bg-secondary)', borderRadius: '4px', fontSize: '13px' }}>
                                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '80%' }}>📎 {file.name}</span>
                                    <Trash2
                                        size={14} color="red" cursor="pointer"
                                        onClick={() => setMergeFiles(mergeFiles.filter((_, i) => i !== idx))}
                                    />
                                </div>
                            ))}
                        </div>

                        <button
                            onClick={handleMerge}
                            disabled={isProcessing || mergeFiles.length === 0}
                            style={{
                                width: '100%', padding: '12px', borderRadius: '8px',
                                background: isProcessing ? 'var(--border-color)' : 'var(--accent-color)',
                                color: 'white', border: 'none', cursor: 'pointer',
                                fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                            }}
                        >
                            {isProcessing ? <Loader size={18} className="spin" /> : <Download size={18} />}
                            Merge All Files
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SplitMergeModal;
