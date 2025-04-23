export class YouTubeModifier {
    private readonly YOUTUBE_SELECTORS = {
        recommendations: 'ytd-watch-next-secondary-results-renderer',
        relatedVideos: '#related',
        videoGrid: 'ytd-rich-grid-renderer',
        searchResults: 'ytd-search',
        shorts: 'ytd-reel-shelf-renderer',
        comments: 'ytd-comments',
        videoItems: [
            'ytd-video-renderer',
            'ytd-grid-video-renderer',
            'ytd-compact-video-renderer',
            'ytd-rich-item-renderer',
            'ytd-reel-item-renderer'
        ].join(',')
    };

    private focusTopic: string = '';
    private isActive: boolean = false;
    private observer: MutationObserver | null = null;
    private lastUrl: string = '';
    private processingPromise: Promise<void> | null = null;

    constructor() {
        this.setupUrlChangeDetection();
    }

    private setupUrlChangeDetection(): void {
        // Check for URL changes every 500ms
        setInterval(() => {
            if (this.lastUrl !== window.location.href) {
                this.lastUrl = window.location.href;
                if (this.isActive) {
                    this.onUrlChange();
                }
            }
        }, 500);
    }

    public activate(topic: string): void {
        this.focusTopic = topic.toLowerCase();
        this.isActive = true;
        
        // Initial cleanup
        this.cleanupPage();
        
        // Setup observer for dynamic content
        this.setupObserver();
        
        // Inject our styles
        this.injectStyles();
        
        // Force YouTube to load more relevant content
        this.modifyYouTubeAlgorithm();
    }

    public deactivate(): void {
        this.isActive = false;
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }
        this.restoreYouTubePage();
    }

    private async onUrlChange(): Promise<void> {
        console.log('URL changed, updating content...');
        await this.waitForContent();
        this.cleanupPage();
    }

    private setupObserver(): void {
        if (this.observer) {
            this.observer.disconnect();
        }

        this.observer = new MutationObserver((mutations) => {
            if (!this.processingPromise) {
                this.processingPromise = this.processNewContent(mutations).finally(() => {
                    this.processingPromise = null;
                });
            }
        });

        this.observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    private async processNewContent(mutations: MutationRecord[]): Promise<void> {
        const relevantMutations = mutations.filter(mutation => 
            Array.from(mutation.addedNodes).some(node => 
                node instanceof HTMLElement && 
                (node.matches(this.YOUTUBE_SELECTORS.videoItems) ||
                 node.querySelector(this.YOUTUBE_SELECTORS.videoItems))
            )
        );

        if (relevantMutations.length > 0) {
            await this.cleanupPage();
        }
    }

    private async waitForContent(timeout: number = 5000): Promise<void> {
        const startTime = Date.now();
        while (Date.now() - startTime < timeout) {
            const content = document.querySelector(this.YOUTUBE_SELECTORS.videoItems);
            if (content) return;
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }

    private async cleanupPage(): Promise<void> {
        // Remove all non-educational content
        const videos = document.querySelectorAll(this.YOUTUBE_SELECTORS.videoItems);
        videos.forEach(video => this.processVideoElement(video as HTMLElement));

        // Modify the sidebar if we're on a video page
        if (window.location.pathname === '/watch') {
            this.modifyRecommendations();
        }

        // Clean up shorts section
        const shortsSection = document.querySelector(this.YOUTUBE_SELECTORS.shorts);
        if (shortsSection) {
            shortsSection.remove();
        }
    }

    private processVideoElement(video: HTMLElement): void {
        const titleEl = video.querySelector('#video-title, #video-title-link');
        const channelEl = video.querySelector('#channel-name, #text.ytd-channel-name');
        const descriptionEl = video.querySelector('#description-text, #metadata');

        const title = titleEl?.textContent?.toLowerCase() || '';
        const channel = channelEl?.textContent?.toLowerCase() || '';
        const description = descriptionEl?.textContent?.toLowerCase() || '';

        const content = `${title} ${channel} ${description}`;

        if (!this.isContentRelevant(content)) {
            // Instead of just hiding, remove the element
            video.remove();
        }
    }

    private isContentRelevant(content: string): boolean {
        const normalizedContent = content.toLowerCase();
        const words = this.focusTopic.split(/\s+/);

        // Must contain at least one word from the topic
        if (!words.some(word => normalizedContent.includes(word))) {
            return false;
        }

        // Must contain educational terms
        const educationalTerms = [
            'tutorial', 'lesson', 'course', 'learn', 'study',
            'education', 'lecture', 'example', 'practice', 'explained',
            'introduction', 'basics', 'guide', 'concept', 'theory'
        ];
        
        if (!educationalTerms.some(term => normalizedContent.includes(term))) {
            return false;
        }

        // Check for non-educational content
        const nonEducationalTerms = [
            'game', 'gaming', 'sport', 'music', 'funny',
            'prank', 'challenge', 'vlog', 'reaction', 'unboxing',
            'vs', 'versus', 'match', 'highlights'
        ];

        if (nonEducationalTerms.some(term => normalizedContent.includes(term))) {
            return false;
        }

        return true;
    }

    private modifyRecommendations(): void {
        // Remove the default recommendations section
        const recommendationsSection = document.querySelector(this.YOUTUBE_SELECTORS.recommendations);
        if (recommendationsSection) {
            recommendationsSection.remove();
        }

        // Create our own recommendations section
        this.createCustomRecommendations();
    }

    private injectStyles(): void {
        const style = document.createElement('style');
        style.textContent = `
            /* Modern UI Theme Colors */
            :root {
                --mindful-primary: #1a73e8;
                --mindful-secondary: #dc3545;
                --mindful-dark: #1a1a1a;
                --mindful-darker: #0f0f0f;
                --mindful-light: #ffffff;
                --mindful-gray: #2d2d2d;
                --mindful-hover: #2b2b2b;
            }

            /* Custom Scrollbar */
            ::-webkit-scrollbar {
                width: 8px;
                background: var(--mindful-darker);
            }

            ::-webkit-scrollbar-thumb {
                background: var(--mindful-primary);
                border-radius: 4px;
            }

            /* Hide unwanted sections with fade */
            ytd-browse[page-subtype="trending"],
            ytd-browse[page-subtype="subscriptions"] ytd-shelf-renderer,
            ytd-browse[page-subtype="subscriptions"] ytd-grid-renderer {
                display: none !important;
            }

            /* Style our custom recommendations */
            #mindful-recommendations {
                background: var(--mindful-dark);
                border-radius: 16px;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
                margin: 20px 0;
                border: 1px solid var(--mindful-gray);
                overflow: hidden;
            }

            #mindful-recommendations h2 {
                color: var(--mindful-light);
                font-size: 18px;
                font-weight: 500;
                padding: 16px 20px;
                margin: 0;
                background: var(--mindful-darker);
                border-bottom: 1px solid var(--mindful-gray);
            }

            #mindful-video-list {
                padding: 16px;
            }

            /* Video Item Styling */
            ytd-video-renderer,
            ytd-grid-video-renderer,
            ytd-compact-video-renderer {
                border-radius: 12px;
                margin: 8px 0;
                transition: transform 0.2s ease, box-shadow 0.2s ease;
            }

            ytd-video-renderer:hover,
            ytd-grid-video-renderer:hover,
            ytd-compact-video-renderer:hover {
                transform: translateY(-2px);
                box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
                background: var(--mindful-hover);
            }

            /* Educational Content Indicators */
            ytd-video-renderer:has(#video-title:contains("tutorial")),
            ytd-video-renderer:has(#video-title:contains("lesson")),
            ytd-video-renderer:has(#video-title:contains("course")) {
                position: relative;
                border-left: 4px solid var(--mindful-primary);
                padding-left: 16px;
                background: linear-gradient(90deg, rgba(26,115,232,0.1) 0%, rgba(0,0,0,0) 100%);
            }

            ytd-video-renderer:has(#video-title:contains("practice")),
            ytd-video-renderer:has(#video-title:contains("exercise")),
            ytd-video-renderer:has(#video-title:contains("example")) {
                position: relative;
                border-left: 4px solid var(--mindful-secondary);
                padding-left: 16px;
                background: linear-gradient(90deg, rgba(220,53,69,0.1) 0%, rgba(0,0,0,0) 100%);
            }

            /* Educational Badge */
            ytd-video-renderer:has(#video-title:contains("tutorial"))::before,
            ytd-video-renderer:has(#video-title:contains("lesson"))::before,
            ytd-video-renderer:has(#video-title:contains("course"))::before {
                content: "Educational";
                position: absolute;
                top: 8px;
                right: 8px;
                background: var(--mindful-primary);
                color: white;
                padding: 4px 8px;
                border-radius: 4px;
                font-size: 12px;
                font-weight: 500;
                opacity: 0.9;
                z-index: 1;
            }

            /* Practice Badge */
            ytd-video-renderer:has(#video-title:contains("practice"))::before,
            ytd-video-renderer:has(#video-title:contains("exercise"))::before {
                content: "Practice";
                position: absolute;
                top: 8px;
                right: 8px;
                background: var(--mindful-secondary);
                color: white;
                padding: 4px 8px;
                border-radius: 4px;
                font-size: 12px;
                font-weight: 500;
                opacity: 0.9;
                z-index: 1;
            }

            /* Focus Mode Header */
            .mindful-focus-header {
                background: var(--mindful-dark);
                padding: 16px;
                margin-bottom: 20px;
                border-radius: 12px;
                box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
                display: flex;
                align-items: center;
                justify-content: space-between;
                border: 1px solid var(--mindful-gray);
            }

            .mindful-focus-header h2 {
                color: var(--mindful-light);
                margin: 0;
                font-size: 18px;
                font-weight: 500;
            }

            .mindful-focus-header .topic {
                color: var(--mindful-primary);
                font-weight: 600;
            }

            /* Custom Animations */
            @keyframes fadeIn {
                from { opacity: 0; transform: translateY(10px); }
                to { opacity: 1; transform: translateY(0); }
            }

            @keyframes slideIn {
                from { transform: translateX(-20px); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }

            /* Animation Classes */
            .mindful-animate-in {
                animation: fadeIn 0.3s ease forwards;
            }

            .mindful-slide-in {
                animation: slideIn 0.3s ease forwards;
            }

            /* Loading States */
            .mindful-loading {
                position: relative;
                overflow: hidden;
            }

            .mindful-loading::after {
                content: "";
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: linear-gradient(90deg, 
                    transparent 0%, 
                    rgba(255,255,255,0.1) 50%, 
                    transparent 100%);
                animation: shimmer 1.5s infinite;
            }

            @keyframes shimmer {
                0% { transform: translateX(-100%); }
                100% { transform: translateX(100%); }
            }
        `;
        document.head.appendChild(style);
    }

    private createCustomRecommendations(): void {
        const container = document.createElement('div');
        container.id = 'mindful-recommendations';
        container.className = 'mindful-animate-in';
        container.innerHTML = `
            <h2>
                <span style="color: var(--mindful-primary)">Educational</span>
                <span style="color: var(--mindful-secondary)">Recommendations</span>
            </h2>
            <div id="mindful-video-list" class="mindful-loading"></div>
        `;

        // Create focus mode header
        const header = document.createElement('div');
        header.className = 'mindful-focus-header mindful-slide-in';
        header.innerHTML = `
            <h2>Focusing on: <span class="topic">${this.focusTopic}</span></h2>
        `;

        // Insert our containers
        const sidebar = document.querySelector('#secondary');
        if (sidebar) {
            sidebar.prepend(container);
            sidebar.prepend(header);
        }

        // Force YouTube to load related educational content
        this.injectRecommendationScript();
    }

    private injectRecommendationScript(): void {
        const script = document.createElement('script');
        script.textContent = `
            // Override YouTube's recommendation algorithm
            if (window.yt && window.yt.config_) {
                window.yt.config_.RELATED_PLAYER_ARGS = {
                    'rvs': 'educational=1&topic=${encodeURIComponent(this.focusTopic)}'
                };
            }
        `;
        document.head.appendChild(script);
    }

    private modifyYouTubeAlgorithm(): void {
        // Inject a script to modify YouTube's internal API
        const script = document.createElement('script');
        script.textContent = `
            // Override YouTube's data API
            if (window.ytcfg && window.ytcfg.data_) {
                window.ytcfg.data_.SEND_VISITOR_DATA = false;
                window.ytcfg.data_.LOGGED_IN = false; // Force educational content
            }

            // Modify search parameters
            const originalFetch = window.fetch;
            window.fetch = async (url, options) => {
                if (url.includes('/youtubei/')) {
                    options = options || {};
                    options.headers = options.headers || {};
                    options.headers['X-Youtube-Education-Mode'] = 'enabled';
                    if (url.includes('/next')) {
                        // Modify recommendations request
                        const body = JSON.parse(options.body);
                        body.context.client.clientName = 'EDUCATION';
                        body.context.client.clientVersion = '2.20230101';
                        options.body = JSON.stringify(body);
                    }
                }
                return originalFetch(url, options);
            };
        `;
        document.head.appendChild(script);
    }

    private restoreYouTubePage(): void {
        // Remove our custom elements
        document.getElementById('mindful-recommendations')?.remove();
        
        // Remove our injected styles
        const injectedStyle = document.querySelector('style[data-mindful-browsing]');
        if (injectedStyle) {
            injectedStyle.remove();
        }

        // Restore YouTube's original recommendations
        location.reload();
    }
} 