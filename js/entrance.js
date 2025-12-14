/* ========================================
   Kirim Data - Entrance & Effects
   Splash screen and cinematic effects
   ======================================== */

// ========================================
// SPLASH SCREEN
// ========================================

/**
 * Initialize splash screen and entrance animation
 */
function initSplashScreen() {
    const splash = document.getElementById('splash-screen');
    if (!splash) return;

    // Hide splash after animation
    setTimeout(() => {
        splash.classList.add('hidden');

        // Trigger stagger animations on main content
        triggerEntranceAnimations();

        // Remove splash from DOM after transition
        setTimeout(() => {
            splash.remove();
        }, 500);
    }, 1500);
}

/**
 * Trigger staggered entrance animations
 */
function triggerEntranceAnimations() {
    const elements = document.querySelectorAll('.entrance-animate');
    elements.forEach((el, index) => {
        el.style.animationDelay = `${index * 0.1}s`;
        el.classList.add('animate-fadeInUp');
    });
}

// ========================================
// RIPPLE EFFECT
// ========================================

/**
 * Create ripple effect on button click
 * @param {Event} event - Click event
 */
function createRipple(event) {
    const button = event.currentTarget;

    // Remove existing ripples
    const existingRipple = button.querySelector('.ripple');
    if (existingRipple) {
        existingRipple.remove();
    }

    // Create ripple element
    const ripple = document.createElement('span');
    ripple.classList.add('ripple');

    // Calculate position
    const rect = button.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = event.clientX - rect.left - size / 2;
    const y = event.clientY - rect.top - size / 2;

    // Apply styles
    ripple.style.width = ripple.style.height = `${size}px`;
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;

    button.appendChild(ripple);

    // Remove after animation
    setTimeout(() => ripple.remove(), 600);
}

/**
 * Initialize ripple effects on all buttons
 */
function initRippleEffects() {
    document.querySelectorAll('.btn:not(.text-link)').forEach(btn => {
        btn.addEventListener('click', createRipple);
    });
}

// ========================================
// SUCCESS EFFECTS
// ========================================

/**
 * Show confetti burst effect
 * @param {number} x - X position (optional, defaults to center)
 * @param {number} y - Y position (optional, defaults to center)
 */
function showConfetti(x = window.innerWidth / 2, y = window.innerHeight / 2) {
    const colors = ['#6366f1', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#ec4899'];
    const particleCount = 30;

    for (let i = 0; i < particleCount; i++) {
        createParticle(x, y, colors[Math.floor(Math.random() * colors.length)]);
    }
}

/**
 * Create a single confetti particle
 */
function createParticle(x, y, color) {
    const particle = document.createElement('div');
    particle.className = 'success-particle';
    particle.style.cssText = `
        left: ${x}px;
        top: ${y}px;
        background: ${color};
        transform: translate(-50%, -50%) scale(${Math.random() * 0.5 + 0.5});
    `;

    // Random direction
    const angle = Math.random() * Math.PI * 2;
    const velocity = Math.random() * 100 + 50;
    const vx = Math.cos(angle) * velocity;
    const vy = Math.sin(angle) * velocity;

    document.body.appendChild(particle);

    // Animate
    let currentX = x;
    let currentY = y;
    let opacity = 1;

    const animate = () => {
        currentX += vx * 0.02;
        currentY += vy * 0.02 + 2; // gravity
        opacity -= 0.02;

        particle.style.left = `${currentX}px`;
        particle.style.top = `${currentY}px`;
        particle.style.opacity = opacity;

        if (opacity > 0) {
            requestAnimationFrame(animate);
        } else {
            particle.remove();
        }
    };

    requestAnimationFrame(animate);
}

/**
 * Show success toast notification
 * @param {string} message - Message to display
 */
function showSuccessToast(message) {
    // Remove existing toast
    const existingToast = document.querySelector('.copy-toast');
    if (existingToast) existingToast.remove();

    // Create toast
    const toast = document.createElement('div');
    toast.className = 'copy-toast';
    toast.textContent = message;
    document.body.appendChild(toast);

    // Show toast
    requestAnimationFrame(() => {
        toast.classList.add('show');
    });

    // Hide and remove
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400);
    }, 2000);
}

// ========================================
// RADAR/WAVE ANIMATION
// ========================================

/**
 * Create radar wave animation element
 * @returns {HTMLElement} Radar container element
 */
function createRadarAnimation() {
    const container = document.createElement('div');
    container.className = 'radar-container';
    container.innerHTML = `
        <div class="radar-wave"></div>
        <div class="radar-wave"></div>
        <div class="radar-wave"></div>
        <div class="radar-wave"></div>
        <div class="radar-center"></div>
    `;
    return container;
}

// ========================================
// STEP TRANSITIONS
// ========================================

let currentStep = null;

/**
 * Enhanced showStep with animations
 * @param {string} id - Step ID to show
 * @param {string} direction - 'left' or 'right' for slide direction
 */
function showStepAnimated(id, direction = 'right') {
    const steps = document.querySelectorAll('.step');
    const newStep = document.getElementById(id);

    if (!newStep) return;

    // Exit current step
    steps.forEach(step => {
        if (step.classList.contains('active') && step.id !== id) {
            step.style.animation = direction === 'right'
                ? 'slideOutLeft 0.3s ease-out forwards'
                : 'slideOutRight 0.3s ease-out forwards';

            setTimeout(() => {
                step.classList.remove('active');
                step.style.animation = '';
            }, 300);
        }
    });

    // Enter new step
    setTimeout(() => {
        newStep.classList.add('active');
        newStep.style.animation = direction === 'right'
            ? 'slideInRight 0.4s ease-out forwards'
            : 'slideInLeft 0.4s ease-out forwards';
    }, 150);

    currentStep = id;
}

// ========================================
// INITIALIZATION
// ========================================

document.addEventListener('DOMContentLoaded', () => {
    // Initialize splash screen
    initSplashScreen();

    // Initialize ripple effects
    initRippleEffects();

    // Re-initialize ripples when DOM changes (for dynamically added buttons)
    const observer = new MutationObserver(() => {
        initRippleEffects();
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
});
