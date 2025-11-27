// Import from the built distribution
// The SDK exports both named and default exports
import { init } from '/dist/widget-sdk.dev.js';

// ----------------------------------------------------------------
// LOGGING UTILITY
// ----------------------------------------------------------------
const logNode = document.querySelector('#log');
const log = (message, payload) => {
    const time = new Date().toLocaleTimeString();
    const data = payload ? ` ${JSON.stringify(payload, null, 2)}` : '';
    logNode.textContent = `[${time}] ${message}${data}\n${logNode.textContent}`;
};

// ----------------------------------------------------------------
// BOOTSTRAP TOKEN FETCH
// ----------------------------------------------------------------
// This calls our local reference server (examples/server.js)
const fetchBootstrapToken = async () => {
    try {
        // Note: We use a relative path because we expect this file 
        // to be served by the same server at http://localhost:3000
        const response = await fetch('/api/bootstrap', {
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' }
        });

        if (!response.ok) {
            throw new Error(`Server error: ${response.statusText}`);
        }

        const data = await response.json();
        log('🔑 Token acquired from backend');
        return data.token;
    } catch (err) {
        log('❌ Token fetch failed', { error: err.message });
        throw err;
    }
};

// ----------------------------------------------------------------
// CONFIG FETCH
// ----------------------------------------------------------------
const fetchConfig = async () => {
    try {
        const response = await fetch('/api/config');
        if (!response.ok) throw new Error('Failed to fetch config');
        return await response.json();
    } catch (err) {
        log('❌ Config fetch failed', { error: err.message });
        throw err;
    }
};

// ----------------------------------------------------------------
// WIDGET INITIALIZATION
// ----------------------------------------------------------------
let widget = null;

async function initializeWidget() {
    if (widget) return;

    log('⚙️ Initializing widget...');

    try {
        const config = await fetchConfig();

        widget = init({
            domNode: '#pixelbin-widget',
            widgetOrigin: config.widgetOrigin,
            autostart: true,
            params: {
                widgetType: 'ai-editor', // Change this to test other types
            },
            style: {
                width: '100%',
                height: '100%',
                border: 'none',
            },
            bootstrap: {
                getToken: fetchBootstrapToken,
            },
            debug: true, // Enable SDK debug logs in console
        });

        widget
            .on('ready', () => log('✅ Widget READY'))
            .on('open', () => log('📖 Widget OPENED'))
            .on('close', () => log('📕 Widget CLOSED'))
            .on('logout', (payload) => log('👋 Logout requested', payload))
            .on('navigate', (payload) => log('🧭 Navigation', payload))
            .on('error', (err) => {
                log(`⚠️ Error: ${err.code}`, err);
                widget = null;
            });

    } catch (e) {
        log('❌ Initialization failed', { message: e.message });
        widget = null;
    }
}

// ----------------------------------------------------------------
// UI CONTROLS
// ----------------------------------------------------------------
document.querySelector('#init').addEventListener('click', () => {
    initializeWidget();
});

document.querySelector('#open').addEventListener('click', () => {
    if (!widget) initializeWidget();
    widget.open();
});

document.querySelector('#close').addEventListener('click', () => {
    if (widget) widget.close();
});

document.querySelector('#destroy').addEventListener('click', () => {
    if (widget) {
        widget.destroy();
        widget = null;
        log('💥 Widget destroyed');
    }
});

document.querySelector('#navigate').addEventListener('click', () => {
    if (!widget) {
        log('⚠️ Widget not initialized. Please initialize first.');
        return;
    }
    const widgetType = document.querySelector('#widgetType').value;
    log(`🧭 Navigating to ${widgetType}...`);
    widget.navigate({ widgetType })
        .then((payload) => log('✅ Navigation successful', payload))
        .catch((err) => log('❌ Navigation failed', err));
});

document.querySelector('#openWithImage').addEventListener('click', async () => {
    if (!widget) {
        log('⚠️ Widget not initialized. Initializing now...');
        await initializeWidget();
    }

    const imageUrl = document.querySelector('#imageUrl').value;
    const widgetType = document.querySelector('#widgetType').value; // optional

    if (!imageUrl) {
        log('⚠️ Please provide an image URL');
        return;
    }

    try {
        if (imageUrl) {
            log(`📸 Opening widget with image URL: ${imageUrl}`);
            widget.open({ imageUrl, widgetType });
        }
    } catch (err) {
        log('❌ Failed to open with image', { error: err.message });
    }
});
