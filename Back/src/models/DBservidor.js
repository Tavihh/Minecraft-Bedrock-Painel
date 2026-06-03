// importações
const { DataTypes } = require('sequelize')
const sq = require('./DBconfig')

// definindo db
const DBservidor = sq.define('servidores', {
    nome: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
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
    descricao: {
        type: DataTypes.STRING,
        allowNull: true
    },
    versao: {
        type: DataTypes.STRING,
        defaultValue: 'latest',
        allowNull: false
    },
    ram_maxima: {
        type: DataTypes.INTEGER,
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
    path_db: {
        type: DataTypes.STRING,
        allowNull: false
    },
    imagem_mapa: {
        type: DataTypes.STRING,
        allowNull: true
    },
    nivel_permissao: {
        type: DataTypes.ENUM('visitor', 'member', 'operator'),
        defaultValue: 'member'
    },
    tipo_mundo: {
        type: DataTypes.ENUM('flat', 'legacy', 'default'),
        defaultValue: 'default'
    },
    porta_host: {
        type: DataTypes.INTEGER,
        allowNull: false,
        unique: true
    },
    gamemode: {
        type: DataTypes.ENUM('survival', 'creative'),
        allowNull: false,
        defaultValue: 'survival'
    },
    cheats: {
        type: DataTypes.ENUM('true', 'false'),
        allowNull: false
    },
    cordenadas: {
        type: DataTypes.ENUM('true', 'false'),
        allowNull: false
    },
    dias_jogados: {
        type: DataTypes.ENUM('true', 'false'),
        allowNull: false
    },
    desempenho: {
        type: DataTypes.ENUM('leve', 'medio', 'alto'),
        allowNull: false,
        defaultValue: 'medio'
    },
    view_distance: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    simulation_distance: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    max_players: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 1
    },
    difficulty: {
        type: DataTypes.ENUM('peaceful', 'easy', 'normal', 'hard'),
        allowNull: false,
        defaultValue: 'normal'
    },
    force_gamemode: {
        type: DataTypes.ENUM('true', 'false'),
        allowNull: false
    },
    seed: {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: ''
    }
});

// hooks
DBservidor.beforeValidate( async (servidor) => {
    if(!servidor.porta_host) {
        try{
            const maxPort = await DBservidor.max('porta_host');
            servidor.porta_host = maxPort ? Number(maxPort + 1) : 19132;
        } catch (error) {
            console.log('Erro no Hook de porta:', error);
        }
    } else {
        try {
            const portaExiste = await DBservidor.findOne({where: {porta_host: Number(servidor.porta_host)}})
            if(portaExiste) {
                const maxPort = await DBservidor.max('porta_host');
                servidor.porta_host = maxPort ? Number(maxPort + 1) : 19132;
            }
        } catch (error) {
            console.log('Erro no Hook de porta:', error);
        }   
    }
})

// exportações
module.exports = DBservidor;