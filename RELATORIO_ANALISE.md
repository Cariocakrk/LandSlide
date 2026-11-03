# 📊 Relatório de Análise Técnica do Projeto (Atualizado)

## 1. 🏗️ Identificação e Visão Geral

- **Nome do projeto:** GeoShield Monitor — Sistema Geotécnico Inteligente de Prevenção de Deslizamentos
- **Objetivo identificado:** Oferecer uma plataforma full stack de engenharia geotécnica e monitoramento em tempo real para apoiar a Defesa Civil na previsão e prevenção de escorregamentos translacionais de encostas.
- **Problema que o sistema resolve:** Monitoramento topográfico, meteorológico e geotécnico de encostas vulneráveis através do cálculo do Fator de Segurança ($FS$) pelo método de Equilíbrio-Limite de Talude Infinito (Mohr-Coulomb / ABNT NBR 11682), emissão de protocolos de evacuação e disparo de alertas comunitários via WhatsApp.
- **Funcionalidades do MVP implementadas:**
  - Painel de telemetria geotécnica em tempo real (Socket.IO + fallback Serverless);
  - Gêmeo Digital 3D do terreno com mapa de calor de suscetibilidade e posicionamento de sensores;
  - Extração topográfica real por CEP/endereço via Modelo Digital de Elevação (Open-Meteo SRTM/Copernicus 30m);
  - Laboratório paramétrico de simulação geotécnica com diagrama de Mohr-Coulomb interativo e cenários históricos reais (Petrópolis 2022, São Sebastião 2023);
  - Central de Comando da Defesa Civil com gestão de protocolos, recebimento de denúncias com fotos/geolocalização e bot WhatsApp;
  - Histórico auditável com filtros por nível de risco e data, paginação e exportação de Laudo Pericial em PDF (ABNT NBR 11682);
  - Autenticação completa com hash `bcrypt`, 2FA por e-mail, middleware JWT e acesso de 1 clique para banca avaliadora.
- **Tecnologias principais:**
  - **Frontend:** Next.js 16, React 19, TypeScript, Tailwind CSS 4, Three.js / React Three Fiber, Zustand, Recharts, jsPDF
  - **Backend:** Node.js, Express 5, Socket.IO, TypeScript, Jest
  - **Banco de Dados:** MySQL com Prisma ORM 6 e migrations versionadas

---

## 2. 📂 Organização Atual do Repositório

```text
LandSlide/
├── README.md
├── DIVISAO_TAREFAS.md
├── RELATORIO_ANALISE.md
├── backend/
│   ├── insomnia.json
│   ├── package.json
│   ├── jest.config.js
│   ├── prisma/
│   │   ├── schema.prisma
│   │   ├── seed.ts
│   │   └── migrations/
│   │       └── 20260824112730_init_v2/migration.sql
│   └── src/
│       ├── server.ts
│       ├── __tests__/
│       │   └── riskAlgorithm.test.ts
│       ├── controllers/
│       │   ├── alerts.controller.ts
│       │   ├── history.controller.ts
│       │   ├── protocols.controller.ts
│       │   ├── sensors.controller.ts
│       │   ├── simulation.controller.ts
│       │   ├── terrain.controller.ts
│       │   ├── weather.controller.ts
│       │   └── whatsapp.controller.ts
│       ├── middlewares/
│       │   └── auth.middleware.ts
│       ├── routes/
│       │   ├── api.routes.ts
│       │   └── auth.routes.ts
│       └── lib/
│           ├── prisma.ts
│           ├── elevation.ts
│           ├── geocoding.ts
│           ├── mailer.ts
│           ├── mockSensors.ts
│           ├── riskAlgorithm.ts
│           └── whatsapp.ts
└── frontend/
    ├── package.json
    ├── app/
    │   ├── api/ (Rotas Serverless de fallback para deploy na Vercel)
    │   ├── page.tsx
    │   ├── dashboard/page.tsx
    │   ├── defesa-civil/page.tsx
    │   ├── gerar-terreno/page.tsx
    │   ├── historico/page.tsx
    │   ├── mapa-3d/page.tsx
    │   └── simulacao/page.tsx
    ├── components/
    │   ├── 3d/ (TerrainMesh.tsx, SensorSidebar.tsx)
    │   ├── simulation/MohrCoulombChart.tsx
    │   ├── AuthModal.tsx
    │   ├── IncidentReportModal.tsx
    │   ├── LiveAlertLogs.tsx
    │   └── sidebar.tsx
    ├── lib/
    │   ├── api.ts
    │   ├── geotechnicalEngine.ts
    │   ├── pdfReportGenerator.ts
    │   └── socket.ts
    └── store/
        ├── authStore.ts
        └── terrainStore.ts
```

---

## 3. ⚙️ Arquitetura do Backend e Banco de Dados

- **Separação em Camadas:** O backend está modularizado em `routes/`, `controllers/`, `middlewares/` e `lib/`.
- **Singleton do Prisma Client:** Centralizado em `backend/src/lib/prisma.ts`, evitando exaustão do pool de conexões MySQL.
- **Modelagem Relacional MySQL (`backend/prisma/schema.prisma`):**
  - `User`: Credenciais, papel (`OPERATOR` / `USER`), telefone e CEP.
  - `SensorData`: Leituras de telemetria (`soilMoisture`, `terrainInclination`, `rainVolume`, `groundVibration`, `riskLevel`, `statusColor`).
  - `EmergencyProtocol`: Protocolos da Defesa Civil e relatos comunitários (`description` em `@db.LongText` para suportar fotos Base64 e metadados JSON).
  - `AlertDispatch`: Registros de alertas enviados (`message` em `@db.Text`), com chave estrangeira (`@relation`) vinculada a `EmergencyProtocol.protocolCode`.
- **Testes Automatizados:** Suíte Jest em `backend/src/__tests__/riskAlgorithm.test.ts` com 12 testes cobrindo o cálculo do Fator de Segurança ($FS$) e as faixas de risco R1 a R4.

---

## 4. 🌐 Cobertura de Rotas da API e Coleção do Insomnia

Todas as rotas do backend estão registradas em `backend/src/routes/auth.routes.ts` e `backend/src/routes/api.routes.ts` e documentadas na coleção `backend/insomnia.json`:

| Método | Endpoint | Controller / Handler | Proteção JWT |
|---|---|---|---|
| POST | `/api/auth/register` | `auth.routes.ts` | Pública |
| POST | `/api/auth/login` | `auth.routes.ts` | Pública |
| POST | `/api/auth/verify-2fa` | `auth.routes.ts` | Pública |
| POST | `/api/auth/demo-login` | `auth.routes.ts` | Pública |
| GET | `/api/history` | `history.controller.ts` | `verifyToken` |
| POST | `/api/sensor-data` | `sensors.controller.ts` | Pública (IoT) |
| GET | `/api/sensor-history/:sensorId` | `sensors.controller.ts` | Pública |
| GET | `/api/defense-protocols` | `protocols.controller.ts` | `verifyToken` |
| POST | `/api/defense-protocols/mock` | `protocols.controller.ts` | `verifyToken` |
| POST | `/api/defense-protocols/:id/status` | `protocols.controller.ts` | `verifyToken` |
| GET | `/api/incidents` | `protocols.controller.ts` | Pública |
| POST | `/api/incidents` | `protocols.controller.ts` | Pública |
| POST | `/api/alerts/dispatch` | `alerts.controller.ts` | `verifyToken` |
| GET | `/api/alerts` | `alerts.controller.ts` | `verifyToken` |
| POST | `/api/simulation/mode` | `simulation.controller.ts` | `verifyToken` |
| POST | `/api/generate-terrain` | `terrain.controller.ts` | Pública |
| GET | `/api/weather/:lat/:lng` | `weather.controller.ts` | Pública |
| GET | `/api/whatsapp/status` | `whatsapp.controller.ts` | `verifyToken` |
| POST | `/api/whatsapp/disconnect` | `whatsapp.controller.ts` | `verifyToken` |

---

## 5. ✅ Resumo das Melhorias e Correções Aplicadas

1. **Unificação do Prisma Client (`backend/src/lib/prisma.ts`)**: Substituição das 8 instâncias isoladas de `new PrismaClient()` por um singleton global reutilizado em todas as rotas, controllers, simulador e bot WhatsApp.
2. **Registro de Rotas Faltantes (`backend/src/routes/api.routes.ts`)**: Adição das rotas `GET /api/alerts`, `GET /api/incidents` e `POST /api/incidents`, além de suporte a JSON estruturado (texto, foto Base64, telefone e localização) nos protocolos.
3. **Integridade Referencial e Suporte a Mídia (`schema.prisma` e `alerts.controller.ts`)**: Ajuste de `EmergencyProtocol.description` para `@db.LongText` e `AlertDispatch.message` para `@db.Text`, além de `upsert` automático do protocolo antes de gravar o disparo de alerta para evitar erros de Foreign Key.
4. **Autenticação JWT Consistente no Modo Avaliador (`simulacao/page.tsx`, `historico/page.tsx` e `auth.routes.ts`)**: Os botões de acesso rápido da banca agora requisitam um JWT real assinado em `POST /api/auth/demo-login`, permitindo consumir rotas protegidas por `verifyToken`.
5. **Correção do Índice de Risco e Filtros no Histórico e PDF (`historico/page.tsx`, `pdfReportGenerator.ts`, `history.controller.ts`)**: Leitura unificada de `log.risk ?? log.riskLevel ?? log.riskScore` e ativação dos filtros de nível de risco e data tanto no cliente quanto no servidor.
6. **Alinhamento Fuso Horário Open-Meteo (`weather.controller.ts`)**: Uso de `timezone=UTC` para corresponder exatamente à busca de índice horário em ISO UTC.
7. **Sincronização Completa de Eventos WebSocket (`SensorSidebar.tsx`, `simulation.controller.ts`, `whatsapp.ts`)**: Tratamento dos eventos `sensorCalibrated` e `sirenTested` no frontend e preservação dos IDs reais gerados pelo banco nos alertas em tempo real.
8. **Padronização da Equação Geotécnica (`whatsapp.ts`, `pdfReportGenerator.ts`, `README.md`)**: Todos os módulos utilizam e documentam a formulação de Mohr-Coulomb com os mesmos parâmetros e limiares R1–R4.
