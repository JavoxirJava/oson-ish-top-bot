const redisMap = require('./redis');

const mapKey = (annId) => `ann:map:${annId}`;

async function saveMapping(annId, chatId, messageId) {
    await redisMap.hset(mapKey(annId), String(chatId), String(messageId));
}

async function getMessageId(annId, chatId) {
    const v = await redisMap.hget(mapKey(annId), String(chatId));
    return v ? Number(v) : null;
}

async function getAllMappings(annId) {
    const obj = await redisMap.hgetall(mapKey(annId));
    const out = [];
    for (const [chatId, messageId] of Object.entries(obj)) {
        out.push({ chatId: Number(chatId), messageId: Number(messageId) });
    }
    return out;
}

async function clearMapping(annId) {
    await redisMap.del(mapKey(annId));
}

module.exports = { saveMapping, getMessageId, getAllMappings, clearMapping };