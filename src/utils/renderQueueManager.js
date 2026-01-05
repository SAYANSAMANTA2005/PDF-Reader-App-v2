// src/utils/renderQueueManager.js
// Manages render task prioritization and execution
// Ensures critical pages (visible) render first, low-priority pages later
// Cancels pending renders if user scrolls away

export class RenderQueueManager {
    constructor(options = {}) {
        this.maxConcurrent = options.maxConcurrent || 2;
        this.queue = []; // { taskId, pageNum, priority, task, worker }
        this.active = new Map(); // Running renders
        this.cancelled = new Set();
        this.abortControllers = new Map(); // Track AbortControllers for cancellation
        this.metrics = {
            totalQueued: 0,
            totalCompleted: 0,
            totalCancelled: 0,
            averageRenderTime: 0,
            renderTimes: []
        };
    }

    /**
     * Add render task to queue with priority
     * Higher priority tasks execute first
     * 
     * Priority Levels:
     * 100: CRITICAL - visible pages (render immediately)
     * 50:  HIGH     - next 3 pages in scroll direction
     * 25:  NORMAL   - adjacent pages
     * 10:  LOW      - prefetch further ahead
     */
    enqueue(pageNum, priority, renderFn, taskId = null) {
        taskId = taskId || `render-${pageNum}-${Date.now()}`;
        
        // Don't re-queue if already active
        if (this.active.has(taskId)) {
            console.warn(`Task ${taskId} already active, skipping re-queue`);
            return taskId;
        }

        // Don't queue if cancelled
        if (this.cancelled.has(taskId)) {
            this.cancelled.delete(taskId);
        }

        this.queue.push({
            taskId,
            pageNum,
            priority,
            renderFn,
            createdAt: performance.now(),
            attemptCount: 0
        });

        this.metrics.totalQueued++;
        
        // Sort by priority (descending) and creation time (ascending)
        this.queue.sort((a, b) => {
            if (b.priority !== a.priority) {
                return b.priority - a.priority; // Higher priority first
            }
            return a.createdAt - b.createdAt; // FIFO for same priority
        });

        // Try to start new renders
        this.processPending();
        
        return taskId;
    }

    /**
     * Cancel task by ID
     * If actively rendering, cancels render
     * If queued, removes from queue
     */
    cancel(taskId) {
        this.cancelled.add(taskId);

        // Remove from queue
        const queueIndex = this.queue.findIndex(t => t.taskId === taskId);
        if (queueIndex !== -1) {
            this.queue.splice(queueIndex, 1);
            this.metrics.totalCancelled++;
            return true;
        }

        // If active, signal cancellation via AbortController
        const abortController = this.abortControllers.get(taskId);
        if (abortController) {
            abortController.abort();
            this.abortControllers.delete(taskId);
            this.metrics.totalCancelled++;
            return true;
        }

        return false;
    }

    /**
     * Cancel all renders for a specific page
     * Useful when user scrolls to different page
     */
    cancelPage(pageNum) {
        let cancelled = 0;

        // Remove from queue
        this.queue = this.queue.filter(task => {
            if (task.pageNum === pageNum) {
                cancelled++;
                return false;
            }
            return true;
        });

        // Cancel active renders
        for (const [taskId, activeTask] of this.active.entries()) {
            if (activeTask.pageNum === pageNum) {
                this.cancel(taskId);
                cancelled++;
            }
        }

        this.metrics.totalCancelled += cancelled;
        return cancelled;
    }

    /**
     * Cancel all renders older than specified priority
     * When user scrolls, cancel low-priority renders
     */
    cancelBelowPriority(minPriority) {
        const taskIds = Array.from(this.active.keys());
        let cancelled = 0;

        for (const taskId of taskIds) {
            const task = this.active.get(taskId);
            if (task && task.priority < minPriority) {
                this.cancel(taskId);
                cancelled++;
            }
        }

        return cancelled;
    }

    /**
     * AGGRESSIVE CANCEL: Cancel ALL queued and active renders
     * Used for fast page jumps (e.g., page 1 -> page 300)
     * Clears entire pipeline for instant response
     */
    cancelAllAndClear() {
        // Cancel all active renders
        const activeTaskIds = Array.from(this.active.keys());
        for (const taskId of activeTaskIds) {
            this.cancel(taskId);
        }

        // Clear entire queue
        const queueLength = this.queue.length;
        this.queue = [];

        console.log(`[RenderQueue] AGGRESSIVE CLEAR: Cancelled ${activeTaskIds.length} active, cleared ${queueLength} queued`);
        return { active: activeTaskIds.length, queued: queueLength };
    }

    /**
     * Process pending queue items
     * Respects maxConcurrent limit
     */
    async processPending() {
        while (this.queue.length > 0 && this.active.size < this.maxConcurrent) {
            const task = this.queue.shift();

            // Skip if cancelled
            if (this.cancelled.has(task.taskId)) {
                this.cancelled.delete(task.taskId);
                this.metrics.totalCancelled++;
                continue;
            }

            await this.executeTask(task);
        }
    }

    /**
     * Execute render task
     * Tracks timing and memory usage
     * Uses AbortController for instant cancellation
     */
    async executeTask(task) {
        const abortController = new AbortController();
        const startTime = performance.now();
        const initialMemory = performance.memory?.usedJSHeapSize || 0;

        // Store abort controller for fast cancellation
        this.abortControllers.set(task.taskId, abortController);

        // Mark as active
        this.active.set(task.taskId, {
            pageNum: task.pageNum,
            priority: task.priority,
            abort: () => abortController.abort(),
            startTime
        });

        try {
            // Execute render with abort signal
            const result = await Promise.race([
                task.renderFn(abortController.signal),
                new Promise((_, reject) => {
                    // Timeout after 30s (something is wrong)
                    const timeout = setTimeout(() => {
                        reject(new Error('Render timeout'));
                    }, 30000);
                    
                    abortController.signal.addEventListener('abort', () => {
                        clearTimeout(timeout);
                    });
                })
            ]);

            // Check if cancelled while rendering
            if (this.cancelled.has(task.taskId)) {
                this.cancelled.delete(task.taskId);
                this.metrics.totalCancelled++;
                return;
            }

            // Record metrics
            const renderTime = performance.now() - startTime;
            this.recordMetrics(renderTime);
            this.metrics.totalCompleted++;

            return result;
        } catch (error) {
            if (error.name === 'AbortError' || error.message === 'Render timeout') {
                // Cancelled or timed out
                this.metrics.totalCancelled++;
            } else {
                console.error(`Render task ${task.taskId} failed:`, error);
                
                // Retry up to 2 times
                if (task.attemptCount < 2) {
                    task.attemptCount++;
                    task.priority = Math.max(0, task.priority - 10); // Lower priority on retry
                    this.queue.unshift(task); // Re-queue at front
                }
            }
        } finally {
            this.active.delete(task.taskId);
            
            // Process next queued task
            if (this.queue.length > 0) {
                this.processPending();
            }
        }
    }

    /**
     * Record render time metrics
     * Used for performance monitoring and optimization
     */
    recordMetrics(renderTime) {
        this.metrics.renderTimes.push(renderTime);
        
        // Keep only last 100 measurements
        if (this.metrics.renderTimes.length > 100) {
            this.metrics.renderTimes.shift();
        }

        // Calculate average
        const total = this.metrics.renderTimes.reduce((a, b) => a + b, 0);
        this.metrics.averageRenderTime = total / this.metrics.renderTimes.length;
    }

    /**
     * Get queue statistics
     * Useful for performance debugging
     */
    getStats() {
        return {
            queued: this.queue.length,
            active: this.active.size,
            capacity: this.maxConcurrent,
            utilization: (this.active.size / this.maxConcurrent * 100).toFixed(1) + '%',
            metrics: {
                ...this.metrics,
                averageRenderTime: this.metrics.averageRenderTime.toFixed(2) + 'ms',
                renderTimes: undefined // Exclude detailed times from stats
            }
        };
    }

    /**
     * Get queue priority distribution
     * Debug what's queued and its priority
     */
    getQueueDistribution() {
        const distribution = {
            CRITICAL: 0,
            HIGH: 0,
            NORMAL: 0,
            LOW: 0
        };

        this.queue.forEach(task => {
            if (task.priority >= 75) distribution.CRITICAL++;
            else if (task.priority >= 40) distribution.HIGH++;
            else if (task.priority >= 20) distribution.NORMAL++;
            else distribution.LOW++;
        });

        return distribution;
    }

    /**
     * Get current active renders
     * For debugging and monitoring
     */
    getActiveRenders() {
        return Array.from(this.active.entries()).map(([taskId, data]) => ({
            taskId,
            pageNum: data.pageNum,
            priority: data.priority,
            elapsed: (performance.now() - data.startTime).toFixed(0) + 'ms'
        }));
    }

    /**
     * Clear all queued and active renders
     * Call on PDF unload or app unmount
     */
    clear() {
        const taskIds = Array.from(this.active.keys());
        taskIds.forEach(taskId => this.cancel(taskId));
        this.queue = [];
        this.cancelled.clear();
    }

    /**
     * Get queue visualization for debugging
     * Shows what pages are queued and their priorities
     */
    visualize() {
        const lines = [
            `\n${'='.repeat(60)}`,
            `Render Queue Status (${this.queue.length} queued, ${this.active.size} active)`,
            `${'='.repeat(60)}`,
            `\nQueued Pages (by priority):`,
            ...this.queue.map((t, i) => 
                `  ${i+1}. Page ${t.pageNum} [Priority: ${t.priority}] [Attempts: ${t.attemptCount}]`
            ),
            `\nActive Renders:`,
            ...this.getActiveRenders().map(r => 
                `  ▶ Page ${r.pageNum} [${r.elapsed}] [Priority: ${r.priority}]`
            ),
            `\nStatistics:`,
            `  Total Queued: ${this.metrics.totalQueued}`,
            `  Total Completed: ${this.metrics.totalCompleted}`,
            `  Total Cancelled: ${this.metrics.totalCancelled}`,
            `  Avg Render Time: ${this.metrics.averageRenderTime.toFixed(2)}ms`,
            `${'='.repeat(60)}\n`
        ];

        return lines.join('\n');
    }
}

/**
 * Priority helper constants
 * Use these when enqueuing renders
 */
export const RENDER_PRIORITY = {
    CRITICAL: 100,  // Visible pages - render immediately
    HIGH: 50,       // Next in scroll direction
    NORMAL: 25,     // Adjacent pages
    LOW: 10         // Prefetch/background
};
