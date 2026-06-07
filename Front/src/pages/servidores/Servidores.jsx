import { useEffect, useState } from 'react'
import './style.css'
import api from '../../utils/api'
import DetalheServidor from '../detalheServidor/DetalheServidor'

function Servidores({render}) {
    const [servidores, setServidores] = useState([])
    const [erros, setErros] = useState([])
    const [pronto, setPronto] = useState(false)
    const getStatus = (listaServidores) => {
        listaServidores.forEach(sv => {
            api.get(`/servidores/estaOn/${sv.id}`)
                .then((res) => {
                    // Atualiza dinamicamente apenas o servidor que respondeu
                    setServidores(prev => prev.map(item => 
                        item.id === sv.id ? { ...item, status: res.data.status } : item
                    ));
                })
                .catch((err) => {
                    setErros(err.response?.data || ['Erro ao atualizar status'])
                    setTimeout(() => { setErros([]) }, 10000)
                })
        })
    }

    const getServers = () => {
        api.get('/servidores/listar').then((res)=> {
            setServidores(res.data)
            if (res.data && res.data.length > 0) {
                getStatus(res.data)
            }
            setErros([])
        }).catch((err) => {
            setErros(err.response?.data || ['Erro ao conectar ao Servidor BackEnd']);
            setServidores([])
        }).finally(() => {
            setPronto(true)
        })
    }

    useEffect(() => {
        getServers()
        const i = setInterval(() => {getServers()}, 5000);
        return () => {clearInterval(i);}
    }, [])

    return (
        <div>
            {!pronto && (<div className='alert warning'>Carregando...</div>)}
            {erros.map((e, index) => (<div key={index} className="alert danger">{e}</div>))}
            {pronto && servidores.length == 0 && (
                <div className="alert warning">Nenhum Servidor</div>
            )}

            <div className="servidores-list">
            {servidores.map(sv => {
                // Mapeamento pragmático de cores e textos com base no status do servidor
                const statusConfig = {
                    online: { cor: '#388e3c', texto: 'Online' },
                    criando: { cor: '#ffb300', texto: 'Criando...' },
                    ligando: { cor: '#ffb300', texto: 'Ligando...' },
                    offline: { cor: '#f44336', texto: 'Offline' },
                    erro: { cor: '#f44336', texto: 'Erro crítico' }
                };
                
                const currentStatus = statusConfig[sv.status] || { cor: '#757575', texto: 'Desconhecido' };
                
                return (
                <div className="list-item-server" key={sv.id || sv.nome} onClick={() => {render(<DetalheServidor id={sv.id} container_id={sv.container_id} render={render}/>,  `Painel`)}}>
                    
                    {/* 1. Nome e Ícone Principal */}
                    <div className="list-col-main">
                        <svg className="icon-server" xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#FFFFFF">
                            <path d="M480-120q-151 0-255.5-46.5T120-280v-400q0-66 105.5-113T480-840q149 0 254.5 47T840-680v400q0 67-104.5 113.5T480-120Zm0-479q89 0 179-25.5T760-679q-11-29-100.5-55T480-760q-91 0-178.5 25.5T200-679q14 30 101.5 55T480-599Zm0 199q42 0 81-4t74.5-11.5q35.5-7.5 67-18.5t57.5-25v-120q-26 14-57.5 25t-67 18.5Q600-528 561-524t-81 4q-42 0-82-4t-75.5-11.5Q287-543 256-554t-56-25v120q25 14 56 25t66.5 18.5Q358-408 398-404t82 4Zm0 200q46 0 93.5-7t87.5-18.5q40-11.5 67-26t32-29.5v-98q-26 14-57.5 25t-67 18.5Q600-328 561-324t-81 4q-42 0-82-4t-75.5-11.5Q287-343 256-354t-56-25v99q5 15 31.5 29t66.5 25.5q40 11.5 88 18.5t94 7Z"/>
                        </svg>
                        <div className="server-details">
                            <span className="server-title">{sv.nome}</span>
                            <span className="server-subtext">Bedrock {sv.versao || 'latest'}</span>
                        </div>
                    </div>

                    {/* 2. Porta de Conexão */}
                    <div className="list-col-info">
                        <span className="info-label">Porta:</span>
                        <span className="info-value font-mono">{sv.server_port || 19132}</span>
                    </div>

                    {/* 3. Badge de Status Semitransparente */}
                    <div className="list-col-status">
                        <div className="status-badge" style={{ backgroundColor: `${currentStatus.cor}15`, color: currentStatus.cor }}>
                            <svg xmlns="http://www.w3.org/2000/svg" height="16px" viewBox="0 -960 960 960" width="16px" fill={currentStatus.cor}>
                                <path d="M480-280q83 0 141.5-58.5T680-480q0-83-58.5-141.5T480-680q-83 0-141.5 58.5T280-480q0 83 58.5 141.5T480-280Z"/>
                            </svg>
                            <span>{currentStatus.texto}</span>
                        </div>
                    </div>
                </div>
            );
        })}
        </div>
        </div>
    )
}
export default Servidores