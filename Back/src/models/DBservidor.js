// importações
const { DataTypes } = require('sequelize')
const sq = require('./DBconfig')

// definindo db
const DBservidor = sq.define('servidores', {
    // Configuracoes
    nome: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    descricao: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    // Sensiveis
    nome_diretorio: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    imagem_mapa: {
        type: DataTypes.STRING, // Caminho absoluto para os arquivos do mundo
        allowNull: true
    },
    path_diretorio: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    path_db: {
        type: DataTypes.STRING,
        allowNull: false
    },
    // desativa conquistas
    allow_cheats: {
        type: DataTypes.ENUM('true', 'false'),
        allowNull: false,
    },
    gamemode: {
        type: DataTypes.ENUM('survival', 'creative', 'adventure'),
        allowNull: false,
    },
    // customizacoes do mundo
    force_gamemode: {
        type: DataTypes.ENUM('true', 'false'),
        allowNull: false,
    },
    version: {
        type: DataTypes.STRING,
        allowNull: false
    },
    level_type: {
        type: DataTypes.ENUM('DEFAULT', 'FLAT', 'LEGACY'),
        allowNull: false,
    },
    difficulty: {
        type: DataTypes.ENUM('peaceful', 'easy', 'normal', 'hard'),
        allowNull: false,
    },
    server_name: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    level_seed: {
        type: DataTypes.STRING,
        allowNull: true
    },
    max_players: {
        type: DataTypes.STRING,
        allowNull: true
    },
    desempenho: {
        type: DataTypes.ENUM('leve', 'medio', 'alto'),
        allowNull: false,
    },
    cordenadas: {
        type: DataTypes.ENUM('true', 'false'),
        allowNull: false,
    },
    dias_jogados: {
        type: DataTypes.ENUM('true', 'false'),
        allowNull: false,
    },
    default_player_permission_level: {
        type: DataTypes.ENUM('visitor', 'member', 'operator'),
        allowNull: false,
    },
    online_mode: {
        type: DataTypes.ENUM('true', 'false'),
        allowNull: false,
    },
    allow_list: {
        type: DataTypes.ENUM('true', 'false'),
        allowNull: false,
    },
    player_idle_timeout: {
        type: DataTypes.STRING,
        allowNull: true
    },
    server_port: {
        type: DataTypes.STRING,
        allowNull: false
    },
    server_portv6: {
        type: DataTypes.STRING,
        allowNull: true
    },
    ram_maxima: {
        type: DataTypes.STRING,
        defaultValue: 2,
        allowNull: false
    },
    container_id: {
        type: DataTypes.STRING,
        allowNull: true
    },
    status: {
        type: DataTypes.ENUM('criando', 'ligando', 'online', 'offline', 'erro'),
        defaultValue: 'offline'
    },
    view_distance: {
        type: DataTypes.STRING,
        allowNull: false
    },
    tick_distance: {
        type: DataTypes.STRING,
        allowNull: false
    },
    texturepack_required: {
        type: DataTypes.ENUM('true', 'false'),
        allowNull: false,
    },
});

// hooks
DBservidor.beforeValidate(async (servidor) => {
    if (!servidor.isNewRecord && !servidor.changed('server_port')) {
        return; 
    }

    // 🚀 SEGREDO 2: Atualizado de 'porta_host' para 'server_port' conforme seu novo Model
    if (!servidor.server_port) {
        try {
            const maxPort = await DBservidor.max('server_port');
            // Como no banco é STRING, garantimos que grava como String, mas soma como Number
            servidor.server_port = maxPort ? String(Number(maxPort) + 1) : '19132';
            servidor.server_portv6 = servidor.server_port; // Sincroniza a v6 junto
        } catch (error) {
            console.log('Erro no Hook de porta (geração):', error);
        }
    } else {
        try {
            // Garante que a busca seja feita usando o valor atual como String
            const portaExiste = await DBservidor.findOne({ 
                where: { server_port: String(servidor.server_port) } 
            });
            
            if (portaExiste && portaExiste.id !== servidor.id) {
                const maxPort = await DBservidor.max('server_port');
                servidor.server_port = maxPort ? String(Number(maxPort) + 1) : '19132';
                servidor.server_portv6 = servidor.server_port; // Sincroniza a v6 junto
            }
        } catch (error) {
            console.log('Erro no Hook de porta (validação):', error);
        }   
    }
});

// exportações
module.exports = DBservidor;