/**
 * Enhanced Annotation Wrapper for PDF Pages
 * Uses the existing proven SVG annotation system
 */

import React from 'react';
import AnnotationLayer from './AnnotationLayer';

const EnhancedAnnotationLayer = ({ width, height, scale, pageNum }) => {
    // Simply render the existing annotation layer which already works
    return (
        <AnnotationLayer width={width} height={height} scale={scale} pageNum={pageNum} />
    );
};

export default EnhancedAnnotationLayer;
