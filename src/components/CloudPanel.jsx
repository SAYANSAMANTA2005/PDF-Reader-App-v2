import React from 'react';
import { usePDF } from '../context/PDFContext';
import { Cloud, FileText, Trash2, Download, ExternalLink, RefreshCw, UploadCloud, Plus } from 'lucide-react';
import { supabaseStorage } from '../utils/supabaseStorage';

const CloudPanel = () => {
    const {
        user, userPdfs, setUserPdfs, loadPDF,
        isCloudSyncing, hasUnsavedAnnotations, updateCloudVersion
    } = usePDF();
    const [isRefreshing, setIsRefreshing] = React.useState(false);
    const [isUploading, setIsUploading] = React.useState(false);
    const [authError, setAuthError] = React.useState(null);
    const fileInputRef = React.useRef(null);

    const handleCloudFileOpen = async (pdf) => {
        if (hasUnsavedAnnotations) {
            const choice = confirm("⚠️ Unsaved Annotations Detected!\n\nWould you like to SAVE your drawings to the Cloud (updating the previous version) before opening the new file?\n\n- OK: Save & Open\n- Cancel: Open Without Saving");

            if (choice) {
                console.log("🔄 Cloud Sync: Auto-updating cloud version...");
                await updateCloudVersion();
            }
        }
        loadPDF(pdf.public_url, { customFileName: pdf.file_name });
    };

    React.useEffect(() => {
        if (user) refreshPdfs();
    }, [user]);

    const refreshPdfs = async () => {
        if (!user) return;
        setIsRefreshing(true);
        try {
            const pdfs = await supabaseStorage.getUserPDFs(user.id);
            setUserPdfs(pdfs);
        } catch (err) {
            console.error('Refresh failed:', err);
        } finally {
            setIsRefreshing(false);
        }
    };

    const syncWithStorage = async () => {
        if (!user) return;
        setIsRefreshing(true);
        try {
            console.log('🔄 Deep Syncing with Supabase Storage...');
            const storageFiles = await supabaseStorage.listAllStorageFiles(user.id, user.email);
            // Filter out placeholder files or internal supabase system files
            const validFiles = storageFiles.filter(f => f.file_name !== '.emptyFolderPlaceholder' && f.file_name.endsWith('.pdf'));

            setUserPdfs(validFiles);
            console.log(`✅ Found ${validFiles.length} files in storage.`);
        } catch (err) {
            console.error('Storage Sync failed:', err);
            alert('Cloud Sync failed: ' + err.message);
        } finally {
            setIsRefreshing(false);
        }
    };

    const handleDelete = async (id, path) => {
        if (!confirm('🗑️ Are you sure you want to delete this PDF from your cloud storage permanently?')) return;

        try {
            console.log('🗑️ UI: Initiating delete for:', path);
            await supabaseStorage.deletePDF(id, path);

            // Remove from local state immediately for snappy feel
            setUserPdfs(prev => prev.filter(p => p.id !== id));

            console.log('✅ UI: Delete successful');
        } catch (err) {
            console.error('❌ UI: Delete error:', err);
            alert('Cloud Delete failed! \n\nTIP: Check if your Supabase Storage Policies allow "DELETE" operations for the "pdfs" bucket.');

            // Re-sync just in case
            refreshPdfs();
        }
    };

    const handleManualUpload = async (e) => {
        const file = e.target.files[0];
        if (!file || file.type !== 'application/pdf') return;

        const MAX_SIZE = 50 * 1024 * 1024; // 50MB
        if (file.size > MAX_SIZE) {
            alert(`File is too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum size is 50MB.`);
            return;
        }

        setIsUploading(true);
        try {
            // 1. Check for duplicate FIRST
            const duplicate = await supabaseStorage.checkDuplicate(user.id, file.name, file.size);
            if (duplicate) {
                alert(`"${file.name}" is already in your cloud!`);
                return;
            }

            console.log('☁️ Manual Upload Starting:', file.name);
            const { dbData } = await supabaseStorage.uploadPDF(file, user.id, user.email);
            setUserPdfs(prev => [dbData, ...prev]);
            console.log('✅ Manual Upload Success');
        } catch (err) {
            console.error('❌ Manual Upload Failed:', err);
            alert('Upload failed: ' + err.message);
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const totalSize = userPdfs.reduce((acc, p) => acc + (p.size || 0), 0) / 1024 / 1024;

    return (
        <div className="flex flex-col h-full bg-secondary/5 backdrop-blur-md">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
                <div className="flex items-center gap-2">
                    <Cloud size={18} className="text-accent" />
                    <h2 className="text-sm font-black uppercase tracking-widest text-primary">Cloud Documents</h2>
                </div>
                <div className="flex items-center gap-2">
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleManualUpload}
                        accept="application/pdf"
                        hidden
                    />
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        className="p-1.5 bg-accent/10 text-accent hover:bg-accent hover:text-white rounded-lg transition-all"
                        title="Upload PDF to Cloud"
                    >
                        {isUploading ? <RefreshCw size={14} className="animate-spin" /> : <Plus size={14} />}
                    </button>
                    <button
                        onClick={refreshPdfs}
                        disabled={isRefreshing}
                        className="p-1.5 hover:bg-secondary rounded-lg transition-colors"
                    >
                        <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {/* Storage Stats Bar */}
            <div className="px-4 py-3 bg-secondary/5 border-b border-border">
                <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-text-secondary">
                        {userPdfs.length} {userPdfs.length === 1 ? 'Document' : 'Documents'}
                    </span>
                    <span className="font-bold text-accent">
                        {totalSize.toFixed(1)} MB / 1024 MB
                    </span>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {userPdfs.length === 0 ? (
                    <div className="py-12 text-center space-y-4 px-4">
                        <div className="w-16 h-16 bg-secondary/10 rounded-full flex items-center justify-center mx-auto text-secondary/30">
                            <FileText size={32} />
                        </div>
                        <div className="space-y-2">
                            <p className="text-sm font-bold">Your cloud is empty</p>
                            <p className="text-[11px] text-secondary leading-relaxed">
                                Uploaded PDFs are automatically synced here.
                            </p>
                            <button
                                onClick={syncWithStorage}
                                disabled={isRefreshing}
                                className="flex items-center gap-2 mx-auto text-[10px] bg-accent/10 text-accent px-4 py-1.5 rounded-full font-bold hover:bg-accent hover:text-white transition-all mt-2"
                            >
                                <RefreshCw size={10} className={isRefreshing ? 'animate-spin' : ''} />
                                Sync Storage
                            </button>
                        </div>
                        <div className="pt-4 border-t border-dashed space-y-3">
                            <p className="text-[10px] text-accent font-bold uppercase tracking-widest">Troubleshooting Tips</p>
                            <ul className="text-left text-[10px] text-secondary space-y-2 list-disc pl-4">
                                <li>Run the <b>SQL Schema</b> in Supabase SQL Editor</li>
                                <li>Create a <b>Public Bucket</b> named "pdfs"</li>
                                <li>Enable <b>Storage Policies</b> for the "pdfs" bucket</li>
                            </ul>
                        </div>
                    </div>
                ) : (
                    userPdfs.map(pdf => (
                        <div
                            key={pdf.id}
                            className="group relative bg-primary border border-border rounded-lg p-2.5 hover:border-accent hover:shadow-md transition-all cursor-pointer"
                        >
                            <div
                                className="flex items-center gap-2.5"
                                onClick={() => handleCloudFileOpen(pdf)}
                            >
                                <div className="w-8 h-8 bg-accent/10 rounded-md flex items-center justify-center text-accent shrink-0">
                                    <FileText size={16} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-xs font-bold truncate pr-6">{pdf.file_name}</h4>
                                    <p className="text-[10px] text-secondary mt-0.5">
                                        {(pdf.size / 1024 / 1024).toFixed(2)} MB • {new Date(pdf.created_at).toLocaleDateString()}
                                    </p>
                                </div>
                            </div>

                            <div className="absolute top-1.5 right-1.5 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-primary/90 backdrop-blur-sm p-0.5 rounded-md shadow-sm">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleDelete(pdf.id, pdf.storage_path);
                                    }}
                                    className="p-1 text-red-500 hover:bg-red-50 rounded"
                                    title="Delete from cloud"
                                >
                                    <Trash2 size={12} />
                                </button>
                                <button
                                    className="p-1 text-accent hover:bg-accent/10 rounded"
                                    title="Open in Reader"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleCloudFileOpen(pdf);
                                    }}
                                >
                                    <ExternalLink size={12} />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <div className="p-4 bg-secondary/10 border-t border-border mt-auto">
                <div className="flex justify-between items-center mb-2">
                    <span className="text-[11px] font-black text-secondary uppercase tracking-[0.1em]">Total Storage Used</span>
                    <span className="text-[11px] font-black text-accent">
                        {totalSize.toFixed(1)} / 1024 MB
                    </span>
                </div>
                <div className="w-full bg-secondary/20 h-2 rounded-full overflow-hidden shadow-inner">
                    <div
                        className="h-full bg-gradient-to-r from-accent to-blue-400 shadow-[0_0_10px_rgba(var(--accent-rgb),0.5)] transition-all duration-500"
                        style={{ width: `${Math.min(100, (totalSize / 1024) * 100)}%` }}
                    />
                </div>
                <p className="text-[9px] text-secondary/50 mt-2 font-bold uppercase tracking-tighter">
                    Maximum individual file size: 50 MB. Shared space: 1024 MB.
                </p>
            </div>
            {isCloudSyncing && (
                <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] z-50 flex flex-col items-center justify-center gap-3 animate-in fade-in duration-300">
                    <div className="w-12 h-12 border-4 border-accent/20 border-t-accent rounded-full animate-spin shadow-lg" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-accent animate-pulse">Syncing to Cloud...</p>
                </div>
            )}
        </div>
    );
};

export default CloudPanel;
