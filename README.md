# GeoShield Monitor - Sistema Geotécnico Inteligente de Prevenção de Deslizamentos

Sistema computacional fullstack de engenharia geotécnica e monitoramento em tempo real para Defesa Civil e mitigação de desastres naturais em encostas tropicais brasileiras (com foco em eventos críticos como Petrópolis/RJ 2022 e São Sebastião/SP 2023).

O sistema é **100% autossuficiente e independente de hardware físico (IoT)**: realiza a análise topográfica real de qualquer endereço ou CEP via Modelos Digitais de Elevação (DEM/SRTM 30m), consulta dados meteorológicos e umidade volumétrica do solo em tempo real (Open-Meteo), e executa o cálculo do Fator de Segurança ($FS$) através da mecânica dos solos de Mohr-Coulomb com perda de sucção mátrica.

---

## 🏛️ Guia para a Banca Examinadora / Avaliadores do TCC

Para facilitar a avaliação da banca examinadora sem necessidade de etapas manuais de e-mail ou configuração complexa:

1. **Acesso com 1 Clique (Recomendado):**  
   Na tela inicial, clique em **"Acessar Central"** e selecione o botão dourado **"🎓 Entrar Imediatamente como Avaliador (1-Clique • Sem 2FA)"**. O sistema autenticará instantaneamente com privilégios de Operador Chefe da Defesa Civil.

2. **Login Tradicional:**  
   - **E-mail:** `admin@defesacivil.gov.br`
   - **Senha:** `admin123`
   - **Código 2FA Mestre da Banca:** `123456` ou `000000` (ou clique no link de preenchimento automático na tela).

3. **Demonstração Imediata por CEP:**  
   Vá em **"Topografia (CEP)"** no menu lateral e digite qualquer CEP vulnerável do Brasil:
   - `25680-195` (Morro da Oficina / Petrópolis - RJ)
   - `11600-000` (Vila Sahy / São Sebastião - SP)
   - `20531-540` (Tijuca / Rio de Janeiro - RJ)
   - `30140-071` (Belo Horizonte - MG)

---

## 🔬 Formulação Geotécnica Rigorosa (Mecânica dos Solos)

Diferente de protótipos empíricos genéricos, o GeoShield adota o **Modelo de Talude Infinito (Infinite Slope Stability Model)** com critério de ruptura de **Mohr-Coulomb** e a extensão de **Fredlund & Rahardjo (1978)** para solos não-saturados com poropressões e perda de sucção mátrica:

$$FS = \frac{c' + c_s(1 - m) + (\gamma_{\text{sat}} \cdot z \cdot \cos^2\beta - u_w) \cdot \tan\phi'}{\gamma_{\text{sat}} \cdot z \cdot \sin\beta \cdot \cos\beta + F_{\text{vib}}}$$

### Variáveis e Constantes Adotadas:
- $\beta$: Declividade real da encosta (extraída do Modelo Digital de Elevação Copernicus/SRTM 30m).
- $c'$: Coesão residual efetiva do solo ($8.0\text{ kPa}$ para regolito tropical/argilo-arenoso).
- $c_s$: Parcela de coesão adicional por sucção mátrica ($12.0\text{ kPa}$ em solo seco a semi-seco).
- $\phi'$: Ângulo de atrito interno do solo ($26.5^\circ \approx 0.4625\text{ rad}$).
- $\gamma_{\text{sat}}$: Peso específico aparente do solo saturado ($18.5\text{ kN/m}^3$).
- $z$: Profundidade estimada da superfície potencial de ruptura ($2.0\text{ m}$).
- $m$: Coeficiente de saturação e elevação do lençol freático derivado de $P_{72\text{h}}$ (precipitação acumulada em 72h) e umidade volumétrica nas camadas $0-1\text{cm}, 1-3\text{cm}, 9-27\text{cm}$.
- $u_w = m \cdot \gamma_w \cdot z \cdot \cos^2\beta$: Poropressão neutra atuante na base do talude.

### Classificação de Risco Oficial (Normas CPRM / IPT / CEMADEN):
| Grau | Fator de Segurança ($FS$) | Risco | Ação Recomendada |
| :---: | :---: | :---: | :--- |
| **R1** | $FS > 1.50$ | **Baixo** (Verde) | Monitoramento de rotina e preservação vegetal |
| **R2** | $1.20 < FS \le 1.50$ | **Médio** (Amarelo) | Vistoria preventiva e limpeza de calhas e drenagens |
| **R3** | $1.00 < FS \le 1.20$ | **Alto** (Laranja) | Atenção Máxima da Defesa Civil e alerta aos moradores |
| **R4** | $FS \le 1.00$ | **Muito Alto** (Vermelho) | Sirenes de emergência e evacuação imediata do perímetro |

---

## 🗄️ Banco de Dados Remoto (Hostinger MySQL)

O sistema está conectado ao banco de dados relacional MySQL hospedado na Hostinger:

- **Host:** `srv1721.hstgr.io:3306`
- **Banco de Dados:** `u377366289_gpec08`
- **ORM:** Prisma Client v6
- **Modelos:** `User` (autenticação com hash bcrypt e 2FA), `SensorData` (histórico de telemetria geotécnica persistida para laudos e auditoria), `EmergencyProtocol` (ordens de serviço da Defesa Civil).

A string de conexão configurada no arquivo `backend/.env` trata o caractere especial `@` da senha via URL-encoding (`%40`):
```env
DATABASE_URL="mysql://u377366289_gpec08:gpec08%40EC@srv1721.hstgr.io:3306/u377366289_gpec08"
JWT_SECRET="geoshield_secret_key_prod_2026_tcc"
PORT=3001
```

---

## 💻 Como Rodar o Projeto Localmente

### Pré-requisitos
- Node.js v18 ou superior (testado na v24.19.0)
- npm v9 ou superior

### Passo 1: Iniciar o Backend
```bash
cd backend
npm install
npx prisma generate
npm run dev
```
O servidor inicializará na porta **3001** (`http://localhost:3001`).

Para rodar a suíte completa de testes automatizados geotécnicos:
```bash
npm test
```
*(Todos os 12 testes unitários do algoritmo geotécnico e casos de borda executam com sucesso).*

### Passo 2: Iniciar o Frontend
Em outro terminal:
```bash
cd frontend
npm install
npm run dev
```
Acesse a aplicação em **http://localhost:3000**.

---

## 🌐 Como Fazer Deploy no Vercel (Frontend)

Para publicar o frontend na nuvem Vercel de forma limpa e sem erros:

1. Suba o repositório para o seu GitHub.
2. No painel do Vercel, clique em **Add New Project** e selecione o repositório.
3. Configure a seção **Root Directory**:
   - Clique em `Edit` e selecione a pasta `frontend`.
4. Adicione a seguinte Variável de Ambiente (**Environment Variable**):
   - `NEXT_PUBLIC_API_URL`: URL pública onde o seu backend estiver rodando (ex: `https://seu-backend.up.railway.app` ou `https://seu-backend.onrender.com`).
   - *(Se deixar sem valor em desenvolvimento, o frontend usa fallback inteligente local)*.
5. Clique em **Deploy**.

---

## 🏗️ Estrutura Arquitetural do Repositório

```text
LandSlide/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma        # Modelo relacional MySQL (Users, Telemetria, Protocolos)
│   │   └── seed.ts              # População de dados iniciais e operador mestre
│   ├── src/
│   │   ├── lib/
│   │   │   ├── riskAlgorithm.ts # Motor matemático de Mohr-Coulomb e sucção mátrica
│   │   │   ├── elevation.ts     # Integração Open-Meteo DEM 30m e interpolação bilinear
│   │   │   ├── mockSensors.ts   # Emulador autônomo com persistência histórica MySQL
│   │   │   └── whatsapp.ts      # Integração Baileys/Puppeteer para alertas à população
│   │   ├── controllers/
│   │   │   ├── terrain.controller.ts  # Declividade, amplitude e MDE topográfico
│   │   │   └── weather.controller.ts  # Precipitação 72h e umidade multi-camada
│   │   └── routes/
│   │       ├── auth.routes.ts         # Login, registro, 2FA e rota de avaliador 1-clique
│   │       └── api.routes.ts          # Endpoints REST e sincronização WebSocket
│   └── src/__tests__/
│       └── riskAlgorithm.test.ts      # 12 testes unitários do modelo geotécnico
│
├── frontend/
│   ├── app/
│   │   ├── page.tsx             # Landing page institucional com acesso público
│   │   ├── dashboard/           # Painel de controle com cards geotécnicos e CEMADEN
│   │   ├── gerar-terreno/       # Geocodificação CEP e extração MDE em tempo real
│   │   ├── mapa-3d/             # Visualização Three.js/WebGL com malha tridimensional
│   │   ├── simulacao/           # Laboratório de eventos reais (Petrópolis/São Sebastião)
│   │   ├── defesa-civil/        # Emissão e despacho de protocolos de evacuação
│   │   └── historico/           # Auditoria e histórico de telemetria gravada no MySQL
│   ├── components/
│   │   ├── 3d/TerrainMesh.tsx   # Shader/heatmap de suscetibilidade por vértice
│   │   ├── AuthModal.tsx        # Modal com botão de acesso da banca e bypass 2FA
│   │   └── sidebar.tsx          # Navegação com indicador de status de conexão em tempo real
│   └── store/
│       ├── terrainStore.ts      # Estado global com modelo hidrológico e estações virtuais
│       └── authStore.ts         # Estado de sessão do operador
└── README.md                    # Documentação do projeto
```

---

## 📄 Licença e Créditos Acadêmicos

Desenvolvido para fins de Trabalho de Conclusão de Curso (TCC) em Engenharia / Ciência da Computação, integrando Ciência de Dados, Engenharia Geotécnica, Modelos Numéricos de Elevação (DEM) e Sistemas Críticos de Defesa Civil.

