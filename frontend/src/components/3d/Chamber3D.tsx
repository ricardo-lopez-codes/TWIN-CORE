import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Gauge, Wind, ShieldCheck, Flame } from 'lucide-react';

interface Chamber3DProps {
  pressure: number; // kPa
  pumpState: string;
  valveState: string;
  stage: string;
  height?: string;
  className?: string;
}

export const Chamber3D: React.FC<Chamber3DProps> = ({
  pressure = 70.0,
  pumpState = 'OFF',
  valveState = 'CLOSED',
  stage = 'NORMAL',
  height = '380px',
  className = ''
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const valveStemRef = useRef<THREE.Mesh | null>(null);
  const gaugeNeedleRef = useRef<THREE.Mesh | null>(null);
  const particlesRef = useRef<THREE.Points | null>(null);

  useEffect(() => {
    if (!mountRef.current) return;
    const container = mountRef.current;
    const width = container.clientWidth;
    const heightPx = container.clientHeight;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, width / heightPx, 0.1, 100);
    camera.position.set(0, 2.5, 6.5);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, heightPx);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxDistance = 12;
    controls.minDistance = 3.5;
    controls.target.set(0, 1.2, 0);

    // Lighting
    const ambient = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambient);

    const dir = new THREE.DirectionalLight(0x38bdf8, 1.4);
    dir.position.set(5, 8, 5);
    scene.add(dir);

    const interiorLight = new THREE.PointLight(0x0284c7, 1.5, 4);
    interiorLight.position.set(0, 1.2, 0);
    scene.add(interiorLight);

    // Chamber Materials
    const steelMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.25,
      metalness: 0.85
    });

    const quartzGlassMat = new THREE.MeshPhysicalMaterial({
      color: 0xbae6fd,
      roughness: 0.05,
      transmission: 0.85,
      transparent: true,
      opacity: 0.35,
      ior: 1.52,
      thickness: 0.4
    });

    const brassMat = new THREE.MeshStandardMaterial({
      color: 0xd97706,
      roughness: 0.3,
      metalness: 0.9
    });

    // 1. Horizontal Cylindrical Chamber Body
    const chamberGroup = new THREE.Group();
    chamberGroup.position.set(0, 1.2, 0);

    // Main Cylinder (cut open front viewport)
    const cylinderGeo = new THREE.CylinderGeometry(1.6, 1.6, 3.8, 32, 1, true, 0.5, Math.PI * 1.8);
    const cylinder = new THREE.Mesh(cylinderGeo, steelMat);
    cylinder.rotation.z = Math.PI / 2;
    cylinder.castShadow = true;
    chamberGroup.add(cylinder);

    // Quartz Sight Window on front
    const windowGeo = new THREE.CylinderGeometry(1.58, 1.58, 2.6, 24, 1, true, -Math.PI * 0.4, Math.PI * 0.8);
    const quartzWindow = new THREE.Mesh(windowGeo, quartzGlassMat);
    quartzWindow.rotation.z = Math.PI / 2;
    chamberGroup.add(quartzWindow);

    // Heavy End Flanges (Left & Right)
    for (let side = -1; side <= 1; side += 2) {
      const flangeGeo = new THREE.CylinderGeometry(1.85, 1.85, 0.25, 24);
      const flange = new THREE.Mesh(flangeGeo, steelMat);
      flange.rotation.z = Math.PI / 2;
      flange.position.x = side * 1.95;
      chamberGroup.add(flange);

      // Flange Bolt studs
      for (let b = 0; b < 12; b++) {
        const ang = (b / 12) * Math.PI * 2;
        const boltGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.12, 8);
        const bolt = new THREE.Mesh(boltGeo, brassMat);
        bolt.rotation.z = Math.PI / 2;
        bolt.position.set(side * 2.1, Math.cos(ang) * 1.72, Math.sin(ang) * 1.72);
        chamberGroup.add(bolt);
      }
    }

    // Chamber Support Legs
    for (let side = -1; side <= 1; side += 2) {
      const legGeo = new THREE.BoxGeometry(0.2, 1.2, 2.2);
      const leg = new THREE.Mesh(legGeo, steelMat);
      leg.position.set(side * 1.3, -0.6, 0);
      leg.castShadow = true;
      chamberGroup.add(leg);
    }

    // Internal Specimen Test Stage (Unit 1 inside)
    const stageGeo = new THREE.BoxGeometry(2.0, 0.1, 1.4);
    const stageMesh = new THREE.Mesh(stageGeo, new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5 }));
    stageMesh.position.set(0, -0.6, 0);
    chamberGroup.add(stageMesh);

    // Miniature Unit 1 Prototype on Stage
    const unitMockGeo = new THREE.BoxGeometry(1.0, 0.35, 0.8);
    const unitMock = new THREE.Mesh(unitMockGeo, new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.5 }));
    unitMock.position.set(0, -0.38, 0);
    chamberGroup.add(unitMock);

    // 2. Top-Mounted Analog Vacuum Dial Gauge
    const gaugeStemGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.5, 12);
    const gaugeStem = new THREE.Mesh(gaugeStemGeo, brassMat);
    gaugeStem.position.set(0, 1.85, 0);
    chamberGroup.add(gaugeStem);

    const gaugeBodyGeo = new THREE.CylinderGeometry(0.45, 0.45, 0.18, 24);
    const gaugeBody = new THREE.Mesh(gaugeBodyGeo, steelMat);
    gaugeBody.rotation.x = Math.PI / 2;
    gaugeBody.position.set(0, 2.3, 0);
    chamberGroup.add(gaugeBody);

    const gaugeDialGeo = new THREE.CircleGeometry(0.4, 24);
    const gaugeDial = new THREE.Mesh(gaugeDialGeo, new THREE.MeshBasicMaterial({ color: 0xf8fafc }));
    gaugeDial.position.set(0, 2.3, 0.1);
    chamberGroup.add(gaugeDial);

    // Needle
    const needleGeo = new THREE.BoxGeometry(0.03, 0.35, 0.02);
    const needle = new THREE.Mesh(needleGeo, new THREE.MeshBasicMaterial({ color: 0xdc2626 }));
    needle.position.set(0, 2.3 + 0.12, 0.12);
    chamberGroup.add(needle);
    gaugeNeedleRef.current = needle;

    // 3. Right Vent Solenoid Valve
    const valveGroup = new THREE.Group();
    valveGroup.position.set(1.95, 0.8, 0);

    const valveBodyGeo = new THREE.BoxGeometry(0.4, 0.5, 0.4);
    const valveBody = new THREE.Mesh(valveBodyGeo, brassMat);
    valveGroup.add(valveBody);

    const valveStem = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.6, 12), steelMat);
    valveStem.position.y = 0.35;
    valveGroup.add(valveStem);
    valveStemRef.current = valveStem;
    chamberGroup.add(valveGroup);

    // 4. Chamber Air Molecules Particle Cloud
    const particleCount = 140;
    const particleGeo = new THREE.BufferGeometry();
    const particlePos = new Float32Array(particleCount * 3);
    for (let p = 0; p < particleCount; p++) {
      particlePos[p * 3] = (Math.random() - 0.5) * 2.8;
      particlePos[p * 3 + 1] = -0.4 + Math.random() * 1.5;
      particlePos[p * 3 + 2] = (Math.random() - 0.5) * 2.2;
    }
    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePos, 3));
    const particleMat = new THREE.PointsMaterial({
      color: 0x38bdf8,
      size: 0.06,
      transparent: true,
      opacity: 0.6
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    chamberGroup.add(particles);
    particlesRef.current = particles;

    scene.add(chamberGroup);

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

    let animId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      const time = clock.getElapsedTime();

      controls.update();

      // Animate needle based on pressure (70 kPa down to 40 kPa)
      if (gaugeNeedleRef.current) {
        // Map 40-75 kPa to needle angle (-1.8 to 1.8 rad)
        const norm = Math.min(Math.max((pressure - 40) / 35, 0), 1);
        const targetAngle = -1.5 + norm * 3.0;
        gaugeNeedleRef.current.rotation.z = -targetAngle;
      }

      // Animate Solenoid valve stem if open
      if (valveStemRef.current) {
        const isOpen = valveState.includes('OPEN');
        valveStemRef.current.position.y += ((isOpen ? 0.55 : 0.35) - valveStemRef.current.position.y) * 0.15;
      }

      // Rarify particles with pressure
      if (particlesRef.current) {
        const mat = particlesRef.current.material as THREE.PointsMaterial;
        mat.opacity = Math.max(0.15, (pressure / 75) * 0.7);
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
    <div className={`relative bg-gradient-to-b from-slate-900 to-slate-950 rounded-2xl overflow-hidden border border-slate-800 shadow-xl ${className}`}>
      <div ref={mountRef} style={{ height }} className="w-full cursor-grab active:cursor-grabbing" />

      {/* Top Overlay Badge */}
      <div className="absolute top-4 left-4 flex flex-col gap-1 text-xs font-mono">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
          <span className="text-white font-bold uppercase tracking-wider text-[11px]">
            Hypobaric Test Chamber • 3D Simulation
          </span>
        </div>
        <div className="text-[11px] text-slate-400">
          Chamber Pressure: <strong className="text-cyan-300">{pressure.toFixed(1)} kPa</strong>
        </div>
      </div>

      {/* Actuator Status Chips */}
      <div className="absolute bottom-3 left-3 right-3 flex flex-wrap items-center justify-between gap-2 text-[10px] sm:text-[11px] font-mono bg-slate-900/90 backdrop-blur-md p-2 rounded-xl border border-slate-800">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 uppercase font-semibold">PUMP:</span>
            <span className={`px-2 py-0.5 rounded font-bold ${pumpState === 'ACTIVE' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' : 'bg-slate-800 text-slate-400'}`}>
              {pumpState}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 uppercase font-semibold">VALVE:</span>
            <span className={`px-2 py-0.5 rounded font-bold ${valveState.includes('OPEN') ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'bg-slate-800 text-slate-400'}`}>
              {valveState}
            </span>
          </div>
        </div>
        <div className="text-slate-400 hidden sm:block">
          Interactive Viewport
        </div>
      </div>
    </div>
  );
};
