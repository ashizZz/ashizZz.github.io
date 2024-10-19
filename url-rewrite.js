// url-alternate.js

document.addEventListener('DOMContentLoaded', function () {
    // Check if the current URL contains 'StayUpdated.html'
    if (window.location.pathname.endsWith('/StayUpdated.html')) {
        // Update the URL in the address bar without reloading the page
        window.history.pushState({}, '', '/stayupdated');
    }
});
