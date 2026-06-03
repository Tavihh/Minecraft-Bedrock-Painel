// importações
const docker = require('../config/Docker')

// definindo middleware
async function dockerStatus(req, res, next) {
    let erros = []
    try {
        await docker.ping()
        return next()
    } catch (err) {
        erros.push('O daemon do docker está inacessivel ou desligado')
        return res.status(400).json(erros)
    }
}

// exportações
module.exports = dockerStatus
