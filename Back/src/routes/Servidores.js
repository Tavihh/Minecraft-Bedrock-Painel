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
const DBjogador = require('../models/DBjogador')
const getLanIp = require('../utils/getLanIp')
const renderizaMapa = require('../utils/renderizaMapa')


// rotas
router.get('/', ( req, res ) => {
    return res.status(200).json(['Rota Servidores Funcionando!'])
})

router.post('/criar', upload.single('arquivo_mundo'), async(req, res) => {
    const { 
        nome, 
        descricao, 

        // Desativa Conquistas
        allow_cheats, //allow-cheats (true) false
        gamemode, // survival, (creative), adventure

        // Customização do Mundo
        force_gamemode, //force-gamemode
        version, // versao do mundo gerado
        level_type, // level-type (DEFAULT), FLAT, LEGACY
        difficulty, // difficulty peaceful, easy, (normal), hard
        server_name, // server-name
        level_seed, // level-seed de criação
        max_players, // max-players
        desempenho, // escolher nivel de desempenho
        cordenadas, // (true) or false
        dias_jogados, // (true) or false
        default_player_permission_level, // default-player-permission-level visitor, (member), operator
        online_mode, // online-mode true or (false) Se for True, apenas contas oficiais Xbox poderão entrar
        allow_list, // allow-list true or (false)
        player_idle_timeout, // player-idle-timeout em minutos, chuta jogadores inativos
        server_port, // server-port=19132
        texturepack_required
    } = req.body;
    const nome_diretorio = nome.replace(/\s+/g, '_').toLowerCase();
    const PathDestino = path.join(__dirname, '../data', nome_diretorio)
    const PathWorlds = path.join(PathDestino, 'worlds', 'Bedrock level')

    const PathBase = path.join(__dirname, '../data');
    const PathDB = path.join(PathDestino, 'worlds', 'Bedrock level', 'db')
    let erros = []
    // fluxo de diretorios
    try {
        if(fs.existsSync(PathDestino)) {
            if(req.file) fs.removeSync(req.file.path);
            erros.push('Já existe um servidor com este nome.')
            return res.status(400).json(erros)
        }
        if (!fs.existsSync(PathWorlds)) {
            fs.mkdirSync(PathWorlds, {recursive: true})
        }
        if(req.file) {
            // valida a extensão
            const ext = path.extname(req.file.originalname).toLowerCase();
            if(ext !== '.zip' && ext !== '.mcworld') {
                fs.removeSync(req.file.path);
                fs.removeSync(PathDestino);
                erros.push('Apenas arquivos .zip ou .mcworld são permitidos');
                return res.status(400).json(erros)
            }
            const zip = new AdmZip(req.file.path)
            zip.extractAllTo(path.join(PathWorlds), true)
            fs.removeSync(req.file.path)

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
        if(req.file) fs.removeSync(req.file.path)
        if(fs.existsSync(PathDestino)) fs.removeSync(PathDestino);
        erros.push('Erro ao processar os diretórios ou upload do mundo.')
        return res.status(400).json(erros)
    }

    let view_distance
    let tick_distance
    let ram_maxima

    if(desempenho == 'leve') {[view_distance, tick_distance, ram_maxima] = [6, 4, 2]}
    else if(desempenho == 'medio') {[view_distance, tick_distance, ram_maxima] = [10, 4, 4]}
    else if(desempenho == 'alto') {[view_distance, tick_distance, ram_maxima] = [16, 8, 6]}

    let sv
    try{
        sv = await DBservidor.create({
            // Configuracoes
            nome: String(nome),
            descricao: String(descricao),
            // Sensiveis
            nome_diretorio: String(nome_diretorio),
            path_diretorio: PathDestino,
            path_db: PathDB,
            // desativa conquistas
            allow_cheats: String(allow_cheats),
            gamemode: String(gamemode),
            // customizacoes do mundo
            force_gamemode: String(force_gamemode),
            version: String(version),
            level_type: String(level_type),
            difficulty: String(difficulty),
            server_name: String(server_name) || String(nome),
            level_seed: String(level_seed),
            max_players: String(max_players),
            desempenho: String(desempenho),
            cordenadas: String(cordenadas),
            dias_jogados: String(dias_jogados),
            default_player_permission_level: String(default_player_permission_level),
            online_mode: String(online_mode),
            allow_list: String(allow_list),
            player_idle_timeout: String(player_idle_timeout),
            server_port: String(server_port),
            server_portv6: String(server_port),
            ram_maxima: String(ram_maxima),
            view_distance: String(view_distance),
            tick_distance: String(tick_distance),
            texturepack_required: String(texturepack_required)
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
            Image: `itzg/minecraft-bedrock-server`,
            name: `${sv.nome_diretorio}`,
            Tty: true,
            OpenStdin: true,
            Env: [
                'EULA=TRUE',
                `GAMERULES=showCoordinates=${sv.cordenadas},showDaysPlayed=${sv.dias_jogados}`,
                `SERVER_NAME=${sv.server_name}`,
                `GAMEMODE=${sv.gamemode}`,
                `FORCE_GAMEMODE=${sv.force_gamemode}`,
                `DIFFICULTY=${sv.difficulty}`,
                `ALLOW_CHEATS=${sv.allow_cheats}`,
                `MAX_PLAYERS=${sv.max_players}`,
                `ONLINE_MODE=${sv.online_mode}`,
                `ALLOW_LIST=${sv.allow_list}`,
                `SERVER_PORT=${sv.server_port}`,
                `SERVER_PORT_V6=${sv.server_portv6}`,
                `VIEW_DISTANCE=${sv.view_distance}`,
                `SIMULATION_DISTANCE=${sv.tick_distance}`,
                `PLAYER_IDLE_TIMEOUT=${sv.player_idle_timeout}`,
                `LEVEL_SEED=${sv.level_seed}`,
                `DEFAULT_PLAYER_PERMISSION_LEVEL=${sv.default_player_permission_level}`,
                `TEXTUREPACK_REQUIRED=${sv.texturepack_required}`,
                `LEVEL_TYPE=${sv.level_type}`,
                `VERSION=${sv.version}`,
                `MEMORY=${sv.ram_maxima}G`
            ],
            HostConfig: {
                PortBindings: {
                    [`${String(server_port)}/udp`]: [{ HostIp: '0.0.0.0', HostPort: String(server_port) }],
                    [`${String(server_port)}/tcp`]: [{ HostIp: '0.0.0.0', HostPort: String(server_port) }]
                },
                Binds: [
                    `${path.resolve(PathDestino)}:/data`,
                ],
                // Mantém apenas o limite de RAM para o Windows não engolir sua máquina
                Memory: Number(sv.ram_maxima) * 1024 * 1024 * 1024
            }
        })
    } catch (err) {
        if(fs.existsSync(PathDestino)) fs.removeSync(PathDestino)
        await sv.destroy()
        erros.push('Não foi possivel inicializar o container do Docker')
        erros.push(err.message)
        return res.status(400).json(erros)
    }

    try {
        // ligando container/servidor
        await sv.update({container_id: container.id, status: 'criando'});
        await container.start()
        return res.status(201).json(['Servidor de Minecraft Bedrock Criado!'])
    } catch (err) {
        await sv.update({status: 'erro'})
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

router.put('/editar/:id', async (req, res) => {
    const { 
        nome, 
        descricao, 

        // Desativa Conquistas
        allow_cheats, //allow-cheats (true) false
        gamemode, // survival, (creative), adventure

        // Customização do Mundo
        force_gamemode, //force-gamemode
        version, // versao do mundo gerado
        level_type, // level-type (DEFAULT), FLAT, LEGACY
        difficulty, // difficulty peaceful, easy, (normal), hard
        server_name, // server-name
        level_seed, // level-seed de criação
        max_players, // max-players
        desempenho, // escolher nivel de desempenho
        cordenadas, // (true) or false
        dias_jogados, // (true) or false
        default_player_permission_level, // default-player-permission-level visitor, (member), operator
        online_mode, // online-mode true or (false) Se for True, apenas contas oficiais Xbox poderão entrar
        allow_list, // allow-list true or (false)
        player_idle_timeout, // player-idle-timeout em minutos, chuta jogadores inativos
        server_port, // server-port=19132
        texturepack_required
    } = req.body;
    const { id } = req.params
    let erros = []
    let view_distance
    let tick_distance
    let ram_maxima

    if(desempenho == 'leve') {[view_distance, tick_distance, ram_maxima] = [6, 4, 2]}
    else if(desempenho == 'medio') {[view_distance, tick_distance, ram_maxima] = [10, 4, 4]}
    else if(desempenho == 'alto') {[view_distance, tick_distance, ram_maxima] = [16, 8, 6]}
    
    // Atualiza o DB
    let sv
    try{
        sv = await DBservidor.findByPk(id)
        await sv.update({
            // Configuracoes
            nome: String(nome),
            descricao: String(descricao),
            // desativa conquistas
            allow_cheats: String(allow_cheats),
            gamemode: String(gamemode),
            // customizacoes do mundo
            force_gamemode: String(force_gamemode),
            difficulty: String(difficulty),
            server_name: String(server_name) || String(nome),
            max_players: String(max_players),
            cordenadas: String(cordenadas),
            dias_jogados: String(dias_jogados),
            default_player_permission_level: String(default_player_permission_level),
            online_mode: String(online_mode),
            allow_list: String(allow_list),
            player_idle_timeout: String(player_idle_timeout),
            texturepack_required: String(texturepack_required)
        })
    } catch (err) {
        erros.push('Não foi possivel editar o banco de dados')
        erros.push(err.message)
        return res.status(400).json(erros)
    }
    // Atualiza Server.properties
    try {
        const pathProperties = path.join(sv.path_diretorio, 'server.properties');
        if (fs.existsSync(pathProperties)) {
            let conteudo = fs.readFileSync(pathProperties, 'utf-8');

            const atualizarLinha = (chave, valor) => {
                const chaveUpper = String(chave).toUpperCase();
                const regex = new RegExp(`^${chaveUpper}=.*$`, 'm');
                if (regex.test(conteudo)) {
                    conteudo = conteudo.replace(regex, `${chaveUpper}=${valor}`);
                } else {
                    conteudo += `\n${chaveUpper}=${valor}`;
                }
            };

            atualizarLinha('server-name', sv.server_name);
            atualizarLinha('gamemode', sv.gamemode);
            atualizarLinha('force-gamemode', sv.force_gamemode);
            atualizarLinha('difficulty', sv.difficulty);
            atualizarLinha('allow-cheats', sv.allow_cheats);
            atualizarLinha('max-players', sv.max_players);
            atualizarLinha('online-mode', sv.online_mode);
            atualizarLinha('allow-list', sv.allow_list);
            atualizarLinha('player-idle-timeout', sv.player_idle_timeout);
            atualizarLinha('texturepack-required', sv.texturepack_required);
            
            // Regras especiais do array GAMERULES que vão para linhas separadas no properties nativo
            atualizarLinha('showcoordinates', sv.cordenadas);
            atualizarLinha('showdaysplayed', sv.dias_jogados);

            fs.writeFileSync(pathProperties, conteudo, 'utf8');
        }
        

    } catch (err) {
        erros.push('Não foi possivel editar o container')
        erros.push(err.message)
        return res.status(400).json(erros)
    }

    try {
        // ligando container/servidor
        const container = docker.getContainer(sv.container_id);
        await container.restart
        await sv.update({ status: 'offline'})
        return res.status(201).json(['Servidor de Minecraft Bedrock Atualizado!'])
    } catch (err) {
        await sv.update({status: 'erro'})
        erros.push('Servidor atualizado e configurado, mas houve uma falha ao iniciar o container.')
        erros.push(err.message)
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
            if(sv.status !== 'offline') {
                await sv.update({status: 'offline'})
            } 
            await DBjogador.update({ esta_online: false },{ where: { servidorId: id }});
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