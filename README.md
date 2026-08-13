# GeoShield Monitor - Sistema Inteligente Preventivo de Deslizamentos

Este projeto é um painel completo FULLSTACK de alto nível comercial focado no monitoramento e previsão estrutural para a Defesa Civil, voltado à mitigação de catástrofes naturais como as ocorridas em Petrópolis e São Sebastião.
Possui arquitetura baseada em Next.js (Frontend) e Node.js (Backend) com WebSockets simulando Sensores IoT transmitindo telemetria em tempo real para um ambiente PostgreSQL.

## 🚀 Requisitos Iniciais
- Node.js v18 ou superior
- Banco de dados PostgreSQL rodando (Docker ou Servidor Local)

## 📦 Instalação e Execução Passo a Passo

### 1️⃣ Subir a Infraestrutura do Backend
As regras de risco e WebSockets operam isoladamente aqui. 

Abra o terminal na pasta raiz e faça:
```bash
cd backend
npm install
```

**Banco de Dados:**  
O projeto vem configurado de fábrica com **SQLite** local (arquivo `dev.db`), facilitando a execução imediata sem necessidade de instalar banco de dados externo ou Docker.
Para configurar, acesse o arquivo `backend/.env` (crie copiando de `.env.example`) e configure:
```env
DATABASE_URL="file:./dev.db"
JWT_SECRET="dev_secret_key"
```

**Sincronizar e Inicializar:**
Gere e execute as migrações locais com o comando:
```bash
npx prisma migrate dev --name init
```

**Executar testes unitários:**
Você pode rodar os testes unitários do backend com:
```bash
npm run test
```

**Executar servidor (Rodará na porta 3001):**
Para inicializar o servidor em desenvolvimento:
```bash
npm run dev
```

**Importar Rotas da API:**
Importe o arquivo `backend/insomnia.json` no Insomnia para obter todas as 15 rotas REST organizadas e prontas para uso.

### 2️⃣ Iniciar o Painel de Controle (Frontend)
Em uma janela de terminal nova (paralela a do backend), acesse o ambiente React:
```bash
cd frontend
npm install
npm run dev
```

Abra seu navegador no endereço: **http://localhost:3000** e acesse a central.

## 🌟 Funcionalidades Integradas
1. **Painel Socket.io:** Os gráficos Recharts e o Gauge rodam continuamente baseados numa IA (calculateRisk) a cada 2 segundos.
2. **Mapa 3D Interativo:** O terreno gerado recebe dados paramétricos, sofrendo oxidação/avermelhamento assim que o terreno emite alertas (uso de WebGL).
3. **Módulo de Simulação de Caos:** Você pode propositalmente sabotar os sensores pelo painel e testar o sistema operando em modo de Alerta Vermelho.
4. **Chamados Defesa Civil:** Gera formulários institucionais automaticamente logados com severidade.

## Estrutura do TCC (Pastas)
- `/frontend/app/*` (Rotas como dashboard, mapa-3d, historico, simulacao e defesa-civil)
- `/backend/src/lib/riskAlgorithm.ts` (Onde encontra-se a fórmula matemática pura do TCC)
- `/backend/src/lib/mockSensors.ts` (Onde o loop NodeJS de 2000ms simula as leituras IoT)
- `/backend/prisma/schema.prisma` (Tabelas do banco)

Para finalizar a execução pare ambos os terminais com `Ctrl + C`.
