// src/routes/notify.js
const express = require('express');
const env = require('../config/env');
const logger = require('../lib/logger');
const { login, getAnnouncementById, getAnnouncementImagesById } = require('../services/backendApi');
const { sendToAdmins } = require('../services/moderation');
const { markApproved, markRejected } = require('../services/moderation'); // sizdagi markApproved/markRejected

function normalizeEvent({ event, status }) {
    // event kelmasa, statusga qarab aniqlaymiz
    const s = String(status || '').toUpperCase();
    if (event) return String(event).toLowerCase();

    if (s === 'APPROVED' || s === 'ACCEPTED' || s === 'ACTIVE') return 'approved';
    if (s === 'REJECTED' || s === 'DECLINED') return 'rejected';
    if (s === 'WAITING' || s === 'PENDING' || s === 'CREATED') return 'created';
    return ''; // noma'lum
}

function mountNotifyRoute(app, bot) {
    const router = express.Router();

    router.post('/notify', express.json(), async (req, res) => {
        try {
            const auth = req.get('x-auth-token');
            if (!auth || auth !== env.WEBHOOK_SECRET) return res.status(401).json({ ok: false, error: 'unauthorized' });

            const { annId, event, status, reason } = req.body || {};
            if (!annId) return res.status(400).json({ ok: false, error: 'annId required' });

            const ev = normalizeEvent({ event, status });
            if (!ev) return res.status(400).json({ ok: false, error: 'event/status required' });

            // --- Statusga qarab harakat qilamiz:
            if (ev === 'created') {
                await login();
                const ann = await getAnnouncementById(annId);
                const images = await getAnnouncementImagesById(annId);
                await sendToAdmins(bot, env.SEND_GROUP_ID, ann, images?.data || []);
                return res.json({ ok: true, action: 'sent' });
            }

            if (ev === 'approved') {
                await markApproved(bot, String(annId));
                return res.json({ ok: true, action: 'approved-updated' });
            }

            if (ev === 'rejected') {
                await markRejected(bot, String(annId), reason || '—', env.ADMIN_IDS);
                return res.json({ ok: true, action: 'rejected-updated' });
            }

            return res.status(400).json({ ok: false, error: 'unsupported event' });
        } catch (err) {
            logger.error({ err }, 'Notify route error');
            return res.status(500).json({ ok: false });
        }
    });

    app.use('/', router);
}

module.exports = { mountNotifyRoute };
