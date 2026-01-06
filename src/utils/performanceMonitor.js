// src/utils/performanceMonitor.js
// Tracks PDF rendering performance and detects issues
// Helps identify memory leaks and bottlenecks

export class PerformanceMonitor {
    constructor(options = {}) {
        this.enabled = options.enabled !== false;
        this.sampleInterval = options.sampleInterval || 1000; // ms
        this.sampleHistory = options.sampleHistory || 300; // Keep 5 minutes of data
        
        this.samples = [];
        this.markers = new Map(); // Named performance markers
        this.memoryWarnings = [];
        this.renderWarnings = [];
        
        this.thresholds = {
            memoryGrowthRate: options.memoryGrowthRate || 1024 * 1024, // 1MB per sample
            slowRenderTime: options.slowRenderTime || 500, // ms
            memoryMax: options.memoryMax || 200 * 1024 * 1024, // 200MB
        };
        
        this.startMonitoring();
    }

    /**
     * Start periodic monitoring
     */
    startMonitoring() {
        this.monitoringInterval = setInterval(() => {
            if (!this.enabled) return;

            const sample = this.takeSample();
            this.samples.push(sample);

            // Keep history manageable
            if (this.samples.length > this.sampleHistory) {
                this.samples.shift();
            }

            // Check for anomalies
            this.checkMemoryHealth(sample);
            this.checkRenderHealth(sample);
        }, this.sampleInterval);
    }

    /**
     * Stop monitoring
     */
    stopMonitoring() {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
        }
    }

    /**
     * Take performance snapshot
     */
    takeSample() {
        const memory = performance.memory || {};
        const now = performance.now();

        return {
            timestamp: now,
            memory: {
                used: memory.usedJSHeapSize || 0,
                limit: memory.jsHeapSizeLimit || 0,
                percentage: memory.jsHeapSizeLimit 
                    ? (memory.usedJSHeapSize / memory.jsHeapSizeLimit * 100).toFixed(1) 
                    : 0
            },
            cpu: this.estimateCPUUsage(),
            fps: this.calculateFPS(),
            renderTime: this.getAverageRenderTime()
        };
    }

    /**
     * Mark named time points
     */
    mark(name) {
        this.markers.set(name, performance.now());
    }

    /**
     * Measure time between marks
     */
    measure(name, startMark, endMark) {
        const start = this.markers.get(startMark) || 0;
        const end = endMark ? (this.markers.get(endMark) || performance.now()) : performance.now();
        const duration = end - start;

        return {
            name,
            duration,
            start: startMark,
            end: endMark || 'now'
        };
    }

    /**
     * Check memory health
     */
    checkMemoryHealth(sample) {
        if (this.samples.length < 2) return;

        const prevSample = this.samples[this.samples.length - 2];
        const memoryGrowth = sample.memory.used - prevSample.memory.used;

        // Check memory growth rate
        if (memoryGrowth > this.thresholds.memoryGrowthRate) {
            this.memoryWarnings.push({
                type: 'RAPID_GROWTH',
                growth: (memoryGrowth / 1024 / 1024).toFixed(2) + 'MB',
                current: this.formatBytes(sample.memory.used),
                timestamp: sample.timestamp
            });
        }

        // Check absolute limit
        if (sample.memory.used > this.thresholds.memoryMax) {
            this.memoryWarnings.push({
                type: 'MEMORY_LIMIT_EXCEEDED',
                current: this.formatBytes(sample.memory.used),
                limit: this.formatBytes(this.thresholds.memoryMax),
                timestamp: sample.timestamp
            });
        }

        // Keep recent warnings
        if (this.memoryWarnings.length > 100) {
            this.memoryWarnings = this.memoryWarnings.slice(-50);
        }
    }

    /**
     * Check render health
     */
    checkRenderHealth(sample) {
        if (sample.renderTime > this.thresholds.slowRenderTime) {
            this.renderWarnings.push({
                type: 'SLOW_RENDER',
                time: sample.renderTime.toFixed(2) + 'ms',
                threshold: this.thresholds.slowRenderTime + 'ms',
                timestamp: sample.timestamp
            });
        }

        // Keep recent warnings
        if (this.renderWarnings.length > 100) {
            this.renderWarnings = this.renderWarnings.slice(-50);
        }
    }

    /**
     * Estimate CPU usage based on frame drops
     * Very rough approximation
     */
    estimateCPUUsage() {
        if (!window.requestAnimationFrame) return 0;

        let frames = 0;
        let lastTime = performance.now();

        return Math.min(100, (1000 / Math.max(16.67, performance.now() - lastTime)) * 16.67);
    }

    /**
     * Calculate FPS based on frame timing
     */
    calculateFPS() {
        const now = performance.now();
        
        if (!this.lastFrameTime) {
            this.lastFrameTime = now;
            this.frameCount = 0;
            return 60;
        }

        const delta = now - this.lastFrameTime;
        
        if (delta >= 1000) {
            const fps = (this.frameCount / (delta / 1000)).toFixed(1);
            this.frameCount = 0;
            this.lastFrameTime = now;
            return fps;
        }

        this.frameCount++;
        return this.lastFPS || 60;
    }

    /**
     * Get average render time from samples
     */
    getAverageRenderTime() {
        if (this.samples.length === 0) return 0;

        const sum = this.samples.reduce((acc, s) => acc + (s.renderTime || 0), 0);
        return (sum / this.samples.length).toFixed(2);
    }

    /**
     * Detect potential memory leaks
     * Returns analysis of memory trend
     */
    detectMemoryLeaks() {
        if (this.samples.length < 10) {
            return { status: 'NOT_ENOUGH_DATA', samples: this.samples.length };
        }

        // Calculate trend: fit line to memory over time
        const trend = this.linearRegression(
            this.samples.map((s, i) => i),
            this.samples.map(s => s.memory.used)
        );

        const slope = trend.slope;
        const avgMemory = this.samples.reduce((sum, s) => sum + s.memory.used, 0) / this.samples.length;

        // Positive slope = memory increasing
        const growthRate = (slope / avgMemory * 100).toFixed(2);

        if (slope > this.thresholds.memoryGrowthRate * 5) {
            return {
                status: 'PROBABLE_LEAK',
                growthRate: growthRate + '%',
                slope: this.formatBytes(slope) + '/sample',
                warning: 'Memory is consistently growing. Possible leak detected.'
            };
        } else if (slope > this.thresholds.memoryGrowthRate) {
            return {
                status: 'SUSPICIOUS',
                growthRate: growthRate + '%',
                slope: this.formatBytes(slope) + '/sample',
                warning: 'Memory growth detected. Monitor closely.'
            };
        }

        return {
            status: 'HEALTHY',
            growthRate: growthRate + '%',
            slope: this.formatBytes(slope) + '/sample'
        };
    }

    /**
     * Linear regression for trend analysis
     */
    linearRegression(xValues, yValues) {
        const n = xValues.length;
        const sumX = xValues.reduce((a, b) => a + b, 0);
        const sumY = yValues.reduce((a, b) => a + b, 0);
        const sumXX = xValues.reduce((a, b) => a + b * b, 0);
        const sumXY = xValues.reduce((sum, x, i) => sum + x * yValues[i], 0);

        const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
        const intercept = (sumY - slope * sumX) / n;

        return { slope, intercept };
    }

    /**
     * Get performance report
     */
    getReport() {
        if (this.samples.length === 0) {
            return { status: 'NO_DATA' };
        }

        const latest = this.samples[this.samples.length - 1];
        const earliest = this.samples[0];
        const maxMemory = Math.max(...this.samples.map(s => s.memory.used));
        const avgFPS = this.samples.reduce((sum, s) => sum + parseFloat(s.fps || 60), 0) / this.samples.length;

        return {
            timestamp: new Date(latest.timestamp).toISOString(),
            memory: {
                current: this.formatBytes(latest.memory.used),
                peak: this.formatBytes(maxMemory),
                change: this.formatBytes(latest.memory.used - earliest.memory.used),
                percentage: latest.memory.percentage + '%'
            },
            performance: {
                avgFPS: avgFPS.toFixed(1),
                avgRenderTime: this.getAverageRenderTime() + 'ms'
            },
            health: this.detectMemoryLeaks(),
            warnings: {
                memory: this.memoryWarnings.length,
                render: this.renderWarnings.length,
                total: this.memoryWarnings.length + this.renderWarnings.length
            },
            uptime: this.formatTime(latest.timestamp)
        };
    }

    /**
     * Get detailed metrics for debugging
     */
    getMetrics() {
        return {
            samples: this.samples.length,
            markers: Array.from(this.markers.keys()),
            memoryWarnings: this.memoryWarnings.slice(-10),
            renderWarnings: this.renderWarnings.slice(-10),
            report: this.getReport()
        };
    }

    /**
     * Format bytes to human readable
     */
    formatBytes(bytes) {
        const absBytes = Math.abs(bytes);
        if (absBytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(absBytes) / Math.log(k));
        const value = parseFloat((bytes / Math.pow(k, i)).toFixed(2));
        return (bytes < 0 ? '-' : '') + value + ' ' + sizes[i];
    }

    /**
     * Format time duration
     */
    formatTime(ms) {
        const seconds = ms / 1000;
        if (seconds < 60) return seconds.toFixed(1) + 's';
        const minutes = seconds / 60;
        if (minutes < 60) return minutes.toFixed(1) + 'm';
        const hours = minutes / 60;
        return hours.toFixed(1) + 'h';
    }

    /**
     * Visualization for debugging
     */
    visualize() {
        const report = this.getReport();
        const lines = [
            `\n${'='.repeat(60)}`,
            `Performance Report`,
            `${'='.repeat(60)}`,
            `Memory:`,
            `  Current: ${report.memory.current}`,
            `  Peak: ${report.memory.peak}`,
            `  Change: ${report.memory.change}`,
            `  Usage: ${report.memory.percentage}`,
            ``,
            `Performance:`,
            `  Avg FPS: ${report.performance.avgFPS}`,
            `  Avg Render Time: ${report.performance.avgRenderTime}`,
            ``,
            `Health: ${report.health.status}`,
            `  Memory Growth: ${report.health.growthRate}`,
            ``,
            `Warnings: ${report.warnings.total}`,
            `  Memory: ${report.warnings.memory}`,
            `  Render: ${report.warnings.render}`,
            `${'='.repeat(60)}\n`
        ];

        return lines.join('\n');
    }

    /**
     * Cleanup
     */
    destroy() {
        this.stopMonitoring();
        this.samples = [];
        this.markers.clear();
        this.memoryWarnings = [];
        this.renderWarnings = [];
    }
}
