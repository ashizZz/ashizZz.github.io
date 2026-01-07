/**
 * StayUpdated Route Handler
 * Handles clean URL routing for /StayUpdated without .html extension
 * Provides enhanced redirect logic and analytics tracking
 */

(function() {
    'use strict';

    // Configuration
    const CONFIG = {
        targetPath: '/StayUpdated/',
        routePath: '/StayUpdated',
        preserveQuery: true,
        preserveHash: true,
        enableAnalytics: true,
        redirectMethod: 'replace' // 'replace' or 'assign'
    };

    /**
     * Normalize path by removing trailing slashes and ensuring proper format
     * @param {string} path - The path to normalize
     * @returns {string} Normalized path
     */
    function normalizePath(path) {
        return path.replace(/\/+$/, '') || '/';
    }

    /**
     * Check if current path matches the route pattern (case-insensitive)
     * @param {string} pathname - Current pathname
     * @returns {boolean} True if path matches route
     */
    function matchesRoute(pathname) {
        const normalized = normalizePath(pathname);
        const normalizedRoute = normalizePath(CONFIG.routePath);
        
        // Convert to lowercase for case-insensitive comparison
        const lowerNormalized = normalized.toLowerCase();
        const lowerRoute = normalizedRoute.toLowerCase();
        
        // Exact match (case-insensitive)
        if (lowerNormalized === lowerRoute) {
            return true;
        }
        
        // Match with trailing slash (case-insensitive)
        if (lowerNormalized === lowerRoute + '/') {
            return true;
        }
        
        // Match any case variation of StayUpdated (e.g., /stayupdated, /STAYUPDATED, /StayUpdated)
        const routePattern = /^\/stayupdated\/?$/i;
        if (routePattern.test(normalized)) {
            return true;
        }
        
        return false;
    }

    /**
     * Build target URL with query params and hash
     * @returns {string} Complete target URL
     */
    function buildTargetUrl() {
        let targetUrl = CONFIG.targetPath;
        const currentUrl = new URL(window.location.href);
        
        // Preserve query parameters
        if (CONFIG.preserveQuery && currentUrl.search) {
            targetUrl += currentUrl.search;
        }
        
        // Preserve hash fragment
        if (CONFIG.preserveHash && currentUrl.hash) {
            targetUrl += currentUrl.hash;
        }
        
        return targetUrl;
    }

    /**
     * Perform redirect to target URL
     */
    function performRedirect() {
        const targetUrl = buildTargetUrl();
        
        try {
            // Log redirect for debugging (only in development)
            if (window.location.hostname === 'localhost' || 
                window.location.hostname === '127.0.0.1' ||
                window.location.hostname.includes('localhost')) {
                console.log('[StayUpdated] Redirecting:', window.location.pathname, '→', targetUrl);
            }
            
            // Track redirect event if analytics enabled
            if (CONFIG.enableAnalytics) {
                trackRedirect();
            }
            
            // Perform redirect based on configured method
            if (CONFIG.redirectMethod === 'replace') {
                window.location.replace(targetUrl);
            } else {
                window.location.assign(targetUrl);
            }
        } catch (error) {
            console.error('[StayUpdated] Redirect error:', error);
            // Fallback: try direct assignment
            try {
                window.location.href = targetUrl;
            } catch (fallbackError) {
                console.error('[StayUpdated] Fallback redirect failed:', fallbackError);
            }
        }
    }

    /**
     * Track redirect event for analytics
     */
    function trackRedirect() {
        try {
            // Google Analytics 4 (gtag)
            if (typeof gtag !== 'undefined') {
                gtag('event', 'page_redirect', {
                    'from': window.location.pathname,
                    'to': CONFIG.targetPath,
                    'event_category': 'navigation',
                    'event_label': 'StayUpdated Route'
                });
            }
            
            // Universal Analytics (ga)
            if (typeof ga !== 'undefined') {
                ga('send', 'event', 'navigation', 'redirect', 'StayUpdated Route', {
                    'nonInteraction': true
                });
            }
            
            // Custom analytics hook
            if (typeof window.trackEvent === 'function') {
                window.trackEvent('StayUpdated Redirect', {
                    from: window.location.pathname,
                    to: CONFIG.targetPath
                });
            }
        } catch (error) {
            // Silently fail analytics - don't break redirect
            if (window.location.hostname === 'localhost') {
                console.warn('[StayUpdated] Analytics tracking failed:', error);
            }
        }
    }

    /**
     * Clean URL by removing .html extension, index.html, or ensuring proper directory structure
     * Uses history.replaceState to update URL without reload
     * Handles case-insensitive paths
     */
    function cleanUrl() {
        const currentPath = window.location.pathname;
        const currentHref = window.location.href;
        const cleanPath = '/StayUpdated';
        const cleanPathWithSlash = '/StayUpdated/';
        
        // Case-insensitive check for StayUpdated path
        const stayUpdatedPattern = /\/stayupdated/i;
        const isStayUpdatedPath = stayUpdatedPattern.test(currentPath);
        
        let needsCleaning = false;
        let newPath = cleanPathWithSlash;
        
        // Check if URL contains index.html (most common case for directory structure)
        if (currentPath.includes('/index.html') || currentPath.endsWith('index.html') || 
            currentHref.includes('/index.html')) {
            needsCleaning = true;
            // For file:// URLs, extract the directory path (case-insensitive)
            if (isStayUpdatedPath) {
                newPath = currentPath.replace(/\/index\.html.*$/i, '/');
                // Ensure it ends with /StayUpdated/ (normalize case)
                if (!/\/stayupdated\/$/i.test(newPath)) {
                    newPath = newPath.replace(/\/stayupdated.*$/i, '/StayUpdated/');
                }
            } else {
                newPath = cleanPathWithSlash;
            }
        }
        // Check if URL contains .html extension and needs cleaning (case-insensitive)
        else if (/stayupdated\.html/i.test(currentPath) || /stayupdated\.html/i.test(currentHref)) {
            needsCleaning = true;
            newPath = cleanPathWithSlash;
        }
        // Ensure trailing slash for directory structure (case-insensitive)
        else if (currentPath.toLowerCase() === cleanPath.toLowerCase() || 
                 (isStayUpdatedPath && !currentPath.endsWith('/') && !currentPath.includes('.'))) {
            needsCleaning = true;
            newPath = cleanPathWithSlash;
        }
        // Handle case variations (e.g., /stayupdated, /STAYUPDATED) - redirect to canonical /StayUpdated/
        else if (isStayUpdatedPath && currentPath.toLowerCase() !== cleanPathWithSlash.toLowerCase()) {
            needsCleaning = true;
            newPath = cleanPathWithSlash;
        }
        
        if (needsCleaning) {
            const newUrl = newPath + window.location.search + window.location.hash;
            const currentFullUrl = currentPath + window.location.search + window.location.hash;
            
            // Only update if URL actually changed
            if (newUrl !== currentFullUrl) {
                try {
                    window.history.replaceState(
                        { ...window.history.state, cleanUrl: true },
                        document.title,
                        newUrl
                    );
                    
                    // Track URL cleanup
                    if (CONFIG.enableAnalytics) {
                        try {
                            if (typeof gtag !== 'undefined') {
                                gtag('event', 'url_cleanup', {
                                    'from': currentPath,
                                    'to': newPath,
                                    'event_category': 'navigation'
                                });
                            }
                        } catch (e) {
                            // Silently fail
                        }
                    }
                    
                    // Log for debugging
                    if (window.location.hostname === 'localhost' || 
                        window.location.hostname === '127.0.0.1' ||
                        window.location.protocol === 'file:') {
                        console.log('[StayUpdated] URL cleaned:', currentPath, '→', newUrl);
                        console.log('[StayUpdated] Full URL:', currentHref, '→', window.location.origin + newUrl);
                    }
                } catch (error) {
                    console.warn('[StayUpdated] Failed to clean URL:', error);
                    // For file:// URLs, try alternative approach
                    if (window.location.protocol === 'file:') {
                        console.log('[StayUpdated] Note: file:// URLs may not support URL changes in all browsers');
                    }
                }
            }
        }
    }

    /**
     * Initialize route handler
     */
    function init() {
        const currentPath = window.location.pathname;
        const lowerPath = currentPath.toLowerCase();
        
        // Case-insensitive check for StayUpdated path
        const stayUpdatedPattern = /\/stayupdated/i;
        const isStayUpdatedPath = stayUpdatedPattern.test(currentPath);
        
        // If URL contains index.html, clean it immediately
        if (currentPath.includes('/index.html') || currentPath.endsWith('index.html')) {
            cleanUrl();
            return;
        }
        
        // If accessing StayUpdated.html directly (case-insensitive), clean the URL
        if (/stayupdated\.html/i.test(currentPath)) {
            // Clean URL - this will remove .html extension and normalize case
            cleanUrl();
            // Also redirect to canonical URL if case is different
            if (!currentPath.match(/\/StayUpdated\.html$/i)) {
                performRedirect();
            }
            return;
        }
        
        // If on StayUpdated path (case-insensitive), check if case needs normalization
        if (isStayUpdatedPath) {
            // If case is not canonical (/StayUpdated/), redirect to canonical
            if (currentPath !== '/StayUpdated/' && currentPath !== '/StayUpdated') {
                performRedirect();
                return;
            }
            // If already on canonical path, just ensure it's clean
            cleanUrl();
            return;
        }
        
        // Check if we're on the route path (case-insensitive) - redirect to canonical
        if (matchesRoute(currentPath)) {
            // Small delay to ensure DOM is ready (if needed)
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', performRedirect);
            } else {
                // Use requestAnimationFrame for smooth transition
                requestAnimationFrame(() => {
                    performRedirect();
                });
            }
        } else {
            // Always try to clean URL on init
            cleanUrl();
        }
    }

    /**
     * Handle browser back/forward navigation
     */
    function handlePopState() {
        if (matchesRoute(window.location.pathname)) {
            performRedirect();
        }
    }

    /**
     * Handle programmatic navigation (pushState)
     */
    function interceptPushState() {
        const originalPushState = history.pushState;
        history.pushState = function() {
            originalPushState.apply(history, arguments);
            if (matchesRoute(window.location.pathname)) {
                performRedirect();
            }
        };
    }

    /**
     * Handle replaceState navigation
     */
    function interceptReplaceState() {
        const originalReplaceState = history.replaceState;
        history.replaceState = function() {
            originalReplaceState.apply(history, arguments);
            if (matchesRoute(window.location.pathname)) {
                performRedirect();
            }
        };
    }

    // Initialize on page load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            init();
            // Clean URL after initialization (handles direct .html access)
            setTimeout(cleanUrl, 100);
        });
    } else {
        init();
        // Clean URL immediately if already loaded
        setTimeout(cleanUrl, 100);
    }
    
    // Also clean URL on any navigation (handles edge cases)
    window.addEventListener('load', () => {
        setTimeout(cleanUrl, 200);
    });

    // Handle browser navigation events
    window.addEventListener('popstate', handlePopState);
    
    // Intercept programmatic navigation
    interceptPushState();
    interceptReplaceState();

    // Export configuration for external access (optional)
    if (typeof window !== 'undefined') {
        window.StayUpdatedRouter = {
            config: CONFIG,
            redirect: performRedirect,
            matchesRoute: matchesRoute
        };
    }

    // Service Worker compatibility (for PWA)
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.addEventListener('message', function(event) {
            if (event.data && event.data.type === 'navigate' && 
                matchesRoute(event.data.url)) {
                performRedirect();
            }
        });
    }

})();
