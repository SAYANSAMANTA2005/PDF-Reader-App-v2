import React from 'react';
import { motion } from 'framer-motion';

/**
 * Loading skeleton component for better perceived performance
 */
export const SkeletonBox = ({ width = '100%', height = '1rem', className = '', animate = true }) => (
    <div
        className={`bg-bg-secondary rounded-lg ${className}`}
        style={{ width, height }}
    >
        {animate && (
            <motion.div
                className="h-full w-full bg-gradient-to-r from-transparent via-white/10 to-transparent"
                animate={{ x: ['-100%', '100%'] }}
                transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
            />
        )}
    </div>
);

/**
 * Quiz question skeleton
 */
export const QuizQuestionSkeleton = () => (
    <div className="space-y-6 p-6">
        <div className="flex justify-between items-center">
            <SkeletonBox width="120px" height="1rem" />
            <SkeletonBox width="80px" height="1rem" />
        </div>

        <div className="glass-card p-6">
            <SkeletonBox width="90%" height="1.5rem" className="mb-3" />
            <SkeletonBox width="70%" height="1.5rem" />
        </div>

        <div className="grid gap-3">
            {[1, 2, 3, 4].map(i => (
                <SkeletonBox key={i} width="100%" height="3rem" />
            ))}
        </div>
    </div>
);

/**
 * OCR result skeleton
 */
export const OCRResultSkeleton = () => (
    <div className="space-y-4 p-6">
        <div className="flex justify-between items-center">
            <div className="space-y-2">
                <SkeletonBox width="150px" height="1rem" />
                <SkeletonBox width="200px" height="0.75rem" />
            </div>
            <SkeletonBox width="80px" height="2rem" />
        </div>

        <div className="grid grid-cols-3 gap-2">
            {[1, 2, 3].map(i => (
                <SkeletonBox key={i} width="100%" height="2rem" />
            ))}
        </div>

        <SkeletonBox width="100%" height="200px" />
    </div>
);

/**
 * Export format skeleton
 */
export const ExportFormatSkeleton = () => (
    <div className="grid gap-3 p-4">
        {[1, 2, 3].map(i => (
            <div key={i} className="glass-card p-4 flex items-center gap-4">
                <SkeletonBox width="40px" height="40px" />
                <div className="flex-1 space-y-2">
                    <SkeletonBox width="120px" height="1rem" />
                    <SkeletonBox width="180px" height="0.75rem" />
                </div>
            </div>
        ))}
    </div>
);

/**
 * Generic list skeleton
 */
export const ListSkeleton = ({ count = 3, height = '4rem' }) => (
    <div className="space-y-3">
        {Array.from({ length: count }).map((_, i) => (
            <SkeletonBox key={i} width="100%" height={height} />
        ))}
    </div>
);

/**
 * Card skeleton
 */
export const CardSkeleton = () => (
    <div className="glass-card p-6 space-y-4">
        <div className="flex items-center gap-3">
            <SkeletonBox width="48px" height="48px" />
            <div className="flex-1 space-y-2">
                <SkeletonBox width="60%" height="1.25rem" />
                <SkeletonBox width="40%" height="0.875rem" />
            </div>
        </div>
        <SkeletonBox width="100%" height="2px" />
        <div className="space-y-2">
            <SkeletonBox width="100%" height="1rem" />
            <SkeletonBox width="85%" height="1rem" />
            <SkeletonBox width="95%" height="1rem" />
        </div>
    </div>
);

export default {
    SkeletonBox,
    QuizQuestionSkeleton,
    OCRResultSkeleton,
    ExportFormatSkeleton,
    ListSkeleton,
    CardSkeleton
};
