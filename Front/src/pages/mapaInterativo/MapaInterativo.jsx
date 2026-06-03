import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import api from '../../utils/api'
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './style.css'

// Configuração de ícones
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Adicionamos 'dados' às props
function MapaInterativo({ servidorId, dados }) {
    
    // Se ainda não temos o caminho do mapa no banco, mostramos um aviso
    if (!dados?.imagem_mapa) {
        return <div className="ptero-map-loading">Aguardando geração dos tiles...</div>;
    }

    // Monta a URL usando o que veio do banco (ex: /maps/8/map/dim0)
    const urlTiles = `http://localhost:3000${dados.imagem_mapa}/{z}/{x}/{y}.png`;

    return (
            <MapContainer 
                center={[0,0]} 
                zoom={18}
                className="ptero-leaflet-container"
                crs={L.CRS.Simple}
            >
            <TileLayer
                url={urlTiles}
                tms={true}            // Essencial: Papyrus inverte o eixo Y
                noWrap={true}         // Impede o mapa de se repetir infinitamente
                minZoom={14}          // Um pouco menos que sua menor pasta para dar margem
                maxZoom={20}          // O limite das suas pastas
                maxNativeZoom={20}    // Avisa ao Leaflet que não existem fotos acima de 20
            />
        </MapContainer>
    );
}

export default MapaInterativo;