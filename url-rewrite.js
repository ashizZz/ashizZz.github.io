// url-rewrite.js

// Check if the URL contains 'StayUpdated.html'
if (window.location.pathname === '/StayUpdated.html') {
    // Replace the URL in the browser address bar without reloading the page
    window.history.replaceState(null, null, '/StayUpdated');
}
