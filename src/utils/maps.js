function buildMapLinks(lat, lon) {
    if (lat == null || lon == null || lat === '' || lon === '') return '';
    const g = `https://www.google.com/maps?q=${lat},${lon}`;       // lat,lon
    const y = `https://yandex.com/maps/?ll=${lon},${lat}&z=16&pt=${lon},${lat},pm2rdl`; // lon,lat
    return `🌍 *Xaritada ko‘rish:*\n[Google Maps](${g}) | [Yandex](${y})`;
}
module.exports = { buildMapLinks };