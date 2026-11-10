import Link from 'next/link';
import { 
  ArrowRight, Mountain, CloudRain, Cpu, 
  MapPin, CheckCircle2, AlertOctagon, Smartphone, 
  Activity, FileCheck, ShieldCheck
} from 'lucide-react';

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen relative bg-[var(--background)] text-[var(--foreground)] font-sans overflow-x-hidden">
      {/* Plano de Fundo Artístico de Montanhas & Curvas Topográficas (Visão Geral) */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[720px] overflow-hidden z-0 select-none">
        {/* Brilho solar suave inspirado no sol da logo LandSlide */}
        <div
          className="absolute top-10 left-1/2 -translate-x-1/2 w-[540px] h-[540px] rounded-full blur-[120px] opacity-20"
          style={{ background: 'radial-gradient(circle, var(--primary) 0%, transparent 70%)' }}
        />

        {/* Silhueta de Montanhas em Camadas + Curvas de Nível Topográficas */}
        <svg
          viewBox="0 0 1440 640"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="xMidYMax slice"
          className="w-full h-full object-cover"
        >
          {/* Curvas de nível topográficas no céu */}
          <g stroke="var(--mountain-stroke)" strokeOpacity="0.7" strokeWidth="1.2" strokeDasharray="6 6">
            <path d="M-100 170 Q 360 85, 760 180 T 1540 135" />
            <path d="M-100 225 Q 420 125, 820 225 T 1540 185" />
            <path d="M-100 280 Q 460 175, 880 270 T 1540 235" />
          </g>

          {/* Cordilheira Distante (Camada 1) */}
          <path
            d="M0 445 L180 315 L360 400 L590 255 L810 385 L1060 240 L1280 360 L1440 285 L1440 640 L0 640 Z"
            fill="var(--mountain-1)"
          />

          {/* Encosta Intermediária (Camada 2) */}
          <path
            d="M0 490 L250 365 L480 445 L750 310 L990 435 L1220 330 L1440 410 L1440 640 L0 640 Z"
            fill="var(--mountain-2)"
          />

          {/* Estratos Geológicos / Talude Frontal (Camada 3) */}
          <path
            d="M0 535 L320 420 L620 500 L930 385 L1190 485 L1440 425 L1440 640 L0 640 Z"
            fill="var(--mountain-3)"
          />

          {/* Linhas de crista iluminadas em destaque */}
          <path
            d="M0 445 L180 315 L360 400 L590 255 L810 385 L1060 240 L1280 360 L1440 285"
            stroke="var(--mountain-stroke)"
            strokeWidth="1.8"
          />
          <path
            d="M0 490 L250 365 L480 445 L750 310 L990 435 L1220 330 L1440 410"
            stroke="var(--mountain-stroke)"
            strokeWidth="2.2"
          />
          <path
            d="M0 535 L320 420 L620 500 L930 385 L1190 485 L1440 425"
            stroke="var(--mountain-stroke)"
            strokeWidth="2.5"
          />
        </svg>

        {/* Gradiente de fusão suave com o fundo da página */}
        <div
          className="absolute inset-x-0 bottom-0 h-48"
          style={{ background: 'linear-gradient(to top, var(--background) 12%, transparent 100%)' }}
        />
      </div>

      {/* Barra Institucional Superior */}
      <div className="w-full bg-[var(--surface)]/90 backdrop-blur-md border-b border-[var(--border)] px-6 py-3 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs text-[var(--foreground-muted)]">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="flex items-center gap-2 text-[#2E6F40] dark:text-[#52B788] font-semibold">
              <span className="w-2 h-2 rounded-full bg-[#2E6F40] dark:bg-[#52B788]" />
              Monitoramento Geotécnico Ativo
            </span>
            <span className="text-[var(--border-strong)]">•</span>
            <span>
              Altimetria por Satélite: <strong className="text-[var(--foreground)]">SRTM 30m</strong>
            </span>
            <span className="text-[var(--border-strong)] hidden sm:inline">•</span>
            <span className="hidden sm:inline">
              Modelo Físico: <strong className="text-[var(--primary)]">Mohr-Coulomb</strong>
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span>Norma Técnica: <strong className="text-[var(--foreground)]">ABNT NBR 11682</strong></span>
          </div>
        </div>
      </div>

      <main className="flex-1 px-6 md:px-12 py-12 md:py-16 max-w-6xl mx-auto w-full space-y-20 relative z-10">
        {/* Hero Section Sóbria e Profissional */}
        <header className="text-center max-w-3xl mx-auto space-y-6">
          <div className="flex flex-col items-center justify-center gap-4">
            <div className="w-24 h-24 flex items-center justify-center">
              <img
                src="/logo-landslide.png"
                alt="LandSlide Logo"
                className="w-full h-full object-contain logo-light"
              />
              <img
                src="/logo-landslide-dark.png"
                alt="LandSlide Logo"
                className="w-full h-full object-contain logo-dark"
              />
            </div>

            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[var(--primary-soft)] text-[var(--primary)] border border-[var(--primary)]/25 text-xs font-semibold">
              <ShieldCheck className="w-3.5 h-3.5" />
              Engenharia Geotécnica & Gestão de Risco de Taludes
            </div>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-[var(--foreground)] leading-[1.15]">
            Previsão e Monitoramento de{' '}
            <span className="text-[var(--primary)]">Estabilidade de Encostas</span>
          </h1>

          <p className="text-base sm:text-lg text-[var(--foreground-muted)] max-w-2xl mx-auto leading-relaxed">
            Plataforma corporativa e institucional para análise topográfica em 3D, cálculo contínuo do{' '}
            <strong className="text-[var(--foreground)] font-semibold">Fator de Segurança (FS)</strong> segundo a norma ABNT NBR 11682 e resposta preventiva a eventos pluviométricos extremos.
          </p>

          {/* Ações Principais */}
          <div className="pt-2 flex flex-wrap items-center justify-center gap-3.5">
            <Link 
              href="/dashboard" 
              className="inline-flex h-12 items-center justify-center rounded-xl theme-btn-primary px-7 text-sm font-semibold shadow-sm cursor-pointer active:scale-98 gap-2"
            >
              <Activity className="w-4 h-4" />
              <span>Abrir Painel de Controle</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link 
              href="/mapa-3d" 
              className="inline-flex h-12 items-center justify-center rounded-xl theme-btn-secondary px-6 text-sm font-semibold shadow-xs cursor-pointer active:scale-98 gap-2"
            >
              <Mountain className="w-4 h-4 text-[var(--primary)]" />
              <span>Explorar Mapa 3D</span>
            </Link>

            <Link 
              href="/gerar-terreno" 
              className="inline-flex h-12 items-center justify-center rounded-xl theme-btn-secondary px-6 text-sm font-semibold shadow-xs cursor-pointer active:scale-98 gap-2"
            >
              <MapPin className="w-4 h-4 text-[var(--primary)]" />
              <span>Consultar por CEP</span>
            </Link>
          </div>

          {/* Indicadores Resumidos */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-8 text-left">
            <div className="theme-card rounded-xl p-4">
              <span className="text-[11px] font-medium text-[var(--foreground-muted)] block">Base Topográfica</span>
              <strong className="text-base font-bold text-[var(--foreground)] block mt-0.5">SRTM 30 Metros</strong>
              <span className="text-xs text-[var(--primary)] font-medium">Cobertura nacional</span>
            </div>

            <div className="theme-card rounded-xl p-4">
              <span className="text-[11px] font-medium text-[var(--foreground-muted)] block">Equilíbrio-Limite</span>
              <strong className="text-base font-bold text-[var(--foreground)] block mt-0.5">Mohr-Coulomb</strong>
              <span className="text-xs text-[#2E6F40] dark:text-[#52B788] font-medium">ABNT NBR 11682</span>
            </div>

            <div className="theme-card rounded-xl p-4">
              <span className="text-[11px] font-medium text-[var(--foreground-muted)] block">Referência Pluviométrica</span>
              <strong className="text-base font-bold text-[var(--foreground)] block mt-0.5">100 mm / 72h</strong>
              <span className="text-xs text-[#B47B1C] font-medium">Limiar CEMADEN</span>
            </div>

            <div className="theme-card rounded-xl p-4">
              <span className="text-[11px] font-medium text-[var(--foreground-muted)] block">Documentação</span>
              <strong className="text-base font-bold text-[var(--foreground)] block mt-0.5">Laudo Pericial PDF</strong>
              <span className="text-xs text-[var(--foreground-muted)]">Hash SHA-256 auditável</span>
            </div>
          </div>
        </header>

        {/* Os 4 Pilares da Plataforma */}
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 border-b border-[var(--border)] pb-4">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--primary)]">
                Estrutura Técnica
              </span>
              <h2 className="text-2xl font-bold text-[var(--foreground)] tracking-tight mt-1">
                Pilares da Plataforma LandSlide
              </h2>
            </div>
            <span className="text-xs text-[var(--foreground-muted)]">
              Geotecnia Aplicada • Hidrologia • Gêmeo Digital 3D
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="theme-card rounded-2xl p-6 flex flex-col justify-between hover:border-[var(--primary)] transition-all">
              <div>
                <div className="w-10 h-10 rounded-xl bg-[var(--primary-soft)] flex items-center justify-center text-[var(--primary)] mb-4">
                  <Mountain className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-[var(--foreground)] mb-2">Modelagem Topográfica 3D</h3>
                <p className="text-xs text-[var(--foreground-muted)] leading-relaxed">
                  Reconstrução tridimensional do relevo a partir do CEP ou coordenada geográfica, com análise de declividade, curvas de nível e linhas de drenagem.
                </p>
              </div>
              <div className="pt-4 border-t border-[var(--border)] mt-5 text-[11px] font-medium text-[var(--primary)]">
                Modelo Digital de Elevação (MDE)
              </div>
            </div>

            <div className="theme-card rounded-2xl p-6 flex flex-col justify-between hover:border-[var(--primary)] transition-all">
              <div>
                <div className="w-10 h-10 rounded-xl bg-[var(--primary-soft)] flex items-center justify-center text-[var(--primary)] mb-4">
                  <Cpu className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-[var(--foreground)] mb-2">Motor de Mohr-Coulomb</h3>
                <p className="text-xs text-[var(--foreground-muted)] leading-relaxed">
                  Cálculo contínuo do Fator de Segurança (FS) por equilíbrio-limite de talude infinito, considerando coesão efetiva, atrito interno e poropressão.
                </p>
              </div>
              <div className="pt-4 border-t border-[var(--border)] mt-5 text-[11px] font-medium text-[var(--primary)]">
                Memória de Cálculo Aberta
              </div>
            </div>

            <div className="theme-card rounded-2xl p-6 flex flex-col justify-between hover:border-[var(--primary)] transition-all">
              <div>
                <div className="w-10 h-10 rounded-xl bg-[var(--primary-soft)] flex items-center justify-center text-[var(--primary)] mb-4">
                  <CloudRain className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-[var(--foreground)] mb-2">Hidrologia em Tempo Real</h3>
                <p className="text-xs text-[var(--foreground-muted)] leading-relaxed">
                  Consulta meteorológica hiperlocal por CEP com precipitação atual, chuva acumulada em 72 horas, previsão de 24 horas e saturação do solo.
                </p>
              </div>
              <div className="pt-4 border-t border-[var(--border)] mt-5 text-[11px] font-medium text-[var(--primary)]">
                Telemetria Pluviométrica 72h
              </div>
            </div>

            <div className="theme-card rounded-2xl p-6 flex flex-col justify-between hover:border-[var(--primary)] transition-all">
              <div>
                <div className="w-10 h-10 rounded-xl bg-[var(--primary-soft)] flex items-center justify-center text-[var(--primary)] mb-4">
                  <Smartphone className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-[var(--foreground)] mb-2">Operação & Laudos ABNT</h3>
                <p className="text-xs text-[var(--foreground-muted)] leading-relaxed">
                  Recebimento de vistorias de campo geolocalizadas com foto via WhatsApp e emissão de Laudo Pericial em PDF com assinatura SHA-256.
                </p>
              </div>
              <div className="pt-4 border-t border-[var(--border)] mt-5 text-[11px] font-medium text-[var(--primary)]">
                Auditoria & Resposta Rápida
              </div>
            </div>
          </div>
        </section>

        {/* Casos Históricos e Validação Técnica */}
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 border-b border-[var(--border)] pb-4">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--primary)] flex items-center gap-1.5">
                <FileCheck className="w-3.5 h-3.5" /> Validação Retrospectiva
              </span>
              <h2 className="text-2xl font-bold text-[var(--foreground)] tracking-tight mt-1">
                Estudos de Caso e Calibração Geotécnica
              </h2>
            </div>
            <span className="text-xs text-[var(--foreground-muted)]">
              Retro-análise de escorregamentos translacionais no Brasil
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Estudo 01: Petrópolis */}
            <div className="theme-card rounded-2xl p-6 sm:p-7 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-md bg-[var(--primary-soft)] text-[var(--primary)]">
                      Estudo #01
                    </span>
                    <span className="text-xs text-[var(--foreground-muted)]">Fevereiro / 2022</span>
                  </div>
                  <span className="text-xs font-mono font-semibold text-[#A92626] dark:text-[#F87171]">
                    259,8 mm em 3h
                  </span>
                </div>

                <h3 className="text-lg font-bold text-[var(--foreground)]">
                  Morro da Oficina — Petrópolis, RJ
                </h3>

                <p className="text-xs text-[var(--foreground-muted)] leading-relaxed">
                  Precipitação extrema provocou a supersaturação do manto coluvionar sobre rocha cristalina. Com declividades superiores a 38°, a elevação da poropressão reduziu a tensão efetiva e levou o Fator de Segurança abaixo de 1,00.
                </p>

                <div className="theme-card-muted rounded-xl p-3.5 space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-[var(--foreground-muted)]">Mecanismo de Ruptura:</span>
                    <strong className="text-[var(--foreground)]">Escorregamento Translacional Raso</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--foreground-muted)]">Classificação ABNT / CPRM:</span>
                    <strong className="text-[#A92626] dark:text-[#F87171]">R4 — Risco Muito Alto</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--foreground-muted)]">Detecção no Modelo:</span>
                    <strong className="text-[var(--primary)]">FS &lt; 1,00 com 4h de antecedência</strong>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-[var(--border)] mt-4 text-xs text-[var(--foreground-muted)] flex items-center justify-between">
                <span>Cenário disponível no Simulador</span>
                <span className="text-[#2E6F40] dark:text-[#52B788] font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Calibrado
                </span>
              </div>
            </div>

            {/* Estudo 02: São Sebastião */}
            <div className="theme-card rounded-2xl p-6 sm:p-7 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-md bg-[var(--primary-soft)] text-[var(--primary)]">
                      Estudo #02
                    </span>
                    <span className="text-xs text-[var(--foreground-muted)]">Fevereiro / 2023</span>
                  </div>
                  <span className="text-xs font-mono font-semibold text-[#C85A17] dark:text-[#FB923C]">
                    683,0 mm em 24h
                  </span>
                </div>

                <h3 className="text-lg font-bold text-[var(--foreground)]">
                  Serra do Mar — São Sebastião, SP
                </h3>

                <p className="text-xs text-[var(--foreground-muted)] leading-relaxed">
                  O maior volume pluviométrico em 24 horas registrado no país saturou as vertentes íngremes da Serra do Mar, provocando corridas de detritos e interdição total da rodovia SP-055 (Rio-Santos).
                </p>

                <div className="theme-card-muted rounded-xl p-3.5 space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-[var(--foreground-muted)]">Mecanismo de Ruptura:</span>
                    <strong className="text-[var(--foreground)]">Corrida de Detritos (Debris Flow)</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--foreground-muted)]">Classificação ABNT / CPRM:</span>
                    <strong className="text-[#A92626] dark:text-[#F87171]">R4 — Colapso de Talude</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--foreground-muted)]">Detecção no Modelo:</span>
                    <strong className="text-[var(--primary)]">Limiar 100mm superado na 1ª hora</strong>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-[var(--border)] mt-4 text-xs text-[var(--foreground-muted)] flex items-center justify-between">
                <span>Cenário disponível no Simulador</span>
                <span className="text-[#2E6F40] dark:text-[#52B788] font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Calibrado
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Chamada para Ação Final */}
        <section className="theme-card rounded-3xl p-8 md:p-12 text-center bg-[var(--surface-muted)]/60">
          <div className="max-w-2xl mx-auto space-y-4">
            <span className="px-3 py-1 rounded-full bg-[var(--primary-soft)] text-[var(--primary)] text-xs font-semibold inline-block">
              Diagnóstico Topográfico Imediato
            </span>

            <h2 className="text-2xl md:text-3xl font-bold text-[var(--foreground)] tracking-tight">
              Monitore Qualquer Talude ou Encosta por CEP
            </h2>

            <p className="text-sm text-[var(--foreground-muted)] leading-relaxed">
              Informe um CEP ou endereço para reconstruir a malha topográfica 3D, consultar a chuva acumulada na coordenada e calcular o Fator de Segurança.
            </p>

            <div className="pt-3 flex flex-wrap items-center justify-center gap-3.5">
              <Link
                href="/gerar-terreno"
                className="px-7 py-3 rounded-xl theme-btn-primary font-semibold text-xs shadow-sm cursor-pointer active:scale-98 flex items-center gap-2"
              >
                <MapPin className="w-4 h-4" />
                Consultar CEP Agora
              </Link>
              <Link
                href="/simulacao"
                className="px-7 py-3 rounded-xl theme-btn-secondary font-semibold text-xs cursor-pointer active:scale-98"
              >
                Abrir Simulador Mohr-Coulomb
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Rodapé Institucional */}
      <footer className="w-full border-t border-[var(--border)] bg-[var(--surface)] py-6 px-6 mt-12">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[var(--foreground-muted)]">
          <div className="flex items-center gap-2.5">
            <img src="/logo-landslide.png" alt="LandSlide" className="w-6 h-6 object-contain logo-light" />
            <img src="/logo-landslide-dark.png" alt="LandSlide" className="w-6 h-6 object-contain logo-dark" />
            <span className="font-bold text-[var(--foreground)]">LandSlide Monitor</span>
            <span>•</span>
            <span>Engenharia Geotécnica e Monitoramento de Encostas</span>
          </div>

          <div className="flex items-center gap-3">
            <span>ABNT NBR 11682</span>
            <span>•</span>
            <span>CEMADEN</span>
            <span>•</span>
            <span>CPRM / IPT</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
