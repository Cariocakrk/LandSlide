import { ShieldAlert, ArrowRight, History } from 'lucide-react';
import Link from 'next/link';

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen relative">
      {/* Background gradients */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 bg-[#050505]">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-600/10 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-orange-600/10 blur-[120px]" />
      </div>

      <main className="flex-1 p-8 md:p-12 max-w-6xl mx-auto w-full z-10 pt-20">
        <header className="mb-16 text-center animate-in fade-in slide-in-from-bottom-8 duration-1000">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 mb-6 border border-blue-500/20 text-sm font-medium">
            <ShieldAlert className="w-4 h-4" />
            TCC Engenharia e Computação
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 text-white drop-shadow-md">
            Monitoramento Preventivo de <br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-600">Deslizamentos</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Plataforma IoT de análise de solo e risco baseada em dados em tempo real. Identificação preditiva para a Defesa Civil.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link href="/dashboard" className="relative group inline-flex h-12 items-center justify-center rounded-md bg-blue-600 px-8 text-sm font-medium text-white shadow transition-colors hover:bg-blue-700">
              Acessar Painel Central
              <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link href="/mapa-3d" className="inline-flex h-12 items-center justify-center rounded-md border border-white/10 bg-white/5 backdrop-blur-md px-8 text-sm font-medium text-white shadow-sm transition-colors hover:bg-white/10">
              Ver Mapa 3D
            </Link>
          </div>
        </header>

        <section className="grid md:grid-cols-2 gap-8 mb-16 animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-150 fill-mode-both">
          <div className="rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl p-8 shadow-2xl relative overflow-hidden group hover:border-white/20 transition-colors">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl -mr-16 -mt-16 transition-opacity group-hover:opacity-100 opacity-50" />
            <h2 className="text-2xl font-bold mb-4 text-white flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-blue-400" /> Justificativa do Projeto
            </h2>
            <p className="text-gray-400 leading-relaxed mb-4 text-sm md:text-base">
              Os deslizamentos de terra configuram um dos desastres naturais de maior impacto socioeconômico no Brasil. O crescimento urbano desordenado em encostas e as fortes chuvas de verão saturam o solo, levando ao colapso estrutural do terreno.
            </p>
            <p className="text-gray-400 leading-relaxed text-sm md:text-base">
              O desenvolvimento deste <strong>sistema inteligente com sensores IoT</strong> visa oferecer uma resposta preditiva e ágil. Detectando umidade, inclinação e vibração com antecedência, é possível enviar alertas antecipados, evacuando áreas de risco e salvando centenas de vidas.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl p-8 shadow-2xl relative overflow-hidden group hover:border-white/20 transition-colors">
            <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full blur-3xl -mr-16 -mt-16 transition-opacity group-hover:opacity-100 opacity-50" />
            <h2 className="text-2xl font-bold mb-6 text-white flex items-center gap-2">
              <History className="w-5 h-5 text-orange-400" /> Casos Históricos Notáveis
            </h2>
            <div className="space-y-6">
              <div className="border-l-2 border-red-500/50 pl-4 relative hover:border-red-500 transition-colors">
                <div className="absolute w-3 h-3 bg-red-500 rounded-full -left-[7px] top-1.5 ring-4 ring-black" />
                <h3 className="font-bold text-white text-lg">Petrópolis, RJ (2022)</h3>
                <p className="text-sm text-gray-400 mt-1">Acúmulo excepcional de chuva cursou em deslizamentos generalizados, destruindo infraestrutura e resultando em tragédia de proporções imensas e irreparáveis.</p>
              </div>
              <div className="border-l-2 border-orange-500/50 pl-4 relative hover:border-orange-500 transition-colors">
                <div className="absolute w-3 h-3 bg-orange-500 rounded-full -left-[7px] top-1.5 ring-4 ring-black" />
                <h3 className="font-bold text-white text-lg">São Sebastião, SP (2023)</h3>
                <p className="text-sm text-gray-400 mt-1">O maior volume de chuva já registrado no país em 24h gerou deslizamentos de encostas sob rodovias e soterramentos fatais no litoral paulista.</p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
