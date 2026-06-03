// importações
const Sequelize = require('sequelize')
const path = require('path')

// definindo db
const sq = new Sequelize({
    dialect: 'sqlite',
    storage: path.join(__dirname, 'database.sqlite'),
    logging: false    
})

// conectando no banco de dados
sq.authenticate().then(() => {
    console.log('Banco de Dados OK!')
}).catch((err) => {
    console.log('Banco de Dados Falhou!')
})

// exportações
module.exports = sq
