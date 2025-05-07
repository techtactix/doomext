import { pipeline, cos_sim } from '@xenova/transformers';

export class YouTubeModifier {
    // More robust selectors, combining IDs and tag names where possible
    private readonly YOUTUBE_SELECTORS = {
        pageManager: 'ytd-page-manager',
        sidebar: '#secondary',
        recommendationsContainer: '#related',
        videoGrid: 'ytd-rich-grid-renderer',
        searchResults: 'ytd-search',
        shorts: 'ytd-reel-shelf-renderer, ytd-shorts',
        comments: 'ytd-comments#comments',
        // Combine selectors for various video item types
        videoItems: [
            'ytd-video-renderer',
            'ytd-grid-video-renderer',
            'ytd-compact-video-renderer',
            'ytd-rich-item-renderer',
            'ytd-reel-item-renderer', // For Shorts
            'ytd-playlist-panel-video-renderer' // For playlists in sidebar
        ].join(', '),
        recommendationItems: [
            '#related ytd-compact-video-renderer',
            '#related ytd-video-renderer'
        ].join(', ')
    };

    private focusTopic: string = '';
    private isActive: boolean = false;
    private observer: MutationObserver | null = null;
    private lastUrl: string = window.location.href;
    private processingNodes: Set<Node> = new Set(); // Track nodes being processed
    private filterInterval: number | null = null;
    private styleElement: HTMLStyleElement | null = null;

    // Semantic Search Related Properties
    private featureExtractor: any | null = null; // Stores the model pipeline
    private modelReady: boolean = false;
    private focusTopicEmbedding: number[] | null = null;
    private similarityThreshold: number = 0.5; // Adjust as needed (0.0 to 1.0)
    private modelName: string = 'Xenova/all-MiniLM-L6-v2'; // Standard small sentence transformer

    constructor() {
        console.log('Mindful Browsing: YouTubeModifier loaded (Semantic Search Version).');
        this.setupUrlChangeDetection();
    }

    private setupUrlChangeDetection(): void {
        // Use requestAnimationFrame for smoother, more efficient URL checking
        const checkUrl = () => {
            if (this.lastUrl !== window.location.href) {
                console.log('Mindful Browsing: URL changed', {
                    from: this.lastUrl,
                    to: window.location.href
                });
                this.lastUrl = window.location.href;
                if (this.isActive) {
                    this.onUrlChange();
                }
            }
            requestAnimationFrame(checkUrl);
        };
        checkUrl();
    }

    public async activate(topic: string): Promise<void> {
        console.log(`Mindful Browsing: Activating focus mode for topic: "${topic}"`);
        const previousTopic = this.focusTopic;
        this.focusTopic = topic.toLowerCase();
        this.isActive = true;
        this.lastUrl = window.location.href;

        this.injectStyles();

        // Initialize model (don't wait here, let it load in background)
        this.initializeModel().then(async () => {
            // Regenerate topic embedding only if topic changed or embedding doesn't exist
            if (this.modelReady && (topic !== previousTopic || !this.focusTopicEmbedding)) {
                 await this.generateFocusTopicEmbedding();
            }
            // Run initial cleanup once model is ready (or try anyway)
            this.fullCleanup();
        });
        
        // Setup observer immediately
        this.setupObserver(); 
        console.log('Mindful Browsing: Focus mode activation initiated. Model loading in background...');
    }

    public deactivate(): void {
        console.log('Mindful Browsing: Deactivating focus mode.');
        this.isActive = false;
        this.observer?.disconnect();
        this.observer = null;
        // Don't clear filterInterval if using it as fallback
        // if (this.filterInterval) { clearInterval(this.filterInterval); this.filterInterval = null; }
        this.focusTopicEmbedding = null; // Clear embedding
        // Optionally release model resources if possible/needed (library specific)
        // this.featureExtractor = null; 
        // this.modelReady = false;
        this.restoreYouTubePage();
        console.log('Mindful Browsing: Focus mode deactivated.');
    }

    // Renamed for clarity - primary fallback filter
    private setupContinuousFiltering(interval: number): void {
        if (this.filterInterval) clearInterval(this.filterInterval);
        console.log(`Mindful Browsing: Setting up fallback filter interval (${interval}ms)`);
        this.filterInterval = window.setInterval(() => {
            if (this.isActive) {
                // console.log('Mindful Browsing: Running fallback filter...');
                this.runFilteringLogic();
            }
        }, interval);
    }

    private async onUrlChange(): Promise<void> {
        console.log('Mindful Browsing: Handling URL change...');
        // Reset observer and run full cleanup after delay
        this.observer?.disconnect();
        setTimeout(() => {
            if (this.isActive) { // Check if still active after delay
                this.fullCleanup();
                this.setupObserver();
            }
        }, 500);
    }

    private setupObserver(): void {
        if (this.observer) this.observer.disconnect();

        const targetNode = document.querySelector(this.YOUTUBE_SELECTORS.pageManager) || document.body;
        console.log('Mindful Browsing: Setting up MutationObserver on', targetNode);

        this.observer = new MutationObserver(async (mutations) => {
            if (!this.isActive) return;
            
            // Debounce or batch processing using requestAnimationFrame
            requestAnimationFrame(async () => {
                const nodesToProcess: HTMLElement[] = [];
                for (const mutation of mutations) {
                    if (mutation.type === 'childList') {
                        mutation.addedNodes.forEach(node => {
                            if (this.processingNodes.has(node)) return;
                            if (node instanceof HTMLElement) {
                                if (node.matches(this.YOUTUBE_SELECTORS.videoItems) && !node.classList.contains('mindful-placeholder')) {
                                    nodesToProcess.push(node);
                                } else {
                                    const videos = node.querySelectorAll<HTMLElement>(this.YOUTUBE_SELECTORS.videoItems);
                                    videos.forEach(video => {
                                        if (!this.processingNodes.has(video) && !video.classList.contains('mindful-placeholder')) {
                                            nodesToProcess.push(video);
                                        }
                                    });
                                }
                            }
                        });
                    }
                }

                // Process nodes asynchronously
                if (nodesToProcess.length > 0) {
                    // console.log(`Mindful Browsing: Observer detected ${nodesToProcess.length} new nodes to process.`);
                    // Process sequentially to avoid overwhelming the model
                    for (const node of nodesToProcess) {
                         if (!this.processingNodes.has(node)) { // Double check before processing
                             await this.processElement(node); 
                         }
                    }
                }
            });
        });

        this.observer.observe(targetNode, {
            childList: true,
            subtree: true
        });
        console.log('Mindful Browsing: MutationObserver started.');
    }

    // Process element is now async due to async isContentRelevant
    private async processElement(element: HTMLElement): Promise<void> {
        if (!element || element.classList.contains('mindful-placeholder')) {
            return;
        }

        this.processingNodes.add(element);

        const titleEl = element.querySelector('#video-title, #video-title-link, #title');
        const channelEl = element.querySelector('#channel-name, #text.ytd-channel-name, .ytd-channel-name');
        const descriptionEl = element.querySelector('#description-text, #metadata, .metadata-snippet-text');

        const title = titleEl?.textContent?.trim() || '';
        const description = descriptionEl?.textContent?.trim() || '';
        // Combine title and description for better context
        const content = `${title} ${description}`.trim().toLowerCase(); 

        if (!content) { // No text content found
             console.log('Mindful Browsing: No text content found for element, skipping semantic check.');
             this.processingNodes.delete(element);
             return; 
        }

        const relevant = await this.isContentRelevant(content);

        if (relevant) {
            element.style.borderLeft = '3px solid var(--mindful-primary)'; // Keep relevant indicator
        } else {
            this.replaceWithPlaceholder(element);
        }

        setTimeout(() => this.processingNodes.delete(element), 50); // Shorter delay
    }
    
    // Renamed: Performs a full scan and cleanup
    private fullCleanup(): void {
        console.log('Mindful Browsing: Performing full cleanup...');
        this.removeUnwantedSections(); // Remove shorts, comments etc. first
        this.runFilteringLogic(); // Filter remaining video items
    }

    // This is now the SEMANTIC check
    private async runFilteringLogic(): Promise<void> {
        const videos = document.querySelectorAll<HTMLElement>(this.YOUTUBE_SELECTORS.videoItems);
        // console.log(`Mindful Browsing: Found ${videos.length} video items to check.`);
        // Process sequentially to avoid overwhelming the model
        for (const video of Array.from(videos)) {
             if (!video.classList.contains('mindful-placeholder') && !this.processingNodes.has(video)) {
                  await this.processElement(video);
             }
        }
    }
    
    // New: Specifically removes non-video sections like shorts, comments
    private removeUnwantedSections(): void {
         console.log('Mindful Browsing: Removing unwanted sections (Shorts, Comments)...');
         document.querySelectorAll(this.YOUTUBE_SELECTORS.shorts).forEach(el => el.remove());
    }

    // Placeholder logic remains similar, but ensure class is added
    private replaceWithPlaceholder(element: HTMLElement): void {
        if (!element.parentNode || element.classList.contains('mindful-placeholder')) {
            return; // Already replaced or no parent
        }
        
        const placeholder = document.createElement('div');
        placeholder.className = 'mindful-placeholder'; // Ensure class is added
        // Attempt to match size, but provide fallback defaults
        const height = element.offsetHeight;
        const width = element.offsetWidth;
        placeholder.style.height = height > 20 ? `${height}px` : '100px'; // Min height
        placeholder.style.width = width > 50 ? `${width}px` : '100%'; // Min width
        placeholder.innerHTML = `
            <p>Filtered Content</p>
            <span>Removed by Mindful Browsing (Focus: ${this.focusTopic}) - Semantically Checked</span>
        `;
        
        // Handle specific display types if needed
        const displayStyle = window.getComputedStyle(element).display;
        if (displayStyle === 'inline-block' || displayStyle === 'flex') {
             placeholder.style.display = displayStyle;
        }
        placeholder.style.margin = window.getComputedStyle(element).margin;
        
        element.parentNode.replaceChild(placeholder, element);
        // console.log('Mindful Browsing: Replaced element with placeholder.');
    }

    // This is now the SEMANTIC check
    private async isContentRelevant(content: string): Promise<boolean> {
        // If model not ready or no topic embedding, fallback (e.g., consider irrelevant or use basic check)
        if (!this.modelReady || !this.featureExtractor || !this.focusTopicEmbedding) {
            console.warn('Mindful Browsing: Semantic model not ready or topic embedding missing. Cannot perform check.');
            // Fallback: Consider irrelevant to be safe? Or implement a basic keyword check here?
            return false; // Defaulting to irrelevant if model isn't ready
        }
        if (!content) return false; // No content to check
        
        try {
            // Generate embedding for the video content
            const contentEmbeddingResult = await this.featureExtractor(content, { pooling: 'mean', normalize: true });
            const contentEmbedding = Array.from(contentEmbeddingResult.data as number[]);

            // Calculate cosine similarity
            // const { cos_sim } = await import('@xenova/transformers'); // Use dynamic import if needed
            const similarity = cos_sim(this.focusTopicEmbedding, contentEmbedding);

            // console.log(`Similarity for "${content.substring(0, 50)}..." = ${similarity.toFixed(4)}`);

            // Check against threshold
            return similarity >= this.similarityThreshold;

        } catch (error) {
            console.error('Mindful Browsing: Error during semantic similarity calculation:', error);
            return false; // Treat as irrelevant on error
        }
    }

    private injectStyles(): void {
        if (this.styleElement) return; // Avoid injecting multiple times

        this.styleElement = document.createElement('style');
        this.styleElement.setAttribute('data-mindful-browsing', 'true');
        this.styleElement.textContent = `
            :root {
                --mindful-primary: #1a73e8;
                --mindful-secondary: #dc3545;
                --mindful-dark: #1a1a1a;
                --mindful-darker: #0f0f0f;
                --mindful-light: #ffffff;
                --mindful-gray: #2d2d2d;
                --mindful-hover: #2b2b2b;
            }
            
             /* Hide specific unwanted sections directly */
            ytd-browse[page-subtype="trending"],
            ytd-browse[page-subtype="subscriptions"] ytd-shelf-renderer,
            ytd-browse[page-subtype="subscriptions"] ytd-grid-renderer {
                display: none !important;
            }

            .mindful-placeholder {
                background-color: var(--mindful-darker);
                border: 1px dashed var(--mindful-secondary);
                border-radius: 8px;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                padding: 10px;
                box-sizing: border-box; 
                color: #aaa;
                text-align: center;
                font-size: 13px;
                min-height: 80px; /* Ensure placeholder is visible */
                overflow: hidden;
            }
            
            .mindful-placeholder p {
                margin: 0 0 5px 0;
                font-weight: 500;
                color: #eee;
            }
            
            .mindful-placeholder span {
                color: var(--mindful-secondary);
                font-weight: normal;
                font-size: 12px;
            }
            
            /* Optional: Style relevant items */
            /* Add other styles from previous version if needed */
            ${this.YOUTUBE_SELECTORS.videoItems} { transition: border-left 0.3s ease; }
        `;
        document.head.appendChild(this.styleElement);
         console.log('Mindful Browsing: Styles injected.');
    }

    // Simplified restoration - reload might be necessary if complex changes were made
    private restoreYouTubePage(): void {
        console.log('Mindful Browsing: Restoring YouTube page...');
        this.styleElement?.remove();
        this.styleElement = null;
        // Remove placeholders - requires finding them all
        document.querySelectorAll('.mindful-placeholder').forEach(el => el.remove());
        // Full reload is often the most reliable way to restore YouTube fully
        console.log('Mindful Browsing: Reloading page for full restoration.');
        location.reload(); 
    }

    // --- Model Initialization ---
    private async initializeModel(): Promise<void> {
        if (this.featureExtractor) {
            console.log('Mindful Browsing: Model pipeline already initialized.');
            this.modelReady = true;
            return;
        }
        try {
            console.log(`Mindful Browsing: Initializing semantic model (${this.modelName})...`);
            this.modelReady = false;
            // Use dynamic import for the library if using certain bundlers
            // const { pipeline } = await import('@xenova/transformers');
            this.featureExtractor = await pipeline('feature-extraction', this.modelName, {
                 quantized: true // Use quantized model for smaller size & potentially faster inference
            });
            this.modelReady = true;
            console.log('Mindful Browsing: Semantic model ready.');
            // Generate embedding for the current focus topic if active
            if (this.isActive && this.focusTopic) {
                await this.generateFocusTopicEmbedding();
            }
        } catch (error) {
            console.error('Mindful Browsing: Failed to initialize semantic model:', error);
            this.modelReady = false;
            // Fallback? Notify user? Disable semantic filtering?
        }
    }

    private async generateFocusTopicEmbedding(): Promise<void> {
        if (!this.modelReady || !this.featureExtractor || !this.focusTopic) {
            this.focusTopicEmbedding = null;
            return;
        }
        try {
            console.log('Mindful Browsing: Generating embedding for focus topic:', this.focusTopic);
            const result = await this.featureExtractor(this.focusTopic, { pooling: 'mean', normalize: true });
            this.focusTopicEmbedding = Array.from(result.data as number[]);
            console.log('Mindful Browsing: Focus topic embedding generated.');
        } catch (error) {
            console.error('Mindful Browsing: Failed to generate focus topic embedding:', error);
            this.focusTopicEmbedding = null;
        }
    }

    // --- Methods below might be less reliable and are commented out for now ---
    /*
    private createCustomRecommendations(): void { ... }
    private injectRecommendationScript(): void { ... }
    private modifyYouTubeAlgorithm(): void { ... }
    */
} 