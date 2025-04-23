// Popup script for Mindful Browser extension

document.addEventListener('DOMContentLoaded', () => {
    // Get toggle elements
    const doomscrollingToggle = document.getElementById('doomscrollingToggle');
    const focusModeToggle = document.getElementById('focusModeToggle');

    // Load saved settings
    chrome.storage.sync.get(['doomscrollingEnabled', 'focusModeEnabled'], (result) => {
        doomscrollingToggle.checked = result.doomscrollingEnabled !== false; // Default to true
        focusModeToggle.checked = result.focusModeEnabled || false;
    });

    // Handle doomscrolling toggle
    doomscrollingToggle.addEventListener('change', (e) => {
        const enabled = e.target.checked;
        chrome.storage.sync.set({ doomscrollingEnabled: enabled });
        
        // Notify content script
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            chrome.tabs.sendMessage(tabs[0].id, {
                action: 'toggleDoomscrolling',
                enabled: enabled
            });
        });
    });

    // Handle focus mode toggle
    focusModeToggle.addEventListener('change', (e) => {
        const enabled = e.target.checked;
        chrome.storage.sync.set({ focusModeEnabled: enabled });
        
        // Notify content script
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            chrome.tabs.sendMessage(tabs[0].id, {
                action: 'toggleFocusMode',
                enabled: enabled
            });
        });
    });
}); 