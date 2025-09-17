const dashify = (s = '') => String(s).replace(/\s-\s/g, ' – ');
const yn = v => v === true || v === 'Ha' ? 'Ha' : v === false || v === 'Yo\'q' ? 'Yo\'q' : (v ?? '—');

function joinAddr({ address, regionName, areasName }) {
    return [address, regionName, areasName].filter(Boolean).join(', ');
}

function timeRange(a, b) {
    const s = [a, b].filter(Boolean).join(' – ');
    return s || '—';
}

function salaryRange(from, to, curr) {
    if (!from && !to) return '—';
    const c = curr || '';
    return [from && `${from} ${c}`, to && `${to} ${c}`].filter(Boolean).join(' – ');
}

module.exports = { dashify, yn, joinAddr, timeRange, salaryRange };
