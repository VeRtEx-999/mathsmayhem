// Data Migration and Backup System
// Ensures no user data is lost during updates or deployments

class DataMigrationManager {
    constructor() {
        this.backupPrefix = 'mathsMayhem_backup_';
        this.currentVersion = '2.0';
    }

    // Comprehensive data backup before any updates
    async createFullBackup() {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupKey = `${this.backupPrefix}${timestamp}`;
        
        const backupData = {
            version: this.currentVersion,
            timestamp,
            userData: this.getAllUserData(),
            systemData: this.getSystemData(),
            migrationLog: this.getMigrationLog()
        };

        try {
            // Save to localStorage
            localStorage.setItem(backupKey, JSON.stringify(backupData));
            
            // Also save to IndexedDB for larger storage
            await this.saveToIndexedDB(backupKey, backupData);
            
            console.log(`✅ Full backup created: ${backupKey}`);
            return { success: true, backupKey };
        } catch (error) {
            console.error('❌ Backup failed:', error);
            return { success: false, error: error.message };
        }
    }

    // Get all user-related data from localStorage
    getAllUserData() {
        const userData = {};
        
        // Get all keys from localStorage
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            const value = localStorage.getItem(key);
            
            // Include user-related data
            if (this.isUserDataKey(key)) {
                userData[key] = value;
            }
        }
        
        return userData;
    }

    // Check if a localStorage key contains user data
    isUserDataKey(key) {
        const userDataKeys = [
            'currentUser', 'mathsUsers', 'subscriptionPlan', 'subscriptionStartDate',
            'isTrialUser', 'trialStartDate', 'trialEndDate', 'hasUsedTrial',
            'hasPaymentMethod', 'subscriptionId', 'cardLast4', 'cardType',
            'cardExpiry', 'cardholderName', 'quizzesCompleted', 'correctAnswers',
            'totalScore', 'currentStreak', 'bestStreak', 'selectedTheme',
            'dailyQuizCount', 'lastQuizDate', 'justUpgraded', 'appliedDiscount'
        ];
        
        return userDataKeys.some(pattern => key.includes(pattern)) || 
               key.includes('_backup') || 
               key.includes('_subscription') || 
               key.includes('_progress');
    }

    // Get system-level data
    getSystemData() {
        return {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            language: navigator.language,
            cookieEnabled: navigator.cookieEnabled,
            onLine: navigator.onLine,
            url: window.location.href,
            referrer: document.referrer
        };
    }

    // Get migration history
    getMigrationLog() {
        return JSON.parse(localStorage.getItem('migrationLog') || '[]');
    }

    // Restore from backup
    async restoreFromBackup(backupKey) {
        try {
            let backupData = localStorage.getItem(backupKey);
            
            if (!backupData) {
                // Try IndexedDB
                backupData = await this.loadFromIndexedDB(backupKey);
            }
            
            if (!backupData) {
                throw new Error('Backup not found');
            }

            const data = typeof backupData === 'string' ? JSON.parse(backupData) : backupData;
            
            // Restore user data
            Object.keys(data.userData).forEach(key => {
                localStorage.setItem(key, data.userData[key]);
            });
            
            // Log the restoration
            this.logMigration('restore', `Restored from backup: ${backupKey}`);
            
            console.log(`✅ Data restored from backup: ${backupKey}`);
            return { success: true };
        } catch (error) {
            console.error('❌ Restore failed:', error);
            return { success: false, error: error.message };
        }
    }

    // Auto-migration when user visits site
    async performAutoMigration() {
        const lastVersion = localStorage.getItem('appVersion');
        const currentUser = localStorage.getItem('currentUser');
        
        if (!currentUser) return; // No user to migrate
        
        // Check if migration is needed
        if (lastVersion !== this.currentVersion) {
            console.log(`🔄 Migrating from version ${lastVersion || 'unknown'} to ${this.currentVersion}`);
            
            // Create backup before migration
            await this.createFullBackup();
            
            // Perform migration steps
            await this.migrateUserData(lastVersion, this.currentVersion);
            
            // Update version
            localStorage.setItem('appVersion', this.currentVersion);
            
            this.logMigration('auto', `Migrated from ${lastVersion || 'unknown'} to ${this.currentVersion}`);
        }
    }

    // Migrate user data between versions
    async migrateUserData(fromVersion, toVersion) {
        // Migration logic for different versions
        if (!fromVersion || fromVersion < '2.0') {
            // Migrate to version 2.0 structure
            await this.migrateTo2_0();
        }
        
        // Add more migration steps as needed
    }

    async migrateTo2_0() {
        const currentUser = localStorage.getItem('currentUser');
        if (!currentUser) return;

        // Ensure user has proper data structure
        const subscription = {
            plan: localStorage.getItem('subscriptionPlan') || 'free',
            startDate: localStorage.getItem('subscriptionStartDate') || new Date().toISOString(),
            isTrialUser: localStorage.getItem('isTrialUser') === 'true',
            trialStartDate: localStorage.getItem('trialStartDate'),
            trialEndDate: localStorage.getItem('trialEndDate'),
            hasUsedTrial: localStorage.getItem('hasUsedTrial') === 'true',
            hasPaymentMethod: localStorage.getItem('hasPaymentMethod') === 'true'
        };

        const progress = {
            quizzesCompleted: parseInt(localStorage.getItem('quizzesCompleted')) || 0,
            correctAnswers: parseInt(localStorage.getItem('correctAnswers')) || 0,
            totalScore: parseInt(localStorage.getItem('totalScore')) || 0,
            streak: parseInt(localStorage.getItem('currentStreak')) || 0,
            bestStreak: parseInt(localStorage.getItem('bestStreak')) || 0,
            themes: localStorage.getItem('selectedTheme') || 'default'
        };

        // Store in new format
        localStorage.setItem(`${currentUser}_subscription_v2`, JSON.stringify(subscription));
        localStorage.setItem(`${currentUser}_progress_v2`, JSON.stringify(progress));

        console.log('✅ Migrated to version 2.0 structure');
    }

    // IndexedDB operations for larger backups
    async saveToIndexedDB(key, data) {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('MathsMayhemBackups', 1);
            
            request.onerror = () => reject(request.error);
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains('backups')) {
                    db.createObjectStore('backups');
                }
            };
            
            request.onsuccess = (event) => {
                const db = event.target.result;
                const transaction = db.transaction(['backups'], 'readwrite');
                const store = transaction.objectStore('backups');
                
                store.put(data, key);
                
                transaction.oncomplete = () => resolve();
                transaction.onerror = () => reject(transaction.error);
            };
        });
    }

    async loadFromIndexedDB(key) {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('MathsMayhemBackups', 1);
            
            request.onerror = () => reject(request.error);
            
            request.onsuccess = (event) => {
                const db = event.target.result;
                
                if (!db.objectStoreNames.contains('backups')) {
                    resolve(null);
                    return;
                }
                
                const transaction = db.transaction(['backups'], 'readonly');
                const store = transaction.objectStore('backups');
                const getRequest = store.get(key);
                
                getRequest.onsuccess = () => resolve(getRequest.result);
                getRequest.onerror = () => reject(getRequest.error);
            };
        });
    }

    // Log migration activities
    logMigration(type, message) {
        const log = this.getMigrationLog();
        log.push({
            type,
            message,
            timestamp: new Date().toISOString(),
            version: this.currentVersion
        });
        
        // Keep only last 50 entries
        if (log.length > 50) {
            log.splice(0, log.length - 50);
        }
        
        localStorage.setItem('migrationLog', JSON.stringify(log));
    }

    // Get list of available backups
    getAvailableBackups() {
        const backups = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith(this.backupPrefix)) {
                const data = localStorage.getItem(key);
                try {
                    const parsed = JSON.parse(data);
                    backups.push({
                        key,
                        timestamp: parsed.timestamp,
                        version: parsed.version,
                        size: data.length
                    });
                } catch (error) {
                    // Invalid backup, skip
                }
            }
        }
        
        return backups.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    }

    // Clean old backups (keep last 5)
    cleanOldBackups() {
        const backups = this.getAvailableBackups();
        if (backups.length > 5) {
            const toDelete = backups.slice(5);
            toDelete.forEach(backup => {
                localStorage.removeItem(backup.key);
            });
            
            console.log(`🧹 Cleaned ${toDelete.length} old backups`);
        }
    }

    // Initialize migration system
    async initialize() {
        // Perform auto-migration
        await this.performAutoMigration();
        
        // Clean old backups
        this.cleanOldBackups();
        
        // Create periodic backups
        setInterval(() => {
            this.createFullBackup();
            this.cleanOldBackups();
        }, 24 * 60 * 60 * 1000); // Daily backups
        
        console.log('✅ Data migration system initialized');
    }
}

// Initialize the migration system
const migrationManager = new DataMigrationManager();

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => migrationManager.initialize());
} else {
    migrationManager.initialize();
}

// Make available globally
if (typeof window !== 'undefined') {
    window.migrationManager = migrationManager;
}

// Export for Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { DataMigrationManager };
}
