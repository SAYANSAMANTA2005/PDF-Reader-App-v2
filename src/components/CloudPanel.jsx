import React from 'react';
import { usePDF } from '../context/PDFContext';
import { Cloud, FileText, Trash2, Download, ExternalLink, RefreshCw, UploadCloud, Plus } from 'lucide-react';
import { supabaseStorage } from '../utils/supabaseStorage';

const CloudPanel = () => {
    const { user, userPdfs, setUserPdfs, loadPDF, handleSignIn, isCloudSyncing } = usePDF();
    const [isRefreshing, setIsRefreshing] = React.useState(false);
    const [isUploading, setIsUploading] = React.useState(false);
    const [authError, setAuthError] = React.useState(null);
    const fileInputRef = React.useRef(null);

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
            const storageFiles = await supabaseStorage.listAllStorageFiles(user.id);

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
            const { dbData } = await supabaseStorage.uploadPDF(file, user.id);
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

    if (!user) {
        return (
            <div className="p-8 text-center flex flex-col items-center gap-4">
                <Cloud size={48} className="text-secondary opacity-20" />
                <h3 className="font-bold text-lg">Cloud Storage</h3>
                <p className="text-sm text-secondary">Sign in to sync your PDFs across devices.</p>

                {authError && (
                    <div className="bg-red-50 border border-red-200 text-red-600 p-2 rounded-lg text-[10px] w-full mb-2">
                        <strong>Error:</strong> {authError}
                        <p className="mt-1 opacity-70">Check if Supabase Anon Key is set in .env and Anonymous Auth is enabled in Supabase Dashboard.</p>
                    </div>
                )}

                <button
                    onClick={async () => {
                        console.log('☁️ Cloud: Sign In button clicked');
                        setAuthError(null);
                        try {
                            await handleSignIn();
                            console.log('☁️ Cloud: Sign In successful');
                        } catch (err) {
                            console.error('☁️ Cloud: Sign In error:', err);
                            setAuthError(err.message || 'Unknown authentication error');
                        }
                    }}
                    className="bg-accent text-white px-6 py-2 rounded-xl font-bold text-sm hover:scale-105 transition-transform active:scale-95"
                >
                    Sign In Free
                </button>
            </div>
        );
    }

    return (
        <div className="cloud-panel flex flex-col h-full bg-primary">
            <div className="p-4 border-b flex justify-between items-center bg-secondary/30">
                <div className="flex items-center gap-2">
                    <Cloud size={18} className={isCloudSyncing ? 'text-accent animate-pulse' : 'text-accent'} />
                    <span className="font-bold text-sm tracking-tight text-primary">Cloud Documents</span>
                    {isCloudSyncing && (
                        <div className="flex items-center gap-1.5 ml-2">
                            <RefreshCw size={10} className="animate-spin text-accent" />
                            <span className="text-[9px] font-bold text-accent uppercase tracking-tighter">Syncing...</span>
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-1">
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
                            className="group relative bg-primary border rounded-xl p-3 hover:border-accent hover:shadow-lg transition-all cursor-pointer"
                        >
                            <div
                                className="flex items-start gap-3"
                                onClick={() => loadPDF(pdf.public_url, { customFileName: pdf.file_name })}
                            >
                                <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center text-accent shrink-0">
                                    <FileText size={20} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-xs font-bold truncate pr-6">{pdf.file_name}</h4>
                                    <p className="text-[10px] text-secondary mt-1">
                                        {(pdf.size / 1024 / 1024).toFixed(2)} MB • {new Date(pdf.created_at).toLocaleDateString()}
                                    </p>
                                </div>
                            </div>

                            <div className="absolute top-2 right-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-primary/80 backdrop-blur-sm p-1 rounded-lg">
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
                                        loadPDF(pdf.public_url, { customFileName: pdf.file_name });
                                    }}
                                >
                                    <ExternalLink size={12} />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <div className="p-4 bg-secondary/10 border-t mt-auto">
                <div className="flex justify-between items-center mb-2">
                    <span className="text-[11px] font-black text-secondary uppercase tracking-[0.1em]">Total Storage Used</span>
                    <span className="text-[11px] font-black text-accent drop-shadow-sm">
                        {(userPdfs.reduce((acc, p) => acc + (p.size || 0), 0) / 1024 / 1024).toFixed(1)} / 1024 MB
                        <span className="ml-1 opacity-60 text-[9px]">
                            ({Math.min(100, (userPdfs.reduce((acc, p) => acc + (p.size || 0), 0) / (1024 * 1024 * 1024)) * 100).toFixed(1)}%)
                        </span>
                    </span>
                </div>
                <div className="h-1.5 bg-secondary/20 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-accent"
                        style={{ width: `${Math.min(100, (userPdfs.reduce((acc, p) => acc + (p.size || 0), 0) / (1024 * 1024 * 1024)) * 100)}%` }}
                    />
                </div>
                <p className="text-[9px] text-secondary mt-2 leading-tight">
                    Maximum individual file size: 50 MB. Shared space: 1024 MB.
                </p>
            </div>
        </div>
    );
};

export default CloudPanel;
