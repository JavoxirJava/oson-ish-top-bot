const redisState = require('./redis');

const stateKey = (userId) => `state:reason:${userId}`;

async function setReasonAwait(userId, annId, ttlSec = 180) {
    await redisState.setex(stateKey(userId), ttlSec, String(annId));
}

async function getReasonAwait(userId) {
    return await redisState.get(stateKey(userId));
}

async function clearReasonAwait(userId) {
    await redisState.del(stateKey(userId));
}

module.exports = { setReasonAwait, getReasonAwait, clearReasonAwait };