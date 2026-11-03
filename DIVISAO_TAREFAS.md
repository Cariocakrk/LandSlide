# Divisão de Tarefas — GeoShield Monitor

Este documento apresenta a distribuição de responsabilidades e divisão técnica das tarefas do grupo de desenvolvimento do GeoShield Monitor para fins de avaliação acadêmica.

## 👥 Integrantes e Contribuições

### 1. Henzo Marques Dos Santos Souza (EA - Henzo Marques Dos Santos Souza / Cariocakrk)
**Responsabilidades Principais:**
- **Liderança Técnica e Arquitetura:** Estruturação do projeto full stack, definição do fluxo de dados e comunicação em tempo real via WebSockets (Socket.IO).
- **Banco de Dados Relacional:** Modelagem das entidades no Prisma Schema, configuração do banco MySQL (Hostinger) com migrations versionadas e relacionamento entre protocolos e disparos.
- **Desenvolvimento do Frontend & Gêmeo Digital 3D:** Criação do mapa topográfico 3D interativo utilizando Three.js e React Three Fiber, modelagem dos shaders de coloração de risco e integração com Modelos Digitais de Elevação (SRTM/Copernicus 30m).
- **Módulo de Simulação Geotécnica:** Codificação do motor de equilíbrio-limite de Mohr-Coulomb (ABNT NBR 11682) e laboratório interativo de cenários climáticos/estruturais.

### 2. EA - Cariocakrk (Identidade de Commits Alternativa)
**Responsabilidades Principais:**
- **Segurança e Autenticação:** Implementação dos fluxos de registro, login com hash de senha `bcrypt`, autenticação em duas etapas (2FA), rota rápida de avaliação e proteção de rotas com tokens JWT (`auth.middleware.ts`).
- **Desenvolvimento do Backend em Camadas:** Separação de rotas e controllers em Express 5 (`alerts`, `history`, `protocols`, `sensors`, `simulation`, `terrain`, `weather`) e integração com singleton do Prisma Client.
- **Mensageria e WhatsApp Bot:** Codificação da integração do bot interativo local via `whatsapp-web.js` e fallbacks de disparo externo (Twilio/Meta Graph API).
- **Histórico, Filtros e Laudos Periciais:** Criação da página de histórico com filtros de severidade/data, gráficos Recharts e geração de Laudo Pericial em PDF (ABNT NBR 11682).

---

## 🛠️ Detalhamento Técnico das Entregas

| Componente | Desenvolvedor Responsável | Tecnologia Utilizada |
|---|---|---|
| **Painel 3D de Terreno** | Henzo Marques | React Three Fiber, Three.js, Canvas WebGL |
| **Integração IoT (Simulador)** | Henzo Marques | Socket.IO, Node.js |
| **API do Servidor Express** | Cariocakrk / Henzo Marques | Express 5, TypeScript, Arquitetura MVC/Controllers |
| **Persistência de Dados** | Cariocakrk / Henzo Marques | Prisma ORM v6, MySQL |
| **Bot Interativo WhatsApp** | Cariocakrk | whatsapp-web.js, QR Code Generator |
| **Geração de Terreno por CEP** | Henzo Marques | Nominatim, ViaCEP, Open-Meteo Elevation (SRTM 30m) |
| **Validação, 2FA e JWT** | Cariocakrk | jsonwebtoken, bcrypt, Express Auth Middleware |
| **Conjunto de Testes** | Cariocakrk / Henzo Marques | Jest, ts-jest (12 testes unitários geotécnicos) |

---

## 🔗 Colaboração Acadêmica

Para verificar a colaboração do professor como visualizador ou colaborador remoto no repositório GitHub, por favor siga os passos:
1. Acesse as configurações do repositório no GitHub: **Settings -> Collaborators**.
2. Verifique o convite pendente ou ativo para o usuário do professor.
