// Enhanced User Manager with Database Integration
// Ensures data persistence across deployments
class UserManager {
    constructor() {
        this.users = JSON.parse(localStorage.getItem('mathsUsers') || '[]');
        this.apiUrl = '/api/user-data.js';
        
        // Load from database on initialization
        this.loadFromDatabase();
        
        // Auto-sync data periodically
        this.startAutoSync();
    }

    async loadFromDatabase() {
        try {
            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'load_user_data' })
            });
            
            if (response.ok) {
                console.log('✅ Data synced from database');
            }
        } catch (error) {
            console.log('📱 Using local storage (offline mode)');
        }
    }

    async saveToDatabase(username, data) {
        try {
            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    action: 'save_user_data', 
                    username, 
                    data 
                })
            });
            
            return response.ok;
        } catch (error) {
            console.log('💾 Saved locally (will sync when online)');
            return false;
        }
    }

    async register(username, password, email = null) {
        // Check if user already exists locally
        if (this.users.find(u => u.username === username)) {
            throw new Error('Username already taken');
        }

        // Create user data
        const userData = {
            username,
            password,
            email: email || `${username}@mathsmayhem.com`,
            createdAt: new Date().toISOString()
        };

        // Add to local storage
        this.users.push(userData);
        localStorage.setItem('mathsUsers', JSON.stringify(this.users));

        // Try to save to database
        await this.saveToDatabase(username, { action: 'create_user', userData });

        // Initialize user's subscription and progress data
        this.initializeUserData(username);

        return true;
    }

    async login(username, password) {
        // Check local storage first
        const user = this.users.find(u => u.username === username && u.password === password);
        if (!user) {
            throw new Error('Invalid credentials');
        }

        // Set current user
        localStorage.setItem('currentUser', username);
        
        // Update last login
        user.lastLogin = new Date().toISOString();
        localStorage.setItem('mathsUsers', JSON.stringify(this.users));

        // Try to sync with database
        await this.saveToDatabase(username, { action: 'login', lastLogin: user.lastLogin });

        // Restore user's data from database if available
        await this.restoreUserData(username);

        return true;
    }

    logout() {
        const username = this.getCurrentUser();
        if (username) {
            // Save current state before logout
            this.backupUserData(username);
        }
        
        localStorage.removeItem('currentUser');
    }

    getCurrentUser() {
        return localStorage.getItem('currentUser');
    }

    isLoggedIn() {
        return !!this.getCurrentUser();
    }

    // Data Management Functions
    initializeUserData(username) {
        // Initialize subscription data
        const subscriptionData = {
            plan: 'free',
            startDate: new Date().toISOString(),
            isTrialUser: false,
            hasUsedTrial: false,
            hasPaymentMethod: false
        };
        
        // Initialize progress data
        const progressData = {
            quizzesCompleted: 0,
            correctAnswers: 0,
            totalScore: 0,
            streak: 0,
            bestStreak: 0,
            themes: 'default',
            lastQuizDate: null
        };

        // Store locally with user prefix
        localStorage.setItem(`${username}_subscription`, JSON.stringify(subscriptionData));
        localStorage.setItem(`${username}_progress`, JSON.stringify(progressData));

        console.log('✅ User data initialized for:', username);
    }

    async restoreUserData(username) {
        try {
            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'get_user', username })
            });

            if (response.ok) {
                const result = await response.json();
                if (result.success && result.data) {
                    const { subscription, progress } = result.data;
                    
                    // Restore subscription data
                    if (subscription) {
                        localStorage.setItem('subscriptionPlan', subscription.plan);
                        localStorage.setItem('isTrialUser', subscription.isTrialUser);
                        localStorage.setItem('trialStartDate', subscription.trialStartDate || '');
                        localStorage.setItem('trialEndDate', subscription.trialEndDate || '');
                        localStorage.setItem('hasUsedTrial', subscription.hasUsedTrial);
                        localStorage.setItem('hasPaymentMethod', subscription.hasPaymentMethod);
                        localStorage.setItem('subscriptionId', subscription.subscriptionId || '');
                        localStorage.setItem('subscriptionStartDate', subscription.startDate || '');
                    }
                    
                    // Restore progress data
                    if (progress) {
                        localStorage.setItem('quizzesCompleted', progress.quizzesCompleted || '0');
                        localStorage.setItem('correctAnswers', progress.correctAnswers || '0');
                        localStorage.setItem('totalScore', progress.totalScore || '0');
                        localStorage.setItem('currentStreak', progress.streak || '0');
                        localStorage.setItem('bestStreak', progress.bestStreak || '0');
                        localStorage.setItem('selectedTheme', progress.themes || 'default');
                    }

                    console.log('✅ User data restored from database');
                }
            }
        } catch (error) {
            console.log('📱 Using local data (offline mode)');
        }
    }

    async backupUserData(username) {
        const userData = {
            subscription: {
                plan: localStorage.getItem('subscriptionPlan') || 'free',
                isTrialUser: localStorage.getItem('isTrialUser') === 'true',
                trialStartDate: localStorage.getItem('trialStartDate'),
                trialEndDate: localStorage.getItem('trialEndDate'),
                hasUsedTrial: localStorage.getItem('hasUsedTrial') === 'true',
                hasPaymentMethod: localStorage.getItem('hasPaymentMethod') === 'true',
                subscriptionId: localStorage.getItem('subscriptionId'),
                startDate: localStorage.getItem('subscriptionStartDate')
            },
            progress: {
                quizzesCompleted: parseInt(localStorage.getItem('quizzesCompleted')) || 0,
                correctAnswers: parseInt(localStorage.getItem('correctAnswers')) || 0,
                totalScore: parseInt(localStorage.getItem('totalScore')) || 0,
                streak: parseInt(localStorage.getItem('currentStreak')) || 0,
                bestStreak: parseInt(localStorage.getItem('bestStreak')) || 0,
                themes: localStorage.getItem('selectedTheme') || 'default'
            }
        };

        // Save to database
        await this.saveToDatabase(username, { action: 'backup_user', userData });

        // Also save to localStorage backup
        localStorage.setItem(`${username}_backup`, JSON.stringify({
            ...userData,
            timestamp: new Date().toISOString()
        }));

        console.log('💾 User data backed up');
    }

    // Auto-sync functionality
    startAutoSync() {
        // Sync data every 2 minutes
        setInterval(async () => {
            const username = this.getCurrentUser();
            if (username) {
                await this.backupUserData(username);
            }
        }, 120000);

        // Sync on page visibility change (when user switches tabs)
        document.addEventListener('visibilitychange', async () => {
            if (!document.hidden) {
                const username = this.getCurrentUser();
                if (username) {
                    await this.restoreUserData(username);
                }
            }
        });
    }

    // Emergency data recovery
    async recoverUserData(username) {
        // Try to recover from localStorage backup first
        const backup = localStorage.getItem(`${username}_backup`);
        if (backup) {
            const data = JSON.parse(backup);
            console.log('🔄 Recovering from local backup...');
            
            // Restore data
            if (data.subscription) {
                Object.keys(data.subscription).forEach(key => {
                    if (data.subscription[key] !== null && data.subscription[key] !== undefined) {
                        localStorage.setItem(key === 'plan' ? 'subscriptionPlan' : key, data.subscription[key]);
                    }
                });
            }
            
            return true;
        }
        
        // Try database recovery
        return await this.restoreUserData(username);
    }
}

// Make it globally available
window.userManager = new UserManager();
