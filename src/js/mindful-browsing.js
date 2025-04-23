// Mindful Browsing Content Script
// @ts-ignore
import { pipeline } from '@xenova/transformers';

class MindfulBrowsing {
    constructor() {
        this.scrollStartTime = Date.now();
        this.lastScrollPosition = window.scrollY;
        this.scrollCount = 0;
        this.isDoomscrolling = false;
        this.focusMode = false;
        this.sentimentAnalyzer = null;
        this.initialize();
    }

    async initialize() {
        // Initialize sentiment analyzer
        this.sentimentAnalyzer = await pipeline('sentiment-analysis');
        
        // Add scroll event listener
        window.addEventListener('scroll', this.handleScroll.bind(this));
        
        // Check if we're on YouTube
        if (window.location.hostname === 'www.youtube.com') {
            this.setupYouTubeFocusMode();
        }
    }

    async handleScroll() {
        const currentTime = Date.now();
        const timeSpent = currentTime - this.scrollStartTime;
        const scrollDelta = Math.abs(window.scrollY - this.lastScrollPosition);
        
        this.scrollCount++;
        this.lastScrollPosition = window.scrollY;

        // Detect rapid scrolling
        if (scrollDelta > 100 && timeSpent < 1000) {
            this.scrollCount++;
        }

        // Check for doomscrolling patterns
        if (this.scrollCount > 20 && timeSpent < 30000) {
            if (!this.isDoomscrolling) {
                this.isDoomscrolling = true;
                this.showDoomscrollingReminder();
            }
        }

        // Reset counters if user hasn't scrolled for 5 seconds
        if (timeSpent > 5000) {
            this.scrollCount = 0;
            this.scrollStartTime = currentTime;
            this.isDoomscrolling = false;
        }
    }

    showDoomscrollingReminder() {
        const reminder = document.createElement('div');
        reminder.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: #fff;
            padding: 15px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            z-index: 10000;
            max-width: 300px;
        `;
        reminder.innerHTML = `
            <h3 style="margin: 0 0 10px 0;">Mindful Browsing Reminder</h3>
            <p style="margin: 0;">You've been scrolling for a while. Take a moment to pause and reflect.</p>
        `;
        document.body.appendChild(reminder);
        setTimeout(() => reminder.remove(), 5000);
    }

    async setupYouTubeFocusMode() {
        // Listen for YouTube page changes
        const observer = new MutationObserver(() => {
            if (this.focusMode) {
                this.filterYouTubeContent();
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    async filterYouTubeContent() {
        // Get all video elements
        const videos = document.querySelectorAll('ytd-video-renderer');
        
        // Convert NodeList to Array for easier iteration
        Array.from(videos).forEach(video => {
            const titleElement = video.querySelector('#video-title');
            if (!titleElement) return;

            const title = titleElement.textContent;
            
            // Analyze title sentiment and clickbait patterns
            const isClickbait = this.detectClickbait(title);
            if (isClickbait) {
                // @ts-ignore - HTMLElement style property
                video.style.display = 'none';
            }
        });
    }

    detectClickbait(title: string): boolean {
        const clickbaitPatterns = [
            /you won't believe/i,
            /shocking/i,
            /gone wrong/i,
            /viral/i,
            /must see/i,
            /best ever/i,
            /amazing/i,
            /incredible/i,
            /unbelievable/i,
            /watch this/i
        ];

        return clickbaitPatterns.some(pattern => pattern.test(title));
    }

    toggleFocusMode() {
        this.focusMode = !this.focusMode;
        if (this.focusMode) {
            this.filterYouTubeContent();
        } else {
            // Show all videos
            const videos = document.querySelectorAll('ytd-video-renderer');
            Array.from(videos).forEach(video => {
                // @ts-ignore - HTMLElement style property
                video.style.display = '';
            });
        }
    }
}

// Initialize mindful browsing
const mindfulBrowsing = new MindfulBrowsing();

// Listen for messages from the extension
// @ts-ignore - Chrome API
chrome.runtime.onMessage.addListener((request: any, sender: any, sendResponse: any) => {
    if (request.action === 'toggleFocusMode') {
        mindfulBrowsing.toggleFocusMode();
        sendResponse({ success: true });
    }
}); 