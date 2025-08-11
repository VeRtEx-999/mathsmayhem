// API endpoint for user data management
// Ensures data persistence across deployments

const { dbManager } = require('./database.js');

module.exports = async (req, res) => {
    // Enable CORS for frontend requests
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        const { action, username, data } = req.body || {};

        switch (action) {
            case 'save_user_data':
                const result = await dbManager.saveToBackend();
                return res.status(200).json({ success: true, message: 'Data saved successfully' });

            case 'load_user_data':
                await dbManager.loadFromBackend();
                return res.status(200).json({ success: true, message: 'Data loaded successfully' });

            case 'get_user':
                if (!username) {
                    return res.status(400).json({ success: false, error: 'Username required' });
                }
                
                const userData = {
                    user: dbManager.users.get(username),
                    subscription: await dbManager.getSubscription(username),
                    progress: await dbManager.getProgress(username)
                };
                
                return res.status(200).json({ success: true, data: userData });

            case 'update_subscription':
                if (!username || !data) {
                    return res.status(400).json({ success: false, error: 'Username and data required' });
                }
                
                const subResult = await dbManager.updateSubscription(username, data);
                return res.status(200).json(subResult);

            case 'update_progress':
                if (!username || !data) {
                    return res.status(400).json({ success: false, error: 'Username and data required' });
                }
                
                const progressResult = await dbManager.updateProgress(username, data);
                return res.status(200).json(progressResult);

            case 'backup_all':
                // Create a comprehensive backup
                const backup = {
                    users: Object.fromEntries(dbManager.users),
                    subscriptions: Object.fromEntries(dbManager.subscriptions),
                    progress: Object.fromEntries(dbManager.progress),
                    achievements: Object.fromEntries(dbManager.achievements),
                    timestamp: new Date().toISOString()
                };
                
                return res.status(200).json({ success: true, backup });

            case 'restore_backup':
                if (!data) {
                    return res.status(400).json({ success: false, error: 'Backup data required' });
                }
                
                // Restore from backup
                if (data.users) {
                    dbManager.users = new Map(Object.entries(data.users));
                }
                if (data.subscriptions) {
                    dbManager.subscriptions = new Map(Object.entries(data.subscriptions));
                }
                if (data.progress) {
                    dbManager.progress = new Map(Object.entries(data.progress));
                }
                if (data.achievements) {
                    dbManager.achievements = new Map(Object.entries(data.achievements));
                }
                
                await dbManager.saveToBackend();
                return res.status(200).json({ success: true, message: 'Backup restored successfully' });

            default:
                return res.status(400).json({ success: false, error: 'Invalid action' });
        }
    } catch (error) {
        console.error('API Error:', error);
        return res.status(500).json({ 
            success: false, 
            error: 'Internal server error',
            details: error.message 
        });
    }
};
