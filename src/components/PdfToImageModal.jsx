/**
 * PDF to Image Export Modal
 * Export current page or all pages as images
 */

import React, { useState } from 'react';
import { usePDF } from '../context/PDFContext';
import { X, Download, FileImage, Loader } from 'lucide-react';
import { exportPageAsImage, exportAllPagesAsImages, downloadBlob } from '../utils/imageExportService';

const PdfToImageModal = ({ isOpen, onClose }) => {
    const { pdfDocument, currentPage, numPages, fileName } = usePDF();
    const [exportType, setExportType] = useState('current'); // 'current' or 'all'
    const [format, setFormat] = useState('png');
    const [quality, setQuality] = useState('high'); // 'standard', 'high', 'print'
    const [isExporting, setIsExporting] = useState(false);
    const [progress, setProgress] = useState({ current: 0, total: 0 });

    if (!isOpen) return null;

    const dpiMap = {
        standard: 96,
        high: 150,
        print: 300
    };

    const handleExport = async () => {
        if (!pdfDocument) return;

        setIsExporting(true);
        try {
            const dpi = dpiMap[quality];

            if (exportType === 'current') {
                // Export single page
                const blob = await exportPageAsImage(pdfDocument, currentPage, format, dpi);
                const ext = format === 'jpeg' ? 'jpg' : format;
                const filename = `${fileName.replace('.pdf', '')}_page-${currentPage}.${ext}`;
                downloadBlob(blob, filename);
            } else {
                // Export all pages as ZIP
                const blob = await exportAllPagesAsImages(
                    pdfDocument,
                    format,
                    dpi,
                    (current, total) => setProgress({ current, total })
                );
                const filename = `${fileName.replace('.pdf', '')}_images.zip`;
                downloadBlob(blob, filename);
            }

            onClose();
        } catch (error) {
            console.error('Export failed:', error);
            alert('Export failed. Please try again.');
        } finally {
            setIsExporting(false);
            setProgress({ current: 0, total: 0 });
        }
    };

    return (
        <div
            className="modal-overlay"
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(0,0,0,0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000
            }}
            onClick={onClose}
        >
            <div
                className="modal-content"
                style={{
                    background: 'var(--bg-primary)',
                    borderRadius: '12px',
                    padding: '24px',
                    width: '90%',
                    maxWidth: '500px',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <FileImage size={24} />
                        Export as Image
                    </h2>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
                        <X size={20} />
                    </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {/* Export Type */}
                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Export:</label>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                                onClick={() => setExportType('current')}
                                style={{
                                    flex: 1,
                                    padding: '10px',
                                    border: `2px solid ${exportType === 'current' ? 'var(--accent-color)' : 'var(--border-color)'}`,
                                    background: exportType === 'current' ? 'rgba(var(--accent-rgb), 0.1)' : 'transparent',
                                    borderRadius: '8px',
                                    cursor: 'pointer'
                                }}
                            >
                                Current Page ({currentPage})
                            </button>
                            <button
                                onClick={() => setExportType('all')}
                                style={{
                                    flex: 1,
                                    padding: '10px',
                                    border: `2px solid ${exportType === 'all' ? 'var(--accent-color)' : 'var(--border-color)'}`,
                                    background: exportType === 'all' ? 'rgba(var(--accent-rgb), 0.1)' : 'transparent',
                                    borderRadius: '8px',
                                    cursor: 'pointer'
                                }}
                            >
                                All Pages ({numPages})
                            </button>
                        </div>
                    </div>

                    {/* Format */}
                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Format:</label>
                        <select
                            value={format}
                            onChange={(e) => setFormat(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '10px',
                                border: '1px solid var(--border-color)',
                                borderRadius: '8px',
                                background: 'var(--bg-secondary)',
                                fontSize: '14px'
                            }}
                        >
                            <option value="png">PNG (Best Quality)</option>
                            <option value="jpeg">JPEG (Smaller Size)</option>
                            <option value="webp">WebP (Modern)</option>
                        </select>
                    </div>

                    {/* Quality */}
                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Quality:</label>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            {['standard', 'high', 'print'].map((q) => (
                                <button
                                    key={q}
                                    onClick={() => setQuality(q)}
                                    style={{
                                        flex: 1,
                                        padding: '8px',
                                        border: `2px solid ${quality === q ? 'var(--accent-color)' : 'var(--border-color)'}`,
                                        background: quality === q ? 'rgba(var(--accent-rgb), 0.1)' : 'transparent',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        fontSize: '12px'
                                    }}
                                >
                                    {q === 'standard' && '96 DPI'}
                                    {q === 'high' && '150 DPI'}
                                    {q === 'print' && '300 DPI'}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Progress */}
                    {isExporting && progress.total > 0 && (
                        <div style={{ textAlign: 'center', padding: '10px', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
                            <div style={{ marginBottom: '8px' }}>
                                Exporting {progress.current} of {progress.total}...
                            </div>
                            <div style={{ width: '100%', height: '4px', background: 'var(--border-color)', borderRadius: '2px', overflow: 'hidden' }}>
                                <div
                                    style={{
                                        width: `${(progress.current / progress.total) * 100}%`,
                                        height: '100%',
                                        background: 'var(--accent-color)',
                                        transition: 'width 0.3s'
                                    }}
                                />
                            </div>
                        </div>
                    )}

                    {/* Export Button */}
                    <button
                        onClick={handleExport}
                        disabled={isExporting}
                        style={{
                            padding: '12px',
                            background: isExporting ? 'var(--border-color)' : 'var(--accent-color)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: isExporting ? 'not-allowed' : 'pointer',
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            fontSize: '14px'
                        }}
                    >
                        {isExporting ? (
                            <>
                                <Loader size={18} className="spin" />
                                Exporting...
                            </>
                        ) : (
                            <>
                                <Download size={18} />
                                Export {exportType === 'current' ? 'Page' : 'All Pages'}
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PdfToImageModal;
