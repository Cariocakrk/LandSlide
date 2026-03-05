import { useTerrainStore } from '@/store/terrainStore';
import { CloudRain, Sun, Cloud, CloudLightning, Wind, Droplets, ThermometerSnowflake, ThermometerSun } from 'lucide-react';
import { useMemo } from 'react';

// WMO Weather interpretation codes (Open-Meteo)
const getWeatherVisuals = (code: number, isDay: boolean = true) => {
  if (code === 0) return { icon: Sun, text: "Céu Limpo", color: "text-yellow-400" };
  if (code === 1 || code === 2 || code === 3) return { icon: Cloud, text: "Parcialmente Nublado", color: "text-gray-300" };
  if (code === 45 || code === 48) return { icon: Cloud, text: "Neblina", color: "text-gray-400" };
  if (code === 51 || code === 53 || code === 55 || code === 56 || code === 57) return { icon: CloudRain, text: "Chuvisco", color: "text-blue-300" };
  if (code >= 61 && code <= 67) return { icon: CloudRain, text: "Chuva", color: "text-blue-500" };
  if (code >= 71 && code <= 77) return { icon: ThermometerSnowflake, text: "Neve", color: "text-white" };
  if (code >= 80 && code <= 82) return { icon: CloudRain, text: "Pancadas de Chuva", color: "text-indigo-400" };
  if (code >= 95 && code <= 99) return { icon: CloudLightning, text: "Tempestade", color: "text-yellow-500" };
  
  return { icon: Cloud, text: "Desconhecido", color: "text-gray-400" };
};

export default function WeatherWidget() {
  const { weatherData, location } = useTerrainStore();

  const current = weatherData?.current;

  // Render nothing if we don't have weather data yet
  if (!current) return null;

  const { icon: WeatherIcon, text, color } = getWeatherVisuals(current.weatherCode);

  return (
    <div className="absolute top-6 right-6 z-50 animate-in slide-in-from-right-8 duration-700 fade-in">
      <div className="bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl p-5 shadow-2xl flex flex-col gap-4 min-w-[280px]">
        {/* Header - Location & Condition */}
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-white font-bold text-lg leading-tight truncate max-w-[180px]" title={location || 'Local'}>
              {location || 'Local Selecionado'}
            </h3>
            <p className="text-gray-400 text-sm mt-0.5">{text}</p>
          </div>
          <div className={`p-2 bg-white/5 rounded-xl ${color}`}>
            <WeatherIcon className="w-8 h-8" />
          </div>
        </div>

        {/* Main Temperature */}
        <div className="flex items-center gap-2">
          <span className="text-4xl font-extrabold text-white tracking-tighter">
            {current.temperature}<span className="text-2xl text-gray-400 font-medium">°C</span>
          </span>
        </div>

        {/* Mini Stats Grid */}
        <div className="grid grid-cols-2 gap-3 pt-3 border-t border-white/10 mt-1">
          <div className="flex items-center gap-2 text-sm">
            <CloudRain className="w-4 h-4 text-blue-400" />
            <div className="flex flex-col">
              <span className="text-gray-400 text-xs">Precipitação</span>
              <span className="text-white font-semibold">{current.rain ?? 0} <span className="text-gray-500 text-[10px]">mm</span></span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Wind className="w-4 h-4 text-emerald-400" />
            <div className="flex flex-col">
              <span className="text-gray-400 text-xs">Vento</span>
              <span className="text-white font-semibold">{current.windSpeed ?? 0} <span className="text-gray-500 text-[10px]">km/h</span></span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
