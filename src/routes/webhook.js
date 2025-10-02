// src/routes/webhook.js
const express = require('express');
const env = require('../config/env');

function mountTelegramWebhook(app, bot) {
    // JSON parser shu route uchun
    app.post('/telegram/webhook', express.json(), (req, res) => {
        const secret = req.get('x-telegram-bot-api-secret-token');
        if (!secret || secret !== env.WEBHOOK_SECRET) return res.sendStatus(401);
        // Telegraf ga update'ni beramiz
        bot.handleUpdate(req.body)
            .then(() => res.sendStatus(200))
            .catch(() => res.sendStatus(500));
    });
}

module.exports = { mountTelegramWebhook };
