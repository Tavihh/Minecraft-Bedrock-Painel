// importações
const { z } = require('zod')

// definindo validacao
const schemaId = z.object({
    id: z.coerce.number({invalid_type_error: 'id deve ser um número inteiro positivo'}).int('id deve ser um número inteiro positivo').positive('id deve ser um número inteiro positivo')
})

// exportação
module.exports = schemaId