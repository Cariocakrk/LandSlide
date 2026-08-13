# Divisão de Tarefas — GeoShield Monitor

Este documento apresenta a distribuição de responsabilidades e divisão técnica das tarefas do grupo de desenvolvimento do GeoShield Monitor para fins de avaliação acadêmica.

## 👥 Integrantes e Contribuições

### 1. Henzo Marques Dos Santos Souza (EA - Henzo Marques Dos Santos Souza / Cariocakrk)
**Responsabilidades Principais:**
- **Liderança Técnica e Arquitetura:** Estruturação inicial do projeto full stack, definição do fluxo de dados e comunicação em tempo real via WebSockets (Socket.IO).
- **Banco de Dados:** Modelagem inicial das entidades no Prisma Schema, configuração do SQLite e mapeamento dos modelos relacionais.
- **Desenvolvimento do Frontend:** Criação do mapa topográfico 3D iterativo utilizando Three.js e React Three Fiber, modelagem dos shaders de coloração de risco e renderização do terreno.
- **Módulo de Simulação:** Codificação da lógica de alteração de cenários climáticos/estruturais no frontend.

### 2. EA - Cariocakrk (Identidade de Commits Alternativa)
**Responsabilidades Principais:**
- **Segurança e Autenticação:** Implementação dos fluxos de registro e login com hash de senha `bcrypt` e tokens JWT.
- **Desenvolvimento do Backend:** Escrita inicial de rotas em Express e integração com o Prisma Client para persistência de dados.
- **Mensageria e WhatsApp Bot:** Codificação da integração do bot interativo local via `whatsapp-web.js` e fallbacks de disparo externo (Twilio/Meta Graph API).
- **Histórico e Relatórios:** Criação da página de histórico com gráficos Recharts e listagem paginada de leituras IoT.

---

## 🛠️ Detalhamento Técnico das Entregas

| Componente | Desenvolvedor Responsável | Tecnologia Utilizada |
|---|---|---|
| **Painel 3D de Terreno** | Henzo Marques | React Three Fiber, Three.js, Canvas WebGL |
| **Integração IoT (Simulador)** | Henzo Marques | Socket.IO, Node.JS |
| **API do Servidor Express** | Cariocakrk / Henzo Marques | Express 5, TypeScript |
| **Persistência de Dados** | Cariocakrk / Henzo Marques | Prisma ORM, SQLite |
| **Bot Interativo WhatsApp** | Cariocakrk | whatsapp-web.js, QR Code Generator |
| **Geração de Terreno por CEP** | Henzo Marques | Nominatim, ViaCEP, Open-Meteo Elevation |
| **Validação e JWT** | Cariocakrk | jsonwebtoken, bcrypt, Express Middleware |
| **Conjunto de Testes** | Cariocakrk / Henzo Marques | Jest, ts-jest |

---

## 🔗 Colaboração Acadêmica

Para verificar a colaboração do professor como visualizador ou colaborador remoto no repositório GitHub, por favor siga os passos:
1. Acesse as configurações do repositório no GitHub: **Settings -> Collaborators**.
2. Verifique o convite pendente ou ativo para o usuário do professor.
