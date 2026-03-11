import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.resolve('f:/Claude/Bytes Web/chatbot-api/.wrangler/state/v3/d1/miniflare-D1DatabaseObject/6dbff13ddceac69ea6e8f49514787a2a10bc279326fd24c7f7b02e95a92e5844b06f46de6669e64134c3724c23e51e2c.sqlite');
const db = new Database(dbPath);

async function testRegistrationFlow() {
    console.log('--- Testing Registration Flow ---');

    const testUser = {
        social_id: 'test_google_123',
        provider: 'google',
        email: 'tester@example.com',
        name: 'Test User',
        picture: 'https://example.com/pic.jpg'
    };

    try {
        // 1. Check if table exists
        const tableInfo = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='users'").get();
        if (!tableInfo) {
            console.error('FAILED: users table does not exist!');
            return;
        }
        console.log('OK: users table exists.');

        // 2. Clean up previous test
        db.prepare('DELETE FROM users WHERE social_id = ?').run(testUser.social_id);

        // 3. Simulate insertion (manual callback logic)
        const stmt = db.prepare('INSERT INTO users (social_id, provider, email, name, picture, created_at) VALUES (?, ?, ?, ?, ?, ?)');
        const result = stmt.run(testUser.social_id, testUser.provider, testUser.email, testUser.name, testUser.picture, Date.now());
        
        if (result.changes > 0) {
            console.log('OK: User inserted successfully.');
        } else {
            console.error('FAILED: User insertion failed.');
        }

        // 4. Verify data
        const user = db.prepare('SELECT * FROM users WHERE social_id = ?').get(testUser.social_id);
        if (user && user.email === testUser.email) {
            console.log('OK: Data verification successful.');
            console.log('User Record:', user);
        } else {
            console.error('FAILED: Data verification failed.');
        }

    } catch (error) {
        console.error('TEST ERROR:', error);
    } finally {
        db.close();
    }
}

testRegistrationFlow();
