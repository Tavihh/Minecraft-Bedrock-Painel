// banco de dados
const sq = require('../models/DBconfig')
const DBJogador = require('../models/DBjogador')
const DBservidor = require('../models/DBservidor')

// conectando as tabelas
sq.sync().then(() => {
    console.log('Tabelas OK!')
}).catch((err) => {
    console.log('Tabelas not OK!')
})