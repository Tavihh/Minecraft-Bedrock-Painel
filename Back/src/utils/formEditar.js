// importações
const { z } = require('zod')

// definindo validação
const schemaEditarMundo = z.object({

    // precisa recriar o container
    id: z.coerce.number({invalid_type_error: 'id deve ser um número inteiro positivo'}).int('id deve ser um número inteiro positivo').positive('id deve ser um número inteiro positivo'),
    nome: z.string().min(1, 'O nome é obrigatorio'),
    descricao: z.string({invalid_type_error: 'descricao deve ser texto'}).nullable().optional(),
    porta_host: z.coerce.number({invalid_type_error: "A porta deve ser um número inteiro positivo"}).int("A porta deve ser um número inteiro positivo").positive("A porta deve ser um número inteiro positivo"),
    nivel_permissao: z.enum(['visitor', 'member', 'operator']),
    desempenho: z.enum(['leve', 'medio', 'alto']),
    max_players: z.coerce.number({invalid_type_error: 'Número máximo de players deve ser um número inteiro positivo'}).int('Número máximo de players deve ser um número inteiro positivo').positive('Número máximo de players deve ser um número inteiro positivo'),
    difficulty: z.enum(['peaceful', 'easy', 'normal', 'hard']),
    cordenadas: z.preprocess(a => a === 'true' || a == true, z.boolean()),
    dias_jogados: z.preprocess(a => a === 'true' || a == true, z.boolean()),

    // se colocar uma versão mais antiga do que a atual, pode corromper
    versao: z.string().default('latest'),

    // causa efeitos irreversiveis
    gamemode: z.enum(['survival', 'creative']),
    force_gamemode: z.preprocess(a => a === 'true' || a == true, z.boolean()),
    cheats: z.preprocess(a => a === 'true' || a == true, z.boolean()),
});

// exportações
module.exports = schemaEditarMundo;
