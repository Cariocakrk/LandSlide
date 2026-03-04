"use client";

import { useEffect, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Plane, useTexture, Sphere } from '@react-three/drei';
import * as THREE from 'three';
import { useTerrainStore } from '@/store/terrainStore';

export function TerrainMesh({ matrix, minElevation, maxElevation, isCritical, autoRotate = true }: any) {
  const groupRef = useRef<THREE.Group>(null);
  const planeRef = useRef<THREE.Mesh>(null);
  const sensors = useTerrainStore(state => state.sensors);
  
  const [sensorPositions, setSensorPositions] = useState<Record<string, THREE.Vector3>>({});

  // Deformar a malha e mapear cores (Native PlaneGeometry)
  useEffect(() => {
    if (planeRef.current && matrix) {
      const geometry = planeRef.current.geometry as THREE.PlaneGeometry;
      const vertices = geometry.attributes.position.array;
      const colors = [];
      const colorInstance = new THREE.Color();
      
      const rows = matrix.length;
      const cols = matrix[0].length;
      const range = maxElevation - minElevation || 1; 

      for (let i = 0, j = 0; i < vertices.length; i += 3, j++) {
        const r = Math.floor(j / cols);
        const c = j % cols;
        
        if (r >= rows || c >= cols) {
           colors.push(0, 0, 0);
           continue; 
        }

        const elevation = matrix[r][c];

        // PlaneGeometry nativo tem vértices em X e Y, com Z = 0.
        // Queremos que Y seja a altura, então passamos o Y antigo para o Z, e aplicamos a elevação no Y.
        const originalY = vertices[i + 1];
        vertices[i + 1] = elevation * 0.05;
        vertices[i + 2] = -originalY; // Invertendo Y do plano 2D para virar o Depth no 3D
        
        // Mapeamento de cor
        const normalizedH = (elevation - minElevation) / range;
        
        if (isCritical) {
          colorInstance.setHSL(0.0, 1.0, 0.2 + (normalizedH * 0.4));
        } else if (normalizedH < 0.3) {
          colorInstance.setHSL(0.3, 0.8, 0.2 + (normalizedH * 0.2));
        } else if (normalizedH < 0.7) {
          colorInstance.setHSL(0.15, 0.8, 0.3 + (normalizedH * 0.2));
        } else {
          colorInstance.setHSL(0.0, 0.8, 0.4 + (normalizedH * 0.4));
        }
        
        colors.push(colorInstance.r, colorInstance.g, colorInstance.b);
      }
      
      geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
      geometry.computeVertexNormals();
      // OBRIGATÓRIO PARA RAYCASTER: atualizar caixas de contorno
      geometry.computeBoundingBox();
      geometry.computeBoundingSphere();
      geometry.attributes.position.needsUpdate = true;
      planeRef.current.updateMatrixWorld(true);
    }
  }, [matrix, minElevation, maxElevation, isCritical]);

  // Posicionar os sensores visualmente via Raycaster após deformação
  useEffect(() => {
    if (!planeRef.current || sensors.length === 0) return;

    // Aguardar o frame de update da geometria para o Raycaster ler a malha deformada
    setTimeout(() => {
       if (!planeRef.current) return;
       
       const raycaster = new THREE.Raycaster();
       const downDirection = new THREE.Vector3(0, -1, 0);
       const updatedPositions: Record<string, THREE.Vector3> = {};

       const sensorRadius = 0.15; // Usado no Sphere args=[0.15]
       const sensorHeight = sensorRadius * 2;

       sensors.forEach((s) => {
          // Origem local (sempre paralela à malha, independente da rotação em andamento do grupo vindo do useFrame)
          const localOrigin = new THREE.Vector3(s.position.x, 1000, s.position.y);
          const localDirection = new THREE.Vector3(0, -1, 0);

          // Raycaster requer vetores no World Space, então convertemos mantendo o rastreio
          const originWorld = planeRef.current!.localToWorld(localOrigin.clone());
          
          // O vetor direção no World Space é calculado pegando um segundo ponto abaixo dele no Local Space, e traduzindo
          // para calcularmos exatamente a flecha geométrica apontada para a malha em translação
          const pointBelowLocal = localOrigin.clone().add(localDirection);
          const pointBelowWorld = planeRef.current!.localToWorld(pointBelowLocal);
          const directionWorld = pointBelowWorld.sub(originWorld).normalize();

          raycaster.set(originWorld, directionWorld);

          const intersects = raycaster.intersectObject(planeRef.current!);

          if (intersects.length > 0) {
             const intersect = intersects[0];
             const point = intersect.point.clone(); // World space point

             // Ajuste Avançado: Usar a normal da face para apoiar perfeitamente na ladeira
             if (intersect.face) {
                 const normal = intersect.face.normal.clone();
                 normal.transformDirection(planeRef.current!.matrixWorld);
                 
                 // Adiciona a metade da altura exata projetada na normal do triângulo
                 point.add(normal.multiplyScalar(sensorHeight / 2));
             } else {
                 // Fallback vertical simples
                 point.y += (sensorHeight / 2);
             }

             // Conversão de volta para o Local Space garante que eles rotacionem junto com a Malha no Grupo Pai
             planeRef.current!.worldToLocal(point);

             updatedPositions[s.id] = point;
          }
       });

       setSensorPositions(updatedPositions);
    }, 50);

  }, [sensors, matrix]);

  useFrame(() => {
    if (groupRef.current && autoRotate) {
       groupRef.current.rotation.y -= 0.001; // Rotaciona o grupo todo (Malha + Sensores)
    }
  });

  const getSensorColor = (risk: number) => {
    if (risk > 70) return "#ef4444";
    if (risk > 40) return "#f97316";
    if (risk > 15) return "#eab308";
    return "#10b981";
  };

  return (
    <group ref={groupRef}>
      <mesh ref={planeRef}>
        <planeGeometry args={[10, 10, matrix?.length ? matrix[0].length - 1 : 63, matrix?.length ? matrix.length - 1 : 63]} />
        <meshStandardMaterial 
          vertexColors 
          wireframe={false} 
          roughness={0.8}
          metalness={0.1}
        />
      </mesh>
      
      {/* Sensores ancorados visualmente pelo Raycaster */}
      {sensors.map((s) => {
         const pos = sensorPositions[s.id];
         if (!pos) return null; // Esconde enquanto não ancorar

         return (
            <Sphere 
              key={s.id} 
              args={[0.15, 16, 16]} 
              position={[pos.x, pos.y, pos.z]}
            >
              <meshStandardMaterial 
                color={getSensorColor(s.localRisk)} 
                emissive={getSensorColor(s.localRisk)} 
                emissiveIntensity={s.localRisk > 70 ? 2 : 0.5} 
              />
            </Sphere>
         );
      })}
    </group>
  );
}
