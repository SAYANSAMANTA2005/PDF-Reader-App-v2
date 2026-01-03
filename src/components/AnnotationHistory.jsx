import React from 'react';
import { usePDF } from '../context/PDFContext';
import {
    History,
    RotateCcw,
    User,
    Clock,
    FileEdit,
    PlusCircle,
    Trash2,
    Database
} from 'lucide-react';

const AnnotationHistory = () => {
    const {
        annotationHistory,
        rollbackTo,
        fileName
    } = usePDF();

    return (
        <div className="annotation-history" style={{ padding: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.5rem' }}>
                <Database size={20} color="var(--accent-color)" />
                <h4 style={{ margin: 0 }}>Annotation Ledger</h4>
            </div>

            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                Git-like append-only log tracking all changes to "{fileName}".
            </p>

            <div className="log-container" style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
                position: 'relative',
                paddingLeft: '1.5rem'
            }}>
                {/* Timeline vertical bar */}
                <div style={{
                    position: 'absolute',
                    left: '5px', top: '0', bottom: '0',
                    width: '2px', backgroundColor: 'var(--border-color)'
                }} />

                {annotationHistory.length > 0 ? (
                    [...annotationHistory].reverse().map((event, idx) => (
                        <div key={event.id} className="log-entry" style={{ position: 'relative' }}>
                            {/* Dot on timeline */}
                            <div style={{
                                position: 'absolute',
                                left: '-24px', top: '4px',
                                width: '10px', height: '10px',
                                borderRadius: '50%', border: '2px solid var(--accent-color)',
                                backgroundColor: 'var(--bg-primary)',
                                zIndex: 1
                            }} />

                            <div style={{
                                backgroundColor: 'var(--bg-secondary)',
                                padding: '0.75rem',
                                borderRadius: 'var(--radius-md)',
                                border: '1px solid var(--border-color)'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem', color: 'var(--accent-color)', fontWeight: '600' }}>
                                        {event.action === 'add' ? <PlusCircle size={10} /> : <FileEdit size={10} />}
                                        {event.action.toUpperCase()} {event.type.toUpperCase()}
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.65rem', color: 'var(--text-secondary)' }}>
                                        <Clock size={10} />
                                        {new Date(event.timestamp).toLocaleTimeString()}
                                    </div>
                                </div>

                                <div style={{ fontSize: '0.8rem', marginBottom: '0.6rem' }}>
                                    {event.action === 'add' ? (
                                        <>Annotation added to <strong>Page {event.page}</strong></>
                                    ) : (
                                        <>Modified annotation on Page {event.page}</>
                                    )}
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.65rem', color: 'var(--text-secondary)' }}>
                                        <User size={10} />
                                        Author: User
                                    </div>
                                    <button
                                        onClick={() => rollbackTo(event.id)}
                                        style={{
                                            background: 'none', border: 'none', color: 'var(--accent-color)',
                                            cursor: 'pointer', fontSize: '0.7rem', fontWeight: '600',
                                            display: 'flex', alignItems: 'center', gap: '4px'
                                        }}
                                    >
                                        <RotateCcw size={12} /> Rollback Here
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                        No changes recorded yet. Start annotating to see the ledger.
                    </div>
                )}
            </div>

            <div style={{ marginTop: '2rem', padding: '1rem', backgroundColor: 'rgba(52, 152, 219, 0.05)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--accent-color)' }}>
                <h5 style={{ margin: '0 0 0.5rem 0', fontSize: '0.8rem', color: 'var(--accent-color)' }}>Version Control Tip</h5>
                <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', margin: 0 }}>
                    Each change is cryptographically hashed (concept) and appended to the local ledger.
                    Rollback restores the entire document state to that specific point in time.
                </p>
            </div>
        </div>
    );
};

export default AnnotationHistory;
