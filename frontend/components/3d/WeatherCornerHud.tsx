"use client";

import { useEffect, useState } from 'react';
import {
  CloudRain,
  CloudLightning,
  CloudDrizzle,
  Cloud,
  Sun,
  Wind,
  Droplets,
  RefreshCw,
  MapPin,
  Umbrella,
  Gauge
} from 'lucide-react';
import { useTerrainStore } from '@/store/terrainStore';

interface WeatherCornerHudProps {
  className?: string;
  compact?: boolean;
}

export function WeatherCornerHud({ className = '', compact = false }: WeatherCornerHudProps) {
  const {
    location,
    latitude,
    longitude,
    temperature,
    apparentTemperature,
    windSpeed,
    cloudCover,
    weatherCondition,
    weatherSeverity,
    isRainingNow,
    currentRainIntensity,
    accumulatedRain24h,
    rainVolume,
    forecastRain24h,
    humidity,
    soilSaturationPercent,
    cemadenThreshold,
    lastWeatherUpdate,
    fetchAndApplyWeather,
    updateAllSensors
  } = useTerrainStore();

  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!lastWeatherUpdate) {
      fetchAndApplyWeather();
    }
  }, [lastWeatherUpdate, fetchAndApplyWeather]);

  const handleManualRefresh = async () => {
    setRefreshing(true);
    await fetchAndApplyWeather();
    setTimeout(() => setRefreshing(false), 600);
  };

  const handleToggleRainSimulation = () => {
    if (isRainingNow && currentRainIntensity >= 15) {
      // Voltar ao clima real do CEP
      fetchAndApplyWeather();
    } else {
      // Ativar chuva expressiva no relevo 3D e painel
      useTerrainStore.setState({
        isRainingNow: true,
        currentRainIntensity: 24.5,
        accumulatedRain24h: 68.0,
        rainVolume: 118.0,
        soilSaturationPercent: 86,
        humidity: 94,
        cloudCover: 98,
        weatherCondition: 'Chuva Torrencial na Serra',
        weatherSeverity: 'storm',
        cemadenThreshold: 'Alerta Máximo (>100mm/72h)'
      });
      updateAllSensors({
        rainVolume: 118,
        soilMoisture: 86,
        vibration: 3.2
      });
    }
  };

  const renderWeatherIcon = () => {
    if (weatherSeverity === 'storm') {
      return <CloudLightning className="w-6 h-6 text-[#B91C1C]" />;
    }
    if (weatherSeverity === 'rain' || isRainingNow) {
      return <CloudRain className="w-6 h-6 text-[#3B82F6]" />;
    }
    if (weatherSeverity === 'drizzle') {
      return <CloudDrizzle className="w-6 h-6 text-[#3B82F6]" />;
    }
    if (weatherSeverity === 'cloudy') {
      return <Cloud className="w-6 h-6 text-[var(--foreground-muted)]" />;
    }
    return <Sun className="w-6 h-6 text-[#B47B1C]" />;
  };

  const hasActiveRain = isRainingNow || currentRainIntensity > 0;

  const rainBadgeColor = hasActiveRain
    ? currentRainIntensity >= 15
      ? 'bg-[#B91C1C]/15 text-[#B91C1C] border-[#B91C1C]/35'
      : 'bg-[#3B82F6]/15 text-[#3B82F6] border-[#3B82F6]/35'
    : 'bg-[#2E6F40]/12 text-[#2E6F40] dark:text-[#52B788] border-[#2E6F40]/25';

  const rainStatusLabel = hasActiveRain
    ? currentRainIntensity >= 15
      ? 'Chuva Forte'
      : currentRainIntensity >= 2
      ? 'Chovendo'
      : 'Chuva Leve'
    : 'Sem Chuva';

  return (
    <div
      className={`relative overflow-hidden theme-card backdrop-blur-xl rounded-2xl p-4 font-sans select-none w-[310px] sm:w-[340px] ${className}`}
    >
      {/* Efeito Visual Sutil de Chuva no Fundo do Card Meteorológico (apenas quando está chovendo) */}
      {hasActiveRain && (
        <svg
          viewBox="0 0 340 260"
          fill="none"
          className="pointer-events-none absolute inset-0 w-full h-full object-cover z-0 opacity-45"
        >
          <defs>
            <linearGradient id="rainStreakGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#60A5FA" stopOpacity="0" />
              <stop offset="100%" stopColor="#60A5FA" stopOpacity="0.35" />
            </linearGradient>
          </defs>
          <g stroke="url(#rainStreakGrad)" strokeWidth="1" strokeLinecap="round">
            <line x1="45" y1="5" x2="28" y2="55" />
            <line x1="115" y1="15" x2="98" y2="68" />
            <line x1="195" y1="8" x2="178" y2="58" />
            <line x1="275" y1="18" x2="258" y2="70" />
            <line x1="85" y1="95" x2="68" y2="145" />
            <line x1="230" y1="100" x2="213" y2="150" />
          </g>
        </svg>
      )}

      <div className="relative z-10">
        {/* Cabeçalho da Estação Meteorológica Local */}
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-2.5 mb-3">
          <div className="min-w-0 pr-2">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[var(--primary)]">
              <span className="w-2 h-2 rounded-full bg-[var(--primary)] inline-block shrink-0" />
              <span>Clima Atual no Local (CEP)</span>
            </div>
            <div className="text-xs font-bold text-[var(--foreground)] truncate mt-0.5 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-[var(--primary)] shrink-0" />
              <span className="truncate">{location || 'Petrópolis - RJ (CEP 25680-195)'}</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleToggleRainSimulation}
              title="Intensificar / Alternar chuva no Mapa 3D"
              className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer active:scale-95 flex items-center gap-1 ${
                isRainingNow && currentRainIntensity >= 15
                  ? 'bg-[#3B82F6] text-white border-[#3B82F6]'
                  : 'theme-card-muted text-[var(--foreground)] hover:border-[#3B82F6]'
              }`}
            >
              <CloudRain className="w-3 h-3" />
              <span>{isRainingNow && currentRainIntensity >= 15 ? 'Chuva Forte' : 'Simular Chuva'}</span>
            </button>

            <button
              type="button"
              onClick={handleManualRefresh}
              title="Atualizar meteorologia real agora"
              className="p-1.5 rounded-lg theme-card-muted hover:border-[var(--primary)] text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-all cursor-pointer shrink-0 active:scale-95"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-[var(--primary)]' : ''}`} />
            </button>
          </div>
        </div>

        {/* Bloco Principal: Temperatura + Condição + Status de Chuva */}
        <div className="flex items-center justify-between theme-card-muted rounded-xl p-3 mb-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center">
              {renderWeatherIcon()}
            </div>
            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-extrabold tracking-tight text-[var(--foreground)] font-mono">
                  {temperature.toFixed(1)}°C
                </span>
                <span className="text-[11px] text-[var(--foreground-muted)]">
                  (Sens. {apparentTemperature.toFixed(0)}°C)
                </span>
              </div>
              <div className="text-xs font-semibold text-[var(--primary)] mt-0.5">{weatherCondition}</div>
            </div>
          </div>

          <div className="text-right">
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border ${rainBadgeColor}`}
            >
              {hasActiveRain ? <Umbrella className="w-3 h-3" /> : <Sun className="w-3 h-3" />}
              {rainStatusLabel}
            </span>
            <div className="text-[10px] text-[var(--foreground-muted)] font-mono mt-1">
              {latitude ? `${latitude.toFixed(3)}°, ${longitude?.toFixed(3)}°` : '-22.505°, -43.178°'}
            </div>
          </div>
        </div>

        {/* Grade Detalhada de Pluviometria e Umidade */}
        <div className="grid grid-cols-2 gap-2 text-xs mb-3">
          <div className="theme-card-muted rounded-xl p-2.5">
            <div className="text-[10px] text-[var(--foreground-muted)] font-medium flex items-center justify-between">
              <span>Chuva Agora (1h)</span>
              <CloudRain className="w-3.5 h-3.5 text-[#3B82F6]" />
            </div>
            <div className="text-sm font-bold font-mono text-[var(--foreground)] mt-0.5">
              {currentRainIntensity.toFixed(1)} <span className="text-[10px] font-normal text-[var(--foreground-muted)]">mm/h</span>
            </div>
            <div className="text-[10px] text-[var(--primary)] font-medium">
              24h: {accumulatedRain24h.toFixed(1)} mm
            </div>
          </div>

          <div className="theme-card-muted rounded-xl p-2.5">
            <div className="text-[10px] text-[var(--foreground-muted)] font-medium flex items-center justify-between">
              <span>Acumulado 72h</span>
              <Gauge className="w-3.5 h-3.5 text-[var(--primary)]" />
            </div>
            <div
              className={`text-sm font-bold font-mono mt-0.5 ${
                rainVolume >= 100 ? 'text-[#B91C1C]' : rainVolume >= 60 ? 'text-[#C85A17]' : 'text-[var(--foreground)]'
              }`}
            >
              {rainVolume.toFixed(1)} <span className="text-[10px] font-normal text-[var(--foreground-muted)]">mm</span>
            </div>
            <div className="text-[10px] text-[var(--foreground-muted)]">
              Próx. 24h: +{forecastRain24h.toFixed(1)} mm
            </div>
          </div>

          {!compact && (
            <>
              <div className="theme-card-muted rounded-xl p-2.5">
                <div className="text-[10px] text-[var(--foreground-muted)] font-medium flex items-center justify-between">
                  <span>Ar &amp; Solo</span>
                  <Droplets className="w-3.5 h-3.5 text-[#2E6F40] dark:text-[#52B788]" />
                </div>
                <div className="text-xs font-bold text-[var(--foreground)] mt-0.5">
                  Ar: <span className="text-[#2E6F40] dark:text-[#52B788]">{humidity}%</span> | Solo:{' '}
                  <span className="text-[var(--primary)]">{soilSaturationPercent}%</span>
                </div>
                <div className="text-[10px] text-[var(--foreground-muted)]">Umidade volumétrica</div>
              </div>

              <div className="theme-card-muted rounded-xl p-2.5">
                <div className="text-[10px] text-[var(--foreground-muted)] font-medium flex items-center justify-between">
                  <span>Vento &amp; Nuvens</span>
                  <Wind className="w-3.5 h-3.5 text-[#B47B1C]" />
                </div>
                <div className="text-xs font-bold font-mono text-[var(--foreground)] mt-0.5">
                  {windSpeed.toFixed(1)} km/h
                </div>
                <div className="text-[10px] text-[var(--foreground-muted)]">Nebulosidade: {cloudCover}%</div>
              </div>
            </>
          )}
        </div>

        {/* Rodapé Status CEMADEN */}
        <div className="theme-card-muted rounded-xl px-3 py-2 flex items-center justify-between gap-2 text-[11px]">
          <div className="truncate">
            <span className="text-[var(--foreground-muted)] font-medium mr-1">CEMADEN:</span>
            <strong
              className={
                rainVolume >= 100
                  ? 'text-[#B91C1C]'
                  : rainVolume >= 60
                  ? 'text-[#C85A17]'
                  : rainVolume >= 30
                  ? 'text-[#B47B1C]'
                  : 'text-[#2E6F40] dark:text-[#52B788]'
              }
            >
              {cemadenThreshold}
            </strong>
          </div>
          {lastWeatherUpdate && (
            <span className="text-[10px] font-mono text-[var(--foreground-muted)] shrink-0">{lastWeatherUpdate}</span>
          )}
        </div>
      </div>
    </div>
  );
}
