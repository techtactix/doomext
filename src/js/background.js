// Background script for Mindful Browser extension

// Listen for installation
chrome.runtime.onInstalled.addListener(() => {
  console.log('Mindful Browser extension installed');
  
  // Initialize default settings
  chrome.storage.sync.set({
    doomscrollingEnabled: true,
    focusModeEnabled: false
  });
});

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getSettings') {
    chrome.storage.sync.get(['doomscrollingEnabled', 'focusModeEnabled'], (result) => {
      sendResponse(result);
    });
    return true; // Required for async response
  }
}); 