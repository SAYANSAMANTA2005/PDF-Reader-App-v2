/**
 * Comment Panel
 * Sidebar component for viewing and managing PDF comments
 */

import React from 'react';
import { usePDF } from '../context/PDFContext';
import { X, MessageSquare, Plus } from 'lucide-react';

const CommentPanel = () => {
    const { annotations, setIsCommentPanelOpen, setAnnotationMode } = usePDF();

    // Extract text annotations which we'll treat as comments for this view
    const comments = Object.values(annotations).flat().filter(a => a.type === 'text');

    return (
        <div
            style={{
                display: 'flex', flexDirection: 'column', height: '100%',
                background: 'var(--bg-primary)', borderLeft: '1px solid var(--border-color)'
            }}
        >
            <div style={{ padding: '16px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: '16px' }}>Comments</h3>
                <X size={18} cursor="pointer" onClick={() => setIsCommentPanelOpen(false)} />
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
                {comments.length === 0 ? (
                    <div style={{ textAlign: 'center', color: 'var(--text-secondary)', marginTop: '40px' }}>
                        <MessageSquare size={48} opacity={0.2} style={{ marginBottom: '10px' }} />
                        <p>No comments yet.</p>
                        <button
                            onClick={() => setAnnotationMode('text')}
                            style={{ padding: '8px 16px', background: 'var(--accent-color)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', marginTop: '10px' }}
                        >
                            Add Your First Comment
                        </button>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        {comments.map((comment, idx) => (
                            <div key={idx} style={{ padding: '12px', background: 'var(--bg-secondary)', borderRadius: '8px', position: 'relative' }}>
                                <div style={{ fontWeight: 600, fontSize: '12px', marginBottom: '5px', color: 'var(--accent-color)' }}>Page {comment.pageNum || '?'}</div>
                                <div style={{ fontSize: '14px' }}>{comment.text}</div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default CommentPanel;
