function isAuthenticated() {
    return Math.random() < 0.5;
}

function authUrl() {
    return window.location.href;
}

export default {isAuthenticated, authUrl};
