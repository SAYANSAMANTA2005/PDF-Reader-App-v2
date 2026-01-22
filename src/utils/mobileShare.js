import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';

/**
 * Mobile-aware share utility
 * Uses Capacitor Share API on mobile, falls back to Web Share API on web
 */

export const isMobile = () => {
    return Capacitor.isNativePlatform();
};

/**
 * Share a PDF file
 * @param {Blob} pdfBlob - PDF blob to share
 * @param {string} filename - Filename
 * @param {string} title - Share dialog title
 */
export const sharePDF = async (pdfBlob, filename = 'document.pdf', title = 'Share PDF') => {
    if (!isMobile()) {
        // Web fallback - use Web Share API if available
        if (navigator.share) {
            try {
                const file = new File([pdfBlob], filename, { type: 'application/pdf' });
                await navigator.share({
                    title: title,
                    files: [file],
                });
            } catch (error) {
                console.log('Share cancelled or failed:', error);
            }
        } else {
            // Fallback to download
            const url = URL.createObjectURL(pdfBlob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.click();
            URL.revokeObjectURL(url);
        }
        return;
    }

    // Mobile - use Capacitor Share
    try {
        // Convert blob to base64
        const reader = new FileReader();
        const base64Data = await new Promise((resolve, reject) => {
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(pdfBlob);
        });

        await Share.share({
            title: title,
            text: `Sharing ${filename}`,
            url: base64Data,
            dialogTitle: title,
        });
    } catch (error) {
        console.error('Error sharing PDF:', error);
        throw error;
    }
};

/**
 * Share text content (notes, annotations, etc.)
 * @param {string} text - Text to share
 * @param {string} title - Share dialog title
 */
export const shareText = async (text, title = 'Share Notes') => {
    if (!isMobile()) {
        // Web fallback
        if (navigator.share) {
            try {
                await navigator.share({
                    title: title,
                    text: text,
                });
            } catch (error) {
                console.log('Share cancelled or failed:', error);
            }
        } else {
            // Copy to clipboard as fallback
            await navigator.clipboard.writeText(text);
            alert('Copied to clipboard!');
        }
        return;
    }

    // Mobile - use Capacitor Share
    try {
        await Share.share({
            title: title,
            text: text,
            dialogTitle: title,
        });
    } catch (error) {
        console.error('Error sharing text:', error);
        throw error;
    }
};

/**
 * Share a URL
 * @param {string} url - URL to share
 * @param {string} title - Share dialog title
 */
export const shareURL = async (url, title = 'Share Link') => {
    try {
        await Share.share({
            title: title,
            url: url,
            dialogTitle: title,
        });
    } catch (error) {
        console.error('Error sharing URL:', error);
        throw error;
    }
};
