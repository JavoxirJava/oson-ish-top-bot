const { moderationKeyboard, approvedKeyboard, rejectedKeyboard } = require('../telegram/keyboards');
const mappingRepo = require('../store/mappingRepo');
const logger4 = require('../utils/logger');
const { escMdV2 } = require('../utils/mdv2');
const { yn, joinAddr, timeRange, salaryRange } = require('../utils/format');
const { buildMapLinks } = require('../utils/maps');
const { BACKEND_BASE_URL } = require('../config/env');
const { fetchPhotoAsInput } = require('../utils/fetchPhoto');

function renderAnnText(obj) {
    const ann = annObj(obj?.data || {});

    const lines = [
        `🆕 *Yangi e'lon*`,
        ``,
        `🏢 *Kompaniya:* ${escMdV2(ann.company ?? '—')}`,
        `💼 *Vakansiya:* ${escMdV2(ann.jobName ?? '—')}`,
        `📝 *Tavsif:* ${escMdV2(ann.description ?? '—')}`,
        `📍 *Manzil:* ${escMdV2(joinAddr({ address: ann.address, regionName: ann.regionName, areasName: ann.areasName }) || '—')}`,
        ``,
        `⏳ *Sinov muddati:* ${escMdV2(yn(ann.isThereTrialPeriod))}`,
        `💰 *Narxi:* ${escMdV2(ann.price != null ? `${ann.price} So'm` : '—')}`,
        `💵 *Maosh diapazoni:* ${escMdV2(salaryRange(ann.salaryFrom, ann.salaryTo, ann.annSalaryCurrency || 'USD'))}`,
        `👨‍💻 *Tajriba:* ${escMdV2(ann.experience ?? '—')}`,
        `👥 *Ishchilar soni:* ${escMdV2(ann.peopleCnt ?? '—')}`,
        `📆 *Sinov davri:* ${escMdV2(`${ann.trialPeriod ?? '0'} ${ann.annTrialPeriodTypes ?? ''}`.trim())}`,
        `🚻 *Jins:* ${escMdV2(ann.gender ?? '—')}`,
        `🎓 *Talaba kerakmi?* ${escMdV2(yn(ann.studentIsNeeded))}`,
        ``,
        `👤 *Mas’ul shaxs:* ${escMdV2(ann.firstName ?? '—')}`,
        `📱 *Telegram:* ${ann.telegramUsername ? escMdV2(`@${ann.telegramUsername}`) : '—'}`,
        `🛠 *Ish turi:* ${escMdV2(ann.annJobTypesName ?? '—')}`,
        `⏰ *Ish vaqti:* ${escMdV2(timeRange(ann.fromTime, ann.toTime))}`,
        `🗺 *Viloyat:* ${escMdV2(ann.regionName ?? '—')}`,
        `🏘 *Tuman:* ${escMdV2(ann.areasName ?? '—')}`,
        // **MUHIM**: '+' ham escape bo'lsin — prefiksni ham escMdV2 ichida yozing
        `☎️ *Aloqa:* ${escMdV2(ann.contacts ? `+998${ann.contacts}` : '—')}`,
        ``,
        `📌 *E'lon turi:* ${escMdV2(ann.annTypeName ?? '—')}`,
        `👨‍💼 *E’lon egasi:* ${escMdV2(ann.ownerFio ?? '—')}`,
        `⌚️ *Ish vaqti turi:* ${escMdV2(ann.workTimeType ?? '—')}`,
        `🌐 *Masofaviy:* ${escMdV2(yn(ann.isRemote))}`,
        `🤝 *Kelishilgan ish haqi:* ${escMdV2(yn(ann.isAgreed))}`,
        ``,
        `🗓 *Yaratilgan sana:* ${escMdV2(ann.createdDate ?? '—')}`,
    ];

    const mapBlock = buildMapLinks(ann.lat, ann.lon); // '' yoki markdown blok
    if (mapBlock) lines.push('', mapBlock);

    lines.push('', `🔑 *E’lon kodi:* \`${escMdV2(ann.code ?? '-')}\``);

    return lines.join('\n');
}

async function sendToAdmins(bot, groupId, ann, images = []) {
    const annId = ann?.data?.id || ann?.id;
    const kb = moderationKeyboard(annId);
    const text = renderAnnText(ann);

    try {
        let replyTo;

        if (images.length >= 2) {
            // 2..10 dona rasm — mediaGroup
            const media = [];
            for (const p of images.slice(0, 10)) {
                try {
                    const input = await fetchPhotoAsInput(p);
                    media.push({ type: 'photo', media: input });
                } catch (e) {
                    console.warn('skip bad image', p, e?.message);
                }
            }
            if (media.length >= 2) {
                const msgs = await bot.telegram.sendMediaGroup(groupId, media);
                replyTo = msgs?.[0]?.message_id;
            } else if (media.length === 1) {
                const m1 = await bot.telegram.sendPhoto(groupId, media[0].media);
                replyTo = m1.message_id;
            }
        } else if (images.length === 1) {
            try {
                const input = await fetchPhotoAsInput(images[0]);
                const m1 = await bot.telegram.sendPhoto(groupId, input);
                replyTo = m1.message_id;
            } catch (e) {
                console.warn('single image fetch failed', e?.message);
            }
        }

        const msg = await bot.telegram.sendMessage(groupId, text, {
            parse_mode: 'MarkdownV2',
            reply_markup: kb.reply_markup,
            reply_to_message_id: replyTo,
        });

        await mappingRepo.saveMapping(String(annId), String(groupId), msg.message_id);
    } catch (err) {
        logger4.error({ err, groupId }, 'Failed to send announcement to admin');
    }
}


async function markApproved(bot, annId, adminIds) {
    const mappings = await mappingRepo.getAllMappings(annId);
    for (const { chatId, messageId } of mappings) {
        try {
            await bot.telegram.editMessageReplyMarkup(chatId, messageId, undefined, approvedKeyboard().reply_markup);
        } catch (err) {
            logger4.warn({ err, chatId, messageId }, 'Edit after approve failed');
            // If markup edit fails (old message, etc.), try edit text fallback
            // try {
            //     await bot.telegram.editMessageText(chatId, messageId, undefined, `✅ Tasdiqlangan\n\n${'ID: ' + annId}`);
            // } catch (e2) {
            //     logger4.warn({ err: e2, chatId, messageId }, 'Edit after approve failed');
            // }
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