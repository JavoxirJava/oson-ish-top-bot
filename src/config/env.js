const path = require('path');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env') });

function req(key, fallback) {
    const v = process.env[key] ?? fallback;
    if (v === undefined) throw new Error(`Missing env ${key}`);
    return v;
}

const env = {
    BOT_TOKEN: req('BOT_TOKEN'),
    WEBHOOK_SECRET: req('WEBHOOK_SECRET'),
    WEBHOOK_URL: req('WEBHOOK_URL'),
    PORT: parseInt(process.env.PORT || '8080', 10),
    ADMIN_IDS: (process.env.ADMIN_IDS || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    SEND_GROUP_ID: process.env.SEND_GROUP_ID || '',
    BACKEND_BASE_URL: req('BACKEND_BASE_URL'),
    BACKEND_ADMIN_PHONE: process.env.BACKEND_ADMIN_PHONE || '',
    BACKEND_ADMIN_LOGIN: process.env.BACKEND_ADMIN_LOGIN || '',
    BACKEND_ADMIN_PASSWORD: req('BACKEND_ADMIN_PASSWORD'),
    REDIS_URL: req('REDIS_URL'),
};

module.exports = env;