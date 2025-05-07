// Mindful Browsing Content Script
import { YouTubeModifier } from './youtube-modifier';

class MindfulBrowsing {
    private scrollStartTime: number;
    private lastScrollPosition: number;
    private scrollCount: number;
    private isDoomscrolling: boolean;
    private focusMode: boolean;
    private lastReminderTime: number;
    private readonly REMINDER_COOLDOWN = 600000; // 10 minutes between reminders
    private readonly SCROLL_THRESHOLD = 100; // Number of scroll events
    private readonly TIME_THRESHOLD = 30000; // 2 minute time window
    private readonly RAPID_SCROLL_THRESHOLD = 800; // Rapid scroll detection (pixels)
    private readonly SCROLL_RESET_TIME = 15000; // Reset after 15 seconds of no scrolling
    private readonly REMINDER_DELAY = 1000; // 8 second delay before showing reminder
    private isShorts: boolean = false;
    private youtubeModifier: YouTubeModifier;
    private scrollTimer: number | null = null;
    private reminderTimer: number | null = null;

    constructor() {
        console.log('MindfulBrowsing: Initializing...');
        this.scrollStartTime = Date.now();
        this.lastScrollPosition = window.scrollY;
        this.scrollCount = 0;
        this.isDoomscrolling = false;
        this.focusMode = false;
        this.lastReminderTime = 0;
        this.youtubeModifier = new YouTubeModifier();
        this.initialize();
    }

    async initialize(): Promise<void> {
        console.log('MindfulBrowsing: Setting up...');
        
        // Add scroll event listener
        window.addEventListener('scroll', this.handleScroll.bind(this));
        console.log('MindfulBrowsing: Scroll listener added');
        
        // Check if we're on YouTube
        if (window.location.hostname === 'www.youtube.com') {
            console.log('MindfulBrowsing: YouTube detected, setting up focus mode');
            this.setupYouTubeFocusMode();
            
            // Check if we're on Shorts
            this.checkAndUpdateShortsStatus();
            // Listen for URL changes to detect switching to/from Shorts
            setInterval(() => this.checkAndUpdateShortsStatus(), 1000);
        }
    }

    private checkAndUpdateShortsStatus(): void {
        const wasShorts = this.isShorts;
        this.isShorts = window.location.pathname.includes('/shorts');
        if (this.isShorts !== wasShorts) {
            console.log('MindfulBrowsing: Shorts status changed:', this.isShorts);
            this.resetScrollTracking();
        }
    }

    private resetScrollTracking(): void {
        this.scrollCount = 0;
        this.scrollStartTime = Date.now();
        this.isDoomscrolling = false;
        this.lastScrollPosition = window.scrollY;
        
        // Clear any existing timers
        if (this.scrollTimer) {
            clearTimeout(this.scrollTimer);
            this.scrollTimer = null;
        }
        
        if (this.reminderTimer) {
            clearTimeout(this.reminderTimer);
            this.reminderTimer = null;
        }
    }

    async handleScroll(): Promise<void> {
        // Clear any existing timers
        if (this.scrollTimer) {
            clearTimeout(this.scrollTimer);
        }
        
        const currentTime = Date.now();
        const timeSpent = currentTime - this.scrollStartTime;
        const scrollDelta = Math.abs(window.scrollY - this.lastScrollPosition);
        
        // Only count significant scrolls (more than 50 pixels)
        if (scrollDelta > 50) {
            this.scrollCount++;
            console.log(`MindfulBrowsing: Scroll count: ${this.scrollCount}`);
        }
        this.lastScrollPosition = window.scrollY;

        // Detect rapid scrolling (more than 500 pixels in less than 1 second)
        if (scrollDelta > this.RAPID_SCROLL_THRESHOLD && timeSpent < 1000) {
            this.scrollCount += 2;
            console.log('MindfulBrowsing: Rapid scroll detected');
        }

        // Check for doomscrolling patterns with cooldown
        if (this.scrollCount > this.SCROLL_THRESHOLD && 
            timeSpent < this.TIME_THRESHOLD && 
            !this.isDoomscrolling &&
            (currentTime - this.lastReminderTime) > this.REMINDER_COOLDOWN) {
            console.log('MindfulBrowsing: Doomscrolling detected!');
            this.isDoomscrolling = true;
            this.lastReminderTime = currentTime;
            
            // Add 5 second delay before showing reminder
            if (this.reminderTimer) {
                clearTimeout(this.reminderTimer);
            }
            
            this.reminderTimer = window.setTimeout(() => {
                this.showDoomscrollingReminder();
            }, this.REMINDER_DELAY);
        }

        // Reset counters if user hasn't scrolled for 10 seconds
        this.scrollTimer = window.setTimeout(() => {
            console.log('MindfulBrowsing: Resetting counters');
            this.resetScrollTracking();
        }, this.SCROLL_RESET_TIME);
    }

    showDoomscrollingReminder(): void {
        console.log('MindfulBrowsing: Showing reminder');
        const reminder = document.createElement('div');
        reminder.className = 'mindful-reminder mindful-animate-in';
        reminder.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(26, 26, 26, 0.95);
            color: white;
            padding: 24px;
            border-radius: 16px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
            z-index: 10000;
            max-width: 400px;
            text-align: center;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            border: 1px solid rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(8px);
        `;
        
        const message = this.isShorts ? 
            "You've been watching Shorts for a while. Take a break?" :
            "You've been scrolling for a while. Take a moment to pause and reflect.";

        const icon = this.isShorts ? '🎬' : '⏸️';

        reminder.innerHTML = `
            <div style="font-size: 32px; margin-bottom: 16px;">${icon}</div>
            <h3 style="margin: 0 0 12px 0; color: #1a73e8; font-size: 20px; font-weight: 600;">Mindful Moment</h3>
            <p style="margin: 0 0 20px 0; color: rgba(255, 255, 255, 0.9); line-height: 1.5;">${message}</p>
            <div style="display: flex; gap: 12px; justify-content: center;">
                <button class="mindful-button primary" style="
                    background: #1a73e8;
                    color: white;
                    border: none;
                    padding: 10px 20px;
                    border-radius: 8px;
                    cursor: pointer;
                    font-weight: 500;
                    transition: all 0.2s ease;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    font-size: 14px;
                ">Take a Break</button>
                <button class="mindful-button secondary" style="
                    background: transparent;
                    color: #dc3545;
                    border: 2px solid #dc3545;
                    padding: 10px 20px;
                    border-radius: 8px;
                    cursor: pointer;
                    font-weight: 500;
                    transition: all 0.2s ease;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    font-size: 14px;
                ">Continue</button>
            </div>
        `;

        document.body.appendChild(reminder);
        
        // Add hover effects
        const buttons = reminder.querySelectorAll('button');
        buttons.forEach(button => {
            button.addEventListener('mouseover', () => {
                if (button.classList.contains('primary')) {
                    button.style.background = '#1557b0';
                } else {
                    button.style.background = 'rgba(220, 53, 69, 0.1)';
                }
            });
            button.addEventListener('mouseout', () => {
                if (button.classList.contains('primary')) {
                    button.style.background = '#1a73e8';
                } else {
                    button.style.background = 'transparent';
                }
            });
        });

        // Handle button clicks
        const [takeBreakBtn, continueBtn] = buttons;
        takeBreakBtn.onclick = () => {
            reminder.remove();
            // Close the current tab instead of scrolling to top
            chrome.runtime.sendMessage({ action: 'closeCurrentTab' });
        };
        continueBtn.onclick = () => reminder.remove();

        // Add fade out animation before removal
        setTimeout(() => {
            reminder.style.transition = 'opacity 0.5s ease';
            reminder.style.opacity = '0';
            setTimeout(() => reminder.remove(), 500);
        }, 9500);
    }

    private setupYouTubeFocusMode(): void {
        // Initial setup is handled by YouTubeModifier
        console.log('MindfulBrowsing: YouTube focus mode ready');
    }

    toggleFocusMode(): void {
        this.focusMode = !this.focusMode;
        if (this.focusMode) {
            // Get the current search query or video topic
            const url = new URL(window.location.href);
            let topic = '';
            
            if (url.pathname === '/results') {
                topic = url.searchParams.get('search_query') || '';
            } else if (url.pathname === '/watch') {
                const videoTitle = document.querySelector('h1.ytd-video-primary-info-renderer')?.textContent || '';
                topic = videoTitle;
            }

            if (topic) {
                this.youtubeModifier.activate(topic);
            }
        } else {
            this.youtubeModifier.deactivate();
        }
    }
}

// Initialize mindful browsing
console.log('MindfulBrowsing: Starting extension...');
const mindfulBrowsing = new MindfulBrowsing();

// Listen for messages from the extension
chrome.runtime.onMessage.addListener((request: any, sender: any, sendResponse: any) => {
    console.log('MindfulBrowsing: Received message:', request);
    if (request.action === 'toggleFocusMode') {
        mindfulBrowsing.toggleFocusMode();
        sendResponse({ success: true });
    }
}); 