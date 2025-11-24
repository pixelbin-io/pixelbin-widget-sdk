const express = require('express');
const cors = require('cors');
const crypto = require('crypto'); // Built-in Node.js module
const path = require('path');

// Load environment variables from .env file in the examples directory
require('dotenv').config({ quiet: true });

const app = express();
const PORT = 3000;

// Enable CORS for all routes (for local development)
app.use(cors());
app.use(express.json());

// ------------------------------------------------------------------
// CONFIGURATION
// ------------------------------------------------------------------
// In a real app, these should be environment variables.
// NEVER expose your API Key in the frontend code!
const PIXELBIN_API_KEY = process.env.PIXELBIN_API_KEY || 'YOUR_API_KEY_HERE';
const ALLOWED_ORIGINS = ['http://localhost:3000', 'http://127.0.0.1:3000'];
const BASE_URL = process.env.NODE_ENV === 'production' ? 'https://api.pixelbin.io' : 'https://api.pixelbinz0.de';

// ------------------------------------------------------------------
// MOCK TOKEN GENERATION (Replace with real API call)
// ------------------------------------------------------------------
// This function simulates calling the Pixelbin API to get a token.
// In production, you would make a POST request to:
// https://api.pixelbin.io/service/platform/organization/v1.0/apps/bootstrap_token
async function generatePixelbinToken(origin) {
    const url = new URL(origin);
    const response = await fetch(`${BASE_URL}/service/platform/organization/v1.0/apps/bootstrap_token`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${PIXELBIN_API_KEY}`,
            'X-Widget-Parent-Origin': url.origin,
            'Content-Type': 'application/json'
        }
    });
    
    if (!response.ok) {
        throw new Error(`Pixelbin API Error: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.token;
}

// ------------------------------------------------------------------
// ROUTES
// ------------------------------------------------------------------

// Serve static files from the current directory (so we can serve basic.html)
app.use(express.static(__dirname));

// Also serve the dist folder so basic.html can find the SDK
// We use path.join to resolve the path relative to THIS file (examples/server.js)
// This ensures it works whether you run `node examples/server.js` or `cd examples && node server.js`
app.use('/dist', express.static(path.join(__dirname, '../dist')));

app.get('/api/bootstrap', async (req, res) => {
    try {
        // 1. Validate the request (e.g. check user session cookies)
        // const user = req.user; 
        // if (!user) return res.status(401).json({ error: 'Unauthorized' });

        // 2. Get the origin of the request to pass to Pixelbin
        // (The SDK sends this automatically, or you can infer it)
        const origin = req.get('Origin') || req.get('Referer');

        // 3. Call Pixelbin API (or mock it)
        const token = await generatePixelbinToken(origin);

        // 4. Return the token
        res.json({ token });
    } catch (error) {
        console.error('Error generating token:', error);
        res.status(500).json({ error: 'Failed to generate token' });
    }
});

app.get('/api/config', (req, res) => {
    res.json({
        widgetOrigin: process.env.WIDGET_ORIGIN || 'https://console.pixelbinz0.de'
    });
});

// ------------------------------------------------------------------
// START SERVER
// ------------------------------------------------------------------
const server = app.listen(PORT, () => {
    console.log(`\n🚀 Reference Backend Server running at http://localhost:${PORT}`);
    console.log(`👉 Open http://localhost:${PORT}/basic.html to see the widget example.`);
    console.log(`   (Make sure you have built the SDK first with 'npm run build')\n`);
});

// Graceful shutdown
const shutdown = () => {
    console.log('\nShutting down server...');
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
