import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
  RotateCcw,
  Eye,
  Maximize2,
  Thermometer,
  Wind,
  Layers,
  Sparkles,
  Info,
  X,
  Volume2,
  Compass,
  Cpu,
  Flame
} from 'lucide-react';

interface TwinEnclosure3DProps {
  temperature?: number; // °C
  pressure?: number; // kPa
  power?: number; // W
  voltage?: number; // V
  current?: number; // A
  fanState?: boolean;
  mosfetState?: string;
  status?: 'NORMAL' | 'WARNING' | 'CRITICAL' | 'OFFLINE';
  height?: string;
  showControls?: boolean;
  className?: string;
  compact?: boolean;
}

interface ComponentPin {
  id: string;
  name: string;
  part: string;
  pos: [number, number, number];
  description: string;
  telemetryKey: string;
  deratingInfo: string;
}

const COMPONENT_PINS: ComponentPin[] = [
  {
    id: 'esp32',
    name: 'Main Processing MCU',
    part: 'ESP32-WROOM-32U Dual-Core',
    pos: [-1.2, 0.45, 0.6],
    description: 'Main embedded controller running FreeRTOS tasks for sensor acquisition, hardware threshold watchdog, and LoRa packet framing.',
    telemetryKey: 'Core Clock: 240 MHz | Flash: 4MB SPI',
    deratingInfo: 'Operational down to -40°C. Clock drift occurs under rapid thermal shock; external TCXO recommended at extreme sub-zero.'
  },
  {
    id: 'heatsink',
    name: 'MOSFET Power Stage & Heatsink',
    part: 'IRF3205 N-Channel MOSFET + Anodized Aluminum Fins',
    pos: [1.3, 0.7, 0.3],
    description: 'High-current solid-state load switch controlled via PWM. Dissipates switching losses through vertical cooling fins.',
    telemetryKey: 'Thermal Resistance: θja = 62°C/W (derated at altitude)',
    deratingInfo: 'Thin air at 55 kPa reduces convective heat transfer by ~38%, causing junction temperatures to rise substantially higher for the same electrical wattage.'
  },
  {
    id: 'fan',
    name: 'Active Cooling Blower',
    part: '4010 Brushless DC Ball-Bearing Fan',
    pos: [1.3, 0.6, -1.6],
    description: 'Forces high-velocity airflow through enclosure grilles and directly across the MOSFET heatsink.',
    telemetryKey: 'Nominal Speed: 5,500 RPM @ 12V DC',
    deratingInfo: 'Fan mass airflow drops linearly with air density (ρ_rel). At 4,500m ASL, fan cooling effectiveness drops to ~58% of sea-level performance.'
  },
  {
    id: 'bmp280',
    name: 'Atmospheric Barometric & Temp Sensor',
    part: 'Bosch BMP280 Environmental Sensor',
    pos: [-1.4, 0.35, -0.8],
    description: 'High-precision MEMS barometric pressure and ambient temperature sensor communicating over I2C bus.',
    telemetryKey: 'Range: 30–110 kPa | Resolution: 0.16 Pa',
    deratingInfo: 'Calibrated factory baseline. Crucial for calculating local relative air density and Paschen dielectric breakdown clearance.'
  },
  {
    id: 'lora',
    name: 'Long-Range RF Subsystem',
    part: 'SX1278 433/868 MHz Transceiver + SMA Whip Antenna',
    pos: [-2.1, 1.2, -1.5],
    description: 'Chirp Spread Spectrum (CSS) telemetry link transmitting real-time sensor packets from Unit 1 to Unit 2 gateway.',
    telemetryKey: 'Output Power: +20 dBm (100mW) | SF: 7 | BW: 125kHz',
    deratingInfo: 'Sub-zero temperatures shift crystal oscillator resonance slightly; AFC (Auto Frequency Correction) must remain enabled.'
  },
  {
    id: 'battery',
    name: 'Cold-Climate Energy Buffer',
    part: 'LiFePO4 High-Altitude Pack (12.8V 3.2Ah)',
    pos: [0.0, 0.5, 1.5],
    description: 'Wide-temperature auxiliary power reserve with integrated PTC thermal heating film.',
    telemetryKey: 'Chemistry: Lithium Iron Phosphate | Cutoff: 10.0V',
    deratingInfo: 'Internal impedance (ESR) increases up to 300% at -20°C, precipitating severe transient voltage sag under high pulse loads.'
  }
];

export const TwinEnclosure3D: React.FC<TwinEnclosure3DProps> = ({
  temperature = 25.0,
  pressure = 70.0,
  power = 6.0,
  voltage = 12.0,
  current = 0.5,
  fanState = false,
  mosfetState = 'ACTIVE',
  status = 'NORMAL',
  height = '500px',
  showControls = true,
  className = '',
  compact = false
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Dynamic mesh references for animations
  const fanRotorRef = useRef<THREE.Group | null>(null);
  const heatsinkMatRef = useRef<THREE.MeshStandardMaterial | null>(null);
  const pcbMatRef = useRef<THREE.MeshStandardMaterial | null>(null);
  const particlesRef = useRef<THREE.Points | null>(null);
  const lidGroupRef = useRef<THREE.Group | null>(null);
  const ledPowerLightRef = useRef<THREE.PointLight | null>(null);
  const ledAlertLightRef = useRef<THREE.PointLight | null>(null);
  const ledLoraLightRef = useRef<THREE.PointLight | null>(null);

  // Interactive UI state
  const [activePin, setActivePin] = useState<ComponentPin | null>(null);
  const [exploded, setExploded] = useState(false);
  const [thermalIRMode, setThermalIRMode] = useState(false);
  const [particlesActive, setParticlesActive] = useState(true);
  const [autoRotate, setAutoRotate] = useState(false);
  const [viewPreset, setViewPreset] = useState<string>('iso');

  // Exploded lerp target
  const targetLidY = useRef(0);

  useEffect(() => {
    targetLidY.current = exploded ? 2.8 : 0;
  }, [exploded]);

  useEffect(() => {
    if (!mountRef.current) return;
    const container = mountRef.current;
    const width = container.clientWidth;
    const heightPx = container.clientHeight;

    // 1. Scene setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // 2. Camera setup
    const camera = new THREE.PerspectiveCamera(40, width / heightPx, 0.1, 100);
    camera.position.set(5.5, 4.5, 6.2);
    cameraRef.current = camera;

    // 3. Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(width, heightPx);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 4. Controls setup
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.maxDistance = 14;
    controls.minDistance = 2.5;
    controls.maxPolarAngle = Math.PI / 2 + 0.1; // prevent camera going under floor
    controlsRef.current = controls;

    // 5. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight1.position.set(6, 10, 5);
    dirLight1.castShadow = true;
    dirLight1.shadow.mapSize.width = 1024;
    dirLight1.shadow.mapSize.height = 1024;
    dirLight1.shadow.camera.near = 0.5;
    dirLight1.shadow.camera.far = 25;
    dirLight1.shadow.bias = -0.0005;
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x93c5fd, 0.5); // cool rim light
    dirLight2.position.set(-6, 4, -5);
    scene.add(dirLight2);

    // Dynamic LED Point Lights
    const ledPower = new THREE.PointLight(0x10b981, 0.8, 2.5); // Emerald Green
    ledPower.position.set(-1.8, 0.45, 1.8);
    scene.add(ledPower);
    ledPowerLightRef.current = ledPower;

    const ledAlert = new THREE.PointLight(0xef4444, 0, 3.5); // Red Alert Light
    ledAlert.position.set(-1.5, 0.45, 1.8);
    scene.add(ledAlert);
    ledAlertLightRef.current = ledAlert;

    const ledLora = new THREE.PointLight(0x3b82f6, 0.9, 2.5); // LoRa Cyan/Blue Pulse
    ledLora.position.set(-2.0, 0.6, -1.2);
    scene.add(ledLora);
    ledLoraLightRef.current = ledLora;

    // 6. Enclosure Floor Shadow Plane
    const floorGeo = new THREE.PlaneGeometry(16, 16);
    const floorMat = new THREE.ShadowMaterial({ opacity: 0.12 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.01;
    floor.receiveShadow = true;
    scene.add(floor);

    // Decorative Ground Circular Grid
    const gridHelper = new THREE.PolarGridHelper(5.5, 16, 8, 32, 0x94a3b8, 0xe2e8f0);
    gridHelper.position.y = 0.001;
    scene.add(gridHelper);

    // ----------------------------------------------------
    // BUILD 3D UNIT 1 MODEL HIERARCHY
    // ----------------------------------------------------
    const unit1Root = new THREE.Group();
    scene.add(unit1Root);

    // Materials
    const chassisMat = new THREE.MeshStandardMaterial({
      color: 0x242d3d,
      roughness: 0.28,
      metalness: 0.75,
      envMapIntensity: 1.0
    });

    const brushedAlumMat = new THREE.MeshStandardMaterial({
      color: 0xd1d5db,
      roughness: 0.35,
      metalness: 0.85
    });

    const acrylicLidMat = new THREE.MeshPhysicalMaterial({
      color: 0x93c5fd,
      roughness: 0.1,
      metalness: 0.1,
      transmission: 0.75,
      transparent: true,
      opacity: 0.6,
      ior: 1.49,
      thickness: 0.3
    });

    const pcbMat = new THREE.MeshStandardMaterial({
      color: 0x0f2b23, // Deep aerospace green
      roughness: 0.45,
      metalness: 0.2
    });
    pcbMatRef.current = pcbMat;

    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      roughness: 0.2,
      metalness: 0.95
    });

    const heatsinkMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      roughness: 0.3,
      metalness: 0.85,
      emissive: new THREE.Color(0x000000)
    });
    heatsinkMatRef.current = heatsinkMat;

    // A. Aluminum Chassis Tub (Bottom & 4 Walls)
    const baseWidth = 4.8;
    const baseDepth = 4.2;
    const baseHeight = 1.0;

    // Base plate
    const baseGeo = new THREE.BoxGeometry(baseWidth, 0.12, baseDepth);
    const baseMesh = new THREE.Mesh(baseGeo, chassisMat);
    baseMesh.position.y = 0.06;
    baseMesh.castShadow = true;
    baseMesh.receiveShadow = true;
    unit1Root.add(baseMesh);

    // 4 Walls
    const wallThickness = 0.14;
    // Front & Back
    const fbWallGeo = new THREE.BoxGeometry(baseWidth, baseHeight, wallThickness);
    const fWall = new THREE.Mesh(fbWallGeo, chassisMat);
    fWall.position.set(0, baseHeight / 2 + 0.12, baseDepth / 2 - wallThickness / 2);
    fWall.castShadow = true;
    unit1Root.add(fWall);

    const bWall = new THREE.Mesh(fbWallGeo, chassisMat);
    bWall.position.set(0, baseHeight / 2 + 0.12, -baseDepth / 2 + wallThickness / 2);
    bWall.castShadow = true;
    unit1Root.add(bWall);

    // Left & Right
    const lrWallGeo = new THREE.BoxGeometry(wallThickness, baseHeight, baseDepth - wallThickness * 2);
    const lWall = new THREE.Mesh(lrWallGeo, chassisMat);
    lWall.position.set(-baseWidth / 2 + wallThickness / 2, baseHeight / 2 + 0.12, 0);
    lWall.castShadow = true;
    unit1Root.add(lWall);

    const rWall = new THREE.Mesh(lrWallGeo, chassisMat);
    rWall.position.set(baseWidth / 2 - wallThickness / 2, baseHeight / 2 + 0.12, 0);
    rWall.castShadow = true;
    unit1Root.add(rWall);

    // Chassis Mounting Tabs / Ears (4 corners)
    const earGeo = new THREE.BoxGeometry(0.5, 0.08, 0.4);
    const earPositions: [number, number, number][] = [
      [-baseWidth / 2 - 0.25, 0.04, baseDepth / 2 - 0.3],
      [-baseWidth / 2 - 0.25, 0.04, -baseDepth / 2 + 0.3],
      [baseWidth / 2 + 0.25, 0.04, baseDepth / 2 - 0.3],
      [baseWidth / 2 + 0.25, 0.04, -baseDepth / 2 + 0.3]
    ];
    earPositions.forEach(pos => {
      const ear = new THREE.Mesh(earGeo, brushedAlumMat);
      ear.position.set(...pos);
      ear.castShadow = true;
      unit1Root.add(ear);
    });

    // Ventilation Grille Slits on Right Wall (Air Exhaust)
    for (let i = 0; i < 7; i++) {
      const slitGeo = new THREE.BoxGeometry(0.16, 0.45, 0.07);
      const slit = new THREE.Mesh(slitGeo, new THREE.MeshBasicMaterial({ color: 0x0f172a }));
      slit.position.set(baseWidth / 2 - 0.02, 0.65, -1.2 + i * 0.18);
      unit1Root.add(slit);
    }

    // B. Motherboard PCB
    const pcbGeo = new THREE.BoxGeometry(baseWidth - 0.4, 0.06, baseDepth - 0.4);
    const pcb = new THREE.Mesh(pcbGeo, pcbMat);
    pcb.position.set(0, 0.22, 0);
    pcb.receiveShadow = true;
    unit1Root.add(pcb);

    // Decorative Gold Traces on PCB
    const traceMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
    for (let i = 0; i < 8; i++) {
      const traceGeo = new THREE.PlaneGeometry(0.04, 1.2 + (i % 3) * 0.4);
      const trace = new THREE.Mesh(traceGeo, traceMat);
      trace.rotation.x = -Math.PI / 2;
      trace.position.set(-1.4 + i * 0.35, 0.255, -0.2 + (i % 2) * 0.3);
      unit1Root.add(trace);
    }

    // C. ESP32 SoC Shield & Chip
    const espGroup = new THREE.Group();
    espGroup.position.set(-1.2, 0.3, 0.6);

    const espShieldGeo = new THREE.BoxGeometry(0.95, 0.14, 0.7);
    const espShield = new THREE.Mesh(espShieldGeo, brushedAlumMat);
    espShield.castShadow = true;
    espGroup.add(espShield);

    // ESP32 PCB Antenna (gold trace shape)
    const antGeo = new THREE.BoxGeometry(0.2, 0.08, 0.6);
    const antMesh = new THREE.Mesh(antGeo, goldMat);
    antMesh.position.set(-0.55, 0, 0);
    espGroup.add(antMesh);
    unit1Root.add(espGroup);

    // D. Finned Aluminum Heatsink for MOSFETs
    const heatsinkGroup = new THREE.Group();
    heatsinkGroup.position.set(1.3, 0.3, 0.3);

    // Solid base block
    const hsBaseGeo = new THREE.BoxGeometry(1.2, 0.14, 1.2);
    const hsBase = new THREE.Mesh(hsBaseGeo, heatsinkMat);
    hsBase.castShadow = true;
    heatsinkGroup.add(hsBase);

    // 6 Vertical cooling fins
    const finGeo = new THREE.BoxGeometry(0.08, 0.55, 1.15);
    for (let f = 0; f < 6; f++) {
      const fin = new THREE.Mesh(finGeo, heatsinkMat);
      fin.position.set(-0.45 + f * 0.18, 0.32, 0);
      fin.castShadow = true;
      heatsinkGroup.add(fin);
    }

    // 2 TO-220 MOSFET Packages bolted to heatsink
    for (let m = 0; m < 2; m++) {
      const mosfetGeo = new THREE.BoxGeometry(0.24, 0.32, 0.08);
      const mosfet = new THREE.Mesh(mosfetGeo, new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6 }));
      mosfet.position.set(-0.25 + m * 0.5, 0.22, 0.6);
      mosfet.castShadow = true;
      heatsinkGroup.add(mosfet);
    }
    unit1Root.add(heatsinkGroup);

    // E. Active 4010 Brushless Cooling Fan
    const fanGroup = new THREE.Group();
    fanGroup.position.set(1.3, 0.6, -1.45);

    // Fan Frame (Square shroud)
    const fanFrameGeo = new THREE.BoxGeometry(1.15, 1.15, 0.3);
    const fanFrame = new THREE.Mesh(fanFrameGeo, new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.4 }));
    fanFrame.castShadow = true;
    fanGroup.add(fanFrame);

    // Circular duct cutout illusion
    const ductGeo = new THREE.CylinderGeometry(0.48, 0.48, 0.32, 24);
    const duct = new THREE.Mesh(ductGeo, new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.3 }));
    duct.rotation.x = Math.PI / 2;
    fanGroup.add(duct);

    // Spinning Fan Rotor (Hub + 7 Curved Blades)
    const fanRotor = new THREE.Group();
    fanRotor.position.set(0, 0, 0);

    // Hub
    const hubGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.25, 16);
    const hub = new THREE.Mesh(hubGeo, new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.2 }));
    hub.rotation.x = Math.PI / 2;
    fanRotor.add(hub);

    // Blades
    const bladeGeo = new THREE.BoxGeometry(0.28, 0.06, 0.04);
    for (let b = 0; b < 7; b++) {
      const angle = (b / 7) * Math.PI * 2;
      const blade = new THREE.Mesh(bladeGeo, new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.3 }));
      blade.position.set(Math.cos(angle) * 0.3, Math.sin(angle) * 0.3, 0);
      blade.rotation.z = angle + 0.3;
      blade.rotation.y = 0.25; // pitch
      fanRotor.add(blade);
    }
    fanGroup.add(fanRotor);
    fanRotorRef.current = fanRotor;
    unit1Root.add(fanGroup);

    // F. BMP280 Sensor Module
    const bmpGroup = new THREE.Group();
    bmpGroup.position.set(-1.4, 0.26, -0.8);
    const bmpPcbGeo = new THREE.BoxGeometry(0.45, 0.05, 0.55);
    const bmpPcb = new THREE.Mesh(bmpPcbGeo, new THREE.MeshStandardMaterial({ color: 0x7c3aed, roughness: 0.4 })); // Purple breakout
    bmpGroup.add(bmpPcb);

    // Metal sensor cap with tiny hole
    const bmpCapGeo = new THREE.BoxGeometry(0.18, 0.06, 0.18);
    const bmpCap = new THREE.Mesh(bmpCapGeo, brushedAlumMat);
    bmpCap.position.set(0, 0.04, 0);
    bmpGroup.add(bmpCap);
    unit1Root.add(bmpGroup);

    // G. LoRa SX1278 Module & SMA Whip Antenna
    const loraGroup = new THREE.Group();
    loraGroup.position.set(-2.0, 0.26, -1.4);

    const loraPcbGeo = new THREE.BoxGeometry(0.65, 0.05, 0.75);
    const loraPcb = new THREE.Mesh(loraPcbGeo, new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.4 })); // Blue breakout
    loraGroup.add(loraPcb);

    // Brass SMA Bulkhead through wall
    const smaGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.45, 8);
    const sma = new THREE.Mesh(smaGeo, goldMat);
    sma.rotation.x = Math.PI / 2;
    sma.position.set(-0.25, 0.5, -0.4);
    loraGroup.add(sma);

    // Rubber Ducky Antenna
    const antBaseGeo = new THREE.CylinderGeometry(0.08, 0.08, 1.8, 12);
    const ant = new THREE.Mesh(antBaseGeo, new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.7 }));
    ant.position.set(-0.25, 1.4, -0.7);
    ant.rotation.z = -0.12;
    ant.castShadow = true;
    loraGroup.add(ant);
    unit1Root.add(loraGroup);

    // H. Cold-Climate Backup Battery Pack
    const battGroup = new THREE.Group();
    battGroup.position.set(0.0, 0.45, 1.35);

    // Dual 18650 cells
    for (let c = 0; c < 2; c++) {
      const cellGeo = new THREE.CylinderGeometry(0.24, 0.24, 1.4, 16);
      const cell = new THREE.Mesh(cellGeo, new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.35 }));
      cell.rotation.z = Math.PI / 2;
      cell.position.set(0, 0, -0.3 + c * 0.55);
      cell.castShadow = true;
      battGroup.add(cell);
    }

    // Kapton insulation wrap strip
    const kaptonGeo = new THREE.BoxGeometry(0.6, 0.5, 1.2);
    const kapton = new THREE.Mesh(kaptonGeo, new THREE.MeshStandardMaterial({
      color: 0xd97706,
      transparent: true,
      opacity: 0.7,
      roughness: 0.2
    }));
    battGroup.add(kapton);
    unit1Root.add(battGroup);

    // I. Terminal Blocks & Wiring
    const termBlockGeo = new THREE.BoxGeometry(0.8, 0.3, 0.35);
    const termBlock = new THREE.Mesh(termBlockGeo, new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.5 })); // Green terminal
    termBlock.position.set(1.4, 0.35, 1.7);
    termBlock.castShadow = true;
    unit1Root.add(termBlock);

    // J. Status LEDs on Front Panel
    const ledGeo = new THREE.SphereGeometry(0.05, 12, 12);

    const ledPowerMesh = new THREE.Mesh(ledGeo, new THREE.MeshBasicMaterial({ color: 0x10b981 }));
    ledPowerMesh.position.set(-1.8, 0.65, baseDepth / 2 + 0.01);
    unit1Root.add(ledPowerMesh);

    const ledAlertMesh = new THREE.Mesh(ledGeo, new THREE.MeshBasicMaterial({ color: 0xef4444 }));
    ledAlertMesh.position.set(-1.5, 0.65, baseDepth / 2 + 0.01);
    unit1Root.add(ledAlertMesh);

    const ledLoraMesh = new THREE.Mesh(ledGeo, new THREE.MeshBasicMaterial({ color: 0x38bdf8 }));
    ledLoraMesh.position.set(-1.2, 0.65, baseDepth / 2 + 0.01);
    unit1Root.add(ledLoraMesh);

    // K. Top Cover Lid (With Smooth Explode Animation Support)
    const lidGroup = new THREE.Group();
    lidGroup.position.set(0, baseHeight + 0.12, 0);

    const lidPlateGeo = new THREE.BoxGeometry(baseWidth, 0.08, baseDepth);
    const lidPlate = new THREE.Mesh(lidPlateGeo, acrylicLidMat);
    lidPlate.castShadow = true;
    lidPlate.receiveShadow = true;
    lidGroup.add(lidPlate);

    // Aluminum perimeter frame on lid
    const lidFrameGeo = new THREE.BoxGeometry(baseWidth + 0.04, 0.1, 0.15);
    const lf1 = new THREE.Mesh(lidFrameGeo, brushedAlumMat);
    lf1.position.set(0, 0, baseDepth / 2);
    lidGroup.add(lf1);
    const lf2 = new THREE.Mesh(lidFrameGeo, brushedAlumMat);
    lf2.position.set(0, 0, -baseDepth / 2);
    lidGroup.add(lf2);

    unit1Root.add(lidGroup);
    lidGroupRef.current = lidGroup;

    // L. Airflow Particle Stream System
    const particleCount = 220;
    const particleGeo = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    const particleVelocities: { x: number; y: number; z: number; origZ: number }[] = [];

    for (let p = 0; p < particleCount; p++) {
      const px = 0.6 + Math.random() * 1.5;
      const py = 0.35 + Math.random() * 0.6;
      const pz = 1.6 - Math.random() * 3.5;
      particlePositions[p * 3] = px;
      particlePositions[p * 3 + 1] = py;
      particlePositions[p * 3 + 2] = pz;
      particleVelocities.push({
        x: (Math.random() - 0.5) * 0.02,
        y: (Math.random() - 0.5) * 0.015,
        z: -(0.03 + Math.random() * 0.05),
        origZ: 1.6
      });
    }

    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    const particleMat = new THREE.PointsMaterial({
      color: 0x38bdf8,
      size: 0.08,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending
    });

    const particles = new THREE.Points(particleGeo, particleMat);
    unit1Root.add(particles);
    particlesRef.current = particles;

    // ----------------------------------------------------
    // RESIZE OBSERVER
    // ----------------------------------------------------
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

    // ----------------------------------------------------
    // ANIMATION LOOP
    // ----------------------------------------------------
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      const time = clock.getElapsedTime();

      // Smooth OrbitControls update
      controls.update();

      // Exploded lid lerp
      if (lidGroupRef.current) {
        lidGroupRef.current.position.y += (targetLidY.current + baseHeight + 0.12 - lidGroupRef.current.position.y) * 0.12;
      }

      // Fan Rotation
      if (fanRotorRef.current) {
        const speed = fanState ? 38.0 : (status === 'CRITICAL' ? 45.0 : 0.8); // slight drift if idle
        fanRotorRef.current.rotation.z += delta * speed;
      }

      // Airflow Particles Animation
      if (particlesRef.current && particlesRef.current.visible) {
        const posAttr = particlesRef.current.geometry.attributes.position as THREE.BufferAttribute;
        const speedMultiplier = fanState ? 2.5 : 0.6;
        for (let p = 0; p < particleCount; p++) {
          let pz = posAttr.getY(p * 3 + 2); // z
          pz += particleVelocities[p].z * speedMultiplier;
          if (pz < -2.2) {
            pz = 1.6 + Math.random() * 0.4;
          }
          posAttr.setZ(p, pz);
        }
        posAttr.needsUpdate = true;
      }

      // Pulsing Telemetry Alert Light
      if (ledAlertLightRef.current) {
        if (status === 'CRITICAL') {
          ledAlertLightRef.current.intensity = 1.8 + Math.sin(time * 12) * 1.5;
        } else if (status === 'WARNING') {
          ledAlertLightRef.current.intensity = 0.8 + Math.sin(time * 5) * 0.6;
        } else {
          ledAlertLightRef.current.intensity = 0;
        }
      }

      // LoRa Beacon Pulse
      if (ledLoraLightRef.current) {
        ledLoraLightRef.current.intensity = Math.max(0, Math.sin(time * 3.5) * 1.2);
      }

      renderer.render(scene, camera);
    };

    animate();

    // Cleanup
    return () => {
      resizeObserver.disconnect();
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      controls.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Update dynamic properties when props change
  useEffect(() => {
    // 1. Heatsink thermal glow shader color
    if (heatsinkMatRef.current) {
      if (thermalIRMode) {
        // False color IR
        const normalized = Math.min(Math.max((temperature - 20) / 60, 0), 1);
        const irColor = new THREE.Color().setHSL(0.7 - normalized * 0.7, 1.0, 0.5);
        heatsinkMatRef.current.color = irColor;
        heatsinkMatRef.current.emissive = irColor;
        heatsinkMatRef.current.emissiveIntensity = 0.6;
      } else {
        // Realistic thermal glow
        if (temperature >= 65) {
          heatsinkMatRef.current.emissive = new THREE.Color(0xdc2626); // Red glow
          heatsinkMatRef.current.emissiveIntensity = 0.65;
        } else if (temperature >= 55) {
          heatsinkMatRef.current.emissive = new THREE.Color(0xd97706); // Amber glow
          heatsinkMatRef.current.emissiveIntensity = 0.35;
        } else {
          heatsinkMatRef.current.emissive = new THREE.Color(0x000000);
          heatsinkMatRef.current.emissiveIntensity = 0;
          heatsinkMatRef.current.color = new THREE.Color(0x94a3b8);
        }
      }
    }

    // 2. PCB Thermal IR
    if (pcbMatRef.current) {
      if (thermalIRMode) {
        pcbMatRef.current.color = new THREE.Color(0x1e1b4b); // Deep indigo IR substrate
      } else {
        pcbMatRef.current.color = new THREE.Color(0x0f2b23); // Standard green
      }
    }

    // 3. Airflow particles visibility & density
    if (particlesRef.current) {
      particlesRef.current.visible = particlesActive;
      const mat = particlesRef.current.material as THREE.PointsMaterial;
      // Air density at altitude scales opacity
      const relDensity = Math.min(Math.max(pressure / 101.325, 0.2), 1.0);
      mat.opacity = 0.3 + relDensity * 0.5;
    }
  }, [temperature, pressure, thermalIRMode, particlesActive, status]);

  // Handle Camera Presets
  const handleSetPreset = (preset: string) => {
    setViewPreset(preset);
    if (!cameraRef.current || !controlsRef.current) return;
    const camera = cameraRef.current;
    const controls = controlsRef.current;

    switch (preset) {
      case 'iso':
        camera.position.set(5.5, 4.5, 6.2);
        controls.target.set(0, 0.5, 0);
        break;
      case 'top':
        camera.position.set(0, 8.5, 0.1);
        controls.target.set(0, 0.4, 0);
        break;
      case 'thermal':
        camera.position.set(3.2, 2.8, 1.8);
        controls.target.set(1.3, 0.6, 0.3);
        break;
      case 'fan':
        camera.position.set(3.4, 2.0, -3.2);
        controls.target.set(1.3, 0.6, -1.5);
        break;
      case 'rf':
        camera.position.set(-4.5, 3.2, -3.0);
        controls.target.set(-1.8, 0.8, -1.2);
        break;
    }
  };

  // Toggle Auto-Orbit
  const handleToggleAutoRotate = () => {
    const next = !autoRotate;
    setAutoRotate(next);
    if (controlsRef.current) {
      controlsRef.current.autoRotate = next;
      controlsRef.current.autoRotateSpeed = 2.0;
    }
  };

  // Reset View
  const handleResetView = () => {
    handleSetPreset('iso');
  };

  return (
    <div className={`relative bg-gradient-to-b from-slate-900 to-slate-950 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl ${className}`}>
      {/* 3D WebGL Canvas */}
      <div
        ref={mountRef}
        style={{ height }}
        className="w-full cursor-grab active:cursor-grabbing"
      />

      {/* Top Header Overlay: Unifies Title & Viewport Controls in one responsive flex row */}
      <div className="absolute top-3 left-3 right-3 flex flex-wrap items-center justify-between gap-2 z-10 pointer-events-none">
        {/* Left: Compact Telemetry Badge */}
        <div className="flex items-center gap-2 bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-800 pointer-events-auto shadow-lg max-w-full">
          <div className="w-2 h-2 rounded-full bg-cyan-400 animate-ping shrink-0" />
          <span className="font-mono text-xs font-bold text-white uppercase tracking-wider shrink-0">
            Unit 1 Twin
          </span>
          <span className="text-slate-600 hidden sm:inline">|</span>
          <div className="flex items-center gap-2 text-[11px] font-mono text-slate-300">
            <span>T: <strong className="text-white">{temperature.toFixed(1)}°C</strong></span>
            <span>P: <strong className="text-white">{pressure.toFixed(1)}k</strong></span>
            <span className="hidden sm:inline">Fan: <strong className={fanState ? 'text-cyan-300' : 'text-slate-400'}>{fanState ? 'ACTIVE' : 'OFF'}</strong></span>
          </div>
        </div>

        {/* Right: Camera Presets & Reset Button */}
        {showControls && (
          <div className="flex items-center gap-1.5 pointer-events-auto">
            <div className="flex items-center bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-xl p-1 text-[11px] font-mono text-slate-300 shadow-lg">
              <button
                onClick={() => handleSetPreset('iso')}
                className={`px-2 py-1 rounded-lg transition-all ${viewPreset === 'iso' ? 'bg-cyan-600 text-white font-bold' : 'hover:bg-slate-800 text-slate-400'}`}
                title="Isometric 45° Angle"
              >
                ISO
              </button>
              <button
                onClick={() => handleSetPreset('top')}
                className={`px-2 py-1 rounded-lg transition-all ${viewPreset === 'top' ? 'bg-cyan-600 text-white font-bold' : 'hover:bg-slate-800 text-slate-400'}`}
                title="Top PCB View"
              >
                PCB
              </button>
              <button
                onClick={() => handleSetPreset('thermal')}
                className={`px-2 py-1 rounded-lg transition-all ${viewPreset === 'thermal' ? 'bg-cyan-600 text-white font-bold' : 'hover:bg-slate-800 text-slate-400'}`}
                title="Thermal Heatsink View"
              >
                HEATSINK
              </button>
              <button
                onClick={() => handleSetPreset('fan')}
                className={`px-2 py-1 rounded-lg transition-all ${viewPreset === 'fan' ? 'bg-cyan-600 text-white font-bold' : 'hover:bg-slate-800 text-slate-400'}`}
                title="Blower Exhaust View"
              >
                FAN
              </button>
            </div>

            <button
              onClick={handleResetView}
              className="w-7 h-7 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-800 text-slate-300 flex items-center justify-center transition-colors shadow-lg"
              title="Reset View"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Bottom Floating Tactical Control Bar */}
      {showControls && (
        <div className="absolute bottom-3 left-3 right-3 flex flex-wrap items-center justify-between gap-2 pointer-events-none z-10">
          {/* Visual Mode Toggles */}
          <div className="flex flex-wrap items-center gap-1.5 pointer-events-auto bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-xl p-1 shadow-xl text-[11px] font-mono text-slate-300">
            {/* Exploded View Toggle */}
            <button
              onClick={() => setExploded(!exploded)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border transition-all ${
                exploded
                  ? 'bg-blue-600/30 border-blue-500 text-blue-300'
                  : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-white'
              }`}
            >
              <Layers className="w-3 h-3" />
              <span>{exploded ? 'Collapsed' : 'Explode'}</span>
            </button>

            {/* Thermal IR False-Color Mode */}
            <button
              onClick={() => setThermalIRMode(!thermalIRMode)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border transition-all ${
                thermalIRMode
                  ? 'bg-orange-600/30 border-orange-500 text-orange-300'
                  : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-white'
              }`}
            >
              <Flame className="w-3 h-3" />
              <span>{thermalIRMode ? 'IR: ON' : 'Thermal IR'}</span>
            </button>

            {/* Airflow Particles Toggle */}
            <button
              onClick={() => setParticlesActive(!particlesActive)}
              className={`hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-lg border transition-all ${
                particlesActive
                  ? 'bg-cyan-600/30 border-cyan-500 text-cyan-300'
                  : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-white'
              }`}
            >
              <Wind className="w-3 h-3" />
              <span>Airflow</span>
            </button>

            {/* Auto-Turntable */}
            <button
              onClick={handleToggleAutoRotate}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border transition-all ${
                autoRotate
                  ? 'bg-purple-600/30 border-purple-500 text-purple-300'
                  : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-white'
              }`}
            >
              <Compass className="w-3 h-3" />
              <span>Turntable</span>
            </button>
          </div>

          {/* Quick Component Inspect Chips */}
          <div className="hidden lg:flex items-center gap-1 pointer-events-auto bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-xl p-1 shadow-xl text-[10px] font-mono">
            <span className="text-slate-500 px-1.5 flex items-center gap-1">
              <Info className="w-3 h-3 text-cyan-400" />
              INSPECT:
            </span>
            {COMPONENT_PINS.slice(0, 4).map(pin => (
              <button
                key={pin.id}
                onClick={() => setActivePin(pin)}
                className={`px-2 py-0.5 rounded-lg border transition-all ${
                  activePin?.id === pin.id
                    ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 font-bold'
                    : 'bg-slate-800/70 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white'
                }`}
              >
                {pin.name.split(' ')[0]}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Component Inspection HUD Modal Popover */}
      {activePin && (
        <div className="absolute top-16 right-4 w-96 max-w-[calc(100%-2rem)] bg-slate-900/95 backdrop-blur-xl border border-cyan-500/40 rounded-2xl p-5 shadow-2xl text-xs font-mono text-slate-200 z-20 animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-800">
            <div>
              <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider">
                3D Component Telemetry Pin
              </span>
              <h4 className="text-sm font-sans font-bold text-white mt-0.5">
                {activePin.name}
              </h4>
              <p className="text-[11px] text-slate-400 mt-0.5">{activePin.part}</p>
            </div>
            <button
              onClick={() => setActivePin(null)}
              className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="py-3 space-y-2.5 text-[11px] text-slate-300">
            <div>
              <span className="text-[10px] text-slate-500 uppercase font-semibold">Architecture Role:</span>
              <p className="mt-0.5 text-slate-300 leading-relaxed font-sans">{activePin.description}</p>
            </div>

            <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800">
              <span className="text-[10px] text-cyan-400 uppercase font-semibold">Active Subsystem Metrics:</span>
              <p className="mt-0.5 text-cyan-200">{activePin.telemetryKey}</p>
            </div>

            <div className="bg-amber-950/40 p-2.5 rounded-xl border border-amber-800/40 text-amber-200/90">
              <span className="text-[10px] text-amber-400 uppercase font-semibold">High-Altitude Ladakh Derating:</span>
              <p className="mt-0.5 leading-relaxed font-sans">{activePin.deratingInfo}</p>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              onClick={() => setActivePin(null)}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 text-[11px]"
            >
              Dismiss Pin
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
