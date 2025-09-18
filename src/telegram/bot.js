const { Telegraf } = require('telegraf');
const env4 = require('../config/env');
const logger5 = require('../utils/logger');
const { setReasonAwait, getReasonAwait, clearReasonAwait } = require('../store/state');
const { approveAnn, rejectAnn } = require('../services/backendApi');
const { approvedKeyboard, rejectedKeyboard } = require('./../telegram/keyboards');
const { markApproved, markRejected } = require('../services/moderation');


const bot = new Telegraf(env4.BOT_TOKEN);


// Admin guard helper
function isAdmin(ctx) {
    const uid = String(ctx.from?.id || '');
    return env4.ADMIN_IDS.includes(uid);
}

// Global error handler
bot.catch((err, ctx) => {
    logger5.error({ err }, 'Bot error');
});

// Callback: approve/reject
bot.on('callback_query', async (ctx) => {
    try {
        if (!isAdmin(ctx)) return ctx.answerCbQuery('Ruxsat yo\'q');
        const data = ctx.callbackQuery.data || '';
        if (data.startsWith('approve:')) {
            const annId = data.split(':')[1];
            await approveAnn(annId);
            await ctx.answerCbQuery('Tasdiqlandi');
            // Update only this message quickly
            try {
                await ctx.editMessageReplyMarkup(approvedKeyboard().reply_markup);
            } catch { }
            // Then update all copies
            await markApproved(bot, annId, env4.ADMIN_IDS);
        } else if (data.startsWith('reject:')) {
            const annId = data.split(':')[1];
            await setReasonAwait(ctx.from.id, annId, 180);
            await ctx.answerCbQuery();
            await ctx.reply('Rad etish sababi? (3 daqiqa ichida yuboring)', {
                reply_markup: { force_reply: true, selective: true },
            });
        } else if (data === 'noopAccepted') {
            await ctx.answerCbQuery('E\'lon tasdiqlangan');
        } else if (data === 'noopRejected') {
            await ctx.answerCbQuery('E\'lon rad etilgan');
        } else await ctx.answerCbQuery('');
    } catch (err) {
        logger5.error({ err }, 'Callback handler error');
        await ctx.answerCbQuery('Xatolik');
    }
});

// Force-reply reason capture
bot.on('message', async (ctx) => {
    try {
        if (!ctx.message?.text) return; // only text for MVP
        if (!isAdmin(ctx)) return; // ignore non-admins

        console.log(ctx.message?.text);

        const pendingAnnId = await getReasonAwait(ctx.from.id);
        if (!pendingAnnId) return; // no reason expected

        const reason = ctx.message.text.trim();
        if (!reason) return ctx.reply('Sabab matni bo\'sh bo\'lmasin');

        await rejectAnn(pendingAnnId, reason);
        console.log(pendingAnnId, reason);
        
        await clearReasonAwait(ctx.from.id);

        await ctx.reply('Rad etildi. Rahmat!');
        await markRejected(bot, pendingAnnId, reason, env4.ADMIN_IDS);
    } catch (err) {
        logger5.error({ err }, 'Reason capture error');
        await ctx.reply('Xatolik yuz berdi. Qayta urinib ko\'ring.');
    }
});

module.exports = bot;