/* ========================================
   Kirim Data - Shared Utilities
   Reusable helper functions for both modes
   ======================================== */

// ========================================
// UI UTILITIES
// ========================================

/**
 * Show a specific step and hide others
 * @param {string} id - The ID of the step to show
 */
function showStep(id) {
    document.querySelectorAll('.step').forEach(s => s.classList.remove('active'));
    document.getElementById(id).classList.add('active');
}

/**
 * Reset/reload the application
 */
function resetApp() {
    window.location.reload();
}

/**
 * Auto-scroll chat to bottom
 * @param {string} containerId - The ID of the chat container
 */
function autoScroll(containerId = 'chat-box') {
    const box = document.getElementById(containerId);
    if (box) box.scrollTop = box.scrollHeight;
}

/**
 * Log a message to the chat box
 * @param {string} msg - The message content (can be HTML)
 * @param {string} type - Message type: 'me', 'peer', or 'system'
 * @param {string} containerId - The ID of the chat container
 */
function log(msg, type = 'system', containerId = 'chat-box') {
    const box = document.getElementById(containerId);
    if (!box) return;

    const d = document.createElement('div');
    d.className = `msg ${type}`;
    d.innerHTML = msg;
    box.appendChild(d);
    autoScroll(containerId);
}

// ========================================
// FILE UTILITIES
// ========================================

/**
 * Format bytes to human readable string
 * @param {number} bytes - The number of bytes
 * @returns {string} Formatted string (e.g., "1.5 MB")
 */
function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Trigger a file input click
 * @param {string} inputId - The ID of the file input
 */
function triggerFileInput(inputId) {
    document.getElementById(inputId).click();
}

/**
 * Generate a unique file ID
 * @returns {string} Unique ID
 */
function generateFileId() {
    return Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// ========================================
// ID/CODE UTILITIES
// ========================================

/**
 * Generate a random 4-digit room ID
 * @returns {string} 4-digit ID
 */
function generateId() {
    return Math.floor(1000 + Math.random() * 9000).toString();
}

/**
 * Copy text to clipboard
 * @param {string} text - Text to copy
 * @param {string} successMessage - Message to show on success
 */
function copyToClipboard(text, successMessage = "Disalin!") {
    navigator.clipboard.writeText(text).then(() => {
        alert(successMessage);
    }).catch(err => {
        console.error('Failed to copy:', err);
    });
}

// ========================================
// TOGGLE UTILITIES
// ========================================

/**
 * Toggle visibility of an element
 * @param {string} id - Element ID to toggle
 */
function toggleVisibility(id) {
    const el = document.getElementById(id);
    if (el) {
        el.style.display = (el.style.display === 'block') ? 'none' : 'block';
    }
}
