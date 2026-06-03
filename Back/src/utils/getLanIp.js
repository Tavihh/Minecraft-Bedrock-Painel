const os = require('os');

function getLanIp() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const net of interfaces[name]) {
            // Buscamos um endereço IPv4 que não seja o interno (127.0.0.1)
            if (net.family === 'IPv4' && !net.internal) {
                return net.address; // Retorna algo como '192.168.15.10'
            }
        }
    }
    return '127.0.0.1'; // Fallback caso esteja sem rede
}

module.exports = getLanIp;