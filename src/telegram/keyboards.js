const { Markup } = require('telegraf');

function moderationKeyboard(annId) {
    return Markup.inlineKeyboard([
        [
            Markup.button.callback('✅ Tasdiqlash', `approve:${annId}`),
            Markup.button.callback('❌ Rad etish', `reject:${annId}`),
        ],
    ]);
}

function approvedKeyboard() {
    return Markup.inlineKeyboard([[Markup.button.callback('✅ Tasdiqlangan', 'noopAccepted')]]);
}

function rejectedKeyboard() {
    return Markup.inlineKeyboard([[Markup.button.callback('❌ Rad etilgan', 'noopRejected')]]);
}

module.exports = { moderationKeyboard, approvedKeyboard, rejectedKeyboard };