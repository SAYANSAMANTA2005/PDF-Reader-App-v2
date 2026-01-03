import React, { useState } from 'react';
import { usePDF } from '../context/PDFContext';
import { extractText } from '../utils/pdfHelpers';
import * as aiService from '../utils/aiService';
import {
    Share2,
    Globe,
    Linkedin,
    Twitter,
    ExternalLink,
    Copy,
    Check,
    Zap,
    Eye,
    Sparkles
} from 'lucide-react';

const PublishingPanel = () => {
    const { pdfDocument, fileName } = usePDF();
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState(null); // { platform, data }
    const [copied, setCopied] = useState(false);
    const [error, setError] = useState(null);

    const handleGenerate = async (platform, useAI = true) => {
        if (!pdfDocument) return;
        setIsLoading(true);
        setError(null);
        try {
            const text = await extractText(pdfDocument);
            let content;

            if (useAI) {
                if (platform === 'website') {
                    content = await aiService.generateWebsiteContent(text);
                } else {
                    content = await aiService.generateSocialContent(text, platform);
                }
            } else {
                // RULE-BASED (NO AI) LOGIC
                if (platform === 'website') {
                    const lines = text.split('\n').filter(l => l.trim().length > 0);
                    const title = fileName.replace('.pdf', '');
                    const headings = lines.filter(l => l.length < 50 && !l.includes('.')).slice(0, 10);
                    content = `# ${title}\n\n` +
                        headings.map(h => `## ${h}\nExtract from document analysis regarding "${h.trim()}".`).join('\n\n') +
                        `\n\n---\n*Generated via Rule-Based Layout Engine*`;
                } else {
                    const sentences = text.split(/[.!?]/).filter(s => s.trim().length > 30);
                    const punchline = sentences[0]?.trim() || "Insights from " + fileName;
                    const hashtags = "#" + fileName.split(' ')[0].replace(/[^a-zA-Z]/g, '') + " #PDFReader #Productivity";

                    if (platform === 'linkedin') {
                        content = `📚 DOCUMENT INSIGHTS: ${fileName}\n\n"${punchline}"\n\nKey takeaways are available in this structured document. Check out the full PDF for more details.\n\n${hashtags}`;
                    } else if (platform === 'twitter') {
                        content = `New doc found: ${fileName} 📖\n\n"${punchline.substring(0, 150)}..."\n\nRead more in the full version.\n\n${hashtags}`;
                    } else if (platform === 'blog') {
                        content = `BLOG DRAFT: ${fileName}\n\nSUMMARY:\n${text.substring(0, 500)}...\n\n[Full analysis below]\n---`;
                    }
                }
            }

            if (platform === 'website') {
                const htmlContent = `
                    <!DOCTYPE html>
                    <html lang="en">
                    <head>
                        <meta charset="UTF-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        <title>Published: ${fileName}</title>
                        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/github-markdown-css/5.2.0/github-markdown.min.css">
                        <style>
                            body { box-sizing: border-box; min-width: 200px; max-width: 980px; margin: 0 auto; padding: 45px; background: #fdfdfd; font-family: -apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif; }
                            .badge { background: #3498db; color: white; padding: 2px 8px; border-radius: 4px; font-size: 11px; margin-bottom: 20px; display: inline-block; }
                            @media (max-width: 767px) { body { padding: 15px; } }
                        </style>
                    </head>
                    <body class="markdown-body">
                        <div class="badge">${useAI ? 'AI Enhanced' : 'Standard Layout'}</div>
                        ${content.includes('<') ? content : `<div>${content.split('\n').filter(l => l.trim()).map(l => {
                    if (l.startsWith('##')) return `<h2>${l.replace('##', '').trim()}</h2>`;
                    if (l.startsWith('#')) return `<h1>${l.replace('#', '').trim()}</h1>`;
                    return `<p>${l}</p>`;
                }).join('')}</div>`}
                    </body>
                    </html>
                `;
                const blob = new Blob([htmlContent], { type: 'text/html' });
                const url = URL.createObjectURL(blob);
                window.open(url, '_blank');
                setResult({ platform, data: "Your " + (useAI ? "AI" : "Standard") + " website has been generated and opened!" });
            } else {
                setResult({ platform, data: content });
            }
        } catch (err) {
            console.error("Publishing failure", err);
            setError(err.message || "Failed to generate content.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(result.data);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleShare = (platform) => {
        const text = encodeURIComponent(result.data);
        const url = platform === 'linkedin'
            ? `https://www.linkedin.com/sharing/share-offsite/?text=${text}`
            : `https://twitter.com/intent/tweet?text=${text}`;
        window.open(url, '_blank');
    };

    if (!pdfDocument) {
        return <div className="p-4 text-center text-secondary">No PDF loaded.</div>;
    }

    return (
        <div className="publishing-panel" style={{ padding: '1rem', height: '100%', overflowY: 'auto' }}>
            <h3 style={{ marginBottom: '1.5rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Share2 size={20} color="var(--accent-color)" />
                Publishing Hub
            </h3>

            {result ? (
                <div className="publish-result">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <h4 style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                            Draft for {result.platform.charAt(0).toUpperCase() + result.platform.slice(1)}
                        </h4>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button onClick={handleCopy} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', background: 'none', border: '1px solid var(--border-color)', padding: '0.3rem 0.6rem', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: '0.8rem', color: 'var(--text-primary)' }}>
                                {copied ? <Check size={14} color="green" /> : <Copy size={14} />}
                                {copied ? 'Copied' : 'Copy'}
                            </button>
                            {(result.platform === 'linkedin' || result.platform === 'twitter') && (
                                <button onClick={() => handleShare(result.platform)} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', backgroundColor: 'var(--accent-color)', color: 'white', border: 'none', padding: '0.3rem 0.8rem', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: '0.8rem' }}>
                                    <Share2 size={14} /> Share
                                </button>
                            )}
                        </div>
                    </div>

                    <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '1rem', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', lineHeight: '1.6', whiteSpace: 'pre-wrap', maxHeight: '400px', overflowY: 'auto', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                        {result.data}
                    </div>

                    <button onClick={() => setResult(null)} style={{ marginTop: '1rem', width: '100%', padding: '0.6rem', background: 'none', border: '1px solid var(--accent-color)', color: 'var(--accent-color)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: '0.85rem' }}>
                        Create Another
                    </button>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                    {/* Social Hub */}
                    <section>
                        <h4 style={{ fontSize: '0.9rem', marginBottom: '0.75rem', color: 'var(--text-secondary)' }}>Social Content Creator</h4>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                            <PublishAction icon={<Linkedin size={18} color="#0077b5" />} label="LinkedIn" onClick={() => handleGenerate('linkedin', false)} />
                            <PublishAction icon={<Twitter size={18} color="#1DA1F2" />} label="Twitter/X" onClick={() => handleGenerate('twitter', false)} />
                            <PublishAction icon={<ExternalLink size={18} color="#e67e22" />} label="Blog Post" onClick={() => handleGenerate('blog', false)} />
                            <PublishAction icon={<Sparkles size={18} color="var(--accent-color)" />} label="AI Post (Pro)" onClick={() => handleGenerate('linkedin', true)} />
                        </div>
                    </section>

                    {/* Web Hub */}
                    <section>
                        <h4 style={{ fontSize: '0.9rem', marginBottom: '0.75rem', color: 'var(--text-secondary)' }}>Standard Transformations</h4>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                            <button onClick={() => handleGenerate('website', false)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.75rem', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontSize: '0.8rem', color: 'var(--text-primary)' }}>
                                <Globe size={16} /> Web Layout
                            </button>
                            <button onClick={() => handleGenerate('website', true)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.75rem', backgroundColor: 'rgba(52, 152, 219, 0.1)', border: '1px solid var(--accent-color)', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontSize: '0.8rem', color: 'var(--accent-color)', fontWeight: '600' }}>
                                <Sparkles size={16} /> AI Website
                            </button>
                        </div>
                    </section>

                    {/* Pro Tools */}
                    <section>
                        <div style={{ padding: '1rem', backgroundColor: 'var(--bg-secondary)', border: '1px dashed var(--border-color)', borderRadius: 'var(--radius-md)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                <Eye size={16} color="var(--accent-color)" />
                                <span style={{ fontWeight: '600', fontSize: '0.85rem' }}>Interactive PDF Links</span>
                            </div>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0 }}>
                                Create shareable links that jump to specific pages and sections.
                            </p>
                        </div>
                    </section>
                </div>
            )}

            {isLoading && (
                <div style={{ marginTop: '1rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                    <div className="animate-spin" style={{ display: 'inline-block', marginRight: '0.5rem' }}>⌛</div>
                    Processing document...
                </div>
            )}

            {error && <div style={{ color: 'red', fontSize: '0.8rem', marginTop: '1rem' }}>{error}</div>}
        </div>
    );
};

const PublishAction = ({ icon, label, onClick }) => (
    <button
        onClick={onClick}
        style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            padding: '1rem',
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
        }}
        onMouseOver={(e) => e.currentTarget.style.borderColor = 'var(--accent-color)'}
        onMouseOut={(e) => e.currentTarget.style.borderColor = 'var(--border-color)'}
    >
        {icon}
        <span style={{ fontSize: '0.75rem', fontWeight: '500', color: 'var(--text-primary)' }}>{label}</span>
    </button>
);

export default PublishingPanel;
