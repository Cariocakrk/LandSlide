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
  Thermometer,
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
    fetchAndApplyWeather
  } = useTerrainStore();

  const [refreshing, setRefreshing] = useState(false);

  // Busca inicial automática caso ainda não tenha atualizado
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

  const renderWeatherIcon = () => {
    if (weatherSeverity === 'storm') {
      return <CloudLightning className="w-7 h-7 text-red-400 animate-pulse" />;
    }
    if (weatherSeverity === 'rain' || isRainingNow) {
      return <CloudRain className="w-7 h-7 text-cyan-400 animate-bounce" />;
    }
    if (weatherSeverity === 'drizzle') {
      return <CloudDrizzle className="w-7 h-7 text-blue-300" />;
    }
    if (weatherSeverity === 'cloudy') {
      return <Cloud className="w-7 h-7 text-slate-300" />;
    }
    return <Sun className="w-7 h-7 text-amber-400" />;
  };

  const rainBadgeColor = isRainingNow
    ? currentRainIntensity >= 15
      ? 'bg-red-500/20 text-red-300 border-red-500/40 shadow-[0_0_12px_rgba(239,68,68,0.3)]'
      : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-[0_0_12px_rgba(6,182,212,0.3)]'
    : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';

  return (
    <div
      className={`bg-slate-950/88 backdrop-blur-2xl border border-white/15 rounded-2xl p-4 shadow-[0_15px_40px_rgba(0,0,0,0.85)] text-white font-sans select-none w-[310px] sm:w-[340px] ${className}`}
    >
      {/* Cabeçalho da Estação Meteorológica Local */}
      <div className="flex items-center justify-between border-b border-white/10 pb-2.5 mb-3">
        <div className="min-w-0 pr-2">
          <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest text-cyan-400 font-bold">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping inline-block shrink-0" />
            <span>CLIMA ATUAL NO LOCAL (CEP)</span>
          </div>
          <div className="text-xs font-bold text-gray-200 truncate mt-0.5 flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span className="truncate">{location || 'Petrópolis - RJ (CEP 25680-195)'}</span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleManualRefresh}
          title="Atualizar meteorologia agora"
          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white transition-all cursor-pointer shrink-0 active:scale-95"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-cyan-400' : ''}`} />
        </button>
      </div>

      {/* Bloco Principal: Temperatura + Condição + Status de Chuva */}
      <div className="flex items-center justify-between bg-white/[0.03] border border-white/10 rounded-xl p-3 mb-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-slate-900/90 border border-white/10 flex items-center justify-center">
            {renderWeatherIcon()}
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black tracking-tight text-white font-mono">
                {temperature.toFixed(1)}°C
              </span>
              <span className="text-[10px] text-gray-400 font-mono">
                (Sens. {apparentTemperature.toFixed(0)}°C)
              </span>
            </div>
            <div className="text-xs font-bold text-cyan-200 mt-0.5">{weatherCondition}</div>
          </div>
        </div>

        <div className="text-right">
          <span
            className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[9px] font-mono font-black uppercase tracking-wider border ${rainBadgeColor}`}
          >
            <Umbrella className="w-2.5 h-2.5" />
            {isRainingNow ? 'CHOVENDO' : 'SEM CHUVA'}
          </span>
          <div className="text-[9px] text-gray-500 font-mono mt-1">
            {latitude ? `${latitude.toFixed(3)}°, ${longitude?.toFixed(3)}°` : '-22.505°, -43.178°'}
          </div>
        </div>
      </div>

      {/* Grade Detalhada de Pluviometria e Umidade */}
      <div className="grid grid-cols-2 gap-2 text-[11px] font-mono mb-3">
        <div className="bg-black/40 border border-white/5 rounded-xl p-2.5">
          <div className="text-[9px] text-gray-400 uppercase flex items-center justify-between">
            <span>Chuva Agora (1h)</span>
            <CloudRain className="w-3 h-3 text-cyan-400" />
          </div>
          <div className="text-sm font-black text-white mt-0.5">
            {currentRainIntensity.toFixed(1)} <span className="text-[10px] font-normal text-gray-400">mm/h</span>
          </div>
          <div className="text-[9px] text-cyan-400/90">
            24h: {accumulatedRain24h.toFixed(1)} mm
          </div>
        </div>

        <div className="bg-black/40 border border-white/5 rounded-xl p-2.5">
          <div className="text-[9px] text-gray-400 uppercase flex items-center justify-between">
            <span>Acumulado 72h</span>
            <Gauge className="w-3 h-3 text-blue-400" />
          </div>
          <div
            className={`text-sm font-black mt-0.5 ${
              rainVolume >= 100 ? 'text-red-400' : rainVolume >= 60 ? 'text-orange-400' : 'text-blue-400'
            }`}
          >
            {rainVolume.toFixed(1)} <span className="text-[10px] font-normal text-gray-400">mm</span>
          </div>
          <div className="text-[9px] text-gray-400">
            Próx. 24h: +{forecastRain24h.toFixed(1)} mm
          </div>
        </div>

        {!compact && (
          <>
            <div className="bg-black/40 border border-white/5 rounded-xl p-2.5">
              <div className="text-[9px] text-gray-400 uppercase flex items-center justify-between">
                <span>Ar & Solo</span>
                <Droplets className="w-3 h-3 text-emerald-400" />
              </div>
              <div className="text-xs font-bold text-white mt-0.5">
                Ar: <span className="text-emerald-400">{humidity}%</span> | Solo:{' '}
                <span className="text-cyan-300">{soilSaturationPercent}%</span>
              </div>
              <div className="text-[9px] text-gray-500">Poropressão ativa</div>
            </div>

            <div className="bg-black/40 border border-white/5 rounded-xl p-2.5">
              <div className="text-[9px] text-gray-400 uppercase flex items-center justify-between">
                <span>Vento & Nuvens</span>
                <Wind className="w-3 h-3 text-amber-400" />
              </div>
              <div className="text-xs font-bold text-white mt-0.5">
                {windSpeed.toFixed(1)} km/h
              </div>
              <div className="text-[9px] text-gray-500">Nebulosidade: {cloudCover}%</div>
            </div>
          </>
        )}
      </div>

      {/* Rodapé Status CEMADEN */}
      <div className="bg-slate-900/90 border border-white/10 rounded-xl px-3 py-2 flex items-center justify-between gap-2 text-[10px] font-mono">
        <div className="truncate">
          <span className="text-gray-500 uppercase mr-1">CEMADEN:</span>
          <strong
            className={
              rainVolume >= 100
                ? 'text-red-400'
                : rainVolume >= 60
                ? 'text-orange-400'
                : rainVolume >= 30
                ? 'text-yellow-400'
                : 'text-emerald-400'
            }
          >
            {cemadenThreshold}
          </strong>
        </div>
        {lastWeatherUpdate && (
          <span className="text-[9px] text-gray-500 shrink-0">{lastWeatherUpdate}</span>
        )}
      </div>
    </div>
  );
}
