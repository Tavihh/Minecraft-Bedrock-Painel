import { useState, useRef, useEffect } from 'react'
import api from '../../utils/api'
import './style.css'

function CriarServidor() {
    const [formData, setFormData] = useState({
        nome: '', // (Opcional)
        descricao: '', // (Opcional)
        porta_host: 19132, // (Opcional)
        versao: 'latest', // Valor padrão de exemplo
        nivel_permissao: 'member', // visitor, member, operator
        tipo_mundo: 'DEFAULT', // FLAT, LEGACY, DEFAULT
        gamemode: 'survival', // survival, creative
        cheats: false, // true ou false
        cordenadas: true, // true ou false
        dias_jogados: true, // true ou false
        force_gamemode: false, // true ou false
        desempenho: 'leve', //leve, medio, alto
        max_players: 10, // Valor padrão de exemplo
        difficulty: 'normal', // peaceful, easy, normal, hard
        seed: undefined // Valor padrão de exemplo (Opicional)
    })

    const [pronto, setPronto] = useState(false)
    const [erros, setErros] = useState([])
    const [success, setSuccess] = useState([])
    const [arquivo, setArquivo] = useState(null)
    const [versoes, setVersoes] = useState([])
    const formRef = useRef(null)

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
        data.set('cheats', formRef.current.cheats.checked)
        data.set('cordenadas', formRef.current.cordenadas.checked)
        data.set('dias_jogados', formRef.current.dias_jogados.checked)
        data.set('force_gamemode', formRef.current.force_gamemode.checked)

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
                <label>Dados do Servidor:</label>
                <input type="text" name="nome" defaultValue={formData.nome} required placeholder="Nome do Servidor"/>
                <textarea name="descricao" defaultValue={formData.descricao} placeholder="Descrição do Servidor (Opcional)"/>
                <input type="number" name="porta_host" defaultValue={formData.porta_host} placeholder="Porta do Host (Opcional)"/>
                <input type="number" name="seed" defaultValue={formData.seed} placeholder="Seed do Mundo (Opcional)"/>
                <input type="number" name="max_players" defaultValue={formData.max_players} placeholder="Máximo de Players"/>
                <label>Versão:</label>
                <select name="versao" id="versao" defaultValue={formData.versao} required>
                    <option value="latest">Latest</option>
                    {versoes.length > 0 ? versoes.map((v, i) => (
                        <option value={v} key={i}>{v}</option>
                    )) : ''}
                </select>
                <label>Difficultade:</label>
                <select name="difficulty" defaultValue={formData.difficulty}>
                    <option value="peaceful">Peaceful</option>
                    <option value="easy">Easy</option>
                    <option value="normal">Normal</option>
                    <option value="hard">Hard</option>
                </select>
                <label>Modo de Jogo:</label>
                <select name="gamemode" defaultValue={formData.gamemode}>
                    <option value="survival">Survival</option>
                    <option value="creative">Creative</option>
                </select>
                <label>Desempenho:</label>
                <select name="desempenho" defaultValue={formData.desempenho}>
                    <option value="leve">Leve</option>
                    <option value="medio">Médio</option>
                    <option value="alto">Alto</option>
                </select>
                <label>Tipo de Mundo:</label>
                <select name="tipo_mundo" defaultValue={formData.tipo_mundo}>
                    <option value="default">Default</option>
                    <option value="flat">Flat</option>
                    <option value="legacy">Legacy</option>
                </select>
                <label>Nível de Permissão:</label>
                <select name="nivel_permissao" defaultValue={formData.nivel_permissao}>
                    <option value="visitor">Visitor</option>
                    <option value="member">Member</option>
                    <option value="operator">Operator</option>
                </select>
                <div className="checkbox">
                    <label>
                        <input type="checkbox" name="cheats" defaultChecked={formData.cheats} />
                        Permitir Cheats
                    </label>
                    <label>
                        <input type="checkbox" name="cordenadas" defaultChecked={formData.cordenadas} />
                        Exibir Coordenadas
                    </label>
                    <label>
                        <input type="checkbox" name="dias_jogados" defaultChecked={formData.dias_jogados} />
                        Contar Dias Jogados
                    </label>
                    <label>
                        <input type="checkbox" name="force_gamemode" defaultChecked={formData.force_gamemode} />
                        Forçar Modo de Jogo
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