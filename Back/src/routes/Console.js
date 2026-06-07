// importações
const express = require('express')
const router = express.Router()
const schemaContainerId = require('../utils/formContainerId')
const docker = require('../config/Docker')

// rotas
router.get('/', ( req, res ) => {
    return res.status(200).json(['Rota Console Funcionando!'])
})

router.post('/comando/:container_id', async (req, res) => {
    // validando dados
    const validacao = schemaContainerId.safeParse(req.params)
    if (!validacao.success) {
        const erros = validacao.error.issues.map(e => e.message)
        return res.status(400).json(erros)
    }
    let erros = []
    try {
        const { container_id } = req.params
        const comando = req.body.comando
        if (!comando || typeof comando !== 'string' || comando.trim() === '') {
            erros.push('Comando não pode ser vazio')
            return res.status(400).json(erros)
        }

        const container = docker.getContainer(container_id)
        const inspecao = await container.inspect()
        if(!inspecao.State.Running) {
            erros.push('O servidor precisa estar ligado para executar comandos')
            return res.status(400).json(erros)
        }

        // Remove a barra '/' caso o usuário digite (/op jogador)
        const comandoFormatado = comando.trim().replace(/^\//, '');

        // 🚀 A SOLUÇÃO COMPROVADA: Chama o utilitário interno do container do itzg
        const exec = await container.exec({
            Cmd: ['mc-send-to-console', comandoFormatado],
            AttachStdin: false,
            AttachStdout: true,  // Deixe true para capturar se o docker reclamar de algo
            AttachStderr: true
        });

        // Executa o comando em background dentro do container
        await exec.start({ detach: true });

        return res.status(200).json(['Comando Executado!'])
    } catch (err) {
        erros.push('Não foi possivel executar o comando')
        erros.push(err.message)
        return res.status(500).json(erros)
    }
})

router.get('/ligar', (req, res) => {
    return res.status(200).json(['Console Ligado!'])
})

router.get('/kill', (req, res) => {
    return res.status(200).json(['Jogador Morto!'])
})

router.get('/kick', (req, res) => {
    return res.status(200).json(['Jogador Kickado!'])
})

router.get('/ban', (req, res) => {
    return res.status(200).json(['Jogador Kickado!'])
})

router.get('/give', (req, res) => {
    return res.status(200).json(['Item dado!'])
})



// exportações
module.exports = router