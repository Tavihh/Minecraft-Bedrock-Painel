// importações
const router = require('express').Router()
const DBjogador = require('../models/DBjogador')
const DBservidor = require('../models/DBservidor')
const schemaId = require('../utils/formId')
const docker = require('../config/docker')

// rotas
router.get('/', ( req, res ) => {
    return res.status(200).json([ 'Rota Jogadores Funcionando!'])
})

router.get('/criar', (req, res) => {
    return res.status(200).json([ 'Jogador Criado!'])
})

router.get('/listar', async (req, res) => {
    let erros = []
    try {
        const jogadoresComServidor = await DBjogador.findAll({
            include: [{ model: DBservidor }]
        })
        return res.status(200).json(jogadoresComServidor)
    } catch (err) {
        erros.push('Não foi possível listar os Jogadores')
        erros.push("[Erro ao listar jogadores]:", err.message)
        return res.status(500).json(erros)
    }
})

router.get('/server/:id/atualizarPlayers', async (req, res) => {
    const validacao = schemaId.safeParse(req.params)
    if(!validacao.success) {
        const erros = validacao.error.issues.map(a => a.message)
        return res.status(400).json(erros)
    }
    const { id } = validacao.data
    let erros = []

    try {
        const sv = await DBservidor.findByPk(id)
        if(!sv || !sv.container_id) {
            erros.push('Servidor ou contêiner não encontrado')
            return res.status(404).json(erros)
        }

        const container = docker.getContainer(sv.container_id)
        
        const bufferLogs = await container.logs({
            stdout: true, 
            stderr: false, 
            tail: 100,
            decodeWithHeaders: true
        })

        const textoLogs = bufferLogs.toString('utf8')
        const linhas = textoLogs.split('\n')

        // 🚀 SEGREDO 1: Loop único varrendo o log linha por linha (Performance Máxima)
        for (const linha of linhas) {
            
            // 🟢 TRATANDO CONEXÃO
            if (linha.includes('Player connected:')) {
                const match = linha.match(/Player connected:\s+([^,]+),\s+xuid:\s+(\d+)/)
                if (match) {
                    const playerGamertag = match[1].trim()
                    const playerXuid = match[2].trim()

                    const [jogador, criado] = await DBjogador.findOrCreate({
                        where: { xuid: playerXuid, servidorId: id },
                        defaults: {
                            gamertag: playerGamertag,
                            esta_online: true,
                            total_sessoes: 1,
                            ultima_conexao: new Date()
                        }
                    })

                    // 🛡️ SEGREDO 2: Só altera e soma sessão se ele REALMENTE estava offline antes
                    if (!criado && !jogador.esta_online) {
                        await jogador.update({
                            gamertag: playerGamertag,
                            esta_online: true,
                            ultima_conexao: new Date(),
                            total_sessoes: jogador.total_sessoes + 1
                        })
                    }
                }
            }

            // 🔴 TRATANDO DESCONEXÃO
            else if (linha.includes('Player disconnected:')) {
                const match = linha.match(/Player disconnected:\s+([^,]+),\s+xuid:\s+(\d+)/)
                if (match) {
                    const playerGamertag = match[1].trim()
                    const playerXuid = match[2].trim()

                    const [jogador, criado] = await DBjogador.findOrCreate({
                        where: { xuid: playerXuid, servidorId: id },
                        defaults: {
                            gamertag: playerGamertag,
                            esta_online: false,
                            total_sessoes: 0,
                            ultima_conexao: new Date()
                        }
                    })

                    // 🛡️ Só atualiza o banco se o jogador ainda constava como online
                    if (!criado && jogador.esta_online) {
                        await jogador.update({
                            gamertag: playerGamertag,
                            esta_online: false,
                            ultima_conexao: new Date()
                        })
                    }
                }
            }
        }

        // Retorno unificado dos jogadores após processar os status
        const jogadoresComServidor = await DBjogador.findAll({
            where: { servidorId: id },
            include: [{ model: DBservidor }]
        })
        
        return res.status(200).json(jogadoresComServidor)

    } catch (err) {
        console.error("[Erro atualizarPlayers]:", err.message)
        erros.push('Não foi possível processar a lista de jogadores ativos')
        return res.status(500).json(erros)
    }
})

router.get('/deletar', (req, res) => {
    return res.status(200).json([ 'Jogador Deletado!'])
})

// exportações
module.exports = router