const axios = require('axios');
const env3 = require('../config/env');
const logger3 = require('../utils/logger');

const api = axios.create({ baseURL: env3.BACKEND_BASE_URL, timeout: 15000 });
let jwt = '';
let isLoggingIn = false;

async function login() {
    if (isLoggingIn) return; // avoid duplicate logins
    isLoggingIn = true;
    try {
        // Adjust this according to your backend auth contract
        // Try phone-based first, else username
        const credentials = { phone: env3.BACKEND_ADMIN_PHONE, password: env3.BACKEND_ADMIN_PASSWORD }
        const url = '/api/v1/auth/signin'; // change if your path differs
        const { data } = await axios.post(env3.BACKEND_BASE_URL + url, credentials, { timeout: 15000 });
        // Expecting data like { token: '...' } or { accessToken: '...' }
        jwt = data?.data?.jwt;
        if (!jwt) throw new Error('No token in signin response');
        logger3.info('Backend login OK');
    } finally {
        isLoggingIn = false;
    }
}

api.interceptors.request.use((config) => {
    if (jwt) config.headers.Authorization = `Bearer ${jwt}`;
    return config;
});

api.interceptors.response.use(
    (res) => res,
    async (err) => {
        const cfg = err.config;
        const status = err.response?.status;
        if (status === 401 && !cfg.__retried) {
            logger3.warn('401 from backend, relogin and retry once');
            await login();
            cfg.__retried = true;
            if (jwt) cfg.headers.Authorization = `Bearer ${jwt}`;
            return api(cfg);
        }
        return Promise.reject(err);
    }
);

async function getAnnouncementById(annId) {
    // adjust path
    const { data } = await api.get(`/api/v1/ann/get-by-id/${annId}`);
    return data;
}

async function getAnnouncementImagesById(annId) {
    const { data } = await api.get(`/api/v1/vacancy/ann-resources/by-ann/${annId}`);
    return data;
}

async function approveAnn(annId) {
    const { data } = await api.post(`/api/v1/ann/accept/${annId}`);
    return data;
}

async function rejectAnn(annId, reason) {
    const { data } = await api.post(`/api/v1/ann/reject/${annId}?reason=${reason}`);
    return data;
}

module.exports = { api, login, getAnnouncementById, getAnnouncementImagesById, approveAnn, rejectAnn };