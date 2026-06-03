const { z } = require('zod')

const schemaCriarMundo = z.object({
    nome: z.string().min(1, 'O nome é obrigatorio'),
    descricao: z.string().optional().nullable(),
    
    // Validação numérica pura. O React precisa mandar um número ou não mandar o campo.
    porta_host: z.string().optional(),
    
    versao: z.string().default('latest'),
    nivel_permissao: z.enum(['visitor', 'member', 'operator']),
    tipo_mundo: z.enum(['flat', 'default', 'legacy']),
    gamemode: z.enum(['survival', 'creative']),
    
    // Validações booleanas puras. Sem conversões.
    cheats: z.enum(['true', 'false']),
    cordenadas: z.enum(['true', 'false']),
    dias_jogados: z.enum(['true', 'false']),
    
    desempenho: z.enum(['leve', 'medio', 'alto']),
    
    // Validação numérica pura.
    max_players: z.string(),
    
    difficulty: z.enum(['peaceful', 'easy', 'normal', 'hard']),
    force_gamemode: z.enum(['true', 'false']),
    seed: z.string().optional().default('')
});

module.exports = schemaCriarMundo;