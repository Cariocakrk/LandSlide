# GeoShield Monitor — Painel de Controle (Frontend)

Este é o painel de visualização e monitoramento em tempo real do sistema GeoShield Monitor, desenvolvido em Next.js (React) e Tailwind CSS.

## 🛠️ Tecnologias Utilizadas

- **Next.js 16 (App Router):** Roteamento moderno de páginas.
- **React 19:** Biblioteca principal para renderização de interfaces.
- **React Three Fiber & Drei (Three.js):** Para renderização acelerada por hardware do terreno topográfico 3D das encostas.
- **Zustand:** Gerenciamento de estado global de sensores, relevo e autenticação.
- **Recharts:** Gráficos interativos para telemetria em tempo real.
- **Framer Motion:** Animações fluidas de transição e modais.
- **Tailwind CSS 4:** Estilização de componentes e layouts.

## 🚀 Execução em Desenvolvimento

1. Crie o arquivo `.env` copiando de `.env.example` para configurar a URL do backend:
   ```env
   NEXT_PUBLIC_API_URL="http://localhost:3001"
   ```
2. Instale as dependências:
   ```bash
   npm install
   ```
3. Inicialize o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```
4. Acesse em seu navegador: **http://localhost:3000**

## 📂 Organização das Páginas

- `/app/page.tsx` — Página inicial de apresentação e atalhos rápidos.
- `/app/dashboard/page.tsx` — Dashboard geral de telemetria das encostas.
- `/app/gerar-terreno/page.tsx` — Formulário de geocodificação por CEP/Endereço, estimativa de declividade e exibição 3D do terreno.
- `/app/mapa-3d/page.tsx` — Visualizador 3D do relevo e sensores IoT ativos.
- `/app/simulacao/page.tsx` — Console de simulação de cenários climáticos/estruturais de caos.
- `/app/defesa-civil/page.tsx` — Console da Defesa Civil contendo a lista de chamados ativos e disparos de alertas no WhatsApp.
- `/app/historico/page.tsx` — Log de telemetria paginado com gráficos de tendência histórica.

## 📡 Cliente API Centralizado (`frontend/lib/api.ts`)

Todas as chamadas REST utilizam o cliente `apiFetch` que:
- Resolve dinamicamente a URL a partir de `NEXT_PUBLIC_API_URL`.
- Injeta automaticamente o cabeçalho `Authorization: Bearer <token>` de forma transparente para requisições que necessitam de privilégios de operador.
- Adiciona o cabeçalho `Content-Type: application/json` quando apropriado.
