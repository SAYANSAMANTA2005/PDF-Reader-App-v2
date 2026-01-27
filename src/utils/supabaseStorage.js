import { supabase } from '../lib/supabase';

export const supabaseStorage = {
    /**
     * Helper to get folder name (Prefer Email, fallback to ID)
     */
    getStorageFolder(userId, userEmail) {
        // Remove special characters from email to make it a safe folder name
        const folder = userEmail ? userEmail.replace(/[^a-zA-Z0-9.@_-]/g, '_') : userId;
        return folder;
    },

    /**
     * Upload PDF to Supabase Storage and Save Metadata to DB
     */
    async uploadPDF(file, userId, userEmail = null) {
        const folder = this.getStorageFolder(userId, userEmail);
        console.log(`☁️ Supabase: Starting upload for ${file.name} (Folder: ${folder})`);

        if (!file || !userId) throw new Error('File and User ID are required');

        const fileName = `${folder}/${file.name}`;

        // 1. Upload to Storage
        const { data: storageData, error: storageError } = await supabase.storage
            .from('pdfs')
            .upload(fileName, file, {
                cacheControl: '3600',
                upsert: false
            });

        if (storageError) throw storageError;

        // 2. Get Public URL
        const { data: { publicUrl } } = supabase.storage
            .from('pdfs')
            .getPublicUrl(fileName);

        // 3. Save Metadata to DB (We still use userId for the DB link)
        const { data: dbData, error: dbError } = await supabase
            .from('pdfs')
            .insert({
                user_id: userId,
                file_name: file.name,
                storage_path: fileName,
                public_url: publicUrl,
                size: file.size
            })
            .select()
            .single();

        if (dbError) {
            await supabase.storage.from('pdfs').remove([fileName]);
            throw dbError;
        }

        return { storageData, dbData };
    },

    /**
     * Check if a PDF with same name and size already exists for this user
     */
    async checkDuplicate(userId, fileName, fileSize) {
        const { data, error } = await supabase
            .from('pdfs')
            .select('id, public_url, file_name')
            .eq('user_id', userId)
            .eq('file_name', fileName)
            .eq('size', fileSize)
            .maybeSingle();

        if (error) {
            console.error('Error checking duplicates:', error.message);
            return null;
        }
        return data;
    },

    /**
     * Get all PDFs for a user
     */
    async getUserPDFs(userId) {
        const { data, error } = await supabase
            .from('pdfs')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data;
    },

    /**
     * List all files directly from Storage (Syncing tool)
     */
    async listAllStorageFiles(userId, userEmail = null) {
        const folder = this.getStorageFolder(userId, userEmail);
        const { data, error } = await supabase.storage
            .from('pdfs')
            .list(folder, {
                limit: 100,
                offset: 0,
                sortBy: { column: 'created_at', order: 'desc' }
            });

        if (error) throw error;

        return data.map(file => ({
            id: file.id,
            file_name: file.name,
            size: file.metadata.size,
            created_at: file.created_at,
            storage_path: `${folder}/${file.name}`,
            public_url: supabase.storage.from('pdfs').getPublicUrl(`${folder}/${file.name}`).data.publicUrl,
            is_from_storage: true // flag to distinguish
        }));
    },

    /**
     * Delete a PDF
     */
    async deletePDF(pdfId, storagePath) {
        console.log(`🗑️ Supabase: Requesting deletion for ${storagePath}`);

        // 1. Delete from DB (Try by ID first)
        const { error: dbError } = await supabase
            .from('pdfs')
            .delete()
            .eq('id', pdfId);

        // If ID delete didn't work (might be a storage UUID), try deleting by storage_path
        if (!dbError) {
            await supabase
                .from('pdfs')
                .delete()
                .eq('storage_path', storagePath);
        }

        // 2. Delete from Storage (The most important part)
        const { error: storageError } = await supabase.storage
            .from('pdfs')
            .remove([storagePath]);

        if (storageError) {
            console.error('❌ Supabase Storage: Delete failed', storageError.message);
            throw storageError;
        }

        console.log('✅ Supabase: File successfully removed from cloud');
    }
};
