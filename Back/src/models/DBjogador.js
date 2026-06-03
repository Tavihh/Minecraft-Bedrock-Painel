// importações
const { DataTypes } = require('sequelize')
const sq = require('./DBconfig')
const DBservidor = require('./DBservidor')

// definindo db
const DBjogador = sq.define('jogador', {
    xuid: {
        type: DataTypes.STRING,
        allowNull: false
    },
    gamertag: {
        type: DataTypes.STRING,
        allowNull: false
    },
    // relacionamento com o servidor
    servidorId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'servidores',
            key: 'id'
        }
    },
    x: {
        type: DataTypes.FLOAT,
        defaultValue: 0
    },
    z: {
        type: DataTypes.FLOAT,
        defaultValue: 0
    },
    ultima_conexao: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    },
    esta_online: {
        type: DataTypes.BOOLEAN,
        defaultValue:false
    },
    total_sessoes: {
        type: DataTypes.INTEGER,
        defaultValue: 1
    }
}, {
    // indice único composto: Impede duplicatas do mesmo player no mesmo server
    indexes: [
        {
            unique:true, 
            fields:['xuid','servidorId']
        }
    ]
});

// definindo associações 
DBservidor.hasMany(DBjogador, { foreignKey: 'servidorId', onDelete: 'CASCADE'});
DBjogador.belongsTo(DBservidor, { foreignKey: 'servidorId',});

// exportações
module.exports = DBjogador;