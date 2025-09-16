const express3 = require('express');
const env7 = require('./config/env');
const logger7 = require('./utils/logger');
const bot2 = require('./telegram/bot');
const { mountTelegramWebhook } = require('./routes/webhook');
const { mountNotifyRoute } = require('./routes/notify');
const { login: backendLogin } = require('./services/backendApi');


async function main() {
    // Set webhook on startup (can be done once; idempotent)
    await bot2.telegram.setWebhook(env7.WEBHOOK_URL, {
        secret_token: env7.WEBHOOK_SECRET,
    });

    const app = express3();

    // Health check
    app.get('/healthz', (req, res) => res.json({ ok: true }));

    // Mount Telegram webhook route
    mountTelegramWebhook(app, bot2);

    // Mount Java → bot notify route
    mountNotifyRoute(app, bot2);

    // Login to backend at boot (so first requests are warm)
    try { await backendLogin(); } catch (e) { logger7.warn('Initial backend login failed, will retry on demand'); }

    app.listen(env7.PORT, () => {
        logger7.info({ port: env7.PORT }, 'Bot server listening');
    });
}

main().catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(1);
});