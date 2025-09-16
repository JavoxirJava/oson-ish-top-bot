const redisLock = require('./redis');

const lockKey = (annId) => `lock:${annId}`;

async function tryLock(annId, ttlSec = 180) {
    const res = await redisLock.set(lockKey(annId), '1', 'NX', 'EX', ttlSec);
    return !!res;
}

async function unlock(annId) {
    await redisLock.del(lockKey(annId));
}

module.exports = { tryLock, unlock };