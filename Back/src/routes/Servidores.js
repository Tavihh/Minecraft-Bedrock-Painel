// importações
const router = require('express').Router()
const docker = require('../config/Docker')
const { upload, TmpPath } = require('../config/Multer')
const schemaCriarMundo = require('../utils/formCriar')
const schemaEditarMundo = require('../utils/formEditar')
const axios = require('axios')
const schemaId = require('../utils/formId')
const schemaContainerId = require('../utils/formContainerId')
const path = require('path')
const fs = require('fs-extra')
const AdmZip = require('adm-zip')
const DBservidor = require('../models/DBservidor')
const getLanIp = require('../utils/getLanIp')
const renderizaMapa = require('../utils/renderizaMapa')


// rotas
router.get('/', ( req, res ) => {
    return res.status(200).json(['Rota Servidores Funcionando!'])
})

router.post('/criar', upload.single('arquivo_mundo'), async(req, res) => {
    // validando dados
    const validacao = schemaCriarMundo.safeParse(req.body)
    if(!validacao.success) {
        if(req.file) {
            fs.removeSync(req.file.path)
        }
        const erros = validacao.error.issues.map(a => `Campo [${a.path[0]}]: ${a.message}`)
        return res.status(400).json(erros)
    }
    const { nome, descricao, porta_host, versao, nivel_permissao, tipo_mundo, gamemode, cheats, cordenadas, dias_jogados, desempenho, max_players, difficulty, force_gamemode, seed } = validacao.data;
    const nome_diretorio = nome.replace(/\s+/g, '_').toLowerCase();
    const PathDestino = path.join(__dirname, '../data', nome_diretorio)
    const PathWorlds = path.join(PathDestino, 'worlds', 'Bedrock level')

    const PathBase = path.join(__dirname, '../data');
    const PathDB = path.join(PathDestino, 'worlds', 'Bedrock level', 'db')
    let erros = []
    // fluxo de diretorios
    try {
        if(req.file) {
            // valida a extensão
            const ext = path.extname(req.file.originalname).toLowerCase();
            if(ext !== '.zip' && ext !== '.mcworld') {
                fs.removeSync(req.file.path)
                erros.push('Apenas arquivos .zip ou .mcworld são permitidos');
                return res.status(400).json(erros)
            }
            if(fs.existsSync(PathDestino)) {
                fs.removeSync(req.file.path);
                erros.push('Já existe um servidor com este nome.')
                return res.status(400).json(erros)
            } else {
                if(!fs.existsSync(PathWorlds)) fs.mkdirSync(PathWorlds, { recursive: true })
                const zip = new AdmZip(req.file.path)
                zip.extractAllTo(path.join(PathWorlds), true)
                fs.removeSync(req.file.path)
            }
            const arquivoExtraido = fs.readdirSync(PathWorlds)
            if (arquivoExtraido.length === 1 && fs.statSync(path.join(PathWorlds, arquivoExtraido[0])).isDirectory()) {
                const pastaInterna = path.join(PathWorlds, arquivoExtraido[0]);
                const itensParaMover = fs.readdirSync(pastaInterna);
                
                itensParaMover.forEach(i => {
                    fs.moveSync(path.join(pastaInterna, i), path.join(PathWorlds, i));
                });
                fs.removeSync(pastaInterna);
            }
        }
    } catch (err) {
        if(req.file) {
            fs.removeSync(req.file.path)
        }
        erros.push('Erro ao fazer upload do mundo.')
        return res.status(400).json(erros)
    }

    let view_distance
    let simulation_distance
    let ram_maxima

    if(desempenho == 'leve') {[view_distance, simulation_distance, ram_maxima] = [6, 4, 2]}
    if(desempenho == 'medio') {[view_distance, simulation_distance, ram_maxima] = [10, 10, 4]}
    if(desempenho == 'alto') {[view_distance, simulation_distance, ram_maxima] = [16, 14, 6]}

    let Sv
    try{
        Sv = await DBservidor.create({
            nome,
            nome_diretorio,
            descricao,
            porta_host: Number(porta_host),
            versao,
            nivel_permissao,
            ram_maxima: ram_maxima || 2,
            path_diretorio: PathDestino,
            path_db: PathDB, 
            status: 'criando',
            gamemode,
            cheats,
            cordenadas,
            dias_jogados,
            desempenho,
            view_distance,
            simulation_distance,
            max_players,
            difficulty,
            force_gamemode,
            seed
        })
    } catch (err) {
        if(fs.existsSync(PathDestino)) fs.removeSync(PathDestino)
        erros.push('Não foi possivel salvar o servidor')
        erros.push(err.message)
        return res.status(400).json(erros)
    }

    let container
    try {
        container = await docker.createContainer({
            Image: 'itzg/minecraft-bedrock-server',
            name: `${Sv.nome_diretorio}_teste_lan`, // Nome temporário para não conflitar com o antigo
            Tty: true,
            OpenStdin: true,
            Env: [
                'EULA=TRUE',
                `VERSION=${Sv.versao}`,
                `SEED=${Sv.seed}`,
                `DEFAULT_PLAYER_PERMISSION_LEVEL=${Sv.nivel_permissao}`,
                `LEVEL_TYPE=${String(Sv.tipo_mundo).toLowerCase()}`,
                `GAMEMODE=${Sv.gamemode}`,
                `MEMORY=${Sv.ram_maxima}G`,
                `SERVER_NAME=${Sv.nome}`,
                `ALLOW_CHEATS=${String(Sv.cheats).toLowerCase()}`,
                `GAMERULES=showCoordinates=${String(Sv.cordenadas).toLowerCase()},showDaysPlayed=${String(Sv.dias_jogados).toLowerCase()}`,
                `VIEW_DISTANCE=${Sv.view_distance}`,
                `SIMULATION_DISTANCE=${Sv.simulation_distance}`,
                `MAX_PLAYERS=${Number(Sv.max_players)}`,
                `DIFFICULTY=${Sv.difficulty}`,
                `FORCE_GAMEMODE=${String(Sv.force_gamemode).toLowerCase()}`,
                `SERVER_PORT=${Sv.porta_host}`
            ],
            HostConfig: {
                PortBindings: {
                    '19132/udp': [{ HostIp: '0.0.0.0', HostPort: String(Sv.porta_host) }],
                    '19132/tcp': [{ HostIp: '0.0.0.0', HostPort: String(Sv.porta_host) }]
                },
                Binds: [
                    `${path.resolve(PathDestino)}:/data`,
                ],
                // Mantém apenas o limite de RAM para o Windows não engolir sua máquina
                Memory: Number(Sv.ram_maxima) * 1024 * 1024 * 1024
            }
        })
    } catch (err) {
        if(fs.existsSync(PathDestino)) fs.removeSync(PathDestino)
        await Sv.destroy()
        erros.push('Não foi possivel criar o servidor')
        erros.push(err.message)
        return res.status(400).json(erros)
    }

    try {
        // ligando container/servidor
        await Sv.update({container_id: container.id});
        await container.start()
        return res.status(201).json(['Servidor de Minecraft Bedrock Criado!'])
    } catch (err) {
        await Sv.update({status: 'erro'})
        erros.push('Servidor configurado, mas houve uma falha ao iniciar o container.')
        erros.push(err.message)
        return res.status(500).json(erros)
    }
})

router.get('/listar', async (req, res) => {
    let erros = []
    try {
        const servidores = await DBservidor.findAll()
        return res.status(200).json(servidores)
        
    } catch (err) {
        erros.push('Não foi possivel listar os Servidores')
        return res.status(400).json(erros)
    }
})

router.get('/versoes', async (req, res) => {
    let erros = []
    let versoes = []
    try {
        const response = await axios.get('https://raw.githubusercontent.com/PrismarineJS/minecraft-data/master/data/bedrock/common/protocolVersions.json');
        const registros = response.data;
        const versoesFiltradas = registros
            .filter(v => v.minecraftVersion && /^1\.(1[6-9]|)/.test(v.minecraftVersion))
            .map(v => v.minecraftVersion);
        const listaSemRepetir = [...new Set(versoesFiltradas)];
        listaSemRepetir.sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));
        const versoes = [...listaSemRepetir];
        return res.status(200).json(versoes)
    } catch (err) {
        erros.push('Não foi possivel listar as Versões')
        erros.push(err.message)
        return res.status(400).json(erros)
    }
})

router.get('/painel/:id', async (req, res) => {
    // validando dados
    const validacao = schemaId.safeParse(req.params)
    if(!validacao.success) {
        const erros = validacao.error.issues.map(a => a.message)
        return res.status(400).json(erros)
    }
    const { id } = validacao.data
    let erros = []
    try {
        const servidor = await DBservidor.findByPk(id)
        if(!servidor) {
            erros.push('Servidor não encontrado')
            return res.status(404).json(erros)
        }
        server = servidor.toJSON()
        server.ip = getLanIp()
        return res.status(200).json(server)
    } catch (err) {
        erros.push('Erro ao buscar servidor')
        return res.status(404).json(erros)
    }
})

router.get('/download/:id', async (req, res) => {
    // validando dados
    const validacao = schemaId.safeParse(req.params)
    if(!validacao.success) {
        const erros = validacao.error.issues.map(a => a.message)
        return res.status(400).json(erros)
    }
    let erros = []
    const { id } = validacao.data

    // verifica se o servidor está desligado
    let servidor
    let container
    try {
        servidor = await DBservidor.findByPk(id)
        if (!servidor || !servidor.container_id) {
            erros.push('não é possivel verificar status do servidor')
            return res.status(404).json(erros)
        }
        container = docker.getContainer(servidor.container_id)
        // verifica se o servidor está rodando
        if ((await container.inspect()).State.Running) {
            erros.push('Desligue o servidor antes.')
            return res.status(400).json(erros)
        }
    } catch (err) {
        erros.push('Erro ao verificar status do servidor')
        return res.status(400).json(erros)
    }

    // arquivo Download
    try {
        if(!servidor || !fs.existsSync(path.join(servidor.path_diretorio, 'worlds', 'Bedrock level'))) {
            erros.push('Arquivos do mundo não encontrados')
            return res.status(400).json(erros)
        }
        const zip = new AdmZip();
        zip.addLocalFolder(path.join(servidor.path_diretorio, 'worlds', 'Bedrock level'));
        const buffer = zip.toBuffer();
        res.set({
            'Content-Type': 'application/mcworld',
            'Content-Disposition': `attachment; filename="${servidor.nome}.mcworld"`,
            'Content-Length': buffer.length
        });
        return res.send(buffer);
    } catch (err) {
        erros.push('Erro ao gerar download.')
        return res.status(400).json(erros)
    }
})

router.delete('/deletar/:id', async (req, res) => {
    // validando dados
    const validacao = schemaId.safeParse(req.params)
    if(!validacao.success) {
        const erros = validacao.error.issues.map(a => a.message)
        return res.status(400).json(erros)
    }
    const { id } = validacao.data
    let erros = []
    const servidor = await DBservidor.findByPk(id);
    if (!servidor) return res.status(400).json(['Servidor não encontrado'])
    // Apagando o Container
    if(servidor.container_id) {
        try {
            const container = docker.getContainer(servidor.container_id);
            const info = await container.inspect()
            const estaRodando = info.State.Running;
            
            // para o container se estiver rodando
            if (estaRodando) await container.stop()
            // remove o container
            await container.remove()
        } catch (err) {
            erros.push('Erro ao tentar apagar container')
            return res.status(400).json(erros)
        }
    }
    // Apagando os arquivos
    if(servidor.path_diretorio) {
        try {
            if(fs.existsSync(servidor.path_diretorio))fs.removeSync(servidor.path_diretorio)
            if(fs.existsSync(servidor.imagem_mapa)) fs.removeSync(path.join(__dirname, '../', servidor.imagem_mapa))
        } catch (err) {
            erros.push('Não foi possivel apagar os arquivos do servidor')
            return res.status(400).json(erros)
        }
    }
    try {
        await servidor.destroy();
        return res.status(200).json(['Servidor e arquivos deletado com sucesso!'])
    } catch (err) {
        erros.push('Não foi possivel deletar instancia do Servidor')
        return res.status(400).json(erros)
    }
})

router.put('/editar', async (req, res) => {
    // validando dados
    const validacao = schemaEditarMundo.safeParse(req.body)
    if(!validacao.success) {
        const erros = validacao.error.issues.map(a => a.message)
        return res.status(400).json(erros)
    }
    let erros = []
    const { id, nome, descricao, porta_host, nivel_permissao, desempenho, max_players, difficulty, cordenadas, dias_jogados, versao, gamemode, force_gamemode, cheats } = validacao.data
    
    let view_distance
    let simulation_distance
    let ram_maxima
    
    if(desempenho == 'leve') {[view_distance, simulation_distance, ram_maxima] = [6, 4, 2]}
    if(desempenho == 'medio') {[view_distance, simulation_distance, ram_maxima] = [10, 10, 4]}
    if(desempenho == 'alto') {[view_distance, simulation_distance, ram_maxima] = [16, 14, 6]}
    
    // Atualiza o DB
    let Sv
    try{
        Sv = await DBservidor.findByPk(id)
        await Sv.update({
            nome,
            descricao,
            porta_host,
            nivel_permissao,
            desempenho,
            view_distance, 
            simulation_distance, 
            max_players,
            ram_maxima,
            difficulty,
            cordenadas,
            dias_jogados,
            versao,
            gamemode,
            force_gamemode,
            cheats
        })
    } catch (err) {
        erros.push('Não foi possivel editar o servidor')
        return res.status(400).json(erros)
    }
    // apaga o container
    try {
        // apaga o container antigo
        if(Sv.container_id){
            const containerAntigo = docker.getContainer(Sv.container_id)
            // verifica se está rodando e para
            if((await containerAntigo.inspect()).State.Running) {
                await containerAntigo.stop()
            }
            // apaga o container antigo
            await containerAntigo.remove()
        }
    } catch (err) {
        erros.push('Não foi possivel apagar o container antigo')
        return res.status(400).json(erros)
    }
    // recria o container
    let container
    try {
        container = await docker.createContainer({
            Image: 'itzg/minecraft-bedrock-server',
            name: Sv.nome_diretorio,
            Tty: true,
            OpenStdin: true,
            Env: [
                'EULA=TRUE',
                `VERSION=${Sv.versao}`,
                `DEFAULT_PLAYER_PERMISSION_LEVEL=${Sv.nivel_permissao}`,
                `LEVEL_TYPE=${Sv.tipo_mundo.toUpperCase()}`,
                `MEMORY=${Sv.ram_maxima}G`,
                `SERVER_NAME=${Sv.nome}`,
                `GAMERULES=showCoordinates=${Sv.cordenadas},showDaysPlayed=${Sv.dias_jogados}`,
                `VIEW_DISTANCE=${Sv.view_distance}`,
                `SIMULATION_DISTANCE=${Sv.simulation_distance}`,
                `MAX_PLAYERS=${Sv.max_players}`,
                `DIFFICULTY=${Sv.difficulty}`,
                `ALLOW_CHEATS=${Sv.cheats}`,
                `GAMEMODE=${Sv.gamemode}`,
                `FORCE_GAMEMODE=${Sv.force_gamemode}`
            ],
            HostConfig: {
                PortBindings: { '19132/udp': [{ HostPort: String(Sv.porta_host) }] },
                Binds: [`${path.resolve(Sv.path_diretorio)}:/data`],
            }
        })
    } catch (err) {
        erros.push('Não foi possivel recriar o container')
        return res.status(400).json(erros)
    }

    try {
        // ligando container/servidor
        await Sv.update({container_id: container.id});
        await container.start()
        return res.status(201).json(['Servidor de Minecraft Bedrock Atualizado!'])
    } catch (err) {
        await Sv.update({status: 'erro'})
        erros.push('Servidor atualizado e configurado, mas houve uma falha ao iniciar o container.')
        return res.status(500).json(erros)
    }
})

router.post('/desligar/:id', async (req, res) => {
    // validando dados
    const validacao = schemaId.safeParse(req.params)
    if (!validacao.success) {
        const erros = validacao.error.issues.map(a => a.message)
        return res.status(400).json(erros)
    }
    let erros = []
    const { id } = validacao.data

    try {
        const servidor = await DBservidor.findByPk(id)
        if(servidor.container_id) {
            const container = docker.getContainer(servidor.container_id)
            if ((await container.inspect()).State.Running) {
                await container.stop()
            }
        }
        await servidor.update({status: 'offline'})
        return res.status(200).json(['Servidor Desligado!'])
    } catch (err) {
        erros.push('Erro ao tentar desligar o servidor')
        return res.status(400).json(erros)
    }
})

router.post('/ligar/:id', async (req, res) => {
    // validando dados
    const validacao = schemaId.safeParse(req.params)
    if(!validacao.success) {
        const erros = validacao.error.issues.map(a => a.message)
        return res.status(400).json(erros)
    }
    let erros = []
    const { id } = validacao.data  

    try {
        const servidor = await DBservidor.findByPk(id)
        if (servidor.container_id) {
            const container = docker.getContainer(servidor.container_id)
            if (!(await container.inspect()).State.Running) {
                await container.start()
            }
        }
        await servidor.update({status: 'online'})
        return res.status(200).json(['Servidor Ligado!'])
    } catch (err) {
        erros.push('Erro ao tentar ligar o servidor')
        return res.status(400).json(erros)
    }
})

router.get('/estaOn/:id', async (req, res) => {
    // validando dados
    const validacao = schemaId.safeParse(req.params)
    if(!validacao.success) {
        const erros = validacao.error.issues.map(a => a.message)
        return res.status(400).json(erros)
    }
    let erros = []
    const { id } = validacao.data  
    try {
        const sv = await DBservidor.findByPk(id);
        if(!sv || !sv.container_id) {
            erros.push('Servidor ou container não encontrados!')
            return res.status(404).json(erros)
        }
        const container = docker.getContainer(sv.container_id)
        const inspecao = await container.inspect();
        if(!inspecao.State.Running) {
            if(sv.status !== 'offline') await sv.update({status: 'offline'})
            return res.status(200).json({status: 'offline'})
        }
        const dockerHealth = inspecao.State.Health?.Status;
        if (dockerHealth === 'healthy') {
            if (sv.status !== 'online') await sv.update({ status: 'online' });
            return res.status(200).json({status: 'online'})
        }
        if (dockerHealth === 'starting') {
            const statusAtual = sv.status === 'criando' ? 'criando' : 'ligando';
            if (sv.status !== statusAtual) await sv.update({ status: statusAtual });
            return res.status(200).json({ status: statusAtual });
        }
        if (dockerHealth === 'unhealthy') {
            const statusAtual = sv.status === 'criando' ? 'criando' : 'ligando';
            if (sv.status !== statusAtual) await sv.update({ status: statusAtual });
            return res.status(200).json({ status: statusAtual });
        }
        if (!dockerHealth) {
            // Se no seu banco o status inicial for 'criando', mantém 'criando'. Caso contrário, 'ligando'.
            const statusAtual = sv.status === 'criando' ? 'criando' : 'ligando';
            if (sv.status !== statusAtual) await sv.update({ status: statusAtual });
            return res.status(200).json({ status: statusAtual });
        }
        sv.update({status: 'erro'})
        return res.status(200).json({status: 'erro'})
    } catch (err) {
        erros.push(err.message)
        return res.status(400).json(erros)
    }
})

router.get('/logs/:container_id', async (req, res) => {
    // validando dados
    const validacao = schemaContainerId.safeParse(req.params)
    if(!validacao.success) {
        const erros = validacao.error.issues.map(a => a.message)
        return res.status(400).json(erros)
    }
    let erros = []
    const { container_id } = validacao.data 
    try {
        const container = docker.getContainer(container_id)
        const logsBuffer = await container.logs({
            stdout: true,
            stderr: true,
            tail: 40,
            timestamps: false
        })
        const logsLimpos = logsBuffer.toString('utf-8').replace(/[\x00-\x1F\x7F-\x9F]/g, (match) => {
            return (match === '\n' || match === '\r' || match === '\t') ? match : '';
        });
        const arrayDeLinhas = logsLimpos.split('\n').map(linha => linha.trim()).filter(linha => linha.length > 0);
        return res.status(200).json({logs: arrayDeLinhas})
    } catch (err) {
        erros.push('Não foi possivel capturar os logs')
        return res.status(400).json(erros)
    }
})

router.get('/atualizaMapa/:id', async (req, res) => {
    // validando dados
    const validacao = schemaId.safeParse(req.params)
    if(!validacao.success) {
        const erros = validacao.error.issues.map(a => a.message)
        return res.status(400).json(erros)
    }
    let erros = []
    const { id } = validacao.data 
    try {
        // Verificamos se o servidor existe antes de começar
        const servidor = await DBservidor.findByPk(id);
        if (!servidor) {
            erros.push('Servidor não encontrado!')
            return res.status(404).json(erros);
        }
        
        // Se prefere rodar em "background", mantenha sem await:
        renderizaMapa(id).catch(err => console.error("Erro na renderização em background:", err));

        res.status(200).json({'Renderização do mapa iniciada!': 'Aguarde alguns minutos e atualize a página para ver as mudanças.'});

    } catch (err) {
        erros.push('Erro interno ao processar atualização do mapa.');
        erros.push('Erro na rota atualizaMapa:', err);
        res.status(500).json(erros);
    }
});

// exportações
module.exports = router