// src/utils/pdfSafetyConfig.js
// PDF Safety Guard Configuration
// Defines thresholds for safe PDF loading

export const PDF_SAFETY_CONFIG = {
    // Maximum file size in MB (before download)
    MAX_FILE_SIZE_MB: 50,
    
    // Maximum page count
    MAX_PAGE_COUNT: 300,
    
    // Maximum estimated memory usage (in MB)
    MAX_MEMORY_ESTIMATE_MB: 200,
    
    // Maximum estimated CPU impact (1-100 scale)
    MAX_CPU_IMPACT: 75,
    
    // Analysis timeout (ms)
    ANALYSIS_TIMEOUT_MS: 10000,
    
    // File size check timeout (ms)
    HEAD_REQUEST_TIMEOUT_MS: 5000,
    
    // Safe mode settings
    SAFE_MODE: {
        // Max pages to render in safe mode
        MAX_PAGES: 50,
        
        // Reduced quality setting
        SCALE: 0.7,
        
        // Skip text layer extraction
        SKIP_TEXT_LAYER: true,
        
        // Simplified annotations
        SIMPLIFIED_RENDERING: true,
    },
    
    // Memory estimation formula
    // Rough calculation: baseSize + (pageCount * pageMemory) + (width * height * scale * 4)
    ESTIMATION: {
        BASE_MEMORY_MB: 15, // PDF.js overhead
        PER_PAGE_MEMORY_MB: 2, // Average per page
        RESOLUTION_FACTOR: 0.5, // Pixel data multiplier
    },
    
    // CPU impact estimation
    CPU_ESTIMATION: {
        BASE_CPU: 10, // Base overhead
        PER_PAGE_CPU: 0.1, // CPU per page (0.1 = 0.1% increase per page)
        TEXT_EXTRACTION_CPU: 5, // Text layer extraction
        ENCRYPTION_CPU: 15, // Encrypted PDFs cost more
    },
};

/**
 * Get current configuration
 * Can be overridden by users
 */
export const getSafetyConfig = (overrides = {}) => {
    return {
        ...PDF_SAFETY_CONFIG,
        ...overrides,
    };
};

/**
 * Determine if file size is safe
 */
export const isSizeWithinLimits = (fileSizeBytes, config = PDF_SAFETY_CONFIG) => {
    const fileSizeMB = fileSizeBytes / (1024 * 1024);
    return fileSizeMB <= config.MAX_FILE_SIZE_MB;
};

/**
 * Determine if page count is safe
 */
export const isPageCountWithinLimits = (pageCount, config = PDF_SAFETY_CONFIG) => {
    return pageCount <= config.MAX_PAGE_COUNT;
};

/**
 * Estimate memory usage (in MB)
 * Rough estimate based on file size and page count
 */
export const estimateMemoryUsage = (fileSizeBytes, pageCount, config = PDF_SAFETY_CONFIG) => {
    const fileSizeMB = fileSizeBytes / (1024 * 1024);
    const baseMemory = config.ESTIMATION.BASE_MEMORY_MB;
    const pageMemory = pageCount * config.ESTIMATION.PER_PAGE_MEMORY_MB;
    const resolutionMemory = fileSizeMB * config.ESTIMATION.RESOLUTION_FACTOR;
    
    return baseMemory + pageMemory + resolutionMemory;
};

/**
 * Estimate CPU impact (0-100 scale)
 */
export const estimateCPUImpact = (pageCount, isEncrypted = false, config = PDF_SAFETY_CONFIG) => {
    const baseCPU = config.CPU_ESTIMATION.BASE_CPU;
    const pageCPU = Math.min(pageCount * config.CPU_ESTIMATION.PER_PAGE_CPU, 60);
    const encryptionCPU = isEncrypted ? config.CPU_ESTIMATION.ENCRYPTION_CPU : 0;
    
    return Math.min(baseCPU + pageCPU + encryptionCPU, 100);
};

/**
 * Get user-friendly file size string
 */
export const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
};

/**
 * Create risk assessment
 */
export const assessPDFRisk = (analysis, config = PDF_SAFETY_CONFIG) => {
    const risks = [];
    const warnings = [];
    
    // Check file size
    if (analysis.fileSizeBytes > config.MAX_FILE_SIZE_MB * 1024 * 1024) {
        risks.push(`File size (${formatFileSize(analysis.fileSizeBytes)}) exceeds limit (${config.MAX_FILE_SIZE_MB}MB)`);
    }
    
    // Check page count
    if (analysis.pageCount > config.MAX_PAGE_COUNT) {
        risks.push(`Page count (${analysis.pageCount}) exceeds limit (${config.MAX_PAGE_COUNT} pages)`);
    }
    
    // Check estimated memory
    const estimatedMemory = estimateMemoryUsage(analysis.fileSizeBytes, analysis.pageCount, config);
    if (estimatedMemory > config.MAX_MEMORY_ESTIMATE_MB) {
        risks.push(`Estimated memory usage (${Math.round(estimatedMemory)}MB) exceeds limit (${config.MAX_MEMORY_ESTIMATE_MB}MB)`);
    }
    
    // Check estimated CPU
    const estimatedCPU = estimateCPUImpact(analysis.pageCount, analysis.isEncrypted, config);
    if (estimatedCPU > config.MAX_CPU_IMPACT) {
        warnings.push(`High CPU impact estimated (${estimatedCPU}%)`);
    }
    
    // Check encryption
    if (analysis.isEncrypted) {
        warnings.push('This PDF is encrypted - decryption will add processing overhead');
    }
    
    // Check high resolution
    if (analysis.hasHighResolution) {
        warnings.push('This PDF contains high-resolution images - rendering may be slow');
    }
    
    return {
        isSafe: risks.length === 0,
        risks,
        warnings,
        estimatedMemory: Math.round(estimatedMemory),
        estimatedCPU: Math.round(estimatedCPU),
    };
};

/**
 * Recommendation based on risk assessment
 */
export const getRecommendation = (riskAssessment) => {
    if (riskAssessment.isSafe) {
        return {
            action: 'ALLOW',
            message: '✅ PDF is safe to load',
        };
    }
    
    if (riskAssessment.risks.length > 0) {
        return {
            action: 'BLOCK',
            message: '⚠️ PDF exceeds safe limits',
            details: riskAssessment.risks.join('\n'),
        };
    }
    
    if (riskAssessment.warnings.length > 0) {
        return {
            action: 'WARN',
            message: '⚠️ PDF may experience performance issues',
            details: riskAssessment.warnings.join('\n'),
        };
    }
    
    return {
        action: 'ALLOW',
        message: '✅ PDF is safe to load',
    };
};

/**
 * Export for testing
 */
export const TEST_CONFIG = {
    SMALL: {
        MAX_FILE_SIZE_MB: 10,
        MAX_PAGE_COUNT: 50,
    },
    LARGE: {
        MAX_FILE_SIZE_MB: 200,
        MAX_PAGE_COUNT: 1000,
    },
    UNLIMITED: {
        MAX_FILE_SIZE_MB: Infinity,
        MAX_PAGE_COUNT: Infinity,
        MAX_MEMORY_ESTIMATE_MB: Infinity,
        MAX_CPU_IMPACT: 100,
    },
};
