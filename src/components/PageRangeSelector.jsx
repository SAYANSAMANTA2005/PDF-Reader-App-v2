import React, { useState, useEffect } from 'react';
import { usePDF } from '../context/PDFContext';
import { FileText, AlertCircle, Check } from 'lucide-react';

const PageRangeSelector = ({
    onRangeChange,
    defaultStart = 1,
    defaultEnd = null,
    showQuickActions = true
}) => {
    const { numPages, currentPage } = usePDF();
    const [startPage, setStartPage] = useState(defaultStart);
    const [endPage, setEndPage] = useState(defaultEnd || numPages);
    const [isValid, setIsValid] = useState(true);
    const [errorMessage, setErrorMessage] = useState('');
    const [useFullDocument, setUseFullDocument] = useState(true);

    useEffect(() => {
        if (defaultEnd === null && numPages > 0) {
            setEndPage(numPages);
        }
    }, [numPages, defaultEnd]);

    useEffect(() => {
        validateRange(startPage, endPage);
    }, [startPage, endPage, numPages]);

    const validateRange = (start, end) => {
        const startNum = parseInt(start);
        const endNum = parseInt(end);

        if (isNaN(startNum) || isNaN(endNum)) {
            setIsValid(false);
            setErrorMessage('Please enter valid page numbers');
            return false;
        }

        if (startNum < 1 || endNum < 1) {
            setIsValid(false);
            setErrorMessage('Page numbers must be greater than 0');
            return false;
        }

        if (startNum > numPages || endNum > numPages) {
            setIsValid(false);
            setErrorMessage(`Page numbers cannot exceed ${numPages}`);
            return false;
        }

        if (startNum > endNum) {
            setIsValid(false);
            setErrorMessage('Start page must be less than or equal to end page');
            return false;
        }

        setIsValid(true);
        setErrorMessage('');

        if (onRangeChange) {
            onRangeChange({ start: startNum, end: endNum, isValid: true });
        }

        return true;
    };

    const handleFullDocument = () => {
        setUseFullDocument(true);
        setStartPage(1);
        setEndPage(numPages);
    };

    const handleCurrentPage = () => {
        setUseFullDocument(false);
        setStartPage(currentPage);
        setEndPage(currentPage);
    };

    const handleCustomRange = () => {
        setUseFullDocument(false);
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
                    <FileText size={16} className="text-accent" />
                </div>
                <div className="flex-1">
                    <h4 className="text-xs font-black uppercase tracking-widest text-primary">Page Range</h4>
                    <p className="text-[10px] text-secondary font-medium">Select pages to process</p>
                </div>
            </div>

            {showQuickActions && (
                <div className="grid grid-cols-2 gap-2">
                    <button
                        onClick={handleFullDocument}
                        className={`premium-input text-center text-[10px] font-black uppercase tracking-tight transition-all ${useFullDocument ? 'border-accent bg-accent/5' : ''
                            }`}
                    >
                        Full Document
                    </button>
                    <button
                        onClick={handleCurrentPage}
                        className={`premium-input text-center text-[10px] font-black uppercase tracking-tight transition-all ${!useFullDocument && startPage === currentPage && endPage === currentPage ? 'border-accent bg-accent/5' : ''
                            }`}
                    >
                        Current Page
                    </button>
                </div>
            )}

            <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase tracking-widest text-secondary">Start Page</label>
                    <input
                        type="number"
                        min="1"
                        max={numPages}
                        value={startPage}
                        onChange={(e) => {
                            setStartPage(e.target.value);
                            handleCustomRange();
                        }}
                        className={`premium-input w-full text-center font-bold ${!isValid ? 'border-red-500' : ''}`}
                    />
                </div>
                <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase tracking-widest text-secondary">End Page</label>
                    <input
                        type="number"
                        min="1"
                        max={numPages}
                        value={endPage}
                        onChange={(e) => {
                            setEndPage(e.target.value);
                            handleCustomRange();
                        }}
                        className={`premium-input w-full text-center font-bold ${!isValid ? 'border-red-500' : ''}`}
                    />
                </div>
            </div>

            {!isValid && errorMessage && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                    <AlertCircle size={14} className="text-red-500 flex-shrink-0" />
                    <p className="text-[10px] text-red-600 font-bold">{errorMessage}</p>
                </div>
            )}

            {isValid && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-green-500/10 border border-green-500/20">
                    <Check size={14} className="text-green-500 flex-shrink-0" />
                    <p className="text-[10px] text-green-600 font-bold">
                        {startPage === endPage
                            ? `Processing page ${startPage}`
                            : `Processing ${endPage - startPage + 1} pages (${startPage}-${endPage})`
                        }
                    </p>
                </div>
            )}
        </div>
    );
};

export default PageRangeSelector;
