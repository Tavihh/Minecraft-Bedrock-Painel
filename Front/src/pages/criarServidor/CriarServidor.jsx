import { useState, useRef, useEffect } from 'react'
import api from '../../utils/api'
import './style.css'

function CriarServidor() {
    const [formData, setFormData] = useState({
        // Configurações e Identificadores do Painel
        nome: null, 
        descricao: null, 
        server_port: '19132', // Antiga server_port (como string, conforme seu Model)
        desempenho: 'medio', // leve, medio, alto

        // Propriedades Internas do Minecraft (server.properties)
        server_name: null, // Nome exibido in-game (Obrigatorio no seu Model)
        level_seed: null, // Antiga seed (Iniciado como string vazia em vez de undefined)
        max_players: '10', // Mantido o padrão (como string, conforme seu Model)
        player_idle_timeout: '30', // Tempo limite AFK (Opcional)
        version: 'latest', // Antiga versao
        difficulty: 'normal', // peaceful, easy, normal, hard
        level_type: 'DEFAULT', // Antigo tipo_mundo (DEFAULT, FLAT, LEGACY)
        default_player_permission_level: 'member', // Antigo nivel_permissao (visitor, member, operator)

        // Regras de Jogo (Lembre-se que no banco são ENUMs 'true'/'false')
        gamemode: 'survival', // survival, creative, adventure
        allow_cheats: 'false', // Antigo cheats (Iniciado como string para casar com o ENUM)
        force_gamemode: 'false', // Iniciado como string
        cordenadas: 'true', // Iniciado como string
        dias_jogados: 'true', // Iniciado como string
        online_mode: 'false', // Autenticação Xbox Live (Iniciado como string)
        allow_list: 'false', // Whitelist (Iniciado como string)
        texturepack_required: 'false'
    });

    const [pronto, setPronto] = useState(false)
    const [erros, setErros] = useState([])
    const [success, setSuccess] = useState([])
    const [arquivo, setArquivo] = useState(null)
    const [versoes, setVersoes] = useState([])
    const formRef = useRef(null)
    const [isXboxOnly, setIsXboxOnly] = useState(false);
    const [isWhitelist, setIsWhitelist] = useState(false);

    const getVersoes = () => {
        api.get('/servidores/versoes').then((res) => {
            setVersoes(res.data)
            setErros([])
        }).catch((err) => {
            setErros(err.response?.data || ["Erro ao conectar ao Servidor BackEnd"])
        }).finally(() => {
            setPronto(true)
        })
    }

    useEffect(() => {
        getVersoes()
    }, [])


    const handlefileChange = (e) => {
        if (e.target.files.length > 0) {
            setArquivo(e.target.files[0])
        } else {
            setArquivo(null)
        }
    }

    const handleSubmit = (e) => {
        e.preventDefault()
        setPronto(false) // Volta a exibir "Carregando..." enquanto cria o container
        setErros([])
        setSuccess([])

        const data = new FormData(formRef.current)
        data.set('allow_cheats', String(formRef.current.allow_cheats.checked))
        data.set('cordenadas', String(formRef.current.cordenadas.checked))
        data.set('dias_jogados', String(formRef.current.dias_jogados.checked))
        data.set('force_gamemode', String(formRef.current.force_gamemode.checked))
        data.set('texturepack_required', String(formRef.current.texturepack_required.checked))
        data.set('online_mode', String(isXboxOnly))
        data.set('allow_list', String(isWhitelist))
        
        api.post('/servidores/criar', data, {
            headers: { 'Content-Type': 'multipart/form-data' }
        }).then((res) => {
            setSuccess(res.data || ['Erro ao Mostrar Mensagem de Sucesso!'])
            setErros([])
        }).catch((err) => {
            setErros(err.response?.data || ['Erro ao conectar ao Servidor BackEnd'])
            setTimeout(() => {setErros([])}, 10000)
        }).finally(() => {
            setPronto(true)
        })
    }


    return (
        <div>
            {!pronto && (<div className='alert warning'>Carregando...</div>)}
            {erros.map((e, index) => (
                <div key={index} className="alert danger">{e}</div>
            ))}
            {success.map((e, index) => (
                <div key={index} className="alert success">{e}</div>
            ))}
            <form className='container-form' ref={formRef} onSubmit={handleSubmit}>
                {/* Nome */}
                <label htmlFor="nome">Nome: </label>
                <input type="text" name="nome" defaultValue={formData.nome} required placeholder="Nome do Servidor (Painel)"/>
            
                <label htmlFor="descricao">Descrição: </label>
                <textarea name="descricao" defaultValue={formData.descricao} placeholder="Descrição do Servidor (Opcional)"/>
            
                <label htmlFor="server_port">Porta: </label>
                <input type="number" name="server_port" defaultValue={formData.server_port} required placeholder="Porta do Host (Ex: 19132)"/>
            
                <label htmlFor="level_seed">Seed: </label>
                <input type="text" name="level_seed" defaultValue={formData.level_seed} placeholder="Seed do Mundo (Opcional)"/>
            
                <label htmlFor="max_players">Max Jogadores: </label>
                <input type="number" name="max_players" defaultValue={formData.max_players} placeholder="Máximo de Players"/>
            
                <label htmlFor="player_idle_timeout">Expulsar Jogadores Inativos após (min)</label>
                <input type="number" name="player_idle_timeout" defaultValue={formData.player_idle_timeout} placeholder="Tempo Limite AFK (Minutos - Opcional)"/>
                            
                <label>Nome do Servidor (No Jogo):</label>
                <input type="text" name="server_name" defaultValue={formData.server_name} placeholder="Nome Exibido In-Game (Opcional)"/>

                <label>Versão:</label>
                <select name="version" id="version" defaultValue={formData.version} required>
                    <option value="LATEST">Latest</option>
                    {versoes.length > 0 ? versoes.map((v, i) => (
                        <option value={v} key={i}>{v}</option>
                    )) : ''}
                </select>

                <label>Dificuldade:</label>
                <select name="difficulty" defaultValue={formData.difficulty}>
                    <option value="peaceful">Pacífico</option>
                    <option value="easy">Fácil</option>
                    <option value="normal">Normal</option>
                    <option value="hard">Dificil</option>
                </select>

                <label>Modo de Jogo:</label>
                <select name="gamemode" defaultValue={formData.gamemode}>
                    <option value="survival">Sobrevivencia</option>
                    <option value="creative" style={{ color: '#ff3333', fontWeight: 'bold' }}>Criativo</option>
                    <option value="adventure">Aventura</option>
                </select>

                <label>Desempenho:</label>
                <select name="desempenho" defaultValue={formData.desempenho}>
                    <option value="leve">Leve</option>
                    <option value="medio">Médio</option>
                    <option value="alto">Alto</option>
                </select>

                <label>Tipo de Mundo:</label>
                <select name="level_type" defaultValue={formData.level_type}>
                    <option value="DEFAULT">Padrão</option>
                    <option value="FLAT">Plano</option>
                    <option value="LEGACY">Antigo</option>
                </select>

                <label>Nível de Permissão:</label>
                <select name="default_player_permission_level" defaultValue={formData.default_player_permission_level}>
                    <option value="visitor">Visitante</option>
                    <option value="member">Membro</option>
                    <option value="operator">Operador</option>
                </select>

                <div className="checkbox">
                    <label>
                        <input type="checkbox" name="cordenadas" defaultChecked={formData.cordenadas === 'true'} />
                        Exibir Coordenadas
                    </label>
                    <label>
                        <input type="checkbox" name="dias_jogados" defaultChecked={formData.dias_jogados === 'true'} />
                        Exibir Dias Jogados
                    </label>
                    <label>
                        <input type="checkbox" name="force_gamemode" defaultChecked={formData.force_gamemode === 'true'} />
                        Forçar Modo de Jogo
                    </label>
                    <label>
                        <input 
                            type="checkbox" 
                            name="online_mode" 
                            checked={isXboxOnly} 
                            onChange={(e) => { 
                                const marcado = e.target.checked; 
                                setIsXboxOnly(marcado); 
                                if (!marcado) { setIsWhitelist(false); }
                            }}
                        /> Apenas Contas Xbox
                    </label>
                    <label >
                        <input 
                            type="checkbox" 
                            name="allow_list" 
                            checked={isWhitelist} 
                            onChange={(e) => { 
                                const marcado = e.target.checked; 
                                setIsWhitelist(marcado); 
                                if (marcado) { setIsXboxOnly(true); }
                            }}
                        /> Ativar Whitelist 
                        </label>
                    <label>
                        <input type="checkbox" name="texturepack_required" defaultChecked={formData.texturepack_required === 'true'} />
                        Pacotes de Textura
                    </label>
                    <label style={{ color: '#ff3333', fontWeight: 'bold' }}>
                        <input type="checkbox" name="allow_cheats" defaultChecked={formData.allow_cheats === 'true'} />
                        Permitir Cheats
                    </label>
                </div>
                <label htmlFor="arquivo_mundo" className={`upload ${arquivo? 'arquivo-mundo-uploaded' : ''}`}>{arquivo ? `📄 (${arquivo.name})` : 'Upload do Mundo (Opcional)'}</label>
                <input type="file" name="arquivo_mundo" id="arquivo_mundo" accept=".zip, .mcworld, .mcpack, .mcpe" onChange={handlefileChange}/>
                <button type="submit" >
                    Criar Servidor
                </button>
            </form>
        </div>
    )
}


export default CriarServidor