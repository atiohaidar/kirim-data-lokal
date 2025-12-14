/* ========================================
   Kirim Data - Shared Utilities
   Reusable helper functions for both modes
   ======================================== */

// ========================================
// UI UTILITIES
// ========================================

/**
 * Show a specific step with animation
 * @param {string} id - The ID of the step to show
 * @param {string} direction - Animation direction: 'right' (default) or 'left'
 */
function showStep(id, direction = 'right') {
    const steps = document.querySelectorAll('.step');
    const newStep = document.getElementById(id);

    if (!newStep) return;

    // Get current active step
    const currentActive = document.querySelector('.step.active');

    if (currentActive && currentActive.id !== id) {
        // Exit animation for current step
        currentActive.style.animation = direction === 'right'
            ? 'slideOutLeft 0.3s ease-out forwards'
            : 'slideOutRight 0.3s ease-out forwards';

        setTimeout(() => {
            currentActive.classList.remove('active');
            currentActive.style.animation = '';
            currentActive.style.display = 'none';
        }, 280);

        // Enter animation for new step
        setTimeout(() => {
            newStep.style.display = 'block';
            newStep.classList.add('active');
            newStep.style.animation = direction === 'right'
                ? 'slideInRight 0.4s ease-out forwards'
                : 'slideInLeft 0.4s ease-out forwards';
        }, 150);
    } else {
        // First load - just show with fade
        steps.forEach(s => {
            s.classList.remove('active');
            s.style.display = 'none';
        });
        newStep.style.display = 'block';
        newStep.classList.add('active');
        newStep.style.animation = 'fadeInUp 0.5s ease-out forwards';
    }
}

/**
 * Reset/reload the application with confirmation
 */
function resetApp() {
    if (confirm('Yakin mau keluar?')) {
        window.location.reload();
    }
}

/**
 * Auto-scroll chat to bottom with smooth scroll
 * @param {string} containerId - The ID of the chat container
 */
function autoScroll(containerId = 'chat-box') {
    const box = document.getElementById(containerId);
    if (box) {
        box.scrollTo({
            top: box.scrollHeight,
            behavior: 'smooth'
        });
    }
}

/**
 * Log a message to the chat box with animation
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

    // Animation is handled by CSS
    box.appendChild(d);

    // Show success effect for sent messages
    if (type === 'me' && typeof showConfetti === 'function') {
        // Small confetti burst for sent messages
        const rect = d.getBoundingClientRect();
        // showConfetti(rect.left + rect.width / 2, rect.top); // Optional: uncomment for confetti on each message
    }

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

// Alias for legacy code
function triggerUpload(inputId) {
    triggerFileInput(inputId);
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
 * Copy text to clipboard with toast notification
 * @param {string} text - Text to copy
 * @param {string} successMessage - Message to show on success
 */
function copyToClipboard(text, successMessage = "Berhasil disalin! 📋") {
    navigator.clipboard.writeText(text).then(() => {
        // Use toast if available, otherwise fallback to alert
        if (typeof showSuccessToast === 'function') {
            showSuccessToast(successMessage);
        } else {
            showToast(successMessage);
        }
    }).catch(err => {
        console.error('Gagal menyalin:', err);
        showToast('Gagal menyalin teks');
    });
}

/**
 * Simple toast notification fallback
 * @param {string} message - Message to display
 */
function showToast(message) {
    // Check if showSuccessToast exists
    if (typeof showSuccessToast === 'function') {
        showSuccessToast(message);
        return;
    }

    // Fallback toast
    const existing = document.querySelector('.copy-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'copy-toast';
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        bottom: 30px;
        left: 50%;
        transform: translateX(-50%);
        background: linear-gradient(135deg, #10b981 0%, #059669 100%);
        color: white;
        padding: 12px 24px;
        border-radius: 12px;
        font-weight: 600;
        box-shadow: 0 4px 20px rgba(16, 185, 129, 0.4);
        z-index: 9999;
        animation: fadeInUp 0.4s ease-out;
    `;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'fadeOut 0.3s ease-out forwards';
        setTimeout(() => toast.remove(), 300);
    }, 2000);
}

// ========================================
// TOGGLE UTILITIES
// ========================================

/**
 * Toggle visibility of an element with animation
 * @param {string} id - Element ID to toggle
 */
function toggleVisibility(id) {
    const el = document.getElementById(id);
    if (!el) return;

    if (el.style.display === 'block') {
        el.style.animation = 'fadeOut 0.2s ease-out forwards';
        setTimeout(() => {
            el.style.display = 'none';
            el.style.animation = '';
        }, 200);
    } else {
        el.style.display = 'block';
        el.style.animation = 'fadeInUp 0.3s ease-out forwards';
    }
}

// Alias for legacy code
function toggleManual(id) {
    toggleVisibility(id);
}

// ========================================
// SHOW/FUNCTION ALIASES FOR NATIVE.HTML
// ========================================

/**
 * Alias for showStep used in native.html
 */
function show(id) {
    showStep(id);
}
