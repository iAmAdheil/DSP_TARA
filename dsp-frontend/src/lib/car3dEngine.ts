/**
 * Zero-dependency 3D car software renderer.
 * Ported from standalone HTML to a reusable module that takes a canvas element.
 */

// ── Types ─────────────────────────────────────────────────────────
type Vec3 = [number, number, number];
type Vec4 = [number, number, number, number];
type Mat4 = number[];
interface FaceCol { r: number; g: number; b: number; a: number }
interface Face { verts: Vec3[]; nx?: number; ny?: number; nz?: number; col: FaceCol; alpha: number }
interface SceneObj {
  name: string; group: string; pos: Vec3; origPos: Vec3; faces: Face[];
  visible: boolean; alpha: number; rotX: number; rotY: number; rotZ: number;
  scl: Vec3; isWheel?: boolean; isEngine?: boolean; isSteering?: boolean;
}

export interface PartInfo { col: string; desc: string }

export interface SubsystemCve {
  id: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  cvss: number;
  summary: string;
}

export interface Subsystem {
  name: string;
  parts: string[];
  cves: SubsystemCve[];
}

export interface EngineController {
  setGroupVisibility: (group: string, visible: boolean) => void;
  setBodyOpacity: (v: number) => void;
  toggleExplode: () => void;
  setExplodeActive: (active: boolean) => void;
  setExplodeSpread: (v: number) => void;
  getExplodeState: () => { active: boolean; spread: number };
  setAnimState: (key: 'wheels' | 'steering' | 'idle', on: boolean) => void;
  tweenCam: (preset: string) => void;
  setWireframe: (on: boolean) => void;
  setShowNormals: (on: boolean) => void;
  selectPart: (name: string | null) => void;
  highlightParts: (names: string[] | null) => void;
  getPartNames: () => string[];
  getPartInfo: () => Record<string, PartInfo>;
  destroy: () => void;
}

// ── Subsystem definitions ─────────────────────────────────────────
export const SUBSYSTEMS: Record<string, Subsystem> = {
  'Body & Structure': {
    name: 'Body & Structure',
    parts: ['Body Shell', 'Glass', 'Chassis'],
    cves: [
      { id: 'CVE-2024-31021', severity: 'High', cvss: 7.8, summary: 'CAN bus frame injection via exposed OBD-II port allows unauthorized chassis control module reprogramming' },
      { id: 'CVE-2024-28804', severity: 'Medium', cvss: 5.3, summary: 'Structural integrity sensor spoofing through electromagnetic interference on I2C bus' },
      { id: 'CVE-2024-33190', severity: 'Low', cvss: 3.1, summary: 'VIN cloning vulnerability in body control module firmware v2.1–v2.4' },
    ],
  },
  'Powertrain': {
    name: 'Powertrain',
    parts: ['Engine', 'Transmission', 'Exhaust'],
    cves: [
      { id: 'CVE-2024-29155', severity: 'Critical', cvss: 9.8, summary: 'Remote code execution in engine ECU via crafted UDS diagnostic session over cellular telematics' },
      { id: 'CVE-2024-30442', severity: 'High', cvss: 8.1, summary: 'Transmission control unit accepts unsigned firmware updates over CAN FD bus' },
      { id: 'CVE-2024-27891', severity: 'High', cvss: 7.5, summary: 'Exhaust valve actuator denial-of-service via malformed ISO 14229 service requests' },
      { id: 'CVE-2024-31876', severity: 'Medium', cvss: 6.2, summary: 'Engine calibration data exfiltration through OBD-II diagnostic read services' },
    ],
  },
  'Drivetrain & Braking': {
    name: 'Drivetrain & Braking',
    parts: ['FL Wheel', 'FR Wheel', 'RL Wheel', 'RR Wheel', 'Brake System', 'Suspension'],
    cves: [
      { id: 'CVE-2024-32001', severity: 'Critical', cvss: 9.9, summary: 'Brake-by-wire ECU buffer overflow enables arbitrary brake force modulation from adjacent CAN segment' },
      { id: 'CVE-2024-28567', severity: 'High', cvss: 8.4, summary: 'ABS wheel speed sensor replay attack allows traction control system manipulation' },
      { id: 'CVE-2024-29903', severity: 'High', cvss: 7.2, summary: 'Suspension damper calibration bypass through unauthorized TPMS Bluetooth LE pairing' },
      { id: 'CVE-2024-33445', severity: 'Medium', cvss: 5.8, summary: 'Tire pressure monitoring system broadcasts unencrypted sensor data within 10m range' },
    ],
  },
  'Driver Interface': {
    name: 'Driver Interface',
    parts: ['Steering', 'Dashboard', 'Seats', 'Pedals'],
    cves: [
      { id: 'CVE-2024-30221', severity: 'Critical', cvss: 9.1, summary: 'Steering angle sensor CAN message injection enables unauthorized electronic power steering override' },
      { id: 'CVE-2024-27654', severity: 'High', cvss: 7.9, summary: 'Infotainment head unit root shell access via USB debug interface left enabled in production' },
      { id: 'CVE-2024-31555', severity: 'Medium', cvss: 6.5, summary: 'Instrument cluster firmware accepts downgrade to version with known display spoofing vulnerability' },
      { id: 'CVE-2024-28999', severity: 'Medium', cvss: 4.7, summary: 'Seat position memory ECU exposes occupant weight data over unprotected LIN bus' },
      { id: 'CVE-2024-34102', severity: 'Low', cvss: 2.8, summary: 'Accelerator pedal position sensor calibration drift under sustained EMI conditions' },
    ],
  },
};

// Reverse lookup: part name → subsystem name
export const PART_TO_SUBSYSTEM: Record<string, string> = {};
for (const [sysName, sys] of Object.entries(SUBSYSTEMS)) {
  for (const part of sys.parts) {
    PART_TO_SUBSYSTEM[part] = sysName;
  }
}

// Get worst severity for a subsystem
export function getWorstSeverity(cves: SubsystemCve[]): 'Critical' | 'High' | 'Medium' | 'Low' | null {
  if (!cves.length) return null;
  const order: Record<string, number> = { Critical: 0, High: 1, Medium: 2, Low: 3 };
  let worst = cves[0].severity;
  for (const c of cves) { if (order[c.severity] < order[worst]) worst = c.severity; }
  return worst;
}

export const PART_INFO: Record<string, PartInfo> = {
  'Body Shell':    { col: '#3b82f6', desc: 'High-strength steel unibody with crumple zones & A/B/C pillars' },
  'Glass':         { col: '#0ea5e9', desc: 'Laminated & tempered glass windshields and side windows' },
  'FL Wheel':      { col: '#22c55e', desc: 'Front-left 18" alloy with run-flat performance tire' },
  'FR Wheel':      { col: '#22c55e', desc: 'Front-right 18" alloy with run-flat performance tire' },
  'RL Wheel':      { col: '#22c55e', desc: 'Rear-left 18" alloy with run-flat performance tire' },
  'RR Wheel':      { col: '#22c55e', desc: 'Rear-right 18" alloy with run-flat performance tire' },
  'Brake System':  { col: '#ef4444', desc: '4-piston Brembo calipers, 330mm vented cross-drilled discs' },
  'Engine':        { col: '#f97316', desc: '2.0L turbocharged 4-cylinder, 300hp @ 6500rpm / 400Nm torque' },
  'Transmission':  { col: '#eab308', desc: '8-speed dual-clutch automatic transmission' },
  'Exhaust':       { col: '#eab308', desc: 'Titanium performance exhaust with electronically controlled valve' },
  'Steering':      { col: '#a855f7', desc: 'Electric power-assisted rack and pinion steering' },
  'Dashboard':     { col: '#3b82f6', desc: 'Carbon fiber instrument panel with 12" digital cluster' },
  'Seats':         { col: '#a855f7', desc: 'Recaro sport bucket seats with adjustable lumbar support' },
  'Pedals':        { col: '#0ea5e9', desc: 'Billet aluminum pedal set with anti-slip rubber inserts' },
  'Chassis':       { col: '#22c55e', desc: 'High-rigidity steel platform with multi-link rear suspension' },
  'Suspension':    { col: '#14b8a6', desc: 'Adaptive magnetic dampers, 3-mode: Comfort / Sport / Track' },
};

const CAM_PRESETS: Record<string, [number, number, number, number, number, number]> = {
  exterior:  [0.5, 0.55, 14, 0, 0.5, 0],
  top:       [0, 0.06, 18, 0, 0, 0],
  front:     [Math.PI, 1.35, 14, 0, 0.5, 0],
  engine:    [Math.PI - 0.6, 0.72, 8, 0, 1.2, -3],
  underbody: [0.5, 2.95, 12, 0, 0, 0],
};

// ── Math helpers ──────────────────────────────────────────────────
const V3 = {
  add: (a: Vec3, b: Vec3): Vec3 => [a[0]+b[0], a[1]+b[1], a[2]+b[2]],
  sub: (a: Vec3, b: Vec3): Vec3 => [a[0]-b[0], a[1]-b[1], a[2]-b[2]],
  scale: (a: Vec3, s: number): Vec3 => [a[0]*s, a[1]*s, a[2]*s],
  dot: (a: Vec3, b: Vec3): number => a[0]*b[0]+a[1]*b[1]+a[2]*b[2],
  cross: (a: Vec3, b: Vec3): Vec3 => [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]],
  len: (a: Vec3): number => Math.sqrt(a[0]*a[0]+a[1]*a[1]+a[2]*a[2]),
  norm: (a: Vec3): Vec3 => { const l = V3.len(a)||1; return [a[0]/l, a[1]/l, a[2]/l]; },
};

const M4 = {
  applyV: (m: Mat4, v: Vec3): Vec4 => {
    const [x,y,z] = v, w = 1;
    return [
      m[0]*x+m[4]*y+m[8]*z+m[12]*w,
      m[1]*x+m[5]*y+m[9]*z+m[13]*w,
      m[2]*x+m[6]*y+m[10]*z+m[14]*w,
      m[3]*x+m[7]*y+m[11]*z+m[15]*w,
    ];
  },
};

// ── Geometry primitives ───────────────────────────────────────────
function boxFaces(w: number, h: number, d: number, col: FaceCol): Face[] {
  const hw=w/2, hh=h/2, hd=d/2;
  const v: Vec3[] = [
    [-hw,-hh,-hd],[hw,-hh,-hd],[hw,hh,-hd],[-hw,hh,-hd],
    [-hw,-hh,hd],[hw,-hh,hd],[hw,hh,hd],[-hw,hh,hd],
  ];
  return [
    {verts:[v[0],v[1],v[2],v[3]],nx:0,ny:0,nz:-1,col,alpha:col.a},
    {verts:[v[5],v[4],v[7],v[6]],nx:0,ny:0,nz:1,col,alpha:col.a},
    {verts:[v[4],v[0],v[3],v[7]],nx:-1,ny:0,nz:0,col,alpha:col.a},
    {verts:[v[1],v[5],v[6],v[2]],nx:1,ny:0,nz:0,col,alpha:col.a},
    {verts:[v[3],v[2],v[6],v[7]],nx:0,ny:1,nz:0,col,alpha:col.a},
    {verts:[v[4],v[5],v[1],v[0]],nx:0,ny:-1,nz:0,col,alpha:col.a},
  ];
}

function cylinderFaces(rt: number, rb: number, h: number, segs: number, col: FaceCol, alpha: number, axisX?: boolean): Face[] {
  const faces: Face[] = [];
  const hh = h/2;
  const topV: Vec3[] = [], botV: Vec3[] = [];
  for (let i=0;i<segs;i++){
    const a=i*Math.PI*2/segs, c=Math.cos(a), s=Math.sin(a);
    if(axisX){ topV.push([hh,rt*c,rt*s]); botV.push([-hh,rb*c,rb*s]); }
    else{ topV.push([rt*c,hh,rt*s]); botV.push([rb*c,-hh,rb*s]); }
  }
  for(let i=0;i<segs;i++){
    const n=(i+1)%segs;
    faces.push({verts:[botV[i],botV[n],topV[n],topV[i]],col,alpha:alpha||1,ny:0.5});
  }
  for(let i=1;i<segs-1;i++) faces.push({verts:[topV[0],topV[i],topV[i+1],topV[i+1]],col,alpha:alpha||1,ny:axisX?0:1});
  for(let i=1;i<segs-1;i++) faces.push({verts:[botV[0],botV[i+1],botV[i],botV[i]],col,alpha:alpha||1,ny:axisX?0:-1});
  return faces;
}

function torusFaces(R: number, r: number, segs: number, tsegs: number, col: FaceCol): Face[] {
  const faces: Face[] = [];
  for(let i=0;i<segs;i++){
    const a0=i*Math.PI*2/segs, a1=(i+1)*Math.PI*2/segs;
    for(let j=0;j<tsegs;j++){
      const b0=j*Math.PI*2/tsegs, b1=(j+1)*Math.PI*2/tsegs;
      const tp = (a: number, b: number): Vec3 => [(R+r*Math.cos(b))*Math.cos(a), r*Math.sin(b), (R+r*Math.cos(b))*Math.sin(a)];
      faces.push({verts:[tp(a0,b0),tp(a1,b0),tp(a1,b1),tp(a0,b1)],col,alpha:col.a,ny:0.5});
    }
  }
  return faces;
}

// ── Quad helper ───────────────────────────────────────────────────
function quad(a: Vec3, b: Vec3, c: Vec3, d: Vec3, col: FaceCol): Face {
  return { verts: [a, b, c, d], col, alpha: col.a };
}

function tri(a: Vec3, b: Vec3, c: Vec3, col: FaceCol): Face {
  return { verts: [a, b, c, c], col, alpha: col.a };
}

// ── Color helpers ─────────────────────────────────────────────────
const C = {
  body:[72,110,170], bodyDk:[55,85,140], bodyLt:[95,135,195],
  glass:[160,215,240], chrome:[215,225,235],
  rubber:[28,28,30], rim:[190,200,212], brake:[210,45,30], disc:[155,155,155],
  leath:[75,45,25], dash:[22,22,28], eng:[55,72,88], exh:[88,96,112],
  chas:[38,48,58], pedal:[100,108,125], floor:[30,30,38],
  spring:[210,70,35], engBlue:[85,118,152], turbo:[135,142,152],
  shadow:[0,0,0], grill:[30,30,35],
};

function fc(rgb: number[], bright?: number, a?: number): FaceCol {
  const b = bright||1;
  return { r:Math.min(255,rgb[0]*b)|0, g:Math.min(255,rgb[1]*b)|0, b:Math.min(255,rgb[2]*b)|0, a:a||1 };
}

// ── Build car scene ───────────────────────────────────────────────
function buildCar(): SceneObj[] {
  const objects: SceneObj[] = [];

  function makeObj(name: string, group: string, px: number, py: number, pz: number, faces: Face[], opx?: number, opy?: number, opz?: number): SceneObj {
    const obj: SceneObj = {
      name, group, pos:[px,py,pz],
      origPos:[opx??px, opy??py, opz??pz],
      faces, visible:true, alpha:1.0,
      rotX:0, rotY:0, rotZ:0, scl:[1,1,1],
    };
    objects.push(obj);
    return obj;
  }

  // Helper: offset all verts in faces
  function mv(faces: Face[], dx: number, dy: number, dz: number) {
    faces.forEach(f => { f.verts = f.verts.map(v => [v[0]+dx, v[1]+dy, v[2]+dz] as Vec3); });
    return faces;
  }

  // ══════════════════════════════════════════════════════════════
  //  BODY SHELL — shaped panels instead of flat boxes
  // ══════════════════════════════════════════════════════════════
  const bodyCol = fc(C.body);
  const bodyDk = fc(C.bodyDk);
  const bodyLt = fc(C.bodyLt);
  let bodyFaces: Face[] = [];

  // Dimensions
  const bW = 2.1;   // half-width
  const bL = 4.7;   // half-length (front to back)
  const bH = 0.55;  // lower body height
  const hoodY = 0.72; // hood surface height
  const roofY = 1.85;  // roof height
  const roofW = 1.7;   // half roof width
  const cabFZ = -1.1;  // cabin front Z (A-pillar base)
  const cabRZ = 2.4;   // cabin rear Z (C-pillar base)
  const wsTopZ = -0.4;  // windshield top Z
  const rwTopZ = 1.9;   // rear window top Z

  // Lower body — tapered front and rear
  const frontNoseZ = -bL;
  const rearEndZ = bL;
  const frontNoseW = 1.85;  // narrower nose
  const rearEndW = 1.95;

  // Bottom panel
  bodyFaces.push(quad([-bW,0,-bL+0.5],[bW,0,-bL+0.5],[bW,0,bL-0.3],[-bW,0,bL-0.3], bodyDk));
  // Lower sides (left)
  bodyFaces.push(quad([-bW,0,-bL+0.5],[-bW,bH,-bL+0.3],[-bW,bH,bL-0.2],[-bW,0,bL-0.3], bodyCol));
  // Lower sides (right)
  bodyFaces.push(quad([bW,0,bL-0.3],[bW,bH,bL-0.2],[bW,bH,-bL+0.3],[bW,0,-bL+0.5], bodyCol));
  // Top of lower body (under hood/trunk)
  bodyFaces.push(quad([-bW,bH,-bL+0.3],[bW,bH,-bL+0.3],[bW,bH,bL-0.2],[-bW,bH,bL-0.2], bodyCol));

  // Front face (tapered)
  bodyFaces.push(quad([-frontNoseW,0.08,frontNoseZ],[frontNoseW,0.08,frontNoseZ],[bW,bH,-bL+0.3],[-bW,bH,-bL+0.3], bodyCol));
  bodyFaces.push(quad([-frontNoseW,0.08,frontNoseZ],[-bW,0,-bL+0.5],[-bW,bH,-bL+0.3],[-frontNoseW,0.08,frontNoseZ], bodyCol));
  bodyFaces.push(quad([frontNoseW,0.08,frontNoseZ],[bW,bH,-bL+0.3],[bW,0,-bL+0.5],[frontNoseW,0.08,frontNoseZ], bodyCol));

  // Rear face (tapered)
  bodyFaces.push(quad([-rearEndW,0.15,rearEndZ],[rearEndW,0.15,rearEndZ],[bW,bH,bL-0.2],[-bW,bH,bL-0.2], bodyCol));

  // Hood — sloped from cabin front down to nose
  bodyFaces.push(quad([-bW,hoodY,cabFZ],[bW,hoodY,cabFZ],[bW-0.1,hoodY-0.08,frontNoseZ+0.6],[-bW+0.1,hoodY-0.08,frontNoseZ+0.6], bodyLt));
  // Hood front slope to nose
  bodyFaces.push(quad([-bW+0.1,hoodY-0.08,frontNoseZ+0.6],[bW-0.1,hoodY-0.08,frontNoseZ+0.6],[frontNoseW,bH,frontNoseZ+0.15],[-frontNoseW,bH,frontNoseZ+0.15], bodyCol));

  // Trunk — slight slope from cabin rear down
  bodyFaces.push(quad([-bW+0.05,hoodY-0.05,cabRZ],[bW-0.05,hoodY-0.05,cabRZ],[rearEndW,bH+0.1,rearEndZ-0.3],[-rearEndW,bH+0.1,rearEndZ-0.3], bodyLt));

  // Cabin — A-pillar to C-pillar with sloped roof
  // Roof
  bodyFaces.push(quad([-roofW,roofY,wsTopZ],[roofW,roofY,wsTopZ],[roofW,roofY,rwTopZ],[-roofW,roofY,rwTopZ], bodyDk));
  // Cabin sides (left) — from body edge up to roof, with inward taper
  bodyFaces.push(quad([-bW,hoodY,cabFZ],[-roofW,roofY,wsTopZ],[-roofW,roofY,rwTopZ],[-bW,hoodY,cabRZ], bodyCol));
  // Cabin sides (right)
  bodyFaces.push(quad([bW,hoodY,cabRZ],[roofW,roofY,rwTopZ],[roofW,roofY,wsTopZ],[bW,hoodY,cabFZ], bodyCol));

  // Front bumper
  const bmpCol = fc(C.chrome);
  bodyFaces = bodyFaces.concat(mv(boxFaces(3.9,0.3,0.28,bmpCol),0,0.22,-bL-0.1));
  // Front grill
  bodyFaces = bodyFaces.concat(mv(boxFaces(2.8,0.28,0.08,fc(C.grill)),0,0.38,-bL+0.05));
  // Rear bumper
  bodyFaces = bodyFaces.concat(mv(boxFaces(3.9,0.3,0.28,bmpCol),0,0.22,bL+0.1));

  // Headlights
  [-1.3,1.3].forEach(x => {
    bodyFaces = bodyFaces.concat(mv(boxFaces(0.6,0.14,0.12,{r:255,g:250,b:210,a:1}),x,0.52,-bL+0.02));
  });
  // Taillights
  [-1.3,1.3].forEach(x => {
    bodyFaces = bodyFaces.concat(mv(boxFaces(0.55,0.16,0.1,{r:255,g:25,b:25,a:1}),x,0.48,bL+0.02));
  });

  // Side panels connecting lower body to hood/cabin
  // Left side — front fender (lower body to hood level)
  bodyFaces.push(quad([-bW,bH,-bL+0.3],[-bW,hoodY,cabFZ],[-bW,hoodY,-bL+0.6],[-bW,bH,-bL+0.3], bodyCol));
  // Left side — rear quarter (lower body to trunk level)
  bodyFaces.push(quad([-bW,bH,bL-0.2],[-bW,hoodY-0.05,cabRZ],[-bW,hoodY,cabRZ],[-bW,bH,bL-0.2], bodyCol));
  // Right side — front fender
  bodyFaces.push(quad([bW,bH,-bL+0.3],[bW,hoodY,-bL+0.6],[bW,hoodY,cabFZ],[bW,bH,-bL+0.3], bodyCol));
  // Right side — rear quarter
  bodyFaces.push(quad([bW,bH,bL-0.2],[bW,hoodY,cabRZ],[bW,hoodY-0.05,cabRZ],[bW,bH,bL-0.2], bodyCol));

  // Front face of cabin (below windshield, above hood — A-pillar face)
  bodyFaces.push(quad([-bW,hoodY,cabFZ],[bW,hoodY,cabFZ],[roofW,roofY,wsTopZ],[-roofW,roofY,wsTopZ], bodyDk));
  // Rear face of cabin (below rear window — C-pillar face)
  bodyFaces.push(quad([-roofW,roofY,rwTopZ],[roofW,roofY,rwTopZ],[bW,hoodY-0.05,cabRZ],[-bW+0.05,hoodY-0.05,cabRZ], bodyDk));

  // Side sills (rocker panels)
  [-bW-0.03,bW+0.03].forEach(x => {
    bodyFaces = bodyFaces.concat(mv(boxFaces(0.08,0.18,8.2,bodyDk),x,0.1,0));
  });

  // Side body panel fill — left (hood level between fender and cabin)
  bodyFaces.push(quad([-bW,bH,cabFZ],[-bW,hoodY,cabFZ],[-bW,hoodY,cabRZ],[-bW,bH,cabRZ], bodyCol));
  // Side body panel fill — right
  bodyFaces.push(quad([bW,bH,cabRZ],[bW,hoodY,cabRZ],[bW,hoodY,cabFZ],[bW,bH,cabFZ], bodyCol));

  // Front fender side fill (nose to cabin)
  bodyFaces.push(quad([-bW,bH,-bL+0.3],[-bW,hoodY,-bL+0.6],[-bW,hoodY,cabFZ],[-bW,bH,cabFZ], bodyCol));
  bodyFaces.push(quad([bW,bH,cabFZ],[bW,hoodY,cabFZ],[bW,hoodY,-bL+0.6],[bW,bH,-bL+0.3], bodyCol));
  // Rear quarter side fill
  bodyFaces.push(quad([-bW,bH,cabRZ],[-bW,hoodY-0.05,cabRZ],[-rearEndW,bH+0.1,rearEndZ-0.3],[-bW,bH,bL-0.2], bodyCol));
  bodyFaces.push(quad([bW,bH,bL-0.2],[rearEndW,bH+0.1,rearEndZ-0.3],[bW,hoodY-0.05,cabRZ],[bW,bH,cabRZ], bodyCol));

  // Wheel arch cutouts (visual — darker recesses)
  const archCol = fc(C.bodyDk, 0.7);
  [{x:-bW,z:-2.8,s:1},{x:bW,z:-2.8,s:-1},{x:-bW,z:2.8,s:1},{x:bW,z:2.8,s:-1}].forEach(a => {
    // Arch is a half-cylinder recess
    for(let i=0;i<6;i++){
      const a0 = (i/6)*Math.PI, a1 = ((i+1)/6)*Math.PI;
      const r = 0.58;
      const y0 = 0.48+r*Math.sin(a0), z0 = a.z+r*Math.cos(a0);
      const y1 = 0.48+r*Math.sin(a1), z1 = a.z+r*Math.cos(a1);
      bodyFaces.push(quad(
        [a.x,y0,z0],[a.x,y1,z1],
        [a.x+a.s*0.06,y1,z1],[a.x+a.s*0.06,y0,z0],
        archCol
      ));
    }
  });

  makeObj('Body Shell','body',0,0.7,0,bodyFaces,0,0.7,0);

  // ══════════════════════════════════════════════════════════════
  //  GLASS — windshield, rear window, side windows
  // ══════════════════════════════════════════════════════════════
  const glassCol = fc(C.glass, 1, 0.35);
  let glassFaces: Face[] = [];

  // Windshield — from hood front edge, angled up to roof front
  glassFaces.push(quad(
    [-bW+0.08, hoodY, cabFZ], [bW-0.08, hoodY, cabFZ],
    [roofW-0.05, roofY-0.02, wsTopZ], [-roofW+0.05, roofY-0.02, wsTopZ],
    glassCol
  ));
  // Rear window
  glassFaces.push(quad(
    [-roofW+0.05, roofY-0.02, rwTopZ], [roofW-0.05, roofY-0.02, rwTopZ],
    [bW-0.1, hoodY-0.05, cabRZ], [-bW+0.1, hoodY-0.05, cabRZ],
    glassCol
  ));
  // Side windows (left front, left rear)
  const swGlass = fc(C.glass, 1, 0.3);
  // Left front
  glassFaces.push(quad(
    [-bW-0.01, hoodY, cabFZ], [-roofW-0.01, roofY, wsTopZ],
    [-roofW-0.01, roofY, 0.7], [-bW-0.01, hoodY, 0.7],
    swGlass
  ));
  // Left rear
  glassFaces.push(quad(
    [-bW-0.01, hoodY, 0.8], [-roofW-0.01, roofY, 0.8],
    [-roofW-0.01, roofY, rwTopZ], [-bW-0.01, hoodY, cabRZ],
    swGlass
  ));
  // Right front
  glassFaces.push(quad(
    [bW+0.01, hoodY, 0.7], [roofW+0.01, roofY, 0.7],
    [roofW+0.01, roofY, wsTopZ], [bW+0.01, hoodY, cabFZ],
    swGlass
  ));
  // Right rear
  glassFaces.push(quad(
    [bW+0.01, hoodY, cabRZ], [roofW+0.01, roofY, rwTopZ],
    [roofW+0.01, roofY, 0.8], [bW+0.01, hoodY, 0.8],
    swGlass
  ));

  makeObj('Glass','glass',0,0,0,glassFaces,0,0,0);

  // ══════════════════════════════════════════════════════════════
  //  WHEELS — bigger, more detailed
  // ══════════════════════════════════════════════════════════════
  const wheelDefs = [
    {n:'FL Wheel',x:-2.18,z:-2.8},{n:'FR Wheel',x:2.18,z:-2.8},
    {n:'RL Wheel',x:-2.18,z:2.8},{n:'RR Wheel',x:2.18,z:2.8},
  ];
  wheelDefs.forEach(wd => {
    let wf: Face[] = [];
    // Tire — bigger radius, thicker
    wf = wf.concat(cylinderFaces(0.50,0.50,0.32,18,fc(C.rubber),1,true));
    // Tire sidewall inner ring
    wf = wf.concat(cylinderFaces(0.38,0.38,0.33,18,fc(C.rubber,0.8),1,true));
    // Rim
    wf = wf.concat(cylinderFaces(0.36,0.36,0.28,10,fc(C.rim),1,true));
    // Hub cap
    wf = wf.concat(cylinderFaces(0.08,0.08,0.30,10,fc(C.chrome),1,true));
    // 5 spokes
    for(let s=0;s<5;s++){
      const a = s*Math.PI*2/5;
      let sf = boxFaces(0.28,0.035,0.035,fc(C.rim));
      sf.forEach(f => { f.verts = f.verts.map(v => {
        const y2=v[1]*Math.cos(a)-v[2]*Math.sin(a), z2=v[1]*Math.sin(a)+v[2]*Math.cos(a);
        return [v[0], y2+Math.sin(a)*0.15, z2+Math.cos(a)*0.15] as Vec3;
      }); });
      wf = wf.concat(sf);
    }
    const obj = makeObj(wd.n,'wheel',wd.x,0.50,wd.z,wf,wd.x,0.50,wd.z);
    obj.isWheel = true;
  });

  // ─ BRAKES
  let brkFaces: Face[] = [];
  [{x:-2.18,z:-2.8},{x:2.18,z:-2.8},{x:-2.18,z:2.8},{x:2.18,z:2.8}].forEach(wp => {
    let df = cylinderFaces(0.30,0.30,0.04,14,fc(C.disc),1,true);
    df.forEach(f => { f.verts = f.verts.map(v => [v[0]+wp.x,v[1]+0.50,v[2]+wp.z] as Vec3); });
    brkFaces = brkFaces.concat(df);
    let cf = boxFaces(0.14,0.15,0.19,fc(C.brake));
    cf.forEach(f => { f.verts = f.verts.map(v => [v[0]+wp.x+(wp.x<0?-0.2:0.2),v[1]+0.60,v[2]+wp.z] as Vec3); });
    brkFaces = brkFaces.concat(cf);
  });
  makeObj('Brake System','chassis',0,0,0,brkFaces,0,0,0);

  // ─ CHASSIS — rails, cross members, floor pan
  let chasFaces: Face[] = [];
  [-1.4,1.4].forEach(x => {
    chasFaces = chasFaces.concat(mv(boxFaces(0.12,0.12,9.2,fc(C.chas)),x,-0.22,0));
  });
  [-3.8,-2.0,-0.5,1.2,2.8,4.0].forEach(z => {
    chasFaces = chasFaces.concat(mv(boxFaces(3.0,0.1,0.1,fc(C.chas)),0,-0.22,z));
  });
  chasFaces = chasFaces.concat(mv(boxFaces(2.8,0.05,7.8,fc(C.floor)),0,-0.16,0));
  chasFaces = chasFaces.concat(mv(boxFaces(3.2,0.9,0.1,fc(C.chas)),0,-0.05,-1.55));
  makeObj('Chassis','chassis',0,0.7,0,chasFaces,0,0.7,0);

  // ─ SUSPENSION
  let susFaces: Face[] = [];
  [{x:-2.18,z:-2.8},{x:2.18,z:-2.8},{x:-2.18,z:2.8},{x:2.18,z:2.8}].forEach(wp => {
    susFaces = susFaces.concat(mv(cylinderFaces(0.04,0.035,0.6,8,fc(C.chas)),wp.x,0.38,wp.z));
    for(let s=0;s<6;s++){
      let rF = cylinderFaces(0.06,0.06,0.03,8,fc(C.spring));
      mv(rF, wp.x, 0.22+s*0.055, wp.z);
      susFaces = susFaces.concat(rF);
    }
    susFaces = susFaces.concat(mv(boxFaces(0.65,0.045,0.06,fc(C.chas)),wp.x*0.62,-0.06,wp.z));
  });
  makeObj('Suspension','chassis',0,0.7,0,susFaces,0,0.7,0);

  // ─ ENGINE
  let engFaces: Face[] = [];
  engFaces = engFaces.concat(boxFaces(2.2,0.7,1.8,fc(C.eng)));
  engFaces = engFaces.concat(mv(boxFaces(2.0,0.22,1.6,fc(C.chas)),0,0.46,0));
  engFaces = engFaces.concat(mv(boxFaces(1.8,0.14,1.4,fc(C.dash)),0,0.59,0));
  engFaces = engFaces.concat(mv(boxFaces(1.6,0.22,0.55,fc(C.engBlue)),0,0.50,-0.72));
  engFaces = engFaces.concat(mv(cylinderFaces(0.22,0.22,0.4,12,fc(C.turbo),1),-0.78,0.30,-0.88));
  engFaces = engFaces.concat(mv(boxFaces(1.9,0.22,1.5,fc(C.dash)),0,-0.46,0));
  engFaces = engFaces.concat(mv(cylinderFaces(0.13,0.13,0.3,10,fc(C.chrome),1,true),0.88,0.10,0.58));
  const engObj = makeObj('Engine','engine',0,1.35,-3.2,engFaces,0,1.35,-3.2);
  engObj.isEngine = true;

  // ─ TRANSMISSION
  makeObj('Transmission','engine',0,1.25,-1.25,boxFaces(1.4,0.55,1.6,fc(C.chas)),0,1.25,-1.25);

  // ─ EXHAUST
  let exhFaces: Face[] = [];
  exhFaces = exhFaces.concat(mv(cylinderFaces(0.065,0.065,1.5,10,fc(C.exh),1,true),0.6,1.28,-2.8));
  exhFaces = exhFaces.concat(mv(cylinderFaces(0.055,0.055,3.2,10,fc(C.exh),1),0.6,0.74,0));
  exhFaces = exhFaces.concat(mv(cylinderFaces(0.16,0.16,0.8,12,fc(C.exh),1),0.6,0.74,2.8));
  [-0.12,0.12].forEach(x => {
    exhFaces = exhFaces.concat(mv(cylinderFaces(0.06,0.068,0.3,10,fc(C.chrome),1),0.6+x,0.74,4.7));
  });
  makeObj('Exhaust','engine',0,0,0,exhFaces,0,0,0);

  // ─ STEERING
  let stFaces: Face[] = [];
  let swF2 = torusFaces(0.19,0.02,22,8,fc(C.rubber));
  swF2.forEach(f => { f.verts = f.verts.map(v => {
    const ry=1.1, y2=v[1]*Math.cos(ry)-v[2]*Math.sin(ry), z2=v[1]*Math.sin(ry)+v[2]*Math.cos(ry);
    return [v[0]+0.5, y2+1.75, z2-1.7] as Vec3;
  }); });
  stFaces = stFaces.concat(swF2);
  let scF = cylinderFaces(0.028,0.028,0.55,8,fc(C.chrome),1);
  scF.forEach(f => { f.verts = f.verts.map(v => {
    const ry=1.1, y2=v[1]*Math.cos(ry)-v[2]*Math.sin(ry), z2=v[1]*Math.sin(ry)+v[2]*Math.cos(ry);
    return [v[0]+0.5, y2+1.48, z2-1.48] as Vec3;
  }); });
  stFaces = stFaces.concat(scF);
  stFaces = stFaces.concat(mv(boxFaces(1.8,0.07,0.07,fc(C.chrome)),-0.1,0.67,-1.62));
  const stObj = makeObj('Steering','interior',0,0,0,stFaces,0,0,0);
  stObj.isSteering = true;

  // ─ DASHBOARD
  let dashFaces: Face[] = [];
  dashFaces = dashFaces.concat(boxFaces(3.5,0.35,0.6,fc(C.dash)));
  dashFaces = dashFaces.concat(mv(boxFaces(3.4,0.07,0.68,fc(C.chas)),0,0.21,0.05));
  dashFaces = dashFaces.concat(mv(boxFaces(0.7,0.18,0.08,{r:10,g:22,b:50,a:1}),-0.5,0.09,-0.28));
  dashFaces = dashFaces.concat(mv(boxFaces(0.55,0.32,0.06,{r:8,g:14,b:30,a:1}),0.3,0.07,-0.29));
  dashFaces = dashFaces.concat(mv(boxFaces(0.55,0.28,2.2,fc(C.dash)),0.33,-0.15,0.75));
  dashFaces = dashFaces.concat(mv(cylinderFaces(0.06,0.06,0.22,8,fc(C.chrome),1),0.33,0.17,0.24));
  makeObj('Dashboard','interior',0,1.58,-1.42,dashFaces,0,1.58,-1.42);

  // ─ SEATS
  let seatFaces: Face[] = [];
  function addSeat(sx: number, sz: number) {
    seatFaces = seatFaces.concat(mv(boxFaces(0.62,0.14,0.68,fc(C.leath)),sx,0.84,sz));
    seatFaces = seatFaces.concat(mv(boxFaces(0.60,0.74,0.11,fc(C.leath)),sx,1.25,sz+0.32));
    seatFaces = seatFaces.concat(mv(boxFaces(0.44,0.24,0.1,fc(C.leath)),sx,1.70,sz+0.34));
    [-0.29,0.29].forEach(bx2 => {
      seatFaces = seatFaces.concat(mv(boxFaces(0.06,0.32,0.6,fc(C.leath)),sx+bx2,1.00,sz));
    });
  }
  addSeat(-0.70,0.20); addSeat(0.70,0.20);
  addSeat(-0.70,1.80); addSeat(0.70,1.80);
  seatFaces = seatFaces.concat(mv(boxFaces(2.2,0.74,0.11,fc(C.leath)),0,1.30,2.50));
  makeObj('Seats','interior',0,0,0,seatFaces,0,0,0);

  // ─ PEDALS
  let pedFaces: Face[] = [];
  [[-0.22,0],[0,0.03],[0.2,0]].forEach(a => {
    pedFaces = pedFaces.concat(mv(boxFaces(0.04,0.32,0.03,fc(C.chas)),a[0]-0.52,1.04,-1.28));
    pedFaces = pedFaces.concat(mv(boxFaces(0.1,0.04,0.13,fc(C.pedal)),a[0]-0.52,0.90,-1.42));
  });
  makeObj('Pedals','interior',0,0,0,pedFaces,0,0,0);

  // ══════════════════════════════════════════════════════════════
  //  GROUND SHADOW — projected ellipse under the car
  // ══════════════════════════════════════════════════════════════
  const shadowFaces: Face[] = [];
  const shadowCol = fc(C.shadow, 1, 0.12);
  const shadowSegs = 24;
  const sRx = 2.6, sRz = 5.2;
  for (let i=0;i<shadowSegs;i++) {
    const a0 = (i/shadowSegs)*Math.PI*2, a1 = ((i+1)/shadowSegs)*Math.PI*2;
    shadowFaces.push(tri(
      [0, -0.01, 0],
      [sRx*Math.cos(a0), -0.01, sRz*Math.sin(a0)],
      [sRx*Math.cos(a1), -0.01, sRz*Math.sin(a1)],
      shadowCol
    ));
  }
  makeObj('Ground Shadow','shadow',0,0.01,0,shadowFaces,0,0.01,0);

  return objects;
}

// ── Explode config ────────────────────────────────────────────────
const EXPLODE: Record<string, Vec3> = {
  'Body Shell': [0,2.2,0], 'Glass': [0,3.0,0],
  'FL Wheel': [-3.0,-0.4,-1.6], 'FR Wheel': [3.0,-0.4,-1.6],
  'RL Wheel': [-3.0,-0.4,1.6], 'RR Wheel': [3.0,-0.4,1.6],
  'Brake System': [0,-1.5,0], 'Engine': [-2.0,0.6,-2.2],
  'Transmission': [2.0,0.5,-1.0], 'Exhaust': [2.0,-1.8,0],
  'Steering': [-2.5,1.2,-0.5], 'Dashboard': [0,1.2,-2.8],
  'Seats': [0,1.8,1.2], 'Pedals': [-2.0,0.8,-3.2],
  'Chassis': [0,-2.4,0], 'Suspension': [0,-1.8,0],
};

const VIS_GROUPS: Record<string, string[]> = {
  body: ['Body Shell'], glass: ['Glass'],
  interior: ['Dashboard','Seats','Pedals','Steering'],
  engine: ['Engine','Transmission','Exhaust'],
  chassis: ['Chassis','Suspension','Brake System'],
  wheel: ['FL Wheel','FR Wheel','RL Wheel','RR Wheel'],
};

// ── Main engine init ──────────────────────────────────────────────
export function initCar3D(
  canvas: HTMLCanvasElement,
  opts: {
    onHover?: (name: string | null, x: number, y: number) => void;
    onSelect?: (name: string | null) => void;
    onFps?: (fps: number) => void;
    bgColor?: string;
  } = {},
): EngineController {
  const ctx = canvas.getContext('2d')!;
  const objects = buildCar();

  let W = 0, H = 0;
  let wireMode = false;
  let selectedName: string | null = null;
  let bodyOpacity = 1.0;
  let highlightedParts: Set<string> | null = null; // null = show all normally
  let explodeT = 0, explodeTarget = 0, explodeSpread = 1.0;
  const animState = { wheels: true, steering: false, idle: true };
  let destroyed = false;
  const bgColor = opts.bgColor || '#f4f6f8';

  // Camera
  const CAM = {
    pos: [0,1.5,14] as Vec3, target: [0,0.5,0] as Vec3, up: [0,1,0] as Vec3,
    fov: 50, near: 0.1, far: 200,
    theta: 0.3, phi: 0.42, dist: 14,
    view: null as Mat4 | null, proj: null as Mat4 | null,
  };

  function buildView() {
    CAM.pos = [
      CAM.target[0]+CAM.dist*Math.sin(CAM.phi)*Math.sin(CAM.theta),
      CAM.target[1]+CAM.dist*Math.cos(CAM.phi),
      CAM.target[2]+CAM.dist*Math.sin(CAM.phi)*Math.cos(CAM.theta),
    ];
    const z = V3.norm(V3.sub(CAM.pos, CAM.target));
    const x = V3.norm(V3.cross(CAM.up, z));
    const y = V3.cross(z, x);
    const tx=-V3.dot(x,CAM.pos), ty=-V3.dot(y,CAM.pos), tz=-V3.dot(z,CAM.pos);
    CAM.view = [x[0],y[0],z[0],0, x[1],y[1],z[1],0, x[2],y[2],z[2],0, tx,ty,tz,1];
  }

  function buildProj(w: number, h: number) {
    const a=h/w, f=1/Math.tan(CAM.fov*Math.PI/360);
    const n=CAM.near, fr=CAM.far;
    CAM.proj = [f*a,0,0,0, 0,f,0,0, 0,0,(fr+n)/(n-fr),-1, 0,0,(2*fr*n)/(n-fr),0];
  }

  function project(v: Vec3): Vec4 | null {
    const cv = M4.applyV(CAM.view!, v);
    const pv = M4.applyV(CAM.proj!, cv);
    if (pv[3]<=0) return null;
    return [(pv[0]/pv[3]+1)*0.5*W, (1-(pv[1]/pv[3]+1)*0.5)*H, pv[2]/pv[3], pv[3]];
  }

  // Lighting
  const lights = [
    {dir:V3.norm([0.6,1.0,0.5] as Vec3), col:[255,240,210], int:1.8},
    {dir:V3.norm([-0.4,0.3,-0.7] as Vec3), col:[64,128,255], int:0.5},
    {dir:V3.norm([0,0.2,1.0] as Vec3), col:[0,200,255], int:0.3},
  ];
  const ambientInt = 0.22;

  function shade(faceCol: FaceCol, nx: number, ny: number, nz: number, alpha: number): string {
    let r=0, g=0, b=0;
    lights.forEach(l => {
      const d = Math.max(0, nx*l.dir[0]+ny*l.dir[1]+nz*l.dir[2]);
      r+=faceCol.r*d*l.col[0]/255*l.int;
      g+=faceCol.g*d*l.col[1]/255*l.int;
      b+=faceCol.b*d*l.col[2]/255*l.int;
    });
    r+=faceCol.r*ambientInt; g+=faceCol.g*ambientInt; b+=faceCol.b*ambientInt;
    return `rgba(${Math.min(255,r|0)},${Math.min(255,g|0)},${Math.min(255,b|0)},${alpha||faceCol.a||1})`;
  }

  function applyExplode(t: number) {
    objects.forEach(obj => {
      const off = EXPLODE[obj.name];
      if (!off) return;
      obj.pos[0] = obj.origPos[0]+off[0]*t*explodeSpread;
      obj.pos[1] = obj.origPos[1]+off[1]*t*explodeSpread;
      obj.pos[2] = obj.origPos[2]+off[2]*t*explodeSpread;
    });
  }

  function renderFrame(dt: number, elapsed: number) {
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const newW = Math.floor(rect.width * dpr);
    const newH = Math.floor(rect.height * dpr);
    if (canvas.width !== newW || canvas.height !== newH) {
      canvas.width = newW; canvas.height = newH;
      W = newW; H = newH;
      buildProj(W, H);
    }

    ctx.clearRect(0,0,W,H);

    // Fill background
    ctx.fillStyle = bgColor;
    ctx.fillRect(0,0,W,H);

    // Grid
    ctx.save();
    ctx.globalAlpha = 0.15;
    for(let gi=-8;gi<=8;gi++){
      const gp0=project([gi*1.5,-0.01,-12]),gp1=project([gi*1.5,-0.01,12]);
      const gq0=project([-12,-0.01,gi*1.5]),gq1=project([12,-0.01,gi*1.5]);
      if(gp0&&gp1){ctx.beginPath();ctx.moveTo(gp0[0],gp0[1]);ctx.lineTo(gp1[0],gp1[1]);ctx.strokeStyle='#6b7280';ctx.lineWidth=0.5;ctx.stroke();}
      if(gq0&&gq1){ctx.beginPath();ctx.moveTo(gq0[0],gq0[1]);ctx.lineTo(gq1[0],gq1[1]);ctx.strokeStyle='#6b7280';ctx.lineWidth=0.5;ctx.stroke();}
    }
    ctx.restore();

    // Collect visible faces
    interface RenderFace { pts: Vec4[]; depth: number; col: string; isGlass: boolean; wire: boolean; alpha: number; isSelected: boolean }
    const allFaces: RenderFace[] = [];

    objects.forEach(obj => {
      if(!obj.visible) return;
      if(obj.group==='shadow' && wireMode) return; // skip shadow in wireframe
      const rX = obj.isWheel ? elapsed*3.5*(animState.wheels?1:0) : 0;
      const idleY = obj.isEngine ? Math.sin(elapsed*25)*0.003*(animState.idle?1:0) : 0;
      const px=obj.pos[0], py=obj.pos[1]+idleY, pz=obj.pos[2];
      const isDimmed = highlightedParts !== null && !highlightedParts.has(obj.name) && obj.group !== 'shadow';
      const dimFactor = isDimmed ? 0.25 : 1.0;
      const bAlpha = (obj.name==='Body Shell' ? bodyOpacity : 1.0) * dimFactor;
      const isSel = obj.name === selectedName && obj.group!=='shadow';

      obj.faces.forEach(face => {
        const pts3d = face.verts.map(v => {
          let vx=v[0], vy=v[1], vz=v[2];
          if(obj.isWheel){
            const y2=vy*Math.cos(rX)-vz*Math.sin(rX), z2=vy*Math.sin(rX)+vz*Math.cos(rX);
            vy=y2; vz=z2;
          }
          return [vx+px, vy+py, vz+pz] as Vec3;
        });

        const e1=V3.sub(pts3d[1],pts3d[0]), e2=V3.sub(pts3d[2],pts3d[0]);
        const n=V3.norm(V3.cross(e1,e2));
        const toEye=V3.sub(CAM.pos,pts3d[0]);
        const facing=V3.dot(n,V3.norm(toEye));
        const isGlass = obj.name==='Glass' || face.col.a<1;
        if(facing<0 && !isGlass) return;

        const pts2d = pts3d.map(project);
        if(pts2d.some(p => !p)) return;
        const valid = pts2d as Vec4[];

        let depth=0;
        valid.forEach(p => { depth+=p[2]; }); depth/=valid.length;

        let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;
        valid.forEach(p => { if(p[0]<minX)minX=p[0]; if(p[0]>maxX)maxX=p[0]; if(p[1]<minY)minY=p[1]; if(p[1]>maxY)maxY=p[1]; });
        if(maxX<-50||minX>W+50||maxY<-50||minY>H+50) return;

        const alpha = face.alpha * bAlpha;
        let col: string;
        if(wireMode){
          col = isSel ? '#24a06b' : (isGlass ? 'rgba(128,200,230,0.6)' : 'rgba(107,114,128,0.5)');
        } else {
          const faceCol = isSel ? {r:36,g:160,b:107,a:alpha} : face.col;
          col = shade(faceCol, Math.abs(n[0]), Math.abs(n[1]), Math.abs(n[2]), alpha);
          if(isGlass) col = `rgba(120,200,230,${Math.min(0.5,alpha*0.5)})`;
        }
        allFaces.push({pts:valid, depth, col, isGlass, wire:wireMode, alpha, isSelected:isSel});
      });
    });

    allFaces.sort((a,b) => b.depth-a.depth);

    allFaces.forEach(f => {
      const pts = f.pts;
      if(pts.length<3) return;
      ctx.beginPath();
      ctx.moveTo(pts[0][0],pts[0][1]);
      for(let i=1;i<pts.length;i++) ctx.lineTo(pts[i][0],pts[i][1]);
      ctx.closePath();
      if(!f.wire){ctx.fillStyle=f.col;ctx.fill();}
      if(f.wire||f.isSelected){
        ctx.strokeStyle = f.isSelected ? 'rgba(36,160,107,0.9)' : 'rgba(107,114,128,0.22)';
        ctx.lineWidth = f.isSelected ? 1.2 : 0.4;
        ctx.stroke();
      } else {
        ctx.strokeStyle = f.isGlass ? 'rgba(120,200,230,0.15)' : 'rgba(0,0,0,0.06)';
        ctx.lineWidth = 0.3;
        ctx.stroke();
      }
    });
  }

  // Picking
  function pickAtMouse(cx: number, cy: number): string | null {
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const canvasX = (cx - rect.left) * dpr;
    const canvasY = (cy - rect.top) * dpr;
    let best: string | null = null, bestDist = 30;
    objects.forEach(obj => {
      if(!obj.visible || obj.group==='shadow') return;
      obj.faces.forEach(face => {
        let cx3=0,cy3=0,cz3=0;
        face.verts.forEach(v => { cx3+=v[0]; cy3+=v[1]; cz3+=v[2]; });
        cx3=cx3/face.verts.length+obj.pos[0];
        cy3=cy3/face.verts.length+obj.pos[1];
        cz3=cz3/face.verts.length+obj.pos[2];
        const p = project([cx3,cy3,cz3]);
        if(!p) return;
        const d = Math.sqrt((p[0]-canvasX)**2 + (p[1]-canvasY)**2);
        if(d<bestDist){ bestDist=d; best=obj.name; }
      });
    });
    return best;
  }

  // Mouse handling
  const mouse = {x:0,y:0,down:false,rdown:false,px:0,py:0};

  function onMouseDown(e: MouseEvent) {
    if(e.button===0) mouse.down=true;
    if(e.button===2) mouse.rdown=true;
    mouse.px=e.clientX; mouse.py=e.clientY;
  }
  function onMouseUp() { mouse.down=false; mouse.rdown=false; }
  function onMouseLeave() { mouse.down=false; mouse.rdown=false; opts.onHover?.(null,0,0); }
  function onContextMenu(e: MouseEvent) { e.preventDefault(); }
  function onMouseMove(e: MouseEvent) {
    const dx=e.clientX-mouse.px, dy=e.clientY-mouse.py;
    if(mouse.down){
      CAM.theta -= dx*0.008;
      CAM.phi = Math.max(0.05, Math.min(Math.PI-0.05, CAM.phi-dy*0.008));
    }
    if(mouse.rdown){
      const s=CAM.dist*0.0012;
      const cosT=Math.cos(CAM.theta), sinT=Math.sin(CAM.theta);
      CAM.target[0] -= (dx*cosT)*s;
      CAM.target[2] += (dx*sinT)*s;
      CAM.target[1] += dy*s;
    }
    mouse.px=e.clientX; mouse.py=e.clientY;
    mouse.x=e.clientX; mouse.y=e.clientY;
    const picked = pickAtMouse(e.clientX, e.clientY);
    canvas.style.cursor = picked ? 'pointer' : 'default';
    opts.onHover?.(picked, e.clientX, e.clientY);
  }
  function onWheel(e: WheelEvent) {
    e.preventDefault();
    CAM.dist = Math.max(2, Math.min(30, CAM.dist*(e.deltaY>0?1.1:0.9)));
  }
  function onClick(e: MouseEvent) {
    const picked = pickAtMouse(e.clientX, e.clientY);
    if(picked){
      selectedName = selectedName===picked ? null : picked;
    } else {
      selectedName = null;
    }
    opts.onSelect?.(selectedName);
  }

  // Touch
  function onTouchStart(e: TouchEvent) { e.preventDefault(); const t=e.touches[0]; mouse.down=true; mouse.px=t.clientX; mouse.py=t.clientY; }
  function onTouchEnd() { mouse.down=false; }
  function onTouchMove(e: TouchEvent) {
    e.preventDefault(); const t=e.touches[0];
    const dx=t.clientX-mouse.px, dy=t.clientY-mouse.py;
    CAM.theta -= dx*0.008;
    CAM.phi = Math.max(0.05, Math.min(Math.PI-0.05, CAM.phi-dy*0.008));
    mouse.px=t.clientX; mouse.py=t.clientY;
  }

  canvas.addEventListener('mousedown', onMouseDown);
  canvas.addEventListener('mouseup', onMouseUp);
  canvas.addEventListener('mouseleave', onMouseLeave);
  canvas.addEventListener('contextmenu', onContextMenu);
  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('wheel', onWheel, {passive:false});
  canvas.addEventListener('click', onClick);
  canvas.addEventListener('touchstart', onTouchStart, {passive:false});
  canvas.addEventListener('touchend', onTouchEnd);
  canvas.addEventListener('touchmove', onTouchMove, {passive:false});

  // Camera tween
  function tweenCamTo(theta: number, phi: number, dist: number, tx: number, ty: number, tz: number) {
    const t0T=CAM.theta, t0P=CAM.phi, t0D=CAM.dist;
    const t0X=CAM.target[0], t0Y=CAM.target[1], t0Z=CAM.target[2];
    let k=0;
    (function step() {
      if(destroyed) return;
      k+=0.04;
      const t = Math.min(k,1);
      CAM.theta = t0T+(theta-t0T)*t;
      CAM.phi = t0P+(phi-t0P)*t;
      CAM.dist = t0D+(dist-t0D)*t;
      CAM.target[0] = t0X+(tx-t0X)*t;
      CAM.target[1] = t0Y+(ty-t0Y)*t;
      CAM.target[2] = t0Z+(tz-t0Z)*t;
      if(k<1) requestAnimationFrame(step);
    })();
  }

  // Main loop
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  W = Math.floor(rect.width * dpr);
  H = Math.floor(rect.height * dpr);
  canvas.width = W; canvas.height = H;
  buildProj(W, H);

  let lastT = 0, frames = 0, fpsAcc = 0;

  function loop(now: number) {
    if(destroyed) return;
    requestAnimationFrame(loop);
    const dt = Math.min((now-lastT)/1000, 0.05); lastT=now;
    frames++; fpsAcc+=dt;
    if(fpsAcc>=1){ opts.onFps?.(frames); frames=0; fpsAcc=0; }
    buildView();
    if(Math.abs(explodeT-explodeTarget)>0.003){
      explodeT += (explodeTarget-explodeT)*0.055;
      applyExplode(explodeT);
    }
    renderFrame(dt, now/1000);
  }
  requestAnimationFrame(loop);

  return {
    setGroupVisibility: (group, visible) => {
      const names = VIS_GROUPS[group] || [];
      objects.forEach(o => { if(names.includes(o.name)) o.visible = visible; });
    },
    setBodyOpacity: (v) => { bodyOpacity = v; },
    toggleExplode: () => { explodeTarget = explodeTarget > 0.5 ? 0 : 1; },
    setExplodeActive: (active) => { explodeTarget = active ? 1 : 0; },
    setExplodeSpread: (v) => { explodeSpread = v; if(explodeT>0) applyExplode(explodeT); },
    getExplodeState: () => ({ active: explodeTarget > 0.5, spread: explodeSpread }),
    setAnimState: (key, on) => { animState[key] = on; },
    tweenCam: (preset) => {
      const p = CAM_PRESETS[preset];
      if(p) tweenCamTo(p[0],p[1],p[2],p[3],p[4],p[5]);
    },
    setWireframe: (on) => { wireMode = on; },
    setShowNormals: (on) => { /* reserved for future */ },
    selectPart: (name) => { selectedName = name; opts.onSelect?.(name); },
    highlightParts: (names) => { highlightedParts = names ? new Set(names) : null; },
    getPartNames: () => Object.keys(PART_INFO),
    getPartInfo: () => PART_INFO,
    destroy: () => {
      destroyed = true;
      canvas.removeEventListener('mousedown', onMouseDown);
      canvas.removeEventListener('mouseup', onMouseUp);
      canvas.removeEventListener('mouseleave', onMouseLeave);
      canvas.removeEventListener('contextmenu', onContextMenu);
      canvas.removeEventListener('mousemove', onMouseMove);
      canvas.removeEventListener('wheel', onWheel);
      canvas.removeEventListener('click', onClick);
      canvas.removeEventListener('touchstart', onTouchStart);
      canvas.removeEventListener('touchend', onTouchEnd);
      canvas.removeEventListener('touchmove', onTouchMove);
    },
  };
}
