import React, { forwardRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

/**
 * Renders Markdown content with LaTeX math support.
 * Uses Times New Roman to simulate a professional academic document.
 */
const TypedNotePreview = forwardRef(({ markdown }, ref) => {
    return (
        <div
            ref={ref}
            className="typed-note-preview"
            style={{
                fontFamily: '"Times New Roman", Times, serif',
                fontSize: '12pt',
                lineHeight: '1.6',
                color: '#000',
                backgroundColor: 'white',
                padding: '40px', // Standard print margin simulation
                minHeight: '297mm', // A4 height
                boxSizing: 'border-box'
            }}
        >
            <style>{`
                .typed-note-preview h1 { font-size: 24pt; margin-bottom: 24px; font-weight: bold; border-bottom: 2px solid #000; padding-bottom: 10px; }
                .typed-note-preview h2 { font-size: 18pt; margin-top: 24px; margin-bottom: 16px; font-weight: bold; }
                .typed-note-preview h3 { font-size: 14pt; margin-top: 18px; margin-bottom: 12px; font-weight: bold; }
                .typed-note-preview p { margin-bottom: 12px; text-align: justify; }
                .typed-note-preview ul, .typed-note-preview ol { margin-bottom: 12px; padding-left: 24px; }
                .typed-note-preview li { margin-bottom: 6px; }
                .typed-note-preview table { width: 100%; border-collapse: collapse; margin-bottom: 18px; }
                .typed-note-preview th, .typed-note-preview td { border: 1px solid #000; padding: 8px 12px; text-align: left; vertical-align: top; }
                .typed-note-preview th { background-color: #f2f2f2; font-weight: bold; }
                .typed-note-preview blockquote { border-left: 4px solid #ccc; margin: 0; padding-left: 16px; font-style: italic; color: #555; }
                .typed-note-preview code { font-family: "Courier New", Courier, monospace; background: #f4f4f4; padding: 2px 4px; border-radius: 3px; }
                .typed-note-preview pre { background: #f4f4f4; padding: 12px; border-radius: 4px; overflow-x: auto; }
                .katex-display { margin: 1em 0; overflow-x: auto; overflow-y: hidden; }
            `}</style>

            <ReactMarkdown
                remarkPlugins={[remarkMath, remarkGfm]}
                rehypePlugins={[rehypeKatex]}
                components={{
                    table: ({ node, ...props }) => <table {...props} />,
                    th: ({ node, ...props }) => <th {...props} />,
                    td: ({ node, ...props }) => <td {...props} />,
                }}
            >
                {markdown}
            </ReactMarkdown>
        </div>
    );
});

export default TypedNotePreview;
