// importações
const { z } = require('zod')

// definindo validacao
const schemaContainerId = z.object({
    container_id: z.string().min(1, 'ID do container é obrigatório')
})

// exportação
module.exports = schemaContainerId