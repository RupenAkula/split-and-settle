/**
 * js/app.js
 * Split & Settle - Main Entry Point
 * 
 * This file is the primary entry point for the application. It is responsible for
 * bootstrapping the app by initializing the core state from localStorage and 
 * rendering the initial home screen. It handles global unhandled promise rejections
 * and provides a fallback UI if the initial boot fails.
 */

import { loadState } from './state.js';
import { renderHome } from './screens/home.js';

/**
 * Initializes the application synchronously acting as the main bootstrap thread.
 */
async function init() {
    try {
        // Hydrate persistent state from localStorage
        loadState();
        
        // Render the primary starting view
        renderHome();
        
        console.log('Split & Settle initialized - v1.0.0');
    } catch (error) {
        console.error('Failed to initialize application:', error);
        
        const appEl = document.getElementById('app');
        if (appEl) {
            // Draw a raw inline fallback UI to circumvent structural CSS/HTML dependencies natively
            appEl.innerHTML = `
                <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; padding: 24px; text-align: center; font-family: system-ui, sans-serif;">
                    <div style="font-size: 48px; margin-bottom: 16px;">⚠️</div>
                    <h2 style="margin-bottom: 8px; color: #1a1a1a;">App Initialization Error</h2>
                    <p style="margin-bottom: 24px; color: #666; max-width: 300px; font-size: 14px;">Something went wrong loading the app. Please refresh.</p>
                    <button id="fallback-refresh-btn" style="background: #00A67E; color: white; border: none; padding: 12px 24px; border-radius: 8px; font-weight: 500; font-size: 16px; cursor: pointer;">Refresh</button>
                </div>
            `;
            
            document.getElementById('fallback-refresh-btn')?.addEventListener('click', () => {
                window.location.reload();
            });
        }
    }
}

// Ensure the DOM is fully loaded before kicking off the first render tick
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

// Global anchor to catch and trace stray unhandled promises via our async route loaders
window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
});
