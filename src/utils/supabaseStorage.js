import { supabase } from '../lib/supabase';

export const supabaseStorage = {
    /**
     * Upload PDF to Supabase Storage and Save Metadata to DB
     */
    async uploadPDF(file, userId) {
        console.log(`☁️ Supabase: Starting upload for ${file.name} (User: ${userId})`);
        if (!file || !userId) throw new Error('File and User ID are required');

        const fileName = `${userId}/${file.name}`;

        // 1. Upload to Storage
        const { data: storageData, error: storageError } = await supabase.storage
            .from('pdfs')
            .upload(fileName, file, {
                cacheControl: '3600',
                upsert: false
            });

        if (storageError) throw storageError;

        // 2. Get Public URL (optional, if you want to store it)
        const { data: { publicUrl } } = supabase.storage
            .from('pdfs')
            .getPublicUrl(fileName);

        // 3. Save Metadata to DB
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
            // Cleanup storage if DB insert fails
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
     * List all files directly from Storage (useful if DB is out of sync)
     */
    async listAllStorageFiles(userId) {
        const { data, error } = await supabase.storage
            .from('pdfs')
            .list(userId, {
                limit: 100,
                offset: 0,
                sortBy: { column: 'created_at', order: 'desc' }
            });

        if (error) throw error;

        // Convert storage objects to a format similar to our DB records
        return data.map(file => ({
            id: file.id,
            file_name: file.name,
            size: file.metadata.size,
            created_at: file.created_at,
            storage_path: `${userId}/${file.name}`,
            public_url: supabase.storage.from('pdfs').getPublicUrl(`${userId}/${file.name}`).data.publicUrl,
            is_from_storage: true // flag to distinguish
        }));
    },

    /**
     * Delete a PDF
     */
    async deletePDF(pdfId, storagePath) {
        // 1. Delete from DB
        const { error: dbError } = await supabase
            .from('pdfs')
            .delete()
            .eq('id', pdfId);

        if (dbError) throw dbError;

        // 2. Delete from Storage
        const { error: storageError } = await supabase.storage
            .from('pdfs')
            .remove([storagePath]);

        if (storageError) console.error('Error deleting from storage:', storageError.message);
    }
};
