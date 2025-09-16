function escMdV2(s = '') {
    return String(s).replace(/[_*[\](){}`~>#+\-=|.!]/g, '\\$&'); // minus ham shu yerda
}

function dashify(s = '') {
    return String(s).replace(/\s-\s/g, ' – ');
}

module.exports = { escMdV2, dashify };