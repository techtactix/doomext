// Options page script for Mindful Browser extension

document.addEventListener('DOMContentLoaded', () => {
  // Get form elements
  const doomscrollingToggle = document.getElementById('doomscrollingEnabled');
  const sensitivitySelect = document.getElementById('sensitivity');
  const focusModeToggle = document.getElementById('focusModeEnabled');
  const filterStrengthSelect = document.getElementById('filterStrength');
  const saveButton = document.getElementById('saveButton');

  // Load saved settings
  chrome.storage.sync.get([
    'doomscrollingEnabled',
    'sensitivity',
    'focusModeEnabled',
    'filterStrength'
  ], (result) => {
    doomscrollingToggle.checked = result.doomscrollingEnabled !== false; // Default to true
    sensitivitySelect.value = result.sensitivity || 'medium';
    focusModeToggle.checked = result.focusModeEnabled || false;
    filterStrengthSelect.value = result.filterStrength || 'medium';
  });

  // Save settings when button is clicked
  saveButton.addEventListener('click', () => {
    const settings = {
      doomscrollingEnabled: doomscrollingToggle.checked,
      sensitivity: sensitivitySelect.value,
      focusModeEnabled: focusModeToggle.checked,
      filterStrength: filterStrengthSelect.value
    };

    chrome.storage.sync.set(settings, () => {
      // Show save confirmation
      const status = document.createElement('div');
      status.textContent = 'Options saved!';
      status.style.cssText = `
        position: fixed;
        top: 10px;
        right: 10px;
        background: #4CAF50;
        color: white;
        padding: 10px;
        border-radius: 4px;
        z-index: 1000;
      `;
      document.body.appendChild(status);
      setTimeout(() => status.remove(), 2000);
    });
  });
}); 