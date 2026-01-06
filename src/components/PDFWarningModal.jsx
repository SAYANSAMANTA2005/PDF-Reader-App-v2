// src/components/PDFWarningModal.jsx
// Warning modal for unsafe PDFs
// Non-blocking, user-friendly, with action options

import React, { useState } from 'react';
import { X, AlertTriangle, Download, Loader, HardDrive, Zap } from 'lucide-react';

const PDFWarningModal = ({
    isOpen = false,
    analysis = null,
    riskAssessment = null,
    onAllow = null,
    onLoadSafeMode = null,
    onDownloadOnly = null,
    onCancel = null,
    isLoading = false,
    memoryStatus = null,
    memoryCleanedUp = false,
}) => {
    const [selectedAction, setSelectedAction] = useState(null);
    
    if (!isOpen || !analysis || !riskAssessment) {
        return null;
    }
    
    const handleAction = (action) => {
        setSelectedAction(action);
        
        switch (action) {
            case 'ALLOW':
                onAllow?.();
                break;
            case 'SAFE_MODE':
                onLoadSafeMode?.();
                break;
            case 'DOWNLOAD':
                onDownloadOnly?.();
                break;
            case 'CANCEL':
                onCancel?.();
                break;
        }
    };
    
    const isSafe = riskAssessment.isSafe;
    const hasRisks = riskAssessment.risks.length > 0;
    const hasWarnings = riskAssessment.warnings.length > 0;
    
    return (
        <div className="pdf-warning-modal-backdrop">
            <div className="pdf-warning-modal">
                {/* Header */}
                <div className="pdf-warning-header">
                    <div className="pdf-warning-title">
                        <AlertTriangle className="warning-icon" size={28} />
                        <h2>
                            {isSafe ? '✅ PDF is Safe' : '⚠️ Large PDF Detected'}
                        </h2>
                    </div>
                    <button
                        className="pdf-warning-close"
                        onClick={() => handleAction('CANCEL')}
                        aria-label="Close"
                    >
                        <X size={24} />
                    </button>
                </div>
                
                {/* Message */}
                <div className="pdf-warning-message">
                    {hasRisks ? (
                        <p>
                            This PDF exceeds safe limits for your device. Loading it may cause performance issues, app freezing, or high memory usage.
                        </p>
                    ) : hasWarnings ? (
                        <p>
                            This PDF may experience performance issues. It's still safe to load, but rendering might be slower than usual.
                        </p>
                    ) : (
                        <p>
                            This PDF is safe to load on your device.
                        </p>
                    )}
                </div>
                
                {/* File Info Grid */}
                <div className="pdf-warning-info-grid">
                    <div className="pdf-info-item">
                        <span className="pdf-info-label">File Size</span>
                        <span className="pdf-info-value">{analysis.fileSizeMB} MB</span>
                    </div>
                    
                    <div className="pdf-info-item">
                        <span className="pdf-info-label">Pages</span>
                        <span className="pdf-info-value">{analysis.pageCount}</span>
                    </div>
                    
                    <div className="pdf-info-item">
                        <span className="pdf-info-label">Est. Memory</span>
                        <span className="pdf-info-value">{riskAssessment.estimatedMemory} MB</span>
                    </div>
                    
                    <div className="pdf-info-item">
                        <span className="pdf-info-label">Complexity</span>
                        <span className="pdf-info-value">
                            {getComplexityBadge(riskAssessment.estimatedCPU)}
                        </span>
                    </div>
                </div>
                
                {/* Risks */}
                {hasRisks && (
                    <div className="pdf-warning-risks">
                        <h3>Issues Detected:</h3>
                        <ul>
                            {riskAssessment.risks.map((risk, idx) => (
                                <li key={idx}>
                                    <span className="risk-icon">🔴</span>
                                    <span>{risk}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
                
                {/* Warnings */}
                {hasWarnings && (
                    <div className="pdf-warning-list">
                        <h3>Warnings:</h3>
                        <ul>
                            {riskAssessment.warnings.map((warning, idx) => (
                                <li key={idx}>
                                    <span className="warning-icon">⚠️</span>
                                    <span>{warning}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
                
                {/* Details Toggle */}
                <details className="pdf-warning-details">
                    <summary>Technical Details</summary>
                    <div className="pdf-warning-details-content">
                        <table>
                            <tbody>
                                <tr>
                                    <td>Title:</td>
                                    <td>{analysis.metadata?.title || 'N/A'}</td>
                                </tr>
                                <tr>
                                    <td>Author:</td>
                                    <td>{analysis.metadata?.author || 'N/A'}</td>
                                </tr>
                                <tr>
                                    <td>Encrypted:</td>
                                    <td>{analysis.isEncrypted ? 'Yes 🔒' : 'No'}</td>
                                </tr>
                                <tr>
                                    <td>Has Images:</td>
                                    <td>{analysis.hasImages ? 'Yes' : 'No'}</td>
                                </tr>
                                <tr>
                                    <td>High Resolution:</td>
                                    <td>{analysis.hasHighResolution ? 'Yes' : 'No'}</td>
                                </tr>
                                <tr>
                                    <td>Page Dimensions:</td>
                                    <td>{analysis.pageMetrics?.avgWidth} × {analysis.pageMetrics?.avgHeight}pt</td>
                                </tr>
                                <tr>
                                    <td>Complexity Score:</td>
                                    <td>{riskAssessment.estimatedCPU}%</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </details>
                
                {/* Actions */}
                <div className="pdf-warning-actions">
                    {/* Primary: Cancel */}
                    <button
                        className="pdf-action-btn pdf-action-cancel"
                        onClick={() => handleAction('CANCEL')}
                        disabled={isLoading}
                    >
                        Cancel
                    </button>
                    
                    {/* Secondary: Download Only */}
                    <button
                        className="pdf-action-btn pdf-action-secondary"
                        onClick={() => handleAction('DOWNLOAD')}
                        disabled={isLoading}
                    >
                        <Download size={18} />
                        Download Only
                    </button>
                    
                    {/* Tertiary: Safe Mode */}
                    {hasRisks && (
                        <button
                            className="pdf-action-btn pdf-action-secondary"
                            onClick={() => handleAction('SAFE_MODE')}
                            disabled={isLoading}
                        >
                            <Zap size={18} />
                            Safe Mode
                        </button>
                    )}
                    
                    {/* Primary: Load (if safe or user choice) */}
                    {isSafe || (!hasRisks) ? (
                        <button
                            className="pdf-action-btn pdf-action-primary"
                            onClick={() => handleAction('ALLOW')}
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <>
                                    <Loader size={18} className="spinner" />
                                    Loading...
                                </>
                            ) : (
                                'Load PDF'
                            )}
                        </button>
                    ) : null}
                </div>
                
                {/* Footer Note */}
                <div className="pdf-warning-footer">
                    <p>
                        💡 <strong>Tip:</strong> For better performance, consider splitting large PDFs into smaller files or using Safe Mode.
                    </p>
                    {memoryStatus && (
                        <p className={`memory-status ${memoryCleanedUp ? 'cleaned' : 'cleaning'}`}>
                            🔄 {memoryStatus}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};

/**
 * Get complexity badge
 */
function getComplexityBadge(cpuScore) {
    if (cpuScore < 25) return '🟢 Low';
    if (cpuScore < 50) return '🟡 Moderate';
    if (cpuScore < 75) return '🟠 High';
    return '🔴 Very High';
}

export default PDFWarningModal;