import React, { useState, useRef, useEffect } from 'react';
import { usePDF } from '../context/PDFContext';
import {
    MessageSquare,
    Send,
    Lightbulb,
    Copy,
    Download,
    ChevronDown,
    Zap,
    BookOpen,
    AlertCircle,
    Loader,
    Type,
    Settings,
    XCircle
} from 'lucide-react';
import {
    askPDFWithContext,
    explainConcept,
    summarizePageRange,
    askPDFWithSourceTracking,
    askPDFGrounded
} from '../utils/aiService';
import { hasApiKey } from '../utils/aiService';
import '../styles/pdfContextChat.css';

const PDFContextChat = ({ onClose }) => {
    const {
        pdfDocument,
        currentPage,
        numPages,
        pdfPagesData // RAG Data
    } = usePDF();

    const [isExpanded, setIsExpanded] = useState(true);
    const [messages, setMessages] = useState([
        {
            id: 'intro',
            type: 'bot',
            content: 'Hi! I can help you understand this PDF. Ask me anything about it! 📚\n\nTry:\n• "Summarize pages 5-10"\n• "Explain this theorem like I\'m a beginner"\n• "What are the key concepts?"\n• Or select text and ask a question about it.',
            timestamp: Date.now()
        }
    ]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [selectedText, setSelectedText] = useState('');
    const [pageRange, setPageRange] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(true);
    const [contextType, setContextType] = useState('selection'); // 'selection', 'page', 'all', 'range'
    const messagesEndRef = useRef(null);
    const [apiKeyValid, setApiKeyValid] = useState(false);

    // Check API key on mount
    useEffect(() => {
        setApiKeyValid(hasApiKey());
    }, []);

    // Scroll to bottom when new messages appear
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Get selected text from PDF
    const handleGetSelectedText = () => {
        const selection = window.getSelection().toString();
        if (selection) {
            setSelectedText(selection);
            setContextType('selection');
        } else {
            alert('Please select text in the PDF first');
        }
    };

    // Extract text from pages
    const extractPageText = async (pageNum) => {
        if (!pdfDocument) return '';
        try {
            const page = await pdfDocument.getPage(pageNum);
            const textContent = await page.getTextContent();
            return textContent.items.map(item => item.str).join(' ');
        } catch (error) {
            console.error('Error extracting page text:', error);
            return '';
        }
    };

    // Extract text from range
    const extractRangeText = async (startPage, endPage) => {
        if (!pdfDocument) return '';
        const texts = [];
        try {
            for (let i = startPage; i <= endPage && i <= numPages; i++) {
                const text = await extractPageText(i);
                if (text) {
                    texts.push(`[Page ${i}]\n${text}`);
                }
            }
            return texts.join('\n\n');
        } catch (error) {
            console.error('Error extracting range text:', error);
            return '';
        }
    };

    // Handle suggested quick questions
    const handleSuggestion = (suggestion) => {
        setInputValue(suggestion);
        setShowSuggestions(false);
    };

    // Send message to AI
    const handleSendMessage = async () => {
        if (!inputValue.trim() || !apiKeyValid) {
            if (!apiKeyValid) {
                alert('Please configure your Gemini API key in settings first');
            }
            return;
        }

        setShowSuggestions(false);
        const userMessage = {
            id: Date.now().toString(),
            type: 'user',
            content: inputValue,
            timestamp: Date.now(),
            context: {
                selectedText,
                contextType,
                pageRange
            }
        };

        setMessages(prev => [...prev, userMessage]);
        setInputValue('');
        setIsLoading(true);

        try {
            let pageText = '';
            let response = '';

            // Get context based on user selection
            if (contextType === 'selection' && selectedText) {
                pageText = selectedText;
            } else if (contextType === 'page') {
                pageText = await extractPageText(currentPage);
            } else if (contextType === 'range' && pageRange) {
                const [start, end] = pageRange.split('-').map(p => parseInt(p.trim()));
                if (start && end) {
                    pageText = await extractRangeText(start, end);
                }
            } else if (contextType === 'all') {
                // Use RAG Engine if available, otherwise fallback to first 100 pages
                if (pdfPagesData && pdfPagesData.length > 0) {
                    // RAG mode enabled - pageText is not needed as we pass chunks directly
                    pageText = "RAG_MODE";
                    console.log("Using RAG Engine for query");
                } else {
                    pageText = await extractRangeText(1, Math.min(50, numPages));
                }
            }

            // Check for specific patterns and handle accordingly
            const query = inputValue.toLowerCase();

            if (query.includes('summarize pages') || query.includes('summary')) {
                // Extract page numbers from query like "summarize pages 5-10"
                const match = query.match(/pages?\s+(\d+)\s*-\s*(\d+)/i);
                if (match) {
                    const start = parseInt(match[1]);
                    const end = parseInt(match[2]);
                    pageText = await extractRangeText(start, end);
                    response = await summarizePageRange(pageText, start, end);
                } else {
                    response = await askPDFWithContext(inputValue, pageText, selectedText);
                }
            } else if (query.includes('explain') && query.includes('beginner')) {
                // Extract concept to explain
                response = await explainConcept(pageText, inputValue.replace(/explain|beginner|like|i'm|i am/gi, '').trim(), 'beginner');
            } else if (query.includes('explain') && query.includes('advanced')) {
                response = await explainConcept(pageText, inputValue.replace(/explain|advanced/gi, '').trim(), 'advanced');
            } else if (query.includes('explain')) {
                response = await explainConcept(pageText, inputValue.replace(/explain/gi, '').trim(), 'intermediate');
            } else {
                // Default Question Handling
                if (contextType === 'all' && pageText === "RAG_MODE") {
                    // True AI Mode
                    response = await askPDFGrounded(inputValue, pdfPagesData, messages);
                } else {
                    // Standard context mode
                    response = await askPDFWithSourceTracking(inputValue, pageText, selectedText);
                }
            }

            const botMessage = {
                id: (Date.now() + 1).toString(),
                type: 'bot',
                content: response,
                timestamp: Date.now(),
                hasSource: response.includes('SOURCE:')
            };

            setMessages(prev => [...prev, botMessage]);
        } catch (error) {
            console.error('Error getting response:', error);
            const errorMessage = {
                id: (Date.now() + 1).toString(),
                type: 'bot',
                content: `❌ Error: ${error.message || 'Failed to get response. Please try again or check your API key.'}`,
                isError: true,
                timestamp: Date.now()
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    // Copy message to clipboard
    const handleCopyMessage = (content) => {
        navigator.clipboard.writeText(content);
        alert('Copied to clipboard!');
    };

    // Export conversation
    const handleExportChat = () => {
        const exportText = messages
            .map(msg => `[${msg.type.toUpperCase()}]\n${msg.content}`)
            .join('\n\n---\n\n');

        const element = document.createElement('a');
        element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(exportText));
        element.setAttribute('download', `pdf-chat-${Date.now()}.txt`);
        element.style.display = 'none';
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
    };

    const suggestions = [
        'Summarize this page',
        'Explain the main concepts',
        'What are the key takeaways?',
        'Highlight important definitions',
        'Create study questions from this content'
    ];

    if (!apiKeyValid) {
        return (
            <div className="pdf-chat-panel">
                <div className="pdf-chat-header">
                    <div className="pdf-chat-title">
                        <MessageSquare size={18} />
                        <span>Ask PDF</span>
                    </div>
                    <button className="pdf-chat-close-btn" onClick={onClose}>✕</button>
                </div>
                <div className="pdf-chat-content">
                    <div className="pdf-chat-alert">
                        <AlertCircle size={32} />
                        <p>Gemini API key is required to use AI Chat features.</p>
                        <button
                            className="tts-action-btn"
                            style={{ marginTop: '12px', background: '#3b82f6' }}
                            onClick={() => {
                                const key = prompt("Enter your Gemini API key:");
                                if (key) {
                                    localStorage.setItem("GEMINI_API_KEY", key);
                                    window.location.reload();
                                }
                            }}
                        >
                            Configure API Key
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="pdf-chat-panel">
            <div className="pdf-chat-header">
                <div className="pdf-chat-title">
                    <MessageSquare size={18} />
                    <span>Ask PDF</span>
                </div>
                <div className="pdf-chat-header-buttons">
                    <button
                        className="pdf-chat-icon-btn"
                        onClick={handleExportChat}
                        title="Export conversation"
                    >
                        <Download size={16} />
                    </button>
                    <button
                        className="pdf-chat-toggle-btn"
                        onClick={() => setIsExpanded(!isExpanded)}
                        title={isExpanded ? 'Collapse' : 'Expand'}
                    >
                        <ChevronDown
                            size={16}
                            style={{
                                transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                                transition: 'transform 0.2s'
                            }}
                        />
                    </button>
                    <button className="pdf-chat-close-btn" onClick={onClose}>✕</button>
                </div>
            </div>

            {isExpanded && (
                <div className="pdf-chat-container">
                    {/* Messages */}
                    <div className="pdf-chat-messages">
                        {messages.map(msg => (
                            <div key={msg.id} className={`pdf-chat-message ${msg.type}`}>
                                <div className="pdf-chat-message-content">
                                    {msg.type === 'bot' && <span className="pdf-chat-bot-avatar">🤖</span>}
                                    {msg.type === 'user' && <span className="pdf-chat-user-avatar">👤</span>}
                                    <div className="pdf-chat-message-text">
                                        {msg.content.split('\n').map((line, idx) => (
                                            <p key={idx}>{line || <br />}</p>
                                        ))}
                                        {msg.hasSource && (
                                            <div className="pdf-chat-source-indicator">
                                                ✓ Source tracking enabled
                                            </div>
                                        )}
                                    </div>
                                    {msg.type === 'bot' && !msg.isError && (
                                        <button
                                            className="pdf-chat-copy-btn"
                                            onClick={() => handleCopyMessage(msg.content)}
                                            title="Copy message"
                                        >
                                            <Copy size={14} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                        {isLoading && (
                            <div className="pdf-chat-message bot">
                                <div className="pdf-chat-message-content">
                                    <span className="pdf-chat-bot-avatar">🤖</span>
                                    <div className="pdf-chat-loading">
                                        <Loader size={16} className="spinning" /> Thinking...
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Suggestions */}
                    {showSuggestions && messages.length <= 1 && (
                        <div className="pdf-chat-suggestions">
                            <p className="pdf-chat-suggestions-title">💡 Try asking:</p>
                            {suggestions.map((sug, idx) => (
                                <button
                                    key={idx}
                                    className="pdf-chat-suggestion-btn"
                                    onClick={() => handleSuggestion(sug)}
                                >
                                    <Lightbulb size={14} /> {sug}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Context Options */}
                    <div className="pdf-chat-context-options">
                        <label className="pdf-chat-context-label">Context:</label>
                        <div className="pdf-chat-context-buttons">
                            <button
                                className={`pdf-chat-context-btn ${contextType === 'selection' ? 'active' : ''}`}
                                onClick={() => setContextType('selection')}
                                title="Use selected text as context"
                            >
                                <Type size={12} /> Selection
                            </button>
                            <button
                                className={`pdf-chat-context-btn ${contextType === 'page' ? 'active' : ''}`}
                                onClick={() => setContextType('page')}
                                title={`Use page ${currentPage} as context`}
                            >
                                <BookOpen size={12} /> Page
                            </button>
                            <button
                                className={`pdf-chat-context-btn ${contextType === 'all' ? 'active' : ''}`}
                                onClick={() => setContextType('all')}
                                title="Use entire document as context"
                            >
                                <Zap size={12} /> All
                            </button>
                        </div>
                        <button
                            className="pdf-chat-get-selected-btn"
                            onClick={handleGetSelectedText}
                            title="Capture selected text from PDF"
                        >
                            📝 Get Selected
                        </button>
                    </div>

                    {/* Input Area */}
                    <div className="pdf-chat-input-area">
                        <div className="pdf-chat-input-wrapper">
                            <textarea
                                className="pdf-chat-input"
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                onKeyPress={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSendMessage();
                                    }
                                }}
                                placeholder="Ask me anything about this PDF... (Shift+Enter for new line)"
                                disabled={isLoading}
                                rows={2}
                            />
                            <button
                                className="pdf-chat-send-btn"
                                onClick={handleSendMessage}
                                disabled={!inputValue.trim() || isLoading}
                                title="Send message (Enter)"
                            >
                                <Send size={16} />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PDFContextChat;
