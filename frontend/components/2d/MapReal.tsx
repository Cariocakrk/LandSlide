"use client";

import { MapContainer, TileLayer, Popup, CircleMarker, Polyline } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { useTerrainStore, Sensor } from "@/store/terrainStore";
import L from "leaflet";

// Corrigir problema do Leaflet com SSR de \u00edcones
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

// Approximated conversion from local 10x10 ThreeJS coordinates back to degrees
function convertTerrainToLatLng(
  localX: number,
  localZ: number,
  centerLat: number,
  centerLon: number,
  gridWidth: number
) {
  const scale = gridWidth / 1600; 

  const lonRatio = localX / scale;
  const latRatio = -localZ / scale; 

  const lat = centerLat + (latRatio / 111000);
  const lon = centerLon + (lonRatio / (111000 * Math.cos(centerLat * (Math.PI / 180))));

  return { lat, lon };
}

const getRiskColor = (risk: number) => {
  if (risk > 70) return "#ef4444"; // Red
  if (risk > 40) return "#f97316"; // Orange
  if (risk > 15) return "#eab308"; // Yellow
  return "#10b981";                // Green
};

export default function MapReal() {
  const { latitude, longitude, sensors, activeModule, waterways, floodSensors } = useTerrainStore();

  const centerLat = latitude !== null ? latitude : -22.304;
  const centerLng = longitude !== null ? longitude : -43.195;

  return (
    <MapContainer
      center={[centerLat, centerLng]}
      zoom={16}
      style={{ height: "100%", width: "100%", borderRadius: "0.75rem" }}
      attributionControl={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
        url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
      />

      {activeModule === 'landslide' ? (
         sensors.map((sensor: Sensor) => {
          const { lat, lon } = convertTerrainToLatLng(sensor.position.x, sensor.position.z, centerLat, centerLng, 10);
          const color = getRiskColor(sensor.localRisk);
  
          return (
            <CircleMarker
              key={sensor.id}
              center={[lat, lon]}
              radius={8}
              pathOptions={{
                color: color,
                fillColor: color,
                fillOpacity: 0.8,
                weight: 2
              }}
            >
              <Popup className="sensor-popup">
                 <div className="font-sans">
                   <strong className="text-gray-800 text-sm border-b pb-1 block mb-2">{sensor.id}</strong>
                   <div className="text-xs text-gray-600 space-y-1">
                     <p><span className="font-semibold text-gray-800">Risco Local:</span> <span style={{color: color, fontWeight: 'bold'}}>{sensor.localRisk}%</span></p>
                     <p><span className="font-semibold text-gray-800">Umidade:</span> {sensor.soilMoisture}%</p>
                     <p><span className="font-semibold text-gray-800">Inclinação:</span> {sensor.terrainInclination.toFixed(1)}&deg;</p>
                     <p><span className="font-semibold text-gray-800">Chuvas:</span> {sensor.rainVolume} mm</p>
                   </div>
                 </div>
              </Popup>
            </CircleMarker>
          );
        })
      ) : (
         <>
            {waterways.map((river: any) => {
               // Find color based on its local sensor
               const sensor = floodSensors.find((fs) => fs.waterwayId === river.id);
               const rwColor = sensor ? getRiskColor(sensor.localRisk) : '#10b981';

               return (
                  <Polyline 
                     key={river.id}
                     positions={river.coordinates}
                     pathOptions={{ color: rwColor, weight: 6, opacity: 0.8 }}
                  />
               )
            })}
            
            {floodSensors.map((sensor: any) => {
               const color = getRiskColor(sensor.localRisk);
               return (
                  <CircleMarker
                    key={sensor.id}
                    center={[sensor.lat, sensor.lng]}
                    radius={10}
                    pathOptions={{
                      color: '#ffffff',
                      fillColor: color,
                      fillOpacity: 0.9,
                      weight: 3
                    }}
                  >
                    <Popup className="sensor-popup">
                       <div className="font-sans">
                         <strong className="text-gray-800 text-sm border-b pb-1 block mb-2">🌊 Rio: {sensor.riverName}</strong>
                         <div className="text-xs text-gray-600 space-y-1">
                           <p><span className="font-semibold text-gray-800">Risco Enchente:</span> <span style={{color: color, fontWeight: 'bold'}}>{sensor.localRisk}%</span></p>
                           <p><span className="font-semibold text-gray-800">Distância do Centro:</span> {(sensor.distanceToCenter / 1000).toFixed(2)} km</p>
                           <p><span className="font-semibold text-gray-800">Nível Estimado:</span> {sensor.nivelAtual} m</p>
                         </div>
                       </div>
                    </Popup>
                  </CircleMarker>
               )
            })}
         </>
      )}
    </MapContainer>
  );
}
