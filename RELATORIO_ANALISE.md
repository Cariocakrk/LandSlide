# 📊 Relatório de Análise do Projeto

## 1. 🏗️ Identificação e visão geral

- **Nome do projeto:** GeoShield Monitor — Sistema Inteligente Preventivo de Deslizamentos
- **Objetivo identificado:** oferecer um painel de monitoramento e previsão de risco estrutural para apoiar a Defesa Civil na prevenção de deslizamentos.
- **Problema que o sistema pretende resolver:** monitoramento de encostas e antecipação de situações de risco associadas a umidade do solo, inclinação, chuva e vibração, com visualização e emissão de alertas.
- **Funcionalidades do MVP descritas:** painel de telemetria em tempo real; mapa topográfico 3D; simulação de cenários de risco; chamados da Defesa Civil; histórico de sensores; geração de terreno por CEP/endereço; cadastro e autenticação; alertas comunitários por WhatsApp.
- **Tecnologias principais:**
  - Next.js 16 e React 19
  - Node.js, Express 5 e Socket.IO
  - Prisma ORM 6 e SQLite
  - Tailwind CSS 4
  - Three.js/React Three Fiber, Zustand e Recharts
- **Linguagens utilizadas:**
  - TypeScript
  - JavaScript (arquivos de configuração)
  - CSS
  - Prisma Schema Language

### Evidências consultadas

- `README.md` — nome, objetivo, arquitetura declarada, execução e funcionalidades.
- `frontend/package.json` — Next.js, React, Tailwind e bibliotecas do frontend.
- `backend/package.json` — Express, Prisma, Socket.IO e bibliotecas do backend.
- `backend/prisma/schema.prisma` — banco SQLite e entidades persistentes.
- `backend/src/server.ts` — servidor, rotas REST, Socket.IO e operações Prisma.
- `frontend/app/*/page.tsx` — páginas efetivamente iniciadas.

Há divergências relevantes entre a descrição e o código: o `README.md` declara PostgreSQL e dados topográficos “reais”, enquanto o schema usa SQLite e `backend/src/lib/elevation.ts` gera uma matriz procedural, sem consultar um DEM externo.

---

## 2. 📂 Organização do repositório

```text
LandSlide/
├── README.md
├── .gitignore
├── backend/
│   ├── package.json
│   ├── tsconfig.json
│   ├── prisma/
│   │   └── schema.prisma
│   └── src/
│       ├── server.ts
│       ├── routes/
│       │   └── auth.ts
│       └── lib/
│           ├── elevation.ts
│           ├── geocoding.ts
│           ├── mockSensors.ts
│           ├── riskAlgorithm.ts
│           └── whatsapp.ts
└── frontend/
    ├── package.json
    ├── tsconfig.json
    ├── next.config.ts
    ├── postcss.config.mjs
    ├── app/
    │   ├── page.tsx
    │   ├── dashboard/page.tsx
    │   ├── defesa-civil/page.tsx
    │   ├── gerar-terreno/page.tsx
    │   ├── historico/page.tsx
    │   ├── mapa-3d/page.tsx
    │   └── simulacao/page.tsx
    ├── components/
    │   ├── 3d/
    │   ├── AuthModal.tsx
    │   ├── LiveAlertLogs.tsx
    │   └── sidebar.tsx
    ├── lib/
    └── store/
```

### Responsabilidade das pastas

- `backend/prisma` — definição do datasource e dos models persistentes.
- `backend/src/routes` — rotas modulares de autenticação.
- `backend/src/lib` — regras de risco, simulação, geocodificação, elevação e WhatsApp.
- `frontend/app` — rotas e páginas do App Router do Next.js.
- `frontend/components` — componentes compartilhados, incluindo visualização 3D.
- `frontend/lib` — cliente Socket.IO e funções utilitárias.
- `frontend/store` — estado global de autenticação, terreno, clima e sensores.

### Análise da organização

- Separação entre frontend e backend: **adequada** no nível superior.
- Nomes de pastas e arquivos: em geral claros e relacionados ao domínio; há mistura de português e inglês.
- Arquivos de configuração: existem configurações separadas de dependências, TypeScript, Next.js, PostCSS e Prisma.
- Organização mínima do projeto: **atende**, embora quase todas as rotas do backend estejam concentradas em `backend/src/server.ts`; somente autenticação foi separada.
- Pastas de dependências e artefatos gerados são ignoradas. O banco SQLite também é ignorado por `backend/.gitignore`.

---

## 3. 📘 README e documentação inicial

**Localização:** `README.md`

| Item esperado | Situação | Evidência |
|---|---|---|
| Nome do projeto | Atende | Título de `README.md` |
| Problema que o sistema resolve | Atende | Parágrafo inicial de `README.md` |
| Objetivo do projeto | Atende | Parágrafo inicial de `README.md` |
| Funcionalidades do MVP | Atende | Seção “Funcionalidades Integradas” |
| Tecnologias utilizadas | Parcial | Cita Next.js, Node.js, WebSockets e PostgreSQL, mas omite parte da stack e diverge do SQLite configurado |
| Instruções para execução local | Parcial | Apresenta instalação e inicialização; porém orienta PostgreSQL/DATABASE_URL, enquanto o schema usa SQLite fixo |
| Divisão entre frontend, backend e banco | Atende | Seções de execução e “Estrutura do TCC” |

O `frontend/README.md` permanece majoritariamente como documentação genérica criada pelo Next.js e não documenta o domínio do projeto.

### Histórico de commits e participação

- Histórico disponível para análise: **Sim**
- Participação dos integrantes identificável: **Parcial**
- Evidências: o histórico local contém 14 commits e dois pares nome/e-mail, “Cariocakrk” e “EA - Henzo Marques Dos Santos Souza”. Os nomes parecem poder representar a mesma pessoa, mas isso não pode ser presumido. Há um merge de PR e commits distribuídos entre os dois registros. O histórico não contém documentação explícita de divisão de tarefas do grupo.

> Não há evidência suficiente para atribuir autoria individual além dos metadados dos commits.

### Professor como colaborador

**Situação:** NÃO VERIFICÁVEL PELO REPOSITÓRIO

---

## 4. ⚙️ Backend

- **Localização:** `backend`
- **Linguagem:** TypeScript
- **Framework principal:** Express 5
- **Arquivo de inicialização:** `backend/src/server.ts`
- **Servidor configurado:** Sim; servidor HTTP com Express e Socket.IO na porta definida por `PORT` ou 3001.

### Estrutura identificada

- `backend/src/server.ts` — middlewares, rotas, Socket.IO e inicialização dos serviços.
- `backend/src/routes/auth.ts` — cadastro e login.
- `backend/src/lib/riskAlgorithm.ts` — cálculo ponderado do risco.
- `backend/src/lib/mockSensors.ts` — geração periódica de telemetria simulada.
- `backend/src/lib/geocoding.ts` — ViaCEP/Nominatim e cache em memória.
- `backend/src/lib/elevation.ts` — geração procedural de matriz topográfica.
- `backend/src/lib/whatsapp.ts` — cliente WhatsApp, comandos do bot e operações de usuários.

### Organização interna

- Rotas: existem 14 operações REST identificáveis, além de eventos Socket.IO.
- Controllers: **NÃO IDENTIFICADO** como camada separada; handlers estão nas rotas.
- Services: parcial; módulos de domínio estão em `src/lib`, mas não há camada formal de serviços.
- Middlewares: `cors()` e `express.json()`; não foi identificado middleware próprio de autenticação/autorização.
- Configuração do banco: Prisma Client é instanciado em três módulos; o schema fica em `backend/prisma/schema.prisma`.
- Validações: pontuais para modo de simulação, presença de campos e entrada de terreno; não há validação sistemática dos payloads no backend.
- Tratamento de erros: blocos `try/catch` e respostas JSON, frequentemente genéricas; algumas operações adotam fallback em memória.

### Funcionalidades implementadas

- Cadastro e login com consulta/criação de usuário, hash e JWT — `backend/src/routes/auth.ts`.
- Consulta paginada de telemetria persistida — `backend/src/server.ts`.
- Simulação e emissão de alertas em tempo real — `backend/src/server.ts` e `backend/src/lib/mockSensors.ts`.
- CRUD parcial de protocolos (listar, criar mock e atualizar status) — `backend/src/server.ts`.
- Geração de terreno por CEP/endereço — `backend/src/server.ts`, `geocoding.ts` e `elevation.ts`.
- Consulta meteorológica externa — `backend/src/server.ts`.
- Registro e consulta de telemetria — `backend/src/server.ts`.
- Registro e despacho de alertas, com integrações WhatsApp — `backend/src/server.ts` e `whatsapp.ts`.

### Fluxo das requisições

```text
requisição HTTP → rota Express → handler no server.ts/auth.ts → Prisma Client → SQLite → resposta JSON
```

Esse fluxo é completo nas rotas de histórico, autenticação, protocolos, telemetria e alertas quando o banco está acessível. Em criação de simulações, protocolos mock, telemetria e disparos há captura de erro com continuidade em memória/Socket.IO; nesses casos o fluxo pode terminar sem persistência. Geocodificação, clima e terreno seguem fluxos externos/procedurais, não Prisma.

Limitações comprovadas: eventos `calibrateSensor` e `sirenTest` são emitidos por `frontend/components/3d/SensorSidebar.tsx`, mas não há listeners correspondentes no backend. Além disso, a rota de simulação emite um objeto temporário com ID diferente do registro criado pelo Prisma, enquanto a tela usa esse ID no endpoint de atualização de status; esse fluxo não comprova atualização bem-sucedida do registro persistido.

---

## 5. 🗄️ Banco de dados e Prisma ORM

- **Tipo de banco:** SQLite
- **ORM:** Prisma
- **Configuração principal:** `backend/prisma/schema.prisma`
- **Schema Prisma:** `backend/prisma/schema.prisma`
- **Migrations:** Não
- **Localização das migrations:** NÃO IDENTIFICADO

### Models ou entidades identificadas

- `User` — usuário com UUID, nome, e-mail único, senha, papel, telefone, CEP e data de criação.
- `SensorData` — leitura de umidade, inclinação, chuva, vibração, risco, cor de status e data.
- `EmergencyProtocol` — protocolo único, risco, status, descrição e data.
- `AlertDispatch` — registro de disparo com protocolo, CEP, moradores, canal, status, mensagem e data.

### Modelagem

| Elemento | Situação | Evidência |
|---|---|---|
| Models principais definidos | Atende | Quatro models em `backend/prisma/schema.prisma` |
| Chaves primárias | Atende | `id String @id @default(uuid())` em todos os models |
| Chaves estrangeiras e relações | Parcial | O domínio sugere vínculos entre protocolo e disparo, mas `protocolCode` é apenas `String`, sem relação Prisma |
| Campos coerentes com o domínio | Atende | Campos dos quatro models correspondem aos fluxos implementados |
| Prisma Client utilizado no backend | Atende | `server.ts`, `routes/auth.ts` e `lib/whatsapp.ts` |
| Operação real de banco em rota/controller | Atende | `findMany`, `findUnique`, `create`, `update` e `count` em handlers executáveis |

### Operações Prisma encontradas

- `findMany`, `findUnique` ou equivalente: `backend/src/server.ts`, `backend/src/routes/auth.ts`, `backend/src/lib/whatsapp.ts`.
- `create`: `backend/src/server.ts`, `backend/src/routes/auth.ts`, `backend/src/lib/whatsapp.ts`.
- `update`: `backend/src/server.ts`, `backend/src/lib/whatsapp.ts`.
- `delete`: NÃO IDENTIFICADO.
- Outras operações: `count` em `backend/src/server.ts`; `findFirst` em `backend/src/lib/whatsapp.ts`.

### Banco no servidor de produção

O datasource SQLite aponta para arquivo local `dev.db`, ignorado pelo Git. Não há migration, dump, banco versionado ou configuração de produção que comprove criação em servidor. O `README.md` menciona PostgreSQL, mas isso contradiz o schema.

**Situação:** NÃO VERIFICÁVEL PELO REPOSITÓRIO

---

## 6. 🌐 Rotas da API e arquivo do Insomnia

### Rotas encontradas no backend

| Método | Endpoint | Arquivo | Operação realizada | Usa Prisma |
|---|---|---|---|---|
| POST | `/api/auth/register` | `backend/src/routes/auth.ts` | consulta e cria usuário | Sim |
| POST | `/api/auth/login` | `backend/src/routes/auth.ts` | consulta usuário e emite JWT | Sim |
| GET | `/api/history` | `backend/src/server.ts` | lista telemetria paginada | Sim |
| POST | `/api/simulation/mode` | `backend/src/server.ts` | altera simulação e pode criar protocolo | Sim |
| GET | `/api/defense-protocols` | `backend/src/server.ts` | lista protocolos | Sim |
| POST | `/api/defense-protocols/mock` | `backend/src/server.ts` | cria protocolo manual/mock | Sim |
| POST | `/api/defense-protocols/:id/status` | `backend/src/server.ts` | atualiza status | Sim |
| POST | `/api/generate-terrain` | `backend/src/server.ts` | geocodifica e gera matriz de elevação | Não |
| GET | `/api/weather/:lat/:lng` | `backend/src/server.ts` | consulta previsão de seis horas | Não |
| POST | `/api/sensor-data` | `backend/src/server.ts` | guarda histórico em memória e persiste leitura | Sim |
| GET | `/api/sensor-history/:sensorId` | `backend/src/server.ts` | retorna histórico em memória | Não |
| POST | `/api/alerts/dispatch` | `backend/src/server.ts` | registra e tenta despachar alerta | Sim |
| GET | `/api/alerts` | `backend/src/server.ts` | lista disparos | Sim |
| GET | `/api/whatsapp/status` | `backend/src/server.ts` | retorna estado do cliente WhatsApp | Não |
| POST | `/api/whatsapp/disconnect` | `backend/src/server.ts` | encerra/reinicia cliente WhatsApp | Não |

### Adequação das rotas

Os métodos HTTP são majoritariamente coerentes com consulta e criação. A atualização de status usa POST, não um método específico de atualização, mas é clara. Há parâmetros de página, ID, sensor e coordenadas, além de JSON em cadastro, login, simulação, terreno, telemetria e alertas. As respostas são JSON. As rotas cobrem funcionalidades essenciais do MVP. A organização é parcial porque quase todas permanecem no arquivo de inicialização. A autenticação produz token, mas as rotas operacionais não validam o JWT; a restrição observada no frontend é apenas de interface.

### Arquivo exportado do Insomnia

- **Arquivo encontrado:** NÃO IDENTIFICADO
- **Formato:** NÃO IDENTIFICADO
- **Rotas organizadas por funcionalidade:** Não
- **Nomes claros nas requisições:** Não
- **Exemplos de corpo JSON:** Não
- **Parâmetros e variáveis configurados:** Não
- **Compatibilidade com as rotas do backend:** Não verificável sem arquivo

---

## 7. 🎨 Frontend

- **Localização:** `frontend`
- **Framework:** Next.js 16 com React 19
- **Linguagem:** TypeScript/TSX; JavaScript não é a linguagem predominante solicitada
- **Ferramenta de criação/build:** Next.js (`next dev`, `next build`)
- **Tailwind CSS:** Configurado e utilizado
- **Roteamento:** App Router do Next.js

### Arquivos principais

- `frontend/app/layout.tsx` — layout global, tema, sidebar e console de alertas.
- `frontend/app/globals.css` — importação do Tailwind e estilos globais.
- `frontend/lib/socket.ts` — cliente Socket.IO e URL base configurável.
- `frontend/store/terrainStore.ts` — terreno, sensores, clima, risco e envio de telemetria.
- `frontend/store/authStore.ts` — usuário/token persistidos no navegador.

### Páginas e componentes

- `frontend/app/page.tsx` — apresentação inicial e atalhos.
- `frontend/app/dashboard/page.tsx` — painel de telemetria e gráficos.
- `frontend/app/gerar-terreno/page.tsx` — formulário de CEP/endereço, cálculo de declive e cena 3D.
- `frontend/app/mapa-3d/page.tsx` — mapa 3D e seleção de sensores.
- `frontend/app/simulacao/page.tsx` — modos simulados de risco.
- `frontend/app/defesa-civil/page.tsx` — protocolos, status e disparo de alertas.
- `frontend/app/historico/page.tsx` — histórico paginado e visualização gráfica.
- `frontend/components/AuthModal.tsx` — login e cadastro.
- `frontend/components/3d/TerrainMesh.tsx` — malha topográfica e posicionamento visual.
- `frontend/components/3d/SensorSidebar.tsx` — detalhes e histórico de um sensor.

### Análise do desenvolvimento inicial

| Elemento | Situação | Evidência |
|---|---|---|
| Projeto React iniciado | Atende | `frontend/package.json`, `frontend/app/layout.tsx` |
| Uso de JavaScript | Parcial | Há `.mjs`, mas aplicação é escrita em TypeScript/TSX |
| Tailwind configurado ou utilizado | Atende | `postcss.config.mjs`, `globals.css` e classes nas páginas |
| Telas principais iniciadas | Atende | Sete páginas no diretório `app` |
| Componentes organizados | Atende | `components`, `components/3d`, `store` e `lib` |
| Navegação entre páginas | Atende | `sidebar.tsx` e links da página inicial |
| Tela conectada ou preparada para API | Atende | Chamadas REST e listeners Socket.IO em múltiplas telas |

O uso de TypeScript é registrado apenas como divergência da orientação de JavaScript, sem bônus. Não foi executada demonstração visual; funcionamento e acabamento em navegador são **NÃO VERIFICÁVEIS PELO REPOSITÓRIO**.

---

## 8. 🔗 Conexão entre frontend e backend

- **Tipo de comunicação:** REST e WebSocket (Socket.IO)
- **Cliente HTTP:** Fetch; Socket.IO Client para tempo real
- **Arquivo de configuração da API:** `frontend/lib/socket.ts` apenas para Socket.IO; chamadas Fetch repetem URL literal
- **URL base:** `http://localhost:3001`, em `frontend/lib/socket.ts` e nas páginas/stores
- **Variáveis de ambiente:** referências a `NEXT_PUBLIC_API_URL`, `PORT`, `JWT_SECRET` e credenciais opcionais; arquivos `.env`/`.env.example` não foram encontrados e valores sensíveis não são expostos neste relatório
- **CORS no backend:** Configurado de forma ampla por `cors()` e pelo servidor Socket.IO
- **Proxy no frontend:** Ausente

### Endpoints consumidos pelo frontend

| Endpoint | Método | Componente ou página | Finalidade | Compatível com o backend |
|---|---|---|---|---|
| `/api/auth/login` | POST | `components/AuthModal.tsx` | autenticação | Sim |
| `/api/auth/register` | POST | `components/AuthModal.tsx` | cadastro | Sim |
| `/api/history?page=` | GET | `app/historico/page.tsx` | histórico paginado | Sim |
| `/api/simulation/mode` | POST | `app/simulacao/page.tsx` | alterar cenário | Sim |
| `/api/defense-protocols` | GET | `app/defesa-civil/page.tsx` | listar protocolos | Sim |
| `/api/defense-protocols/mock` | POST | `app/defesa-civil/page.tsx` | criar alerta manual | Sim |
| `/api/defense-protocols/:id/status` | POST | páginas de simulação/Defesa Civil | atualizar protocolo | Parcial |
| `/api/generate-terrain` | POST | `app/gerar-terreno/page.tsx` | gerar terreno | Sim |
| `/api/weather/:lat/:lng` | GET | `store/terrainStore.ts` | atualizar chuva e umidade | Sim |
| `/api/sensor-data` | POST | `store/terrainStore.ts` | enviar telemetria | Sim |
| `/api/sensor-history/:sensorId` | GET | `components/3d/SensorSidebar.tsx` | histórico local | Sim |
| `/api/alerts/dispatch` | POST | `app/defesa-civil/page.tsx` | registrar/despachar alerta | Sim |
| `/api/alerts` | GET | `components/LiveAlertLogs.tsx` | carregar logs | Sim |
| `/api/whatsapp/status` | GET | `app/defesa-civil/page.tsx` | obter status | Sim |
| `/api/whatsapp/disconnect` | POST | `app/defesa-civil/page.tsx` | desconectar cliente | Sim |

### Fluxos comprovados

- Dashboard recebe evento `sensorData` emitido a cada dois segundos pelo backend.
- Geração de terreno envia consulta e usa a matriz retornada para estado e visualização 3D.
- Store consulta clima e envia leituras dos sensores ao backend.
- Histórico e protocolos carregam dados de rotas Prisma.
- Defesa Civil recebe atualizações por Socket.IO e envia alterações/disparos por REST.
- Modal envia cadastro/login e persiste a resposta no store de autenticação.

### Estado da integração

**Atende**, com ressalvas. Há comunicação coerente e extensa entre camadas. O fluxo de atualização disparado a partir do alerta temporário de simulação é incompatível com o ID persistido. Os eventos `calibrateSensor` e `sirenTest` não têm tratamento no servidor. A URL de REST está fixa em diversos arquivos, enquanto só o Socket.IO utiliza `NEXT_PUBLIC_API_URL`. Tokens recebidos não são enviados às rotas operacionais e o backend não aplica autorização nelas.

---

## 9. ✅ O que já está implementado

### Backend

- Servidor Express/Socket.IO e middlewares JSON/CORS.
- Rotas de autenticação, histórico, simulação, protocolos, terreno, clima, telemetria, alertas e WhatsApp.
- Algoritmo de risco e simulador de sensores.
- Geocodificação externa e geração procedural de terreno.

### Banco de dados

- Schema Prisma com quatro models e chaves primárias UUID.
- Consultas, criações e atualizações Prisma efetivamente chamadas pelo backend.
- Persistência prevista para usuários, telemetria, protocolos e disparos.

### Frontend

- Aplicação Next.js/React com Tailwind e navegação.
- Páginas de dashboard, terreno, mapa 3D, simulação, Defesa Civil e histórico.
- Estado global de autenticação e terreno.
- Componentes 3D, gráficos, formulários e feedback visual.

### Integração

- Consumo de todas as principais rotas REST do backend.
- Eventos em tempo real para sensores, protocolos, alertas e estado do WhatsApp.
- Envio periódico de telemetria e consulta meteorológica.

---

## 10. 🚧 O que está incompleto ou em desenvolvimento

- Exportação do Insomnia
  - **Evidência:** busca em todo o repositório.
  - **Estado observado:** NÃO IDENTIFICADO.

- Migrations e banco reproduzível/versionado
  - **Evidência:** `backend/prisma` contém somente `schema.prisma`; arquivos SQLite são ignorados.
  - **Estado observado:** schema existe, mas migrations e prova de criação do banco não existem no repositório.

- Coerência da documentação do banco
  - **Evidência:** `README.md` e `backend/prisma/schema.prisma`.
  - **Estado observado:** README descreve PostgreSQL/DATABASE_URL; implementação configura SQLite local.

- Relações entre entidades
  - **Evidência:** `backend/prisma/schema.prisma`.
  - **Estado observado:** não há chaves estrangeiras ou relações Prisma; `protocolCode` é duplicado como texto.

- Organização em camadas no backend
  - **Evidência:** `backend/src/server.ts`.
  - **Estado observado:** grande parte dos handlers e integrações está concentrada no arquivo de inicialização.

- Autorização das rotas restritas
  - **Evidência:** `backend/src/routes/auth.ts`, `frontend/components/sidebar.tsx` e rotas de `server.ts`.
  - **Estado observado:** JWT é criado e a interface restringe páginas, mas não há middleware de autorização no backend.

- Eventos de calibração e sirene
  - **Evidência:** `frontend/components/3d/SensorSidebar.tsx` e `backend/src/server.ts`.
  - **Estado observado:** frontend emite eventos sem listeners correspondentes no servidor.

- Atualização do alerta criado por simulação
  - **Evidência:** `backend/src/server.ts` e `frontend/app/simulacao/page.tsx`.
  - **Estado observado:** o frontend recebe ID temporário e o usa como se fosse ID do registro Prisma.

- Configuração central da API
  - **Evidência:** `frontend/lib/socket.ts` e chamadas Fetch.
  - **Estado observado:** variável de ambiente cobre Socket.IO; REST usa URLs locais literais.

- Arquivo de ambiente de exemplo
  - **Evidência:** listagem de arquivos ocultos.
  - **Estado observado:** NÃO IDENTIFICADO.

- Topografia externa
  - **Evidência:** `backend/src/lib/elevation.ts`.
  - **Estado observado:** matriz é procedural baseada em coordenadas, apesar das descrições de DEM/altimetria real na interface e no README.

- Testes automatizados
  - **Evidência:** `backend/package.json` e `frontend/package.json`.
  - **Estado observado:** backend possui script de teste que apenas encerra com erro; não foram identificados arquivos de teste.

---

## 11. 📦 Dependências principais

### Backend

| Dependência | Versão | Finalidade identificada |
|---|---:|---|
| express | ^5.2.1 | API HTTP |
| @prisma/client | ^6.19.2 | acesso ao banco em produção |
| prisma | ^6.19.2 | CLI/ORM, listado como produção |
| socket.io | ^4.8.3 | eventos em tempo real |
| cors | ^2.8.6 | liberação de origens |
| dotenv | ^17.3.1 | variáveis de ambiente |
| axios | ^1.13.6 | APIs externas e mensageria |
| bcrypt | ^6.0.0 | hash/verificação de senha |
| jsonwebtoken | ^9.0.3 | emissão de JWT |
| whatsapp-web.js | referência GitHub | cliente WhatsApp Web |
| qrcode | ^1.5.4 | QR de autenticação WhatsApp |
| ts-node | ^10.9.2 (dev) | execução TypeScript |
| typescript | ^5.9.3 (dev) | compilação/tipagem |

`node-cache` aparece nas dependências, mas uso efetivo não foi identificado. Pacotes `@types/bcrypt`, `@types/jsonwebtoken` e `prisma` estão em dependências de produção, enquanto outros tipos e TypeScript estão em desenvolvimento.

### Frontend

| Dependência | Versão | Finalidade identificada |
|---|---:|---|
| next | 16.1.6 | framework e roteamento |
| react / react-dom | 19.2.3 | interface |
| tailwindcss | ^4 (dev) | estilização |
| @react-three/fiber | ^9.5.0 | renderização Three.js em React |
| @react-three/drei | ^10.7.7 | utilitários 3D |
| three | ^0.183.2 | gráficos 3D |
| socket.io-client | ^4.8.3 | tempo real |
| zustand | ^5.0.11 | estado global |
| recharts | ^3.7.0 | gráficos de telemetria |
| react-hook-form | ^7.71.2 | formulários |
| zod | ^4.3.6 | validação do formulário de terreno |
| framer-motion | ^12.34.5 | animações |
| next-themes | ^0.4.6 | tema |
| typescript | ^5 (dev) | tipagem |

---

## 12. 🧭 Arquitetura e padrões identificados

- **Arquitetura predominante:** aplicação full stack separada em frontend e backend; frontend orientado a páginas/componentes/stores e backend de estrutura simples com rotas e bibliotecas de domínio.
- **Separação de responsabilidades:** boa entre as duas aplicações e razoável no frontend; parcial no backend devido à concentração em `server.ts` e múltiplas instâncias de Prisma Client.
- **Padrões identificados:** App Router, componentes funcionais React, store global Zustand, API REST, eventos pub/sub por Socket.IO, handlers assíncronos e fallback em memória.
- **Consistência entre os módulos:** interfaces REST e eventos principais são consistentes, com exceções documentadas para IDs de simulação e eventos de calibração/sirene. Há inconsistência terminológica entre PostgreSQL/SQLite e dados topográficos reais/procedurais.

---

# 13. 📝 Avaliação conforme os critérios da AV2

## Quadro avaliativo

| Critério | Valor máximo | Nota atribuída | Evidências e justificativa |
|---|---:|---:|---|
| Organização do repositório, README e professor como colaborador | 1,5 | 1,1 | Separação clara e README útil, porém com divergência PostgreSQL/SQLite e documentação genérica no frontend. Professor colaborador: NÃO VERIFICÁVEL PELO REPOSITÓRIO. |
| Banco de dados criado e coerente com o MVP | 2,0 | 1,3 | Quatro models coerentes e usados; sem migrations, relações, banco versionado ou comprovação do servidor, e com documentação divergente. |
| Arquivo exportado do Insomnia com as rotas organizadas | 1,5 | 0,0 | Arquivo NÃO IDENTIFICADO. |
| Backend iniciado com integração ao banco usando Prisma ORM | 2,0 | 1,8 | Express, JSON, rotas e múltiplas operações Prisma comprovadas; organização e validação são parciais, com fallbacks que não persistem. |
| Frontend iniciado em React, JavaScript e Tailwind | 1,5 | 1,3 | React/Next e Tailwind amplamente usados, com várias telas; aplicação é TypeScript/TSX, divergindo da orientação de JavaScript sem gerar bônus. |
| Conexão inicial entre frontend e backend | 1,0 | 0,9 | REST e Socket.IO conectam vários fluxos; permanecem eventos sem listener e um fluxo de ID incompatível. |
| Clareza na apresentação e divisão de tarefas do grupo | 0,5 | NÃO VERIFICÁVEL | Metadados de commits existem, mas apresentação e divisão do grupo não estão documentadas de modo conclusivo. |
| **Total verificável no repositório** | **10,0** | **6,4** | Soma das notas atribuíveis por evidência; 0,5 ponto permanece dependente de apresentação, e a colaboração do professor é uma faceta externa do primeiro critério. |

### Observação sobre o total

- **Pontuação obtida nos itens verificáveis:** 6,4 pontos.
- **Pontos dependentes de apresentação ou verificação externa:** 0,5 ponto integral de apresentação/divisão, além da verificação do professor como colaborador dentro do critério de 1,5.
- **Nota máxima que pode ser confirmada apenas pelo repositório:** 9,5 pontos, considerando o critério de apresentação como integralmente externo. A distribuição interna do item “professor como colaborador” não é definida no enunciado e depende do professor.

O total não transforma o critério externo em zero: ele permanece a definir.

---

## 14. 📌 Síntese por critério

### 14.1 Organização do repositório e README — máximo 1,5

- **Situação:** Parcial
- **Evidências:** `README.md`, `frontend/README.md`, `frontend`, `backend`, `.gitignore`.
- **Aspectos comprovados:** separação de aplicações, estrutura compreensível, tecnologias e execução documentadas.
- **Aspectos ausentes:** documentação coerente do banco, descrição completa das dependências e documentação específica no README do frontend.
- **Aspectos não verificáveis:** professor como colaborador.
- **Nota sugerida:** 1,1/1,5

### 14.2 Banco de dados e coerência com o MVP — máximo 2,0

- **Situação:** Parcial
- **Evidências:** `backend/prisma/schema.prisma`, `backend/src/server.ts`, `backend/src/routes/auth.ts`, `backend/src/lib/whatsapp.ts`.
- **Models/tabelas principais:** User, SensorData, EmergencyProtocol e AlertDispatch.
- **Coerência com o MVP:** entidades cobrem usuários, telemetria, protocolos e alertas; faltam relações explícitas e artefatos de migration.
- **Criação no servidor de produção:** Não verificável.
- **Nota sugerida:** 1,3/2,0

### 14.3 Insomnia e organização das rotas — máximo 1,5

- **Situação:** Não atende
- **Evidências:** busca integral dos arquivos do repositório.
- **Organização das requisições:** NÃO IDENTIFICADO.
- **Compatibilidade com o backend:** NÃO VERIFICÁVEL PELO REPOSITÓRIO sem exportação.
- **Nota sugerida:** 0,0/1,5

### 14.4 Backend com Prisma ORM — máximo 2,0

- **Situação:** Atende
- **Evidências:** `backend/src/server.ts`, `backend/src/routes/auth.ts`, `backend/src/lib/whatsapp.ts`, `backend/prisma/schema.prisma`.
- **Servidor Node.js/Express:** configurado com Express, HTTP, CORS, JSON e Socket.IO.
- **Prisma configurado:** cliente e datasource SQLite presentes.
- **Operação no banco:** leituras, contagem, criações e atualizações reais no código.
- **Resposta em JSON:** presente em todas as rotas REST identificadas.
- **Nota sugerida:** 1,8/2,0

### 14.5 Frontend com React, JavaScript e Tailwind — máximo 1,5

- **Situação:** Atende parcialmente à especificação de linguagem
- **Evidências:** `frontend/package.json`, `frontend/app`, `frontend/components`, `frontend/app/globals.css`.
- **React iniciado:** aplicação Next.js/React com múltiplas páginas funcionais no código.
- **JavaScript:** configurações usam JavaScript, porém telas e lógica usam TypeScript/TSX.
- **Tailwind:** configurado pelo PostCSS e amplamente utilizado nas classes.
- **Telas e componentes:** dashboard, terreno, mapa 3D, simulação, Defesa Civil, histórico e autenticação.
- **Nota sugerida:** 1,3/1,5

### 14.6 Conexão frontend-backend — máximo 1,0

- **Situação:** Atende
- **Evidências:** `frontend/lib/socket.ts`, páginas, stores e `backend/src/server.ts`.
- **Fluxo identificado:** chamadas Fetch para REST e listeners/emissões Socket.IO.
- **Compatibilidade das rotas e dados:** majoritariamente compatível; atualização de simulação e dois eventos de sensor apresentam lacunas.
- **Nota sugerida:** 0,9/1,0

### 14.7 Apresentação e divisão de tarefas — máximo 0,5

- **Situação:** Parcialmente comprovável quanto ao histórico; apresentação não verificável
- **Evidências no repositório:** 14 commits, dois pares nome/e-mail e um merge de PR; nenhuma divisão formal de tarefas identificada.
- **O que precisa ser verificado na apresentação:** participação efetiva, identidade dos integrantes, responsabilidades assumidas e domínio das partes implementadas.
- **Nota sugerida:** A DEFINIR/0,5

---

## 15. 🔍 Pontos para verificação durante a apresentação

- Demonstrar cadastro e login e explicar se alguma rota operacional valida o token retornado.
- Executar uma consulta de histórico e confirmar que os registros vêm do SQLite configurado no schema.
- Mostrar como o banco foi criado e onde está hospedado, esclarecendo a divergência entre PostgreSQL no README e SQLite no Prisma.
- Demonstrar a criação e atualização de um protocolo disparado pela simulação, verificando o ID persistido.
- Testar os comandos de calibração e sirene do painel do sensor e verificar se o backend recebe esses eventos.
- Gerar terreno por CEP/endereço e esclarecer quais dados são externos e quais são procedurais.
- Demonstrar o envio periódico de telemetria e sua posterior exibição no histórico.
- Demonstrar o fluxo completo de despacho e informar quais canais são reais, simulados ou dependentes de credenciais externas.
- Apresentar a exportação do Insomnia, caso exista fora do repositório, e comparar suas requisições com as 15 rotas REST identificadas.
- Verificar funcionamento e responsividade das páginas em navegador, aspecto não comprovável por leitura estática.
- Confirmar professor como colaborador na plataforma remota.
- Identificar os integrantes e solicitar que cada um explique sua contribuição, relacionando-a ao histórico de commits.

---

## 16. 📋 Conclusão

O projeto apresenta estruturação full stack avançada para uma entrega inicial: frontend e backend estão separados, há várias telas, visualização 3D, estado global, API REST, comunicação em tempo real e uso efetivo do Prisma. Os fluxos mais bem comprovados são geração de terreno procedural após geocodificação, telemetria simulada, consulta climática, persistência de usuários/sensores/protocolos/alertas e consumo dessas rotas pelo frontend.

As principais incompletudes são a ausência do arquivo exportado do Insomnia e de migrations, falta de prova do banco criado em servidor, relações ausentes no schema, divergência entre README e datasource, autorização somente aparente no frontend, eventos sem tratamento no backend e incompatibilidade de ID no fluxo de protocolo da simulação. A topografia é gerada proceduralmente, apesar de textos que a apresentam como altimetria real.

O histórico Git permite observar atividade técnica, mas não comprova de forma conclusiva a composição do grupo, a divisão de tarefas, a clareza da apresentação ou a presença do professor como colaborador. Esses elementos dependem de verificação externa.

**Nota sugerida com base apenas nas evidências verificáveis do repositório: 6,4 pontos, com 0,5 ponto de apresentação/divisão de tarefas a definir e com a faceta “professor como colaborador” sujeita à confirmação externa.**
