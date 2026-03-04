"use client";

import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, Html } from '@react-three/drei';
import { useRef, useEffect, useState, useMemo } from 'react';
import * as THREE from 'three';
import { socket } from '@/lib/socket';
import { Map, AlertTriangle, MapPin } from 'lucide-react';
import { useTerrainStore } from '@/store/terrainStore';
import { TerrainMesh } from '@/components/3d/TerrainMesh';

function Terrain({ riskColor }: { riskColor: string }) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(30, 30, 64, 64);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const y = Math.sin(x * 0.5) * Math.cos(z * 0.5) * 2 + Math.sin(x * 0.1 + z * 0.2) * 4;
      pos.setY(i, y);
    }
    geo.computeVertexNormals();
    return geo;
  }, []);

  const [currentColor] = useState(new THREE.Color('#1f2937'));
  const targetColor = new THREE.Color(riskColor);
  
  useFrame((state, delta) => {
    if (meshRef.current) {
      const material = meshRef.current.material as THREE.MeshStandardMaterial;
      currentColor.lerp(targetColor, delta * 2);
      material.color.copy(currentColor);
    }
  });

  return (
    <mesh ref={meshRef} geometry={geometry} receiveShadow castShadow>
      <meshStandardMaterial color={currentColor} roughness={0.8} metalness={0.2} wireframe={true} />
    </mesh>
  );
}

function Rain({ isRaining }: { isRaining: boolean }) {
  const particlesRef = useRef<THREE.Points>(null);
  const count = 2000;
  
  const [positions, velocities] = useMemo(() => {
    const p = new Float32Array(count * 3);
    const v = new Float32Array(count);
    for(let i=0; i<count; i++){
      p[i*3] = (Math.random() - 0.5) * 30;
      p[i*3+1] = Math.random() * 20;
      p[i*3+2] = (Math.random() - 0.5) * 30;
      v[i] = 0.1 + Math.random() * 0.3;
    }
    return [p, v];
  }, []);

  useFrame(() => {
    if(!isRaining) return;
    if(particlesRef.current) {
      const positionsAttr = particlesRef.current.geometry.attributes.position;
      for(let i=0; i<count; i++){
        let y = positionsAttr.getY(i);
        y -= velocities[i];
        if(y < -5) y = 20;
        positionsAttr.setY(i, y);
      }
      positionsAttr.needsUpdate = true;
    }
  });

  if(!isRaining) return null;

  return (
    <points ref={particlesRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.05} color="#60a5fa" transparent opacity={0.6} />
    </points>
  );
}

function SensorNode({ sensor }: { sensor: any }) {
  const [hovered, setHovered] = useState(false);

  return (
    <Html position={[sensor.position.x, sensor.position.y + 1, sensor.position.z]} center className="pointer-events-none">
       <div className={`transition-all duration-300 ${hovered ? 'scale-100 opacity-100' : 'scale-75 opacity-0'}`}>
         <div className="bg-black/80 backdrop-blur-md text-white p-3 rounded-xl border border-white/20 shadow-2xl min-w-[150px]">
            <div className="font-bold border-b border-white/20 pb-1 mb-2 text-sm flex items-center gap-1">
              <AlertTriangle className="w-3 h-3 text-blue-400" /> {sensor.id}
            </div>
            <div className="text-xs space-y-1">
              <div>Risco Local: {sensor.localRisk}/100</div>
              <div>Umidade: {sensor.soilMoisture.toFixed(0)}%</div>
              <div>Inclinação: {sensor.terrainInclination.toFixed(0)}°</div>
              <div>Vibração: {sensor.vibration.toFixed(0)} Hz</div>
            </div>
         </div>
       </div>
    </Html>
  );
}

function PointLight({ color }: { color: string }) {
  const lightRef = useRef<THREE.PointLight>(null);
  const targetColor = new THREE.Color(color);
  
  useFrame((state, delta) => {
    if (lightRef.current) {
      lightRef.current.color.lerp(targetColor, delta * 2);
    }
  });

  return <pointLight ref={lightRef} position={[0, -2, 0]} intensity={500} distance={50} />;
}

export default function Mapa3D() {
  const { location, elevationMatrix, minElevation, maxElevation, globalRisk, sensors } = useTerrainStore();
  const [colorHex, setColorHex] = useState('#1f2937');
  const [isRaining, setIsRaining] = useState(false);

  useEffect(() => {
    // Dynamic Global Risk Color
    if (globalRisk > 70) setColorHex("#9b2c2c");
    else if (globalRisk > 40) setColorHex("#f97316");
    else if (globalRisk > 15) setColorHex("#eab308");
    else setColorHex("#10b981");

    // Dynamic Rain System
    const hasRain = sensors.some(s => s.rainVolume > 30);
    setIsRaining(hasRain);
  }, [globalRisk, sensors]);

  return (
    <div className="flex flex-col h-full w-full relative bg-black">
      <div className="absolute top-6 left-6 z-10 bg-black/60 backdrop-blur-xl border border-white/10 p-5 rounded-2xl shadow-2xl max-w-sm animate-in slide-in-from-left duration-700">
        <h1 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
          <Map className="w-5 h-5 text-blue-400" /> Visão Topográfica
        </h1>
        {location ? (
           <div className="flex items-center gap-2 text-emerald-400 text-xs mb-4 uppercase tracking-widest font-bold">
               <MapPin className="w-4 h-4" /> {location}
           </div>
        ) : (
           <p className="text-sm text-yellow-500/80 mb-4 bg-yellow-500/10 p-2 rounded border border-yellow-500/20">
             Terreno procedural padrão rodando. Para visualizar o relevo real da sua cidade e habilitar os sensores, gere o mapa na aba de Topografia.
           </p>
        )}
        
        <div className="flex items-center justify-between gap-3 bg-white/5 p-3 rounded-lg border border-white/10">
          <div className="flex gap-3">
             <div className="w-4 h-4 rounded-full shadow-inner ring-2 ring-black flex-shrink-0 transition-colors duration-1000 mt-1" style={{ backgroundColor: colorHex }} />
             <div>
               <div className="text-xs text-gray-400 uppercase font-semibold">Risco Geral</div>
               <div className="text-lg font-black text-white">{globalRisk}/100</div>
             </div>
          </div>
          <div>
             <div className="text-xs text-gray-400 uppercase font-semibold text-right">Sensores</div>
             <div className="text-lg font-black text-blue-400 text-right">{sensors.length}</div>
          </div>
        </div>
      </div>

      <Canvas shadows camera={{ position: [15, 15, 15], fov: 50 }}>
        <color attach="background" args={['#050505']} />
        <ambientLight intensity={0.1} />
        <directionalLight castShadow position={[10, 20, 10]} intensity={2.5} shadow-mapSize={[2048, 2048]} />
        <PointLight color={colorHex} />
        
        {elevationMatrix ? (
            <TerrainMesh matrix={elevationMatrix} minElevation={minElevation} maxElevation={maxElevation} autoRotate={true} />
        ) : (
            <Terrain riskColor={colorHex} />
        )}

        <Rain isRaining={isRaining} />
        
        {/* Render Floating Info Tooltips for each sensor */}
        {sensors.map(s => (
           <SensorNode key={s.id} sensor={s} />
        ))}

        <OrbitControls autoRotate autoRotateSpeed={0.3} maxPolarAngle={Math.PI / 2 - 0.1} minDistance={10} maxDistance={40} />
      </Canvas>
    </div>
  );
}
