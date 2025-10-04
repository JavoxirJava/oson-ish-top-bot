const axios = require('axios');
const { Input } = require('telegraf');
const env = require('../config/env');

const toUrl = (idOrUrl) =>
    String(idOrUrl).startsWith('http')
        ? idOrUrl
        : `${env.BACKEND_BASE_URL}/api/v1/file/download/${idOrUrl}`;

async function fetchPhotoAsInput(p) {
    const url = toUrl(p);
    const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 20000 });
    const ct = (res.headers['content-type'] || '').toLowerCase();
    const ext = ct.includes('png') ? 'png' : ct.includes('webp') ? 'webp' : 'jpg';
    return Input.fromBuffer(Buffer.from(res.data), `photo.${ext}`);
}

module.exports = { fetchPhotoAsInput };
