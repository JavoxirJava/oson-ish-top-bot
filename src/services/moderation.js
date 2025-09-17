const { moderationKeyboard, approvedKeyboard, rejectedKeyboard } = require('../telegram/keyboards');
const mappingRepo = require('../store/mappingRepo');
const logger4 = require('../utils/logger');
const { escMdV2, dashify } = require('../utils/mdv2');
const { buildMapLinks } = require('../utils/maps');
const { BACKEND_BASE_URL } = require('../config/env');


function renderAnnText(obj) {
    const ann = annObj(obj?.data || {});

    // qiymatlarni escape + chiroyli ko‘rinish uchun en dash
    const salaryRange = dashify(`${ann.salaryFrom || ''} ${ann.annSalaryCurrency ? 'USD' : ''} - ${ann.salaryTo || ''} ${ann.annSalaryCurrency ? 'USD' : ''}`.trim());

    const lines = [
        `🆕 *Yangi e'lon*`,
        ``,
        `🏢 *Kompaniya:* ${escMdV2(ann.company)}`,
        `💼 *Vakansiya:* ${escMdV2(ann.jobName)}`,
        `📝 *Tavsif:* ${escMdV2(ann.description)}`,
        `📍 *Manzil:* ${escMdV2((ann.address || '') + (ann.address && (ann.regionName || ann.areasName) ? ', ' : '') + (ann.regionName || '') + (ann.areasName ? (ann.regionName ? ', ' : '') + ann.areasName : ''))}`,
        ``,
        `⏳ *Sinov muddati:* ${escMdV2(ann.isThereTrialPeriod)}`,
        `💰 *Narxi:* ${escMdV2(ann.price + 'So\'m')}`,
        `💵 *Maosh diapazoni:* ${escMdV2(salaryRange)}`,
        `👨‍💻 *Tajriba:* ${escMdV2(ann.experience)}`,
        `👥 *Ishchilar soni:* ${escMdV2(ann.peopleCnt)}`,
        `📆 *Sinov davri:* ${escMdV2(`${ann.trialPeriod || '0'} ${ann.annTrialPeriodTypes || ''}`.trim())}`,
        `🚻 *Jins:* ${escMdV2(ann.gender)}`,
        `🎓 *Talaba kerakmi?* ${escMdV2(ann.studentIsNeeded)}`,
        ``,
        `👤 *Mas’ul shaxs:* ${escMdV2(ann.firstName)}`,
        `📱 *Telegram:* ${ann.telegramUsername ? escMdV2(`@${ann.telegramUsername}`) : '—'}`,
        `🛠 *Ish turi:* ${escMdV2(ann.annJobTypesName)}`,
        `⏰ *Ish vaqti:* ${escMdV2(dashify(`${ann.fromTime || ''} - ${ann.toTime || ''}`))}`,
        `🗺 *Viloyat:* ${escMdV2(ann.regionName)}`,
        `🏘 *Tuman:* ${escMdV2(ann.areasName)}`,
        `☎️ *Aloqa:* +998${escMdV2(ann.contacts)}`,
        ``,
        `📌 *E'lon turi:* ${escMdV2(ann.annTypeName)}`,
        `👨‍💼 *E’lon egasi:* ${escMdV2(ann.ownerFio)}`,
        `⌚️ *Ish vaqti turi:* ${escMdV2(ann.workTimeType)}`,
        `🌐 *Masofaviy:* ${escMdV2(ann.isRemote)}`,
        `🤝 *Kelishilgan ish haqi:* ${escMdV2(ann.isAgreed)}`,
        ``,
        `🗓 *Yaratilgan sana:* ${escMdV2(ann.createdDate)}`,
    ];

    const mapBlock = buildMapLinks(ann.lat, ann.lon); // '' yoki markdown blok
    if (mapBlock) lines.push('', mapBlock);

    lines.push('', `🔑 *E’lon kodi:* \`${escMdV2(ann.code)}\``);

    return lines.join('\n');
}

async function sendToAdmins(bot, adminIds, ann, images) {
    const text = renderAnnText(ann);
    const kb = moderationKeyboard(ann?.data.id);
    for (const chatId of adminIds) {
        try {
            let replyTo; // media groupdan birinchi xabar id

            // 1) Media group (agar rasm bo'lsa). Telegram 2..10 dona rasmni qabul qiladi.
            if (images.length >= 1) {
                const media = images.map(p => ({ type: 'photo', media: `${BACKEND_BASE_URL}/api/v1/file/download/${p}` }));
                const msgs = await bot.telegram.sendMediaGroup(chatId, media);
                // sendMediaGroup array qaytaradi — odatda birinchi xabarni reply target qilamiz
                replyTo = msgs?.[0]?.message_id;
            }

            // 2) Tugmali matn — reply ko'rinishida
            const msg = await bot.telegram.sendMessage(chatId, text, {
                parse_mode: "MarkdownV2",
                reply_markup: kb.reply_markup, 
                reply_to_message_id: replyTo, // agar rasm bo'lmasa undefined bo'ladi
            });

            // 3) Keyinchalik edit qilish uchun shu tugmali xabarning id sini saqlaymiz
            await mappingRepo.saveMapping(ann.id, chatId, msg.message_id);
        } catch (err) {
            logger4.error({ err, chatId }, 'Failed to send announcement to admin');
        }
    }
}

async function markApproved(bot, annId, adminIds) {
    const mappings = await mappingRepo.getAllMappings(annId);
    for (const { chatId, messageId } of mappings) {
        try {
            await bot.telegram.editMessageReplyMarkup(chatId, messageId, undefined, approvedKeyboard().reply_markup);
        } catch (err) {
            // If markup edit fails (old message, etc.), try edit text fallback
            try {
                await bot.telegram.editMessageText(chatId, messageId, undefined, `✅ Tasdiqlangan\n\n${'ID: ' + annId}`);
            } catch (e2) {
                logger4.warn({ err: e2, chatId, messageId }, 'Edit after approve failed');
            }
        }
    }
}

async function markRejected(bot, annId, reason, adminIds) {
    const mappings = await mappingRepo.getAllMappings(annId);
    for (const { chatId, messageId } of mappings) {
        try {
            await bot.telegram.editMessageReplyMarkup(chatId, messageId, undefined, rejectedKeyboard().reply_markup);
            await bot.telegram.sendMessage(chatId, `❌ Rad etildi. Sabab: ${reason}`);
        } catch (err) {
            // Fallback edit text
            try {
                await bot.telegram.editMessageText(chatId, messageId, undefined, `❌ Rad etildi\nSabab: ${reason}`);
            } catch (e2) {
                logger4.warn({ err: e2, chatId, messageId }, 'Edit after reject failed');
            }
        }
    }
}

function annObj(ann) {
    return {
        address: ann?.address || '',
        days: ann?.days ? `${ann.days} kun` : '',
        description: ann?.description ? ann.description.substring(0, 200) : '',
        isThereTrialPeriod: ann?.isThereTrialPeriod ? 'Ha' : 'Yo\'q',
        price: ann?.price ? ann.price : '',
        createdDate: ann?.createdDate ? (new Date(ann.createdDate)).toLocaleDateString('uz-UZ') : '',
        salaryFrom: ann?.salaryFrom ? `${ann.salaryFrom} ${ann.annSalaryCurrency || 'so\'m'}` : '',
        salaryTo: ann?.salaryTo ? `${ann.salaryTo} ${ann.annSalaryCurrency || 'so\'m'}` : '',
        code: ann?.code || '',
        company: ann?.company || '',
        jobName: ann?.jobName || '',
        experience: ann?.experience || '',
        peopleCnt: ann?.peopleCnt || '',
        annTrialPeriodTypes: ann?.annTrialPeriodTypes || '',
        trialPeriod: ann?.trialPeriod || '',
        gender: ann?.gender || '',
        studentIsNeeded: ann?.studentIsNeeded ? 'Ha' : 'Yo\'q',
        fromTime: ann?.fromTime || '',
        toTime: ann?.toTime || '',
        firstName: ann?.firstName || '',
        telegramUsername: ann?.telegramUsername || '',
        annJobTypesName: ann?.annJobTypesName || '',
        regionName: ann?.regionName || '',
        contacts: ann?.contacts || '',
        annTypeName: ann?.annTypeName || '',
        ownerFio: ann?.ownerFio || '',
        workTimeType: ann?.workTimeType ? 'aniq vaqt' : 'kelishilgan',
        isRemote: ann?.isRemote ? 'Ha' : 'Yo\'q',
        isAgreed: ann?.isAgreed ? 'kelishilgan holda' : 'ko\'rsatilgan',
        areasName: ann?.areasName || '',
        lat: ann?.lat || '',
        lon: ann?.lon || '',
    }
    
}

module.exports = { sendToAdmins, markApproved, markRejected };