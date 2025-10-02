const Redis = require('ioredis');
const env2 = require('../config/env');
const logger2 = require('../utils/logger');


const redis = new Redis(env2.REDIS_URL);
redis.on('connect', () => logger2.info('Redis connected'));
redis.on('error', (err) => logger2.error({ err }, 'Redis error'));
module.exports = redis;