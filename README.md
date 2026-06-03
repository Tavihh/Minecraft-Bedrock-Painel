# MineServer Manager 🎮

Um painel de controle completo desenvolvido em Node.js e React para gerenciamento, provisionamento e monitoramento de servidores de Minecraft Bedrock utilizando contêineres Docker e renderização automatizada de mapas via PapyrusCS.

---

## 📋 Pré-requisitos Obrigatórios

Antes de clonar e rodar o projeto, você precisa ter instalado na sua máquina host:

1. **Node.js** (Versão v22 ou superior) -> [Download](https://nodejs.org/)
2. **Docker Desktop** (Certifique-se de que o serviço do Docker está rodando) -> [Download](https://www.docker.com/)
3. **Git** -> [Download](https://git-scm.com/)
4. **Microsoft Visual C++ Redistributable 2015-2022** (Obrigatório para o correto funcionamento do executável do PapyrusCS no Windows) -> [Download Direto](https://aka.ms/vs/17/release/vc_redist.x64.exe)

---

## 🛠️ Estrutura do Projeto

O projeto é um **Monorepo** dividido em duas partes principais:
* `/Front`: Aplicação React (interface do painel construída com Vite e Leaflet).
* `/Back`: API REST em Node.js (Express, Dockerode, Sequelize e Orquestração do Servidor).

---

## 🚀 Passo a Passo: Instalação e Execução

Siga rigorosamente os passos abaixo no seu terminal para colocar o sistema de pé:

### 1. Clonar o Repositório
Abra o seu terminal e clone o projeto para a sua máquina local:
```bash
git clone https://github.com/Tavihh/Minecraft-Bedrock-Painel Mine-Painel
cd Mine-Painel/Back
npm install
node Server
