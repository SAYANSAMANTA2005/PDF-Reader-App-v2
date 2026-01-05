// src/utils/asyncSearchEngine.js
// Non-blocking, chunked search with inverted index
// Supports regex and boolean queries
// Sub-second search on 1000+ page PDFs

export class AsyncSearchEngine {
    constructor(options = {}) {
        this.chunkSize = options.chunkSize || 100; // Pages per batch
        this.maxResults = options.maxResults || 5000;
        this.caseSensitive = options.caseSensitive || false;
        
        // Inverted index: word -> Set of page numbers
        this.index = new Map();
        
        // Page text content: pageNum -> text
        this.pageTexts = new Map();
        
        // Indexed pages
        this.indexedPages = new Set();
        this.totalPages = 0;
        
        // Search options
        this.useRegex = options.useRegex || false;
        this.useBoolean = options.useBoolean || true;
        this.proximity = options.proximity || 0; // Word proximity distance
        
        // Callbacks
        this.onIndexProgress = options.onIndexProgress || (() => {});
        this.onSearchProgress = options.onSearchProgress || (() => {});
        
        // Stats
        this.stats = {
            indexedPages: 0,
            totalWords: 0,
            uniqueWords: 0,
            indexBuildTime: 0,
            lastSearchTime: 0
        };
    }

    /**
     * Build search index incrementally
     * Works in chunks to avoid blocking main thread
     * Can be cancelled via AbortSignal
     */
    async buildIndex(textContent, totalPages, abortSignal = null) {
        this.totalPages = totalPages;
        const startTime = performance.now();
        let processed = 0;
        let totalWords = 0;

        try {
            // Process in chunks
            for (let i = 0; i < totalPages; i += this.chunkSize) {
                // Check for cancellation
                if (abortSignal?.aborted) {
                    console.log('Index build cancelled');
                    return false;
                }

                const chunkEnd = Math.min(i + this.chunkSize, totalPages);
                const chunkSize = chunkEnd - i;

                // Index this chunk
                for (let pageNum = i + 1; pageNum <= chunkEnd; pageNum++) {
                    const text = textContent[pageNum] || '';
                    
                    if (text) {
                        this.indexPage(pageNum, text);
                        this.pageTexts.set(pageNum, text);
                        totalWords += text.split(/\s+/).length;
                    }
                }

                processed += chunkSize;

                // Report progress without blocking
                this.onIndexProgress({
                    processed,
                    total: totalPages,
                    percentage: (processed / totalPages * 100).toFixed(1),
                    uniqueWords: this.index.size
                });

                // Yield to main thread every chunk
                await new Promise(resolve => setTimeout(resolve, 0));
            }

            // Calculate stats
            this.stats.indexedPages = processed;
            this.stats.totalWords = totalWords;
            this.stats.uniqueWords = this.index.size;
            this.stats.indexBuildTime = performance.now() - startTime;

            console.log(
                `[Search Index] Built index for ${processed} pages, ` +
                `${this.index.size} unique words in ${this.stats.indexBuildTime.toFixed(0)}ms`
            );

            return true;
        } catch (error) {
            console.error('Index build failed:', error);
            return false;
        }
    }

    /**
     * Index a single page text
     * Tokenizes and creates inverted index entry
     */
    indexPage(pageNum, text) {
        if (this.indexedPages.has(pageNum)) {
            return; // Already indexed
        }

        // Tokenize text
        const tokens = this.tokenize(text);
        const uniqueTokens = new Set(tokens);

        // Add to inverted index
        for (const token of uniqueTokens) {
            if (!this.index.has(token)) {
                this.index.set(token, new Set());
            }
            this.index.get(token).add(pageNum);
        }

        this.indexedPages.add(pageNum);
    }

    /**
     * Search the index
     * Returns matching pages with relevance scores
     */
    async search(query, abortSignal = null) {
        if (!query || query.trim().length === 0) {
            return { results: [], total: 0, time: 0 };
        }

        const startTime = performance.now();

        try {
            let matchingPages = new Map(); // pageNum -> { relevance, highlights }

            // Regex search
            if (this.useRegex && this.isValidRegex(query)) {
                matchingPages = await this.regexSearch(query, abortSignal);
            }
            // Boolean search (AND, OR, NOT)
            else if (this.useBoolean && this.isBoolean(query)) {
                matchingPages = await this.booleanSearch(query, abortSignal);
            }
            // Simple term search
            else {
                matchingPages = await this.termSearch(query, abortSignal);
            }

            // Sort by relevance
            const results = Array.from(matchingPages.entries())
                .sort((a, b) => b[1].relevance - a[1].relevance)
                .slice(0, this.maxResults)
                .map(([pageNum, data]) => ({
                    pageNum,
                    ...data
                }));

            const searchTime = performance.now() - startTime;
            this.stats.lastSearchTime = searchTime;

            console.log(
                `[Search] Found ${results.length} results for "${query}" in ${searchTime.toFixed(2)}ms`
            );

            this.onSearchProgress({
                query,
                results: results.length,
                time: searchTime
            });

            return {
                results,
                total: results.length,
                time: searchTime
            };
        } catch (error) {
            console.error('Search failed:', error);
            return { results: [], total: 0, time: 0, error: error.message };
        }
    }

    /**
     * Term search: find pages containing all words
     */
    async termSearch(query, abortSignal) {
        const terms = this.tokenize(query);
        let matchingPages = null;

        for (const term of terms) {
            if (abortSignal?.aborted) break;

            const pages = this.index.get(term) || new Set();

            if (matchingPages === null) {
                matchingPages = new Set(pages);
            } else {
                // Intersection: keep only pages with all terms
                matchingPages = new Set([...matchingPages].filter(p => pages.has(p)));
            }

            // Early exit if no matches
            if (matchingPages.size === 0) {
                break;
            }

            await new Promise(resolve => setTimeout(resolve, 0)); // Yield
        }

        // Build results with relevance scores
        const results = new Map();
        const matchingSet = matchingPages || new Set();

        for (const pageNum of matchingSet) {
            const text = this.pageTexts.get(pageNum) || '';
            const occurrences = terms.reduce((count, term) => {
                return count + (text.match(new RegExp(term, 'gi'))?.length || 0);
            }, 0);

            results.set(pageNum, {
                relevance: occurrences,
                matchCount: occurrences,
                preview: this.getPreview(text, terms)
            });
        }

        return results;
    }

    /**
     * Regex search: match using regular expression
     */
    async regexSearch(query, abortSignal) {
        const results = new Map();
        let processedPages = 0;

        try {
            const regex = new RegExp(query, this.caseSensitive ? 'g' : 'gi');

            for (const [pageNum, text] of this.pageTexts.entries()) {
                if (abortSignal?.aborted) break;

                const matches = text.match(regex) || [];
                
                if (matches.length > 0) {
                    results.set(pageNum, {
                        relevance: matches.length,
                        matchCount: matches.length,
                        preview: this.getPreview(text, matches)
                    });
                }

                processedPages++;
                
                if (processedPages % 100 === 0) {
                    await new Promise(resolve => setTimeout(resolve, 0)); // Yield every 100 pages
                }
            }
        } catch (error) {
            console.error('Regex search error:', error);
        }

        return results;
    }

    /**
     * Boolean search: support AND, OR, NOT operators
     * Example: "(algorithm OR neural) AND NOT deep"
     */
    async booleanSearch(query, abortSignal) {
        try {
            // Parse boolean expression
            const ast = this.parseBooleanQuery(query);
            
            // Evaluate expression against index
            const results = new Map();

            for (const pageNum of this.indexedPages) {
                if (abortSignal?.aborted) break;

                if (this.evaluateBooleanAST(ast, pageNum)) {
                    const text = this.pageTexts.get(pageNum) || '';
                    const matches = this.extractBooleanMatches(query, text);

                    results.set(pageNum, {
                        relevance: matches.length,
                        matchCount: matches.length,
                        preview: this.getPreview(text, matches)
                    });
                }
            }

            return results;
        } catch (error) {
            console.error('Boolean search error:', error);
            return new Map();
        }
    }

    /**
     * Tokenize text for indexing
     */
    tokenize(text) {
        return text
            .toLowerCase()
            .match(/\b[\w'-]+\b/g) || [];
    }

    /**
     * Check if query is valid regex
     */
    isValidRegex(query) {
        try {
            new RegExp(query);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Check if query contains boolean operators
     */
    isBoolean(query) {
        return /\b(AND|OR|NOT)\b/i.test(query);
    }

    /**
     * Simple boolean query parser
     */
    parseBooleanQuery(query) {
        // Simplified: doesn't handle complex nesting
        const tokens = query.split(/\s+(AND|OR|NOT)\s+/i);
        return tokens;
    }

    /**
     * Evaluate boolean AST against page
     */
    evaluateBooleanAST(ast, pageNum) {
        let result = true;
        let operator = 'AND'; // default

        for (const token of ast) {
            const lowerToken = token.toLowerCase();

            if (lowerToken === 'and') {
                operator = 'AND';
            } else if (lowerToken === 'or') {
                operator = 'OR';
            } else if (lowerToken === 'not') {
                operator = 'NOT';
            } else {
                // This is a search term
                const hasMatch = this.index.get(token)?.has(pageNum) || false;

                if (operator === 'NOT') {
                    result = result && !hasMatch;
                } else if (operator === 'OR') {
                    result = result || hasMatch;
                } else { // AND
                    result = result && hasMatch;
                }
            }
        }

        return result;
    }

    /**
     * Extract matches from text for preview
     */
    extractBooleanMatches(query, text) {
        const terms = query.split(/\s+(AND|OR|NOT)\s+/i)
            .filter(t => !['AND', 'OR', 'NOT'].includes(t.toUpperCase()));
        
        const matches = [];
        for (const term of terms) {
            const regex = new RegExp(term, 'gi');
            let match;
            while ((match = regex.exec(text)) !== null) {
                matches.push(match[0]);
            }
        }

        return matches;
    }

    /**
     * Get text preview around matches
     */
    getPreview(text, matches, contextLength = 50) {
        if (matches.length === 0) {
            return text.substring(0, contextLength) + '...';
        }

        // Find first match
        const firstMatch = matches[0];
        const index = text.toLowerCase().indexOf(firstMatch.toLowerCase());

        if (index === -1) {
            return text.substring(0, contextLength) + '...';
        }

        const start = Math.max(0, index - contextLength);
        const end = Math.min(text.length, index + firstMatch.length + contextLength);

        return (start > 0 ? '...' : '') + 
               text.substring(start, end) + 
               (end < text.length ? '...' : '');
    }

    /**
     * Get search statistics
     */
    getStats() {
        return {
            ...this.stats,
            indexSize: (this.index.size).toLocaleString() + ' unique words',
            indexBuiltPercentage: (this.indexedPages.size / this.totalPages * 100).toFixed(1) + '%'
        };
    }

    /**
     * Clear index
     */
    clear() {
        this.index.clear();
        this.pageTexts.clear();
        this.indexedPages.clear();
        this.stats = {
            indexedPages: 0,
            totalWords: 0,
            uniqueWords: 0,
            indexBuildTime: 0,
            lastSearchTime: 0
        };
    }

    /**
     * Visualization for debugging
     */
    visualize() {
        const stats = this.getStats();
        const lines = [
            `\n${'='.repeat(60)}`,
            `Search Engine Statistics`,
            `${'='.repeat(60)}`,
            `Index Status:`,
            `  Indexed Pages: ${stats.indexedPages} / ${this.totalPages}`,
            `  Progress: ${stats.indexBuiltPercentage}`,
            `  Unique Words: ${stats.indexSize}`,
            `  Total Words: ${stats.totalWords.toLocaleString()}`,
            ``,
            `Performance:`,
            `  Index Build Time: ${stats.indexBuildTime.toFixed(2)}ms`,
            `  Last Search Time: ${stats.lastSearchTime.toFixed(2)}ms`,
            `${'='.repeat(60)}\n`
        ];

        return lines.join('\n');
    }
}
