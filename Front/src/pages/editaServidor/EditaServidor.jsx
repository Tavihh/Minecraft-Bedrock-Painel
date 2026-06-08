import { useState, useRef, useEffect } from 'react'
import api from '../../utils/api'
import Servidores from '../servidores/Servidores'
import './style.css'

function EditaServidor({ id, container_id, render }) {
    const [pronto, setPronto] = useState(false)
    const [erros, setErros] = useState([])
    const [success, setSuccess] = useState([])
    const formRef = useRef(null)
    const [formData, setFormData] = useState(null); // Iniciado como null para controle de renderização
    const [isXboxOnly, setIsXboxOnly] = useState(false);
    const [isWhitelist, setIsWhitelist] = useState(false);

    const getServers = () => {
        api.get(`/servidores/painel/${id}`).then((res) => {
            setFormData(res.data)
            setIsXboxOnly(res.data.online_mode === 'true')
            setIsWhitelist(res.data.allow_list === 'true')
        }).catch((err) => {
            setErros(err.response?.data || ['Erro ao conectar ao Servidor BackEnd Servidores']);
        }).finally(() => {
            setPronto(true)
        })
    }
    const voltar = () => {render(<Servidores render={render}/>, `Painel`)}

    useEffect(() => {
        getServers()
    }, [id])

    const handleSubmit = (e) => {
        e.preventDefault()
        setPronto(false)
        setErros([])
        setSuccess([])

        // 🚀 O SEGREDO: Monta um JSON plano transformando os checkboxes em strings ('true'/'false')
        const payload = {
            nome: formRef.current.nome.value,
            descricao: formRef.current.descricao.value,
            server_port: formRef.current.server_port.value,
            max_players: formRef.current.max_players.value,
            player_idle_timeout: formRef.current.player_idle_timeout.value,
            server_name: formRef.current.server_name.value,
            difficulty: formRef.current.difficulty.value,
            gamemode: formRef.current.gamemode.value,
            default_player_permission_level: formRef.current.default_player_permission_level.value,
            desempenho: formRef.current.desempenho.value,
            
            // Tratamento cirúrgico dos ENUMs do Sequelize ('true' ou 'false')
            cordenadas: String(formRef.current.cordenadas.checked),
            dias_jogados: String(formRef.current.dias_jogados.checked),
            force_gamemode: String(formRef.current.force_gamemode.checked),
            online_mode: String(isXboxOnly),
            allow_list: String(isWhitelist),
            texturepack_required: String(formRef.current.texturepack_required.checked),
            allow_cheats: String(formRef.current.allow_cheats.checked),
        };

        // Envia como JSON nativo de forma limpa
        api.put(`/servidores/editar/${id}`, payload, {
            headers: { 'Content-Type': 'application/json' }
        }).then((res) => {
            setSuccess(res.data || ['Configurações salvas com sucesso!'])
            setErros([])
        }).catch((err) => {
            setErros(err.response?.data || ['Erro ao conectar ao Servidor BackEnd Submit'])
            setTimeout(() => { setErros([]) }, 10000)
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
            
            {/* 🚀 ESTRATÉGIA: Só exibe o formulário se o formData não for nulo, garantindo que o defaultValue funcione perfeito */}
            {formData && (
                <form className='container-form' ref={formRef} onSubmit={handleSubmit}>
                 <button onClick={voltar} className="btn"><span className="material-icons"><svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#FFFFFF"><path d="m313-440 224 224-57 56-320-320 320-320 57 56-224 224h487v80H313Z"/></svg></span></button>

                    <label htmlFor="nome">Nome: </label>
                    <input type="text" name="nome" defaultValue={formData.nome} required placeholder="Nome do Servidor (Painel)"/>
                
                    <label htmlFor="descricao">Descrição: </label>
                    <textarea name="descricao" defaultValue={formData.descricao} placeholder="Descrição do Servidor (Opcional)"/>

                    <label htmlFor="server_port">Porta: </label>
                    <input type="number" name="server_port" defaultValue={formData.server_port} required placeholder="Porta do Host (Ex: 19132)"/>
                
                    <label htmlFor="max_players">Max Jogadores: </label>
                    <input type="number" name="max_players" defaultValue={formData.max_players} placeholder="Máximo de Players"/>
                
                    <label htmlFor="player_idle_timeout">Expulsar Jogadores Inativos após (min)</label>
                    <input type="number" name="player_idle_timeout" defaultValue={formData.player_idle_timeout} placeholder="Tempo Limite AFK (Minutos - Opcional)"/>
                                
                    <label>Nome do Servidor (No Jogo):</label>
                    <input type="text" name="server_name" defaultValue={formData.server_name} placeholder="Nome Exibido In-Game (Opcional)"/>

                    <label>Dificuldade:</label>
                    <select name="difficulty" defaultValue={formData.difficulty}>
                        <option value="peaceful">Pacífico</option>
                        <option value="easy">Fácil</option>
                        <option value="normal">Normal</option>
                        <option value="hard">Dificil</option>
                    </select>

                    <label>Modo de Jogo:</label>
                    <select name="gamemode" defaultValue={formData.gamemode}>
                        <option value="survival">Sobrevivência</option>
                        <option value="creative" style={{ color: '#ff3333', fontWeight: 'bold' }}>Criativo</option>
                        <option value="adventure">Aventura</option>
                    </select>

                    <label>Desempenho:</label>
                    <select name="desempenho" defaultValue={formData.desempenho}>
                        <option value="leve">Leve</option>
                        <option value="medio">Médio</option>
                        <option value="alto">Alto</option>
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
                            />
                            Apenas Contas Xbox
                        </label>
                        <label>
                            <input 
                                type="checkbox" 
                                name="allow_list" 
                                checked={isWhitelist} 
                                onChange={(e) => { 
                                    const marcado = e.target.checked; 
                                    setIsWhitelist(marcado); 
                                    if (marcado) { setIsXboxOnly(true); }
                                }}
                            />
                            Ativar Whitelist 
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
                    <button type="submit">
                        Atualizar Servidor
                    </button>
                </form>
            )}
        </div>
    )
}

export default EditaServidor;