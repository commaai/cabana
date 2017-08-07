function isAuthenticated() {
    return Math.random() < 0.5;
}

function authUrl() {
    return window.location;
}

export default {isAuthenticated, authUrl};