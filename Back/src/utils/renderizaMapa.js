const path = require('path');
const fsExtra = require('fs-extra');
const { spawn } = require('child_process');
const DBservidor = require('../models/DBservidor');

// Armazena os IDs dos servidores que estão renderizando no momento para evitar concorrência de IO
const mapasEmExecucao = new Set();

/**
 * Helper para pausar a execução por um determinado tempo
 * @param {number} ms - Tempo em milissegundos
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Renderiza o mapa do Minecraft Bedrock utilizando o PapyrusCS de forma assíncrona e resiliente.
 * @param {number|string} servidorId - ID do servidor no banco de dados
 */
async function renderizaMapa(servidorId) {
    // 1. Evita concorrência: impede que a mesma renderização rode em paralelo para o mesmo ID
    if (mapasEmExecucao.has(servidorId)) {
        console.warn(`[Render ${servidorId}] Abortado: Já existe uma renderização em andamento para este servidor.`);
        return;
    }

    // Ativa a trava para este servidor
    mapasEmExecucao.add(servidorId);

    // Definição de escopo para as pastas temporárias para uso nos blocos corretos
    const pastaTemp = path.resolve(__dirname, `../tmp/render_${servidorId}`);

    try {
        const server = await DBservidor.findByPk(servidorId);
        if (!server) {
            console.error(`[Render ${servidorId}] Erro: Servidor não encontrado no banco de dados.`);
            return;
        }

        const nome_diretorio = server.nome_diretorio || server.nome.replace(/\s+/g, '_').toLowerCase();
        
        // Caminhos estruturados, resolvidos de forma absoluta e normalizados para o Windows
        const pastaMundoReal = path.normalize(path.join(__dirname, '../data', nome_diretorio, 'worlds', 'Bedrock level'));
        const servidorMapFolder = path.normalize(path.resolve(__dirname, '../Maps', String(servidorId)));
        const exePath = path.normalize(path.resolve(__dirname, '../../bin/papyrus/PapyrusCs.exe'));

        // 2. Proteção de concorrência com o Docker: aguarda o SO/Docker liberar os ponteiros de escrita do arquivo
        await sleep(3000); 

        // 3. Validação preventiva de consistência de dados do mundo
        const dbPath = path.join(pastaMundoReal, 'db');
        if (!fsExtra.existsSync(dbPath) || fsExtra.readdirSync(dbPath).length < 2) {
            console.warn(`[Render ${servidorId}] Abortado: Pasta 'db' vazia ou sem chunks suficientes.`);
            return;
        }

        // 4. Preparação atômica do ambiente temporário e da pasta de destino
        await fsExtra.ensureDir(pastaTemp);
        await fsExtra.emptyDir(pastaTemp);
        await fsExtra.ensureDir(servidorMapFolder); // Garante que a pasta destino exista no HD antes do .exe rodar
        await fsExtra.copy(pastaMundoReal, pastaTemp);

        console.log(`[Render ${servidorId}] Iniciando subprocesso do PapyrusCS...`);

        // Parâmetros normalizados. O spawn NÃO precisa de aspas extras nas strings do array.
        const args = [
            '-w', path.normalize(pastaTemp), 
            '-o', path.normalize(servidorMapFolder), 
            '--dim', '0', 
            '--forceoverwrite', 
            '--threads', '4',

            // '--brillouin_offset', '120',
            '-y', '320',
        ];

        // Executa o binário encapsulando o ciclo de vida via Promise para controle do fluxo async/await
        await new Promise((resolve, reject) => {
            const renderProcess = spawn(exePath, args);
            let stderrData = '';

            // 🌟 LOGS EM TEMPO REAL: Mostra no console do seu back-end o progresso do PapyrusCS
            renderProcess.stdout.on('data', (data) => {
                // console.log(`[PapyrusCS Output ${servidorId}]: ${data.toString().trim()}`);
            });

            // Escuta o canal de erro em tempo real para não estourar buffers
            renderProcess.stderr.on('data', (data) => {
                stderrData += data.toString();
            });

            // Resolvido/Rejeitado com base no código de saída do processo operacional
            renderProcess.on('close', (code) => {
                if (code !== 0) {
                    return reject(new Error(`PapyrusCS falhou com código ${code}. Detalhes: ${stderrData}`));
                }
                resolve();
            });

            renderProcess.on('error', (err) => {
                reject(new Error(`Falha crítica ao tentar disparar o executável: ${err.message}`));
            });
        });

        // 5. LÓGICA DE MESCLAGEM (Estrutura interna do PapyrusCS: Update -> Map)
        const pastaUpdate = path.join(servidorMapFolder, 'update', 'dim0');
        const pastaFinal = path.join(servidorMapFolder, 'map', 'dim0');

        if (fsExtra.existsSync(pastaUpdate)) {
            console.log(`[Render ${servidorId}] Mesclando novos blocos descobertos ao mapa principal...`);
            // Copia mesclando e substituindo arquivos antigos pelos novos gerados
            await fsExtra.copy(pastaUpdate, pastaFinal, { overwrite: true });
            // Limpa a pasta de transição com segurança
            await fsExtra.remove(path.join(servidorMapFolder, 'update')).catch(() => {});
        }

        // 6. PERSISTÊNCIA NO BANCO DE DADOS
        await DBservidor.update(
            { imagem_mapa: `/Maps/${servidorId}/map/dim0` },
            { where: { id: servidorId } }
        );

        console.log(`[Render ${servidorId}] Sucesso Total! Mapa renderizado e banco atualizado.`);

    } catch (error) {
        console.error(`[Render ❌ Erro Crítico no Servidor ${servidorId}]:`, error.message);
    } finally {
        // Aguarda 1.5 segundos para o Windows desalocar de fato os ponteiros de leitura dos arquivos .ldb
        await sleep(1500); 
        
        console.log(`[Render ${servidorId}] Executando limpeza segura da pasta temporária...`);
        await fsExtra.remove(pastaTemp).catch((err) => {
            console.warn(`[Render ${servidorId}] Nota de IO: Arquivos temporários ficaram presos no Windows e serão limpos na próxima execução. Motivo: ${err.message}`);
        });

        // Libera a trava do servidor, permitindo que novas renderizações ocorram no futuro
        mapasEmExecucao.delete(servidorId);
    }
}

module.exports = renderizaMapa;