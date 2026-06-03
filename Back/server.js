// importações
const express = require('express')
const app = express()
const path = require('path')
const fs = require('fs')
const cors = require('cors')
const dockerStatus = require('./src/middleware/dockerStatus')
const getLanIp = require('./src/utils/getLanIp')

// configurações
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({extended: true}))


// importando rotas
const Servidores = require('./src/routes/Servidores')
const Jogadores = require('./src/routes/Jogadores')
const Console = require('./src/routes/Console')

app.use('/Public', express.static(path.join(__dirname, '/src/Public')))
app.use('/Maps', express.static(path.join(__dirname, '/src/Maps')))
require('./src/config/Db')

// rotas
app.use('/servidores', dockerStatus, Servidores)
app.use('/jogadores', dockerStatus, Jogadores)
app.use('/console', dockerStatus, Console)

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '/src/Public/index.html'))
})
app.get('/painel', (req, res) => {
    res.sendFile(path.join(__dirname, '/src/Public/index.html'))
})

// ligando servidor
app.listen(3000, () => {
    const ip = getLanIp()
    console.log(`Servidor rodando em http://${ip}:3000`)
})