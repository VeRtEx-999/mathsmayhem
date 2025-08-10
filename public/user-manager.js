// Simple client-side user storage using localStorage
class UserManager {
    constructor() {
        this.users = JSON.parse(localStorage.getItem('mathsUsers') || '[]');
    }

    register(username, password) {
        // Check if user already exists
        if (this.users.find(u => u.username === username)) {
            throw new Error('Username already taken');
        }

        // Add new user
        this.users.push({ username, password });
        localStorage.setItem('mathsUsers', JSON.stringify(this.users));
        return true;
    }

    login(username, password) {
        const user = this.users.find(u => u.username === username && u.password === password);
        if (!user) {
            throw new Error('Invalid credentials');
        }

        // Set current user
        localStorage.setItem('currentUser', username);
        return true;
    }

    logout() {
        localStorage.removeItem('currentUser');
    }

    getCurrentUser() {
        return localStorage.getItem('currentUser');
    }

    isLoggedIn() {
        return !!this.getCurrentUser();
    }
}

// Make it globally available
window.userManager = new UserManager();
