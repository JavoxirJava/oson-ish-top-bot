function escMdV2(s = '') {
    return String(s).replace(/[_*[\](){}`~>#+\-=|.!]/g, '\\$&');
}

function dashify(s = '') {
    return String(s).replace(/\s-\s/g, ' – ');
}

module.exports = { escMdV2, dashify };