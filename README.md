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
Acesse o arquivo `backend/.env` (crie se não existir) e adicione a string de conexão do PostgreSQL que você vai usar:
```env
DATABASE_URL="postgresql://usuario:senha@localhost:5432/geotcc"
JWT_SECRET="sua_chave_segura"
```

**Sincronizar:**
Execute o comando abaixo para gerar as tabelas de Histórico e Usuários:
```bash
npx prisma db push
npx prisma generate
```

**Executar servidor (Rodará na porta 3001):**
Se necessário, instale globalmente o `ts-node` e `nodemon`, ou simplesmente execute:
```bash
npx ts-node src/server.ts
```

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
