import { useState } from 'react'
import CriarServidor from '../criarServidor/CriarServidor';
import Servidores from '../servidores/Servidores';
import Jogadores from '../jogadores/Jogadores'
import DetalheServidor from '../detalheServidor/DetalheServidor';
import './style.css'


function Home() {
    const render = (p, t) => {
        setAbaAtiva({page: p, titulo: t})
    }
    const toggleMenu = () => {
        setMenuAtivo(!menuAtivo);
    }

    const [menuAtivo, setMenuAtivo] = useState(true);
    const [abaAtiva, setAbaAtiva] = useState({
        page: <Servidores render={render}/>,
        titulo: 'Servidores'
    })
    return (
        <section className={`${menuAtivo ? 'inactive home' : 'home'}`}>
            <aside className={menuAtivo? 'inactive' : ''}>
                <button className={abaAtiva == 'criarServidor' ? 'active' : ''} onClick={() => render(<CriarServidor/>, 'Criar novo servidor')}><svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#eff1f5"><path d="M440-280h80v-160h160v-80H520v-160h-80v160H280v80h160v160ZM200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h560q33 0 56.5 23.5T840-760v560q0 33-23.5 56.5T760-120H200Zm0-80h560v-560H200v560Zm0-560v560-560Z"/></svg> Criar Servidor</button>
                <button className={abaAtiva == 'servidores' ? 'active' : ''} onClick={() => render(<Servidores render={render}/>, 'Servidores')}><svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#eff1f5"><path d="M300-720q-25 0-42.5 17.5T240-660q0 25 17.5 42.5T300-600q25 0 42.5-17.5T360-660q0-25-17.5-42.5T300-720Zm0 400q-25 0-42.5 17.5T240-260q0 25 17.5 42.5T300-200q25 0 42.5-17.5T360-260q0-25-17.5-42.5T300-320ZM160-840h640q17 0 28.5 11.5T840-800v280q0 17-11.5 28.5T800-480H160q-17 0-28.5-11.5T120-520v-280q0-17 11.5-28.5T160-840Zm40 80v200h560v-200H200Zm-40 320h640q17 0 28.5 11.5T840-400v280q0 17-11.5 28.5T800-80H160q-17 0-28.5-11.5T120-120v-280q0-17 11.5-28.5T160-440Zm40 80v200h560v-200H200Zm0-400v200-200Zm0 400v200-200Z"/></svg> Servidores</button>
                <button className={abaAtiva == 'jogadores' ? 'active' : ''} onClick={() => render(<Jogadores/>, 'Jogadores')}><svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#eff1f5"><path d="M680-240v-80h200v80H680Zm-80-200v-80h280v80H600Zm-80-200v-80h360v80H520ZM235-515q-35-35-35-85t35-85q35-35 85-35t85 35q35 35 35 85t-35 85q-35 35-85 35t-85-35ZM80-240v-76q0-21 10-40t28-30q45-27 95.5-40.5T320-440q56 0 106.5 13.5T522-386q18 11 28 30t10 40v76H80Zm160-110q-39 10-74 30h308q-35-20-74-30t-80-10q-41 0-80 10Zm108.5-221.5Q360-583 360-600t-11.5-28.5Q337-640 320-640t-28.5 11.5Q280-617 280-600t11.5 28.5Q303-560 320-560t28.5-11.5ZM320-600Zm0 280Z"/></svg> Jogadores</button>
            </aside>
            <article>
                <header>
                    <button className='btn' onClick={toggleMenu}><svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#FFFFFF"><path d="M120-240v-80h720v80H120Zm0-200v-80h720v80H120Zm0-200v-80h720v80H120Z"/></svg></button>
                    <h2>{abaAtiva.titulo}</h2>
                </header>
                <hr />
                <div className="conteudo">
                    {abaAtiva.page}
                </div>
                <footer>
                    <p>Desenvolvido por <a href="https://github.com/Tavihh" target="_blank" rel="noopener noreferrer">Otávio Santiago</a>. - 2024</p>
                </footer>
            </article>
        </section>
    )    
}


export default Home

