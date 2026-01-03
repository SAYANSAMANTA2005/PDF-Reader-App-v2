import React, { useState, useEffect } from 'react';
import { usePDF } from '../context/PDFContext';
import { extractText } from '../utils/pdfHelpers';
import * as aiService from '../utils/aiService';
import { Sparkles, Search, MessageSquare, Key, RefreshCw, Loader2 } from 'lucide-react';

const SummaryPanel = () => {
    const { pdfDocument, fileName, numPages } = usePDF();
    const [summary, setSummary] = useState(null);
    const [aiSummary, setAiSummary] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isAiLoading, setIsAiLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState(null);
    const [isSearching, setIsSearching] = useState(false);
    const [suggestions, setSuggestions] = useState([]);
    const [isSuggestionsLoading, setIsSuggestionsLoading] = useState(false);
    const [apiKey, setApiKey] = useState(localStorage.getItem("GEMINI_API_KEY") || '');
    const [showApiKeyInput, setShowApiKeyInput] = useState(!aiService.hasApiKey());
    const [error, setError] = useState(null);

    // Persist API key
    const handleSaveApiKey = () => {
        let cleanedKey = apiKey.trim();
        // Remove common copy-paste artifacts like "-->" or extra quotes
        cleanedKey = cleanedKey.replace(/^.*?AIzaS/, 'AIzaS');

        if (cleanedKey) {
            aiService.setApiKey(cleanedKey);
            setApiKey(cleanedKey); // Update local state with cleaned key
            setShowApiKeyInput(false);
            setError(null);
        }
    };

    const handleClearKey = () => {
        aiService.clearApiKey();
        setApiKey('');
        setShowApiKeyInput(true);
        setError("API Key removed. Please enter a valid key from Google AI Studio.");
    };

    const handleGenerateAiSummary = async () => {
        if (!pdfDocument || !aiService.hasApiKey()) {
            setShowApiKeyInput(true);
            return;
        }

        setIsAiLoading(true);
        setError(null);
        try {
            const text = await extractText(pdfDocument);
            const result = await aiService.generateSummary(text);
            setAiSummary(result);
        } catch (err) {
            console.error("AI Summary generation failed", err);
            setError(err.message || "Failed to generate AI summary. Check your API key or connection.");
        } finally {
            setIsAiLoading(false);
        }
    };

    const handleSemanticSearch = async (e) => {
        if (e) e.preventDefault();
        if (!searchQuery.trim() || !pdfDocument || !aiService.hasApiKey()) {
            if (!aiService.hasApiKey()) setShowApiKeyInput(true);
            return;
        }

        setIsSearching(true);
        setError(null);
        try {
            const text = await extractText(pdfDocument);
            const result = await aiService.semanticSearch(searchQuery, text);
            setSearchResults(result);
        } catch (err) {
            console.error("Semantic search failed", err);
            setError("Semantic search failed.");
        } finally {
            setIsSearching(false);
        }
    };

    const handleGetSuggestions = async () => {
        if (!pdfDocument || !aiService.hasApiKey()) return;

        setIsSuggestionsLoading(true);
        try {
            const text = await extractText(pdfDocument);
            const result = await aiService.getSmartSuggestions(text);
            // Split by lines and clean up
            const lines = result.split('\n').filter(l => l.trim().length > 5).slice(0, 3);
            setSuggestions(lines);
        } catch (err) {
            console.error("Suggestions failed", err);
        } finally {
            setIsSuggestionsLoading(false);
        }
    };

    // Load suggestions when document changes
    useEffect(() => {
        if (pdfDocument && aiService.hasApiKey()) {
            handleGetSuggestions();
        }
    }, [pdfDocument]);

    if (!pdfDocument) {
        return <div className="p-4 text-center text-secondary">No PDF loaded.</div>;
    }

    return (
        <div className="summary-panel" style={{ padding: '1rem', height: '100%', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Sparkles size={20} color="var(--accent-color)" />
                    AI Intelligence
                </h3>
                <button
                    onClick={() => setShowApiKeyInput(!showApiKeyInput)}
                    style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
                    title="API Key Settings"
                >
                    <Key size={16} />
                </button>
            </div>

            {showApiKeyInput && (
                <div style={{
                    backgroundColor: 'var(--bg-secondary)',
                    padding: '1rem',
                    borderRadius: 'var(--radius-md)',
                    marginBottom: '1rem',
                    border: '1px solid var(--border-color)'
                }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '0.5rem' }}>Enter Gemini API Key:</label>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <input
                            type="password"
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            placeholder="Paste your Gemini API key here"
                            style={{
                                flex: 1,
                                padding: '0.5rem',
                                borderRadius: 'var(--radius-sm)',
                                border: '1px solid var(--border-color)',
                                backgroundColor: 'var(--bg-primary)',
                                color: 'var(--text-primary)',
                                fontSize: '0.85rem'
                            }}
                        />
                        <button
                            onClick={handleSaveApiKey}
                            style={{
                                backgroundColor: 'var(--accent-color)',
                                color: 'white',
                                border: 'none',
                                padding: '0 1rem',
                                borderRadius: 'var(--radius-sm)',
                                fontSize: '0.85rem',
                                cursor: 'pointer',
                                fontWeight: '600'
                            }}
                        >
                            Save Key
                        </button>
                    </div>
                    {aiService.hasApiKey() && (
                        <button
                            onClick={handleClearKey}
                            style={{
                                marginTop: '0.5rem',
                                background: 'none',
                                border: 'none',
                                color: '#b91c1c',
                                cursor: 'pointer',
                                fontSize: '0.75rem',
                                textDecoration: 'underline',
                                padding: 0
                            }}
                        >
                            Clear and Reset Key
                        </button>
                    )}
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.5rem', display: 'flex', justifyContent: 'space-between' }}>
                        <span>Keys are stored locally in your browser.</span>
                        {aiService.hasApiKey() && <span style={{ color: 'green' }}>● API Key Active</span>}
                    </p>
                </div>
            )}

            {error && (
                <div style={{
                    padding: '0.75rem',
                    backgroundColor: '#fee2e2',
                    color: '#b91c1c',
                    borderRadius: 'var(--radius-md)',
                    marginBottom: '1rem',
                    fontSize: '0.85rem'
                }}>
                    {error}
                </div>
            )}

            {/* AI Summary Section */}
            <section style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.75rem' }}>
                    <h4 style={{ margin: 0, fontSize: '0.95rem' }}>Document Summary</h4>
                    {!aiSummary && (
                        <button
                            onClick={handleGenerateAiSummary}
                            disabled={isAiLoading}
                            style={{
                                fontSize: '0.8rem',
                                backgroundColor: 'transparent',
                                border: '1px solid var(--accent-color)',
                                color: 'var(--accent-color)',
                                padding: '0.2rem 0.6rem',
                                borderRadius: 'var(--radius-sm)',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.3rem'
                            }}
                        >
                            {isAiLoading ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                            Generate AI Summary
                        </button>
                    )}
                </div>

                {isAiLoading ? (
                    <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-secondary)' }}>
                        <Loader2 className="animate-spin" style={{ margin: '0 auto 0.5rem' }} />
                        <p style={{ fontSize: '0.85rem' }}>Analyzing document...</p>
                    </div>
                ) : aiSummary ? (
                    <div style={{
                        fontSize: '0.9rem',
                        lineHeight: '1.6',
                        color: 'var(--text-secondary)',
                        backgroundColor: 'var(--bg-secondary)',
                        padding: '1rem',
                        borderRadius: 'var(--radius-md)',
                        maxHeight: '300px',
                        overflowY: 'auto',
                        whiteSpace: 'pre-wrap'
                    }}>
                        {aiSummary}
                        <button
                            onClick={() => setAiSummary(null)}
                            style={{ display: 'block', marginTop: '1rem', border: 'none', background: 'none', color: 'var(--accent-color)', cursor: 'pointer', fontSize: '0.8rem' }}
                        >
                            Clear Summary
                        </button>
                    </div>
                ) : (
                    <div style={{
                        fontSize: '0.85rem',
                        color: 'var(--text-secondary)',
                        padding: '1rem',
                        border: '1px dashed var(--border-color)',
                        borderRadius: 'var(--radius-md)',
                        textAlign: 'center'
                    }}>
                        No AI summary generated yet.
                    </div>
                )}
            </section>

            {/* Semantic Search Section */}
            <section style={{ marginBottom: '2rem' }}>
                <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.95rem' }}>Semantic Search</h4>
                <form onSubmit={handleSemanticSearch} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Ask anything about the PDF..."
                        style={{
                            flex: 1,
                            padding: '0.5rem',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid var(--border-color)',
                            backgroundColor: 'var(--bg-primary)',
                            color: 'var(--text-primary)',
                            fontSize: '0.85rem'
                        }}
                    />
                    <button
                        type="submit"
                        disabled={isSearching}
                        style={{
                            backgroundColor: 'var(--accent-color)',
                            color: 'white',
                            border: 'none',
                            padding: '0 0.75rem',
                            borderRadius: 'var(--radius-sm)',
                            cursor: 'pointer'
                        }}
                    >
                        {isSearching ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                    </button>
                </form>

                {searchResults && (
                    <div style={{
                        fontSize: '0.85rem',
                        backgroundColor: 'var(--bg-secondary)',
                        padding: '0.75rem',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-color)',
                        color: 'var(--text-secondary)',
                        whiteSpace: 'pre-wrap'
                    }}>
                        <strong>Results:</strong>
                        <div style={{ marginTop: '0.5rem' }}>{searchResults}</div>
                        <button
                            onClick={() => setSearchResults(null)}
                            style={{ display: 'block', marginTop: '0.75rem', border: 'none', background: 'none', color: 'var(--accent-color)', cursor: 'pointer', fontSize: '0.75rem' }}
                        >
                            Clear Results
                        </button>
                    </div>
                )}
            </section>

            {/* Smart Suggestions Section */}
            <section style={{ marginBottom: '1rem' }}>
                <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <MessageSquare size={16} />
                    Smart Suggestions
                </h4>

                {isSuggestionsLoading ? (
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <Loader2 size={14} className="animate-spin" />
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Coming up with ideas...</span>
                    </div>
                ) : suggestions.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {suggestions.map((suggestion, idx) => (
                            <button
                                key={idx}
                                onClick={() => {
                                    setSearchQuery(suggestion.replace(/^\d+\.\s*/, '').replace(/^- \s*/, ''));
                                    // Optionally trigger search automatically
                                }}
                                style={{
                                    padding: '0.6rem',
                                    textAlign: 'left',
                                    fontSize: '0.8rem',
                                    backgroundColor: 'var(--bg-secondary)',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: 'var(--radius-sm)',
                                    color: 'var(--text-primary)',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                    hover: { backgroundColor: 'var(--bg-primary)' }
                                }}
                                onMouseOver={(e) => e.currentTarget.style.borderColor = 'var(--accent-color)'}
                                onMouseOut={(e) => e.currentTarget.style.borderColor = 'var(--border-color)'}
                            >
                                {suggestion}
                            </button>
                        ))}
                    </div>
                ) : (
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                        {aiService.hasApiKey() ? "No suggestions available." : "Add API key to see suggestions."}
                    </div>
                )}
            </section>

            <div style={{ marginTop: '2rem', fontSize: '0.75rem', color: 'var(--text-secondary)', opacity: 0.6, textAlign: 'center' }}>
                <p>Powered by Google Gemini AI</p>
                <p>File: {fileName} ({numPages} pages)</p>
            </div>
        </div>
    );
};

export default SummaryPanel;
