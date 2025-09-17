const express2 = require('express');
const env6 = require('../config/env');
const logger6 = require('../utils/logger');
const { getAnnouncementById, getAnnouncementImagesById, login } = require('../services/backendApi');
const { sendToAdmins } = require('../services/moderation');


function mountNotifyRoute(app, bot) {
    const router = express2.Router();
    router.post('/notify', express2.json(), async (req, res) => {
        try {
            const auth = req.header('x-auth-token');
            if (!auth || auth !== env6.WEBHOOK_SECRET) return res.status(401).json({ ok: false, error: 'unauthorized' });

            const { annId } = req.body || {};
            if (!annId) return res.status(400).json({ ok: false, error: 'annId required' });

            // ensure we have a token for backend
            await login();
            const ann = await getAnnouncementById(annId);
            const images = await getAnnouncementImagesById(annId);
            await sendToAdmins(bot, env6.ADMIN_IDS, ann, images?.data);
            return res.json({ ok: true });
        } catch (err) {
            logger6.error({ err }, 'Notify route error');
            return res.status(500).json({ ok: false });
        }
    });
    app.use('/', router);
}

module.exports = { mountNotifyRoute };