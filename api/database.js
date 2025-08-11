// Database Management System for MathsMayhem
// Handles user data, subscriptions, progress, and ensures data persistence

class DatabaseManager {
    constructor() {
        this.users = new Map();
        this.subscriptions = new Map();
        this.progress = new Map();
        this.achievements = new Map();
        
        // Load existing data from localStorage as migration
        this.migrateLocalStorageData();
        
        // Auto-save data periodically
        this.startAutoSave();
    }

    // Migrate existing localStorage data to prevent data loss
    migrateLocalStorageData() {
        try {
            // Check if we're in browser environment
            if (typeof localStorage !== 'undefined') {
                const currentUser = localStorage.getItem('currentUser');
                if (currentUser) {
                    // Migrate user data
                    const userData = {
                        username: currentUser,
                        email: localStorage.getItem('userEmail') || `${currentUser}@mathsmayhem.com`,
                        password: localStorage.getItem('userPassword') || 'migrated',
                        createdAt: localStorage.getItem('userCreatedAt') || new Date().toISOString(),
                        lastLogin: new Date().toISOString()
                    };
                    this.users.set(currentUser, userData);

                    // Migrate subscription data
                    const subscriptionData = {
                        plan: localStorage.getItem('subscriptionPlan') || 'free',
                        startDate: localStorage.getItem('subscriptionStartDate') || new Date().toISOString(),
                        isTrialUser: localStorage.getItem('isTrialUser') === 'true',
                        trialStartDate: localStorage.getItem('trialStartDate'),
                        trialEndDate: localStorage.getItem('trialEndDate'),
                        hasUsedTrial: localStorage.getItem('hasUsedTrial') === 'true',
                        subscriptionId: localStorage.getItem('subscriptionId'),
                        hasPaymentMethod: localStorage.getItem('hasPaymentMethod') === 'true',
                        cardLast4: localStorage.getItem('cardLast4'),
                        cardType: localStorage.getItem('cardType'),
                        cardExpiry: localStorage.getItem('cardExpiry'),
                        cardholderName: localStorage.getItem('cardholderName')
                    };
                    this.subscriptions.set(currentUser, subscriptionData);

                    // Migrate progress data
                    const progressData = {
                        quizzesCompleted: parseInt(localStorage.getItem('quizzesCompleted')) || 0,
                        correctAnswers: parseInt(localStorage.getItem('correctAnswers')) || 0,
                        totalScore: parseInt(localStorage.getItem('totalScore')) || 0,
                        streak: parseInt(localStorage.getItem('currentStreak')) || 0,
                        bestStreak: parseInt(localStorage.getItem('bestStreak')) || 0,
                        lastQuizDate: localStorage.getItem('lastQuizDate'),
                        dailyQuizCount: parseInt(localStorage.getItem('dailyQuizCount')) || 0,
                        themes: localStorage.getItem('selectedTheme') || 'default'
                    };
                    this.progress.set(currentUser, progressData);

                    console.log('✅ User data migrated successfully from localStorage');
                }
            }
        } catch (error) {
            console.error('Migration error:', error);
        }
    }

    // User Management
    async createUser(username, email, password) {
        if (this.users.has(username)) {
            return { success: false, error: 'Username already exists' };
        }

        const userData = {
            username,
            email,
            password: this.hashPassword(password),
            createdAt: new Date().toISOString(),
            lastLogin: new Date().toISOString(),
            verified: true
        };

        this.users.set(username, userData);
        
        // Initialize user's subscription and progress
        this.initializeUserData(username);
        
        await this.saveToBackend();
        
        return { 
            success: true, 
            user: { username, email, createdAt: userData.createdAt } 
        };
    }

    async loginUser(username, password) {
        const user = this.users.get(username);
        if (!user) {
            return { success: false, error: 'User not found' };
        }

        if (!this.verifyPassword(password, user.password)) {
            return { success: false, error: 'Invalid password' };
        }

        // Update last login
        user.lastLogin = new Date().toISOString();
        await this.saveToBackend();

        return { 
            success: true, 
            user: { username, email: user.email, lastLogin: user.lastLogin }
        };
    }

    // Subscription Management
    async updateSubscription(username, subscriptionData) {
        const currentSub = this.subscriptions.get(username) || {};
        const updatedSub = { ...currentSub, ...subscriptionData };
        
        this.subscriptions.set(username, updatedSub);
        await this.saveToBackend();
        
        return { success: true, subscription: updatedSub };
    }

    async getSubscription(username) {
        return this.subscriptions.get(username) || { plan: 'free' };
    }

    // Progress Management
    async updateProgress(username, progressData) {
        const currentProgress = this.progress.get(username) || {};
        const updatedProgress = { ...currentProgress, ...progressData };
        
        this.progress.set(username, updatedProgress);
        await this.saveToBackend();
        
        return { success: true, progress: updatedProgress };
    }

    async getProgress(username) {
        return this.progress.get(username) || {
            quizzesCompleted: 0,
            correctAnswers: 0,
            totalScore: 0,
            streak: 0,
            bestStreak: 0
        };
    }

    // Data Persistence
    async saveToBackend() {
        try {
            // In a real implementation, this would save to a database
            // For now, we'll use a hybrid approach with localStorage backup
            if (typeof localStorage !== 'undefined') {
                const backupData = {
                    users: Object.fromEntries(this.users),
                    subscriptions: Object.fromEntries(this.subscriptions),
                    progress: Object.fromEntries(this.progress),
                    achievements: Object.fromEntries(this.achievements),
                    lastBackup: new Date().toISOString()
                };
                
                localStorage.setItem('mathsMayhemBackup', JSON.stringify(backupData));
            }
            
            // TODO: Implement real database saving here
            // await fetch('/api/save-user-data', { method: 'POST', body: JSON.stringify(backupData) });
            
            return { success: true };
        } catch (error) {
            console.error('Save error:', error);
            return { success: false, error: error.message };
        }
    }

    async loadFromBackend() {
        try {
            // Load from localStorage backup first
            if (typeof localStorage !== 'undefined') {
                const backup = localStorage.getItem('mathsMayhemBackup');
                if (backup) {
                    const data = JSON.parse(backup);
                    this.users = new Map(Object.entries(data.users || {}));
                    this.subscriptions = new Map(Object.entries(data.subscriptions || {}));
                    this.progress = new Map(Object.entries(data.progress || {}));
                    this.achievements = new Map(Object.entries(data.achievements || {}));
                    
                    console.log('✅ Data loaded from backup successfully');
                }
            }
            
            // TODO: Load from real database
            // const response = await fetch('/api/load-user-data');
            // const data = await response.json();
            
            return { success: true };
        } catch (error) {
            console.error('Load error:', error);
            return { success: false, error: error.message };
        }
    }

    // Initialize user data
    initializeUserData(username) {
        if (!this.subscriptions.has(username)) {
            this.subscriptions.set(username, {
                plan: 'free',
                startDate: new Date().toISOString(),
                isTrialUser: false,
                hasUsedTrial: false,
                hasPaymentMethod: false
            });
        }

        if (!this.progress.has(username)) {
            this.progress.set(username, {
                quizzesCompleted: 0,
                correctAnswers: 0,
                totalScore: 0,
                streak: 0,
                bestStreak: 0,
                themes: 'default'
            });
        }
    }

    // Auto-save functionality
    startAutoSave() {
        if (typeof setInterval !== 'undefined') {
            setInterval(() => {
                this.saveToBackend();
            }, 30000); // Save every 30 seconds
        }
    }

    // Utility functions
    hashPassword(password) {
        // Simple hash for demo - use bcrypt in production
        return btoa(password + 'mathsmayhem_salt');
    }

    verifyPassword(password, hash) {
        return btoa(password + 'mathsmayhem_salt') === hash;
    }

    // Data Export/Import for migrations
    exportUserData(username) {
        return {
            user: this.users.get(username),
            subscription: this.subscriptions.get(username),
            progress: this.progress.get(username),
            achievements: this.achievements.get(username)
        };
    }

    importUserData(username, data) {
        if (data.user) this.users.set(username, data.user);
        if (data.subscription) this.subscriptions.set(username, data.subscription);
        if (data.progress) this.progress.set(username, data.progress);
        if (data.achievements) this.achievements.set(username, data.achievements);
        
        this.saveToBackend();
    }
}

// Global database instance
const dbManager = new DatabaseManager();

// Export for Node.js environment
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { DatabaseManager, dbManager };
}

// Make available globally for browser
if (typeof window !== 'undefined') {
    window.dbManager = dbManager;
}
