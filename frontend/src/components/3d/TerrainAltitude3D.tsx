import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Mountain, ArrowUpRight, ShieldAlert, Wind, Compass } from 'lucide-react';

interface TerrainAltitude3DProps {
  pressureKpa: number;
  temperatureC: number;
  height?: string;
  className?: string;
}

export const TerrainAltitude3D: React.FC<TerrainAltitude3DProps> = ({
  pressureKpa = 65.0,
  temperatureC = -10.0,
  height = '420px',
  className = ''
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const beaconRef = useRef<THREE.Group | null>(null);
  const targetBeaconY = useRef<number>(3.5);

  // Barometric formula: altitude in meters ASL
  const calculatedAltitudeM = Math.max(
    0,
    Math.round(44330 * (1 - Math.pow(Math.max(pressureKpa, 20) / 101.325, 0.190284)))
  );
  const calculatedAltitudeFt = Math.round(calculatedAltitudeM * 3.28084);
  const relativeDensityPct = Math.round((pressureKpa / 101.325) * 100);

  // Map 0 - 6,000m altitude to 3D Y coordinates (0.2 to 5.8)
  useEffect(() => {
    const norm = Math.min(Math.max(calculatedAltitudeM / 6000, 0), 1.0);
    targetBeaconY.current = 0.2 + norm * 5.6;
  }, [calculatedAltitudeM]);

  useEffect(() => {
    if (!mountRef.current) return;
    const container = mountRef.current;
    const width = container.clientWidth;
    const heightPx = container.clientHeight;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, width / heightPx, 0.1, 100);
    camera.position.set(7.5, 5.0, 7.5);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, heightPx);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxDistance = 18;
    controls.minDistance = 3;
    controls.maxPolarAngle = Math.PI / 2 + 0.05;
    controls.target.set(0, 2.5, 0);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0x38bdf8, 1.2);
    dirLight.position.set(5, 10, 5);
    scene.add(dirLight);

    const rimLight = new THREE.DirectionalLight(0x818cf8, 0.8);
    rimLight.position.set(-6, 3, -6);
    scene.add(rimLight);

    // 1. Procedural Mountain Terrain Wireframe (Ladakh Himalayan Profile)
    const terrainGeo = new THREE.PlaneGeometry(10, 10, 28, 28);
    const posAttr = terrainGeo.attributes.position as THREE.BufferAttribute;

    for (let i = 0; i < posAttr.count; i++) {
      const vx = posAttr.getX(i);
      const vy = posAttr.getY(i);
      // Generate stylized rugged Himalayan peak topography
      const distFromCenter = Math.sqrt(vx * vx + vy * vy);
      let elevation = Math.sin(vx * 0.8) * Math.cos(vy * 0.8) * 1.5;
      elevation += Math.sin(vx * 1.6 + vy * 1.2) * 0.6;
      elevation += (5 - distFromCenter) * 0.45;
      elevation = Math.max(elevation, 0);
      posAttr.setZ(i, elevation);
    }
    terrainGeo.computeVertexNormals();

    const terrainMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      wireframe: true,
      roughness: 0.8
    });
    const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
    terrainMesh.rotation.x = -Math.PI / 2;
    terrainMesh.position.y = 0;
    scene.add(terrainMesh);

    // Solid terrain base for depth
    const solidTerrainMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.9,
      transparent: true,
      opacity: 0.85
    });
    const solidTerrainMesh = new THREE.Mesh(terrainGeo, solidTerrainMat);
    solidTerrainMesh.rotation.x = -Math.PI / 2;
    solidTerrainMesh.position.y = -0.02;
    scene.add(solidTerrainMesh);

    // 2. Altitude Reference Isobar Ring Planes
    const altitudeLevels = [
      { name: 'Leh Valley (3,500m)', y: 3.5, color: 0x38bdf8, kpa: '65.8 kPa' },
      { name: 'Siachen Base (4,200m)', y: 4.2, color: 0xf59e0b, kpa: '61.2 kPa' },
      { name: 'Chang La Pass (5,360m)', y: 5.36, color: 0xef4444, kpa: '52.2 kPa' }
    ];

    altitudeLevels.forEach(level => {
      // Horizontal contour ring
      const ringGeo = new THREE.RingGeometry(3.8, 3.86, 48);
      const ringMat = new THREE.MeshBasicMaterial({
        color: level.color,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.7
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = level.y;
      scene.add(ring);

      // Radial grid line
      const lineGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-4.0, level.y, 0),
        new THREE.Vector3(4.0, level.y, 0)
      ]);
      const lineMat = new THREE.LineDashedMaterial({
        color: level.color,
        dashSize: 0.2,
        gapSize: 0.1,
        transparent: true,
        opacity: 0.4
      });
      const line = new THREE.Line(lineGeo, lineMat);
      line.computeLineDistances();
      scene.add(line);
    });

    // 3. Central Vertical Altitude Axis Column
    const columnGeo = new THREE.CylinderGeometry(0.04, 0.04, 6.2, 16);
    const columnMat = new THREE.MeshBasicMaterial({ color: 0x64748b, transparent: true, opacity: 0.6 });
    const column = new THREE.Mesh(columnGeo, columnMat);
    column.position.y = 3.1;
    scene.add(column);

    // 4. Live High-Altitude Device Beacon Group (Floats along altitude axis)
    const beaconGroup = new THREE.Group();
    beaconGroup.position.set(0, targetBeaconY.current, 0);

    // Glowing core sphere
    const sphereGeo = new THREE.SphereGeometry(0.22, 16, 16);
    const sphereMat = new THREE.MeshStandardMaterial({
      color: 0x00f0ff,
      emissive: 0x00d4e6,
      emissiveIntensity: 0.8,
      roughness: 0.1
    });
    const sphere = new THREE.Mesh(sphereGeo, sphereMat);
    beaconGroup.add(sphere);

    // Outer pulsing ring
    const beaconRingGeo = new THREE.TorusGeometry(0.42, 0.03, 12, 32);
    const beaconRingMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.8 });
    const beaconRing = new THREE.Mesh(beaconRingGeo, beaconRingMat);
    beaconRing.rotation.x = Math.PI / 2;
    beaconGroup.add(beaconRing);

    // Point light on beacon
    const beaconLight = new THREE.PointLight(0x00f0ff, 1.2, 4.0);
    beaconGroup.add(beaconLight);

    scene.add(beaconGroup);
    beaconRef.current = beaconGroup;

    // Atmospheric particles representing air density
    const particleCount = 180;
    const particleGeo = new THREE.BufferGeometry();
    const particlePos = new Float32Array(particleCount * 3);
    for (let p = 0; p < particleCount; p++) {
      particlePos[p * 3] = (Math.random() - 0.5) * 8;
      particlePos[p * 3 + 1] = Math.random() * 6.0;
      particlePos[p * 3 + 2] = (Math.random() - 0.5) * 8;
    }
    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePos, 3));
    const particleMat = new THREE.PointsMaterial({
      color: 0x93c5fd,
      size: 0.05,
      transparent: true,
      opacity: 0.4
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    // Resize observer
    const resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        const { width: newWidth, height: newHeight } = entry.contentRect;
        if (newWidth > 0 && newHeight > 0) {
          camera.aspect = newWidth / newHeight;
          camera.updateProjectionMatrix();
          renderer.setSize(newWidth, newHeight);
        }
      }
    });
    resizeObserver.observe(container);

    // Animation Loop
    let animId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      const time = clock.getElapsedTime();

      controls.update();

      // Smooth beacon vertical lerp
      if (beaconRef.current) {
        beaconRef.current.position.y += (targetBeaconY.current - beaconRef.current.position.y) * 0.08;
        beaconRing.rotation.z += delta * 1.5;
        // Floating hover bobbing
        sphere.position.y = Math.sin(time * 3.0) * 0.05;
      }

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      resizeObserver.disconnect();
      cancelAnimationFrame(animId);
      controls.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div className={`relative bg-gradient-to-b from-slate-950 to-slate-900 rounded-2xl overflow-hidden border border-slate-800 shadow-xl ${className}`}>
      <div ref={mountRef} style={{ height }} className="w-full cursor-grab active:cursor-grabbing" />

      {/* Top Left Altitude Telemetry Box */}
      <div className="absolute top-4 left-4 p-3 bg-slate-900/90 backdrop-blur-md rounded-xl border border-slate-800 text-xs font-mono shadow-xl space-y-1">
        <div className="flex items-center gap-2 text-cyan-400 font-bold uppercase tracking-wider text-[11px]">
          <Mountain className="w-3.5 h-3.5" />
          <span>Ladakh Altitude & Air Lapse Model</span>
        </div>
        <div className="text-xl font-bold text-white font-sans flex items-baseline gap-1.5">
          <span>{calculatedAltitudeM.toLocaleString()}</span>
          <span className="text-xs text-slate-400 font-mono font-normal">m ASL</span>
          <span className="text-xs text-cyan-400 font-mono font-normal">({calculatedAltitudeFt.toLocaleString()} ft)</span>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-slate-400 pt-1 border-t border-slate-800">
          <span>Baro: <strong className="text-slate-200">{pressureKpa.toFixed(1)} kPa</strong></span>
          <span>•</span>
          <span>Air Density: <strong className="text-cyan-300">{relativeDensityPct}% std</strong></span>
        </div>
      </div>

      {/* Bottom Altitude Legend */}
      <div className="absolute bottom-3 left-3 right-3 flex flex-wrap items-center justify-between gap-2 text-[10px] sm:text-[11px] font-mono bg-slate-900/90 backdrop-blur-md p-2 rounded-xl border border-slate-800 text-slate-300">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-cyan-400 inline-block shrink-0" />
            <span>Leh (3,500m)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400 inline-block shrink-0" />
            <span>Siachen (4,200m)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-500 inline-block shrink-0" />
            <span>Chang La (5,360m)</span>
          </div>
        </div>
        <div className="text-slate-500 hidden sm:block">
          Drag: Orbit • Scroll: Zoom
        </div>
      </div>
    </div>
  );
};
