import { useState, useEffect } from 'react'
import api from '../../utils/api'
import './style.css'

function Jogadores() {
    const [jogadores, setJogadores] = useState([])
    const [erros, setErros] = useState([])
    const [pronto, setPronto] = useState(false)

    const getJogadores = () => {
        api.get('/jogadores/listar').then((res) => {
            setJogadores(res.data)
            setErros([])
        }).catch((err) => {
            setErros(err.response?.data || ["Erro ao conectar ao Servidor BackEnd"])
            setTimeout(() => {setErros([])}, 10000)
        }).finally(() => {
            setPronto(true)
        })
    }

    useEffect(() => {
        getJogadores()

        const i = setInterval(() => {getJogadores()}, 3000);

        return () => {clearInterval(i);}
    }, [])

    return (
        <div>
            {!pronto && (<div className='alert warning'>Carregando...</div>)}
            {erros.map((e, index) => (<div key={index} className="alert danger">{e}</div>))}
            {pronto && jogadores.length == 0 && (
                <div className="alert warning">Nenhum Jogador</div>
            )}
            {jogadores.length > 0 ? jogadores.map(j => (
                <div key={j.id}>
                    <p>{j.gamertag} - {j.servidore?.nome || 'Servidor não encontrado'}</p>
                    <hr />
                </div>
            )) : <div className="alert warning">Nenhum Jogador</div>}
        </div>
    )
}

export default Jogadores