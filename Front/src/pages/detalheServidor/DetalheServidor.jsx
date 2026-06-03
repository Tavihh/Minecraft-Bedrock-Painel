import { useEffect, useState, useRef } from "react"
import api from "../../utils/api"
import './style.css'
import Servidores from "../servidores/Servidores"
import MapaInterativo from "../mapaInterativo/MapaInterativo"

function DetalheServidor({id, container_id, render}) {
    const [sv, setServidor] = useState(false)
    const [p, setPlayers] = useState(false)
    const [erros, setErros] = useState([])
    const [success, setSuccess] = useState([])
    const [pronto, setPronto] = useState(false)
    const [comando, setComando] = useState('');
    const [logs, setLogs] = useState([]);
    const scrollRef = useRef(null);
    const statusConfig = {
        online: { cor: '#388e3c', texto: 'Online' },
        criando: { cor: '#ffb300', texto: 'Criando...' },
        ligando: { cor: '#ffb300', texto: 'Ligando...' },
        offline: { cor: '#f44336', texto: 'Offline' },
        erro: { cor: '#f44336', texto: 'Erro crítico' },
        carregando: { cor: '#757575', texto: 'Carregando...' }
    };
    const [status, setStatus] = useState(statusConfig['carregando'])
    const enviarComandoConsole = (e) => {
        e.preventDefault();
        if (comando.trim() === '') return;  
        api.post(`/console/comando/${container_id}`, { 'comando': comando.trim() }, { headers: { 'Content-Type': 'application/json' }}).then((res) => {
            setSuccess(res.data || ['Comando enviado com sucesso!']);
            setErros([]);
            setComando('');
            setTimeout(() => {setSuccess([])}, 10000)
        }).catch((err) => {
            setErros(err.response?.data || ['Erro ao enviar comando'])
            setTimeout(() => {setErros([])}, 10000)
        })
    }

    const getServers = () => {
        api.get(`/servidores/painel/${id}`).then((res)=> {
            setServidor(res.data)
        }).catch((err) => {
            setErros(err.response?.data || ['Erro ao conectar ao Servidor BackEnd']);
            setServidor([])
            setTimeout(() => {setErros([])}, 10000) 
        }).finally(() => {
            setPronto(true)
        })
    }

    const getPlayers = () => {
        api.get(`/jogadores/server/${id}/atualizarPlayers`).then((res) => {
            setPlayers(res.data)
        }).catch((err) => {
            setErros(err.response?.data || ['Erro ao listar jogadores'])
            setTimeout(() => {setErros([])}, 10000)
        })
    }

    const getStatus = () => {
        api.get(`/servidores/estaOn/${id}`).then((res) => {
        setStatus(statusConfig[res.data.status] || { cor: '#757575', texto: 'Desconhecido' });
        }).catch((err) => {
            setErros(err.response?.data || ['Erro ao atualizar status'])
            setTimeout(() => {setErros([])}, 10000)
        })  
    }
    
    const getLogs = () => {
        api.get(`/servidores/logs/${container_id}`).then((res) => {
            setLogs(res.data.logs || ['Nenhum log disponível'])
        }).catch((err) => {
            setErros(err.response?.data || ['Erro ao pegar logs'])
            setTimeout(() => {setErros([])}, 10000)
        }) 
    }

    const handleRefresh = () => {
        api.get('/servidores/atualizaMapa/' + id).then((res) => {
            console.log(res.data)
            setSuccess(res.data || ['Renderização do mapa iniciada! Aguarde alguns minutos e atualize a página para ver as mudanças.']);
        }).catch((err) => {
            setErros(err.response?.data || ['Erro ao atualizar mapa']);
        });
    }
    const power = (acao) => api.post(`/servidores/${acao}/${id}`).then(getServers);
    const download = () => window.open(`http://localhost:3000/servidores/download/${id}`);
    const deletar = () => window.confirm("Deseja excluir permanentemente?") && api.delete(`/servidores/deletar/${sv.id}`).then(render(<Servidores render={render}/>, 'Servidores')).catch((err) => {setErros(err.response?.data || ['Erro'])});
    const voltar = () => {render(<Servidores render={render}/>, 'Servidores')}

    useEffect(() => {
        getServers()
        getStatus()
        getLogs()
        getPlayers()
        const i = setInterval(() => {
            getServers()
            getStatus()
            getLogs()
            getPlayers()
        }, 5000);
        return () => {clearInterval(i)}
    }, [id, container_id])

    return (
        <div>
            {!pronto && (<div className='alert warning'>Carregando...</div>)}
            {erros && erros.map && erros.map((e, index) => (<div key={index} className="alert danger">{e}</div>))}
            {success && success.map && success.map((s, index) => (<div key={index} className="alert success">{s}</div>))}
            {pronto && sv.length == 0 && (
                <div className="alert warning">Painel não encontrado</div>
            )}
            {sv && pronto && (
                <div>

                    {/* Cabeçalho */}
                    <header>
                        <div className="titulo">
                            <button onClick={voltar} className="btn"><span className="material-icons"><svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#FFFFFF"><path d="m313-440 224 224-57 56-320-320 320-320 57 56-224 224h487v80H313Z"/></svg></span></button>
                            <div className="list-col-status">
                                <div className="status-badge" style={{ backgroundColor: `${status.cor}15`, color: status.cor }}>
                                    <svg xmlns="http://www.w3.org/2000/svg" height="16px" viewBox="0 -960 960 960" width="16px" fill={status.cor}>
                                        <path d="M480-280q83 0 141.5-58.5T680-480q0-83-58.5-141.5T480-680q-83 0-141.5 58.5T280-480q0 83 58.5 141.5T480-280Z"/>
                                    </svg>
                                    <span>{status.texto}</span>
                                </div>
                            </div>
                            <h2>{sv.nome}</h2>
                        </div>
                        <div className="btn-acoes">
                            {['online', 'ligando', 'criando', 'erro'].includes(status.texto)?(
                                <button className="action desligar" onClick={() => {power('desligar')}}>OFF</button>
                            ) : (
                                <button className="action ligar" onClick={() => {power('ligar')}}>ON</button>
                            )}
                            <button className="btn" onClick={download}><span className="material-icons"><svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#FFFFFF"><path d="M480-320 280-520l56-58 104 104v-326h80v326l104-104 56 58-200 200ZM240-160q-33 0-56.5-23.5T160-240v-120h80v120h480v-120h80v120q0 33-23.5 56.5T720-160H240Z"/></svg></span></button>
                            <button className="btn del" onClick={deletar}><span className="material-icons"><svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#FFFFFF"><path d="M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm400-600H280v520h400v-520ZM360-280h80v-360h-80v360Zm160 0h80v-360h-80v360ZM280-720v520-520Z"/></svg></span></button>
                        </div>
                    </header>
                    
                    {/* Info Server */}
                    <div className="infos">
                        <div className="info">
                            <span className="material-icons"><svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#FFFFFF"><path d="m680-240-56-56 182-184-182-184 56-56 240 240-240 240Zm-400 0L40-480l240-240 56 56-182 184 182 184-56 56Zm11.5-211.5Q280-463 280-480t11.5-28.5Q303-520 320-520t28.5 11.5Q360-497 360-480t-11.5 28.5Q337-440 320-440t-28.5-11.5Zm160 0Q440-463 440-480t11.5-28.5Q463-520 480-520t28.5 11.5Q520-497 520-480t-11.5 28.5Q497-440 480-440t-28.5-11.5Zm160 0Q600-463 600-480t11.5-28.5Q623-520 640-520t28.5 11.5Q680-497 680-480t-11.5 28.5Q657-440 640-440t-28.5-11.5Z"/></svg></span>
                            <div className="tile-txt">Porta<span>{sv.porta_host}</span></div>
                        </div>
                        <div className="info">
                            <span className="material-icons"><svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#FFFFFF"><path d="M360-360v-240h240v240H360Zm80-80h80v-80h-80v80Zm-80 320v-80h-80q-33 0-56.5-23.5T200-280v-80h-80v-80h80v-80h-80v-80h80v-80q0-33 23.5-56.5T280-760h80v-80h80v80h80v-80h80v80h80q33 0 56.5 23.5T760-680v80h80v80h-80v80h80v80h-80v80q0 33-23.5 56.5T680-200h-80v80h-80v-80h-80v80h-80Zm320-160v-400H280v400h400ZM480-480Z"/></svg></span>
                            <div className="tile-txt">Ram<span>{sv.ram_maxima}</span></div>
                        </div>
                        <div className="info">
                            <span className="material-icons"><svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#FFFFFF"><path d="M324-111.5Q251-143 197-197t-85.5-127Q80-397 80-480t31.5-156Q143-709 197-763t127-85.5Q397-880 480-880t156 31.5Q709-817 763-763t85.5 127Q880-563 880-480t-31.5 156Q817-251 763-197t-127 85.5Q563-80 480-80t-156-31.5ZM440-162v-78q-33 0-56.5-23.5T360-320v-40L168-552q-3 18-5.5 36t-2.5 36q0 121 79.5 212T440-162Zm276-102q41-45 62.5-100.5T800-480q0-98-54.5-179T600-776v16q0 33-23.5 56.5T520-680h-80v80q0 17-11.5 28.5T400-560h-80v80h240q17 0 28.5 11.5T600-440v120h40q26 0 47 15.5t29 40.5Z"/></svg></span>
                            <div className="tile-txt">IP<span>{sv.ip}</span></div>
                        </div>
                    </div>

                    {/* Console */}
                    <div className="console-container">
                        <div className="console-header">
                            Terminal do Servidor
                        </div>
                        <div className="console-box">
                            {logs && logs.length > 0 ? (
                                logs.map((linha, index) => (
                                    <p key={index}>{linha}</p>
                                ))
                            ) : (
                                <p>Nenhum log disponível.</p>
                            )}
                        </div>
                        <form className="console-input" onSubmit={enviarComandoConsole}>
                            <span>$</span>
                            <input type="text" placeholder="Digite um comando de console (ex: say Ola)..." autoComplete="off" value={comando} onChange={e => {setComando(e.target.value)}} />
                            <button type="submit" style={{display: "none"}}>Enviar</button>
                        </form>
                    </div>

                    {/* mapa */}
                    <div className="map-container">
                        <div className="map-header">
                            <button onClick={handleRefresh} title="Sincronizar Mapa">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M23 4v6h-6"></path>
                                    <path d="M1 20v-6h6"></path>
                                    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                                </svg>
                            </button>
                            Mapa Interativo
                        </div>
                        <div className="map-box">
                            <MapaInterativo servidorId={id} jogadores={null} dados={sv} />
                        </div>
                    </div>

                    {/* jogadores */}
                    <div className="jogadores-container">
                        <div className="jogadores-header">
                            Jogadores Online
                        </div>
                        <div className="jogadores-box">
                            {p.length > 0 ? p.map(p => (
                                <div className="player-row" key={p.id}>
                                    <img src={`https://minotar.net/helm/${p.gamertag}/24.png`} alt="skin" />
                                    <span className={p.esta_online ? 'online' : 'offline'}>{p.gamertag}</span>
                                </div>
                            )) : <p>Nenhum jogador online.</p> }
                        </div>
                    </div>
                </div>
            )}
        </div>
    )

}

export default DetalheServidor