/**
 * The 3D screen's scene (Phase 16, UI-SPEC §3): the board, lit by the shaping room's fixed lights, drawn on a
 * canvas this module makes for itself.
 *
 * THIS IS THE ONLY FILE IN THE APP THAT IMPORTS `three` (D-28, research Pattern 5 and Pitfall 5), and the 3D
 * screen reaches it only through `import("./board-scene")`. That keeps three.js — about 130 KB compressed — in
 * one chunk that only /design/3d ever fetches: no other screen, nothing in `lib/` and nothing the CNC export
 * needs ever pulls it in. `components/3d/three-source.test.ts` fails if any other file imports it, and
 * `e2e/prod/three-d.spec.ts` proves no other route loads it.
 *
 * The room (D-10, D-43): a drawn shaping bay, with deep blue walls, a dusty floor and two long strips under the
 * shelves down both side walls, the board lying on a pair of racks. Its numbers are all `lib/geometry/shaping-bay.ts`'s.
 * The strips never move. Only the board's group turns (`setTurn`, 16-07), so a highlight slides across the foam as the
 * board turns rather than riding along with it; its orientation is `turn × BOARD_TO_ROOM` and `boardPlace` rests it on
 * its racks. The viewer moves only by `setViewer` (`viewerPlace`). Zoom and slide (`setCrop`, 16-09) crop the picture the
 * camera takes — `setViewOffset` — and never move it either.
 *
 * The light is two line lights with length and fall-off, closed-form, written into the standard material
 * (`applyBayLight`), so the foam, the fins, the ghost and the racks share it, with a neutral fill for the light coming
 * back off the room. The room itself is painted by a small shader of its own, so its big flat walls cost almost
 * nothing. three's own `RectAreaLight` reads the same in the picture and costs 100 KB of tables (16-18's measurements).
 *
 * It draws on demand — one frame per change, no loop at rest — and counts its frames on the host's
 * `data-frames`, which is how the browser tests know a board was actually drawn.
 */

import {
  AmbientLight,
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  Color,
  DoubleSide,
  ExtrudeGeometry,
  FrontSide,
  Group,
  HemisphereLight,
  Line,
  LineBasicMaterial,
  LineLoop,
  LineSegments,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  NeutralToneMapping,
  PerspectiveCamera,
  PlaneGeometry,
  Quaternion,
  Scene,
  ShaderMaterial,
  Shape,
  SRGBColorSpace,
  TextureLoader,
  Vector2,
  Vector3,
  WebGLRenderer,
  type Material,
} from "three";
import type { BlankGhost } from "@/lib/geometry/blank-ghost";
import type { Vec3 } from "@/lib/geometry/board-surface";
import { FIN_ROOT_SINK, type PlacedFin } from "@/lib/geometry/fin-outline";
import type { renderMesh, stringerLines } from "@/lib/geometry/board-surface-render";
import {
  BAY,
  BAY_PAINT,
  BAY_TREATMENTS,
  bayBackLogo,
  bayLens,
  baySideLogo,
  boardPlace,
  floorPatch,
  freePlace,
  rackAngles,
  rackSeat,
  REST_VIEWER,
  stripEnds,
  viewerPlace,
  type BayLens,
  type BayTreatment,
  type RackSeat,
  type Viewer,
} from "@/lib/geometry/shaping-bay";
import { BOARD_TO_ROOM, quatMultiply, REST_TURN, ROOM_CAMERA, type Quat } from "@/lib/geometry/view-3d";

/** The theme's colours the scene paints with, read from the page's tokens (any CSS colour three can parse). */
export interface SceneColours {
  /** The ground the canvas clears to: `--surf-3d-ground` (darker than the canvas in the light themes). */
  canvas: string;
  /** Raw foam before the lights: `--surf-foam`. */
  foam: string;
  /** The stringer, painted on the foam: `--surf-on-foam`. */
  onFoam: string;
  /** The blank's veil (16-11): `--surf-ink-muted`. The fins are the bay's own dark paint in every theme. */
  inkMuted: string;
  /** The blank's outline (16-11): `--outline-blank-line`. */
  blankLine: string;
}

/** Everything the scene needs to draw one board. */
export interface BoardSceneInput {
  mesh: ReturnType<typeof renderMesh>;
  stringer: ReturnType<typeof stringerLines>;
  /** The board's points relative to `centre`, for its seat on the racks and the lens (`framePointsOf`). */
  framePoints: Vec3[];
  /** The board's turning centre, in the surface's own axes. */
  centre: Vec3;
  /** The wire view's lines (D-42): `wireSegments`, in the surface's own axes. */
  wire: Float32Array;
  colours: SceneColours;
}

/** What the scene tells the screen. `lost` is a drawing context gone for a moment; it may come back. */
export type BoardSceneState = "ready" | "lost" | "no-webgl";

export interface BoardSceneHandle {
  setBoard(input: BoardSceneInput): void;
  /** Turns the board (16-07): its group alone, resting on the racks. The racks and the strips never move. */
  setTurn(turn: Quat): void;
  /** Stands the viewer (D-43): the camera's place and axes inside the room. One frame per call. */
  setViewer(viewer: Viewer): void;
  /**
   * The Room switch (the founder, 2026-11-05): off, the walls, floor, ceiling, strips, shelves and racks are hidden and
   * the canvas clears to the theme's ground. The strips' light on the board stays, so the board reads the same.
   */
  setRoom(on: boolean): void;
  /**
   * How much the board floats free of its racks, 0 to 1: at 1 it turns about its home in any direction (the Room
   * switch off); a glide down to 0 settles it back onto the racks.
   */
  setFree(share: number): void;
  /**
   * Zoom and slide (16-09): shows only `rect` of the picture the camera takes, in the canvas's own dots
   * (`camera.setViewOffset`), or the whole picture for `null`. The camera never moves and neither do the lights,
   * so the board is lit exactly the same zoomed or slid (D-10, D-28). One frame per call.
   */
  setCrop(rect: { x: number; y: number; width: number; height: number } | null): void;
  /**
   * The board's fins (16-10, D-06): each stood on the bottom at its FINS placement, in the board's group so it turns
   * with the board, drawn only while `visible`. Changing either changes nothing else — the turn, the frame and the
   * crop stay as they are. One frame per call.
   */
  setFins(fins: readonly PlacedFin[], visible: boolean): void;
  /**
   * The picked blank as a see-through ghost round the board (16-11, D-08): its glassy skin and its widest line, in the
   * board's group so they turn with it, drawn only while `visible` (and never with no blank, `null`). Drawn after the
   * board and writing no depth, so it never hides the board; the framing stays the board's. One frame per call.
   */
  setGhost(ghost: BlankGhost | null, visible: boolean): void;
  /**
   * Contour Stripes (16-11, D-12): the foam's lit shading replaced by bands that are the reflections of a row of long
   * tubes fixed overhead in the room, so they stay put as the board turns and bend where its shape bends. The
   * stringer, the fins and the ghost draw as usual. One frame per call; the view is untouched.
   */
  setStripes(on: boolean): void;
  /**
   * The wire view (D-42): the foam drawn plain and unlit with the board's lines on it in pure black, near side only —
   * the foam still hides what is behind it. Every line is one device pixel (the founder: "very thin black lines (very
   * small stroke)"), so the picture is drawn at the screen's full density while this is on, and the stringer is one more
   * thin line in place of its ribbon. It replaces Contour Stripes. The fins and the ghost draw as usual. One frame per
   * call; the view is untouched.
   */
  setWire(on: boolean): void;
  /**
   * The theme's colours again (16-11): the ground, the foam, the stringer and stripes, the fins and the ghost repainted
   * in place — nothing is rebuilt and nothing moves, so the turn, the frame, the zoom and the slide stay as they are.
   */
  setColours(colours: SceneColours): void;
  /** Where the camera and the strips' ends are in the room — for the tests, which prove a turn never moves them. */
  roomReport(): RoomReport;
  resize(width: number, height: number): void;
  dispose(): void;
}

/** The camera's position and the four ends of the two strips in the room, each rounded to 1e-6. */
export interface RoomReport {
  camera: Vec3;
  lights: Vec3[];
}

/** How long a lost drawing context may take to come back before the screen says it can't draw (UI-SPEC §8). */
export const CONTEXT_RESTORE_WAIT_MS = 5000;

/** The stringer's width in millimetres (D-07), and how far it is lifted off the foam so it never sinks into it. */
const STRINGER_WIDTH_MM = 3;
const STRINGER_LIFT_MM = 0.3;

/**
 * The treatment in force: `BAY_TREATMENTS.A`, or on a development server one a picture script named through
 * `window.__shaper3dLighting`, so candidates can be shot without editing the app; a production build never reads it.
 */
function bayTreatmentInForce(): BayTreatment {
  if (process.env.NODE_ENV === "production") return BAY_TREATMENTS.A;
  const name = (globalThis as { __shaper3dLighting?: unknown }).__shaper3dLighting;
  return typeof name === "string" && name in BAY_TREATMENTS
    ? BAY_TREATMENTS[name as keyof typeof BAY_TREATMENTS]
    : BAY_TREATMENTS.A;
}

/** The depth range: the room is small beside it, and a board can come close to the eye when it is raised. */
const CAMERA_NEAR_MM = 40;
const CAMERA_FAR_MM = 60000;

/** Where the strips' ends stand, for every material that takes their light: the same four points, never moved. */
interface BayLightUniforms {
  bayA0: { value: Vector3 };
  bayA1: { value: Vector3 };
  bayB0: { value: Vector3 };
  bayB1: { value: Vector3 };
  bayStrength: { value: Color };
}

/**
 * Lights a standard material by the two strips: at each fragment, in metres, `E` is the closed-form light from a line
 * with its ends at L0 and L1 from the fragment, softened near the line so it never blows up; the specular takes the
 * point on the strip nearest the reflected ray. In three 0.186.1 `geometryPosition`, `geometryNormal`,
 * `geometryViewDir` and `material` are in scope at `lights_fragment_end`; `viewMatrix` turns the strip's ends into view
 * space. Run before the material's first use (`onBeforeCompile` runs per material).
 */
function applyBayLight(material: Material, light: BayLightUniforms) {
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, light);
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <lights_physical_pars_fragment>",
        `#include <lights_physical_pars_fragment>
uniform vec3 bayA0;
uniform vec3 bayA1;
uniform vec3 bayB0;
uniform vec3 bayB1;
uniform vec3 bayStrength;
void bayLine(vec3 P, vec3 N, vec3 V, vec3 A, vec3 B, const in PhysicalMaterial material, inout ReflectedLight light) {
  vec3 L0 = ((viewMatrix * vec4(A, 1.0)).xyz - P) * 0.001;
  vec3 L1 = ((viewMatrix * vec4(B, 1.0)).xyz - P) * 0.001;
  float d0 = length(L0);
  float d1 = length(L1);
  float nl = 0.5 * (dot(N, L0) / d0 + dot(N, L1) / d1);
  float E = 2.0 * max(nl, 0.0) / (d0 * d1 + dot(L0, L1) + 0.06);
  light.directDiffuse += bayStrength * E * BRDF_Lambert(material.diffuseColor);
  vec3 R = reflect(-V, N);
  vec3 Ld = L1 - L0;
  float a = dot(R, Ld);
  float t = clamp((dot(R, L0) * a - dot(L0, Ld)) / max(dot(Ld, Ld) - a * a, 1e-5), 0.0, 1.0);
  vec3 Lv = L0 + t * Ld;
  float dist = length(Lv);
  vec3 L = Lv / dist;
  light.directSpecular += bayStrength * max(dot(N, L), 0.0) * BRDF_GGX(L, V, N, material) / (dist * dist + 0.06) * 0.35;
}`,
      )
      .replace(
        "#include <lights_fragment_end>",
        `#include <lights_fragment_end>
bayLine(geometryPosition, geometryNormal, geometryViewDir, bayA0, bayA1, material, reflectedLight);
bayLine(geometryPosition, geometryNormal, geometryViewDir, bayB0, bayB1, material, reflectedLight);`,
      );
  };
  material.needsUpdate = true;
}

/**
 * The room's paint: its own small shader, not lit by the board's light model. Each surface is `albedo × (base + glow ×
 * strip × E)`, with `E` the strips' own. A strip hangs under its shelf, so on the wall behind it the light stops at the
 * shelf: above it the wall stays dim, as in the photo, and only the far strip reaches it (`shelved`). The floor carries its
 * dust (value noise, the domain turned 30° so no grid shows from overhead) and a soft dark patch under the board. `kind`
 * is 0 for a wall or a shelf, 1 for the floor.
 */
const ROOM_VERTEX = `
varying vec3 vP;
varying vec3 vN;
void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vP = world.xyz;
  vN = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;
const ROOM_FRAGMENT = `
uniform vec3 albedo;
uniform vec3 bayA0;
uniform vec3 bayA1;
uniform vec3 bayB0;
uniform vec3 bayB1;
uniform vec3 stripColour;
uniform float base;
uniform float glow;
uniform float kind;
uniform float underShelf;
uniform vec3 patchCentre;
uniform vec2 patchSize;
uniform vec2 patchAxis;
uniform float eyeClear;
varying vec3 vP;
varying vec3 vN;
float lineLight(vec3 P, vec3 N, vec3 A, vec3 B) {
  vec3 L0 = (A - P) * 0.001;
  vec3 L1 = (B - P) * 0.001;
  float d0 = length(L0);
  float d1 = length(L1);
  float nl = 0.5 * (dot(N, L0) / d0 + dot(N, L1) / d1);
  return 2.0 * max(nl, 0.0) / (d0 * d1 + dot(L0, L1) + 0.06);
}
float shelved(vec3 P, vec3 N, float stripZ) {
  float own = smoothstep(900.0, 300.0, abs(P.z - stripZ)) * abs(N.z);
  return mix(1.0, smoothstep(underShelf + 30.0, underShelf - 10.0, P.y), own);
}
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}
void main() {
  if (distance(vP, cameraPosition) < eyeClear) discard;
  vec3 n = normalize(vN);
  float e;
  vec3 c = albedo;
  if (kind > 0.5) {
    e = lineLight(vP, n, bayA0, bayA1) + lineLight(vP, n, bayB0, bayB1);
    vec2 d = mat2(0.866, -0.5, 0.5, 0.866) * vP.xz;
    float s = noise(d * vec2(0.0016, 0.0055) + 3.1) * 0.6 + noise(d * 0.012) * 0.3 + noise(d * 0.05) * 0.1;
    c *= 1.0 - 0.2 * smoothstep(0.34, 0.78, s);
  } else {
    e = lineLight(vP, n, bayA0, bayA1) * shelved(vP, n, bayA0.z) + lineLight(vP, n, bayB0, bayB1) * shelved(vP, n, bayB0.z);
    e *= mix(0.4, 1.0, abs(n.z) + abs(n.y));
  }
  vec3 lit = c * (base + glow * e * stripColour);
  if (kind > 0.5) {
    vec2 d = vP.xz - patchCentre.xz;
    vec2 q = vec2(dot(d, patchAxis), dot(d, vec2(-patchAxis.y, patchAxis.x))) / patchSize;
    lit *= 1.0 - 0.5 * smoothstep(1.0, 0.25, length(q));
  }
  gl_FragColor = vec4(lit, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

/** The wire view's ink: black on the foam whatever the theme (the founder, D-42). */
const WIRE_INK = "#000000";
/** The lit picture's density, drawing pixels per CSS dot: past this a phone spends more than the shading can show. */
const LIT_DENSITY_LIMIT = 2;

/** Drawing pixels per CSS dot. The wire view takes the screen's full density, so a line is one real pixel on any screen. */
function drawingDensity(wire: boolean): number {
  const screen = window.devicePixelRatio || 1;
  return wire ? screen : Math.min(screen, LIT_DENSITY_LIMIT);
}

const NOOP_HANDLE: BoardSceneHandle = {
  setBoard() {},
  setTurn() {},
  setViewer() {},
  setRoom() {},
  setFree() {},
  setCrop() {},
  setFins() {},
  setGhost() {},
  setStripes() {},
  setWire() {},
  setColours() {},
  roomReport: () => ({ camera: [0, 0, 0], lights: [] }),
  resize() {},
  dispose() {},
};

/** One painted stringer line: a 3 mm ribbon lifted off the foam along the line's outward side. */
function ribbon(points: readonly Vec3[], outward: 1 | -1): { ribbon: BufferGeometry; line: BufferGeometry } {
  const n = points.length;
  const strip = new Float32Array(n * 2 * 3);
  const centre = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const a = points[Math.max(0, i - 1)];
    const b = points[Math.min(n - 1, i + 1)];
    // The line runs along the board's middle (y = 0), so its tangent lies in the x–z plane and its outward
    // side is the tangent turned a quarter turn in that plane — up off the deck, down off the bottom, out
    // round the tips.
    const tx = b[0] - a[0];
    const tz = b[2] - a[2];
    const l = Math.hypot(tx, tz) || 1;
    const nx = (-tz / l) * outward;
    const nz = (tx / l) * outward;
    const p = points[i];
    const x = p[0] + nx * STRINGER_LIFT_MM;
    const z = p[2] + nz * STRINGER_LIFT_MM;
    strip.set([x, p[1] - STRINGER_WIDTH_MM / 2, z, x, p[1] + STRINGER_WIDTH_MM / 2, z], i * 6);
    centre.set([x, p[1], z], i * 3);
  }
  const index: number[] = [];
  for (let i = 0; i + 1 < n; i++) {
    const a = 2 * i;
    index.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
  }
  const ribbonGeometry = new BufferGeometry();
  ribbonGeometry.setAttribute("position", new BufferAttribute(strip, 3));
  ribbonGeometry.setIndex(index);
  const lineGeometry = new BufferGeometry();
  lineGeometry.setAttribute("position", new BufferAttribute(centre, 3));
  return { ribbon: ribbonGeometry, line: lineGeometry };
}

/** How much of a fin's thickness each rounded edge takes, on each face: its edges read round, never knife-sharp. */
const FIN_EDGE_ROUND_SHARE = 0.35;
/** A fin's surface: a little glossier than the raw foam, as a glassed fin beside foam is (UI-SPEC § Color). */
const FIN_ROUGHNESS = 0.6;

/**
 * Contour Stripes' density (UI-SPEC §3): one dark-and-light pair for every this many degrees of surface slope. A surface
 * tilted by an angle turns its reflection by twice that, so a pair spans twice this in the reflection's angle round the
 * tubes. 12 divides 180, so the bands meet themselves exactly where the reflection points straight down. A start point,
 * tuned from pictures.
 */
export const STRIPE_PAIR_SLOPE_DEG = 12;

/**
 * The density in force: `STRIPE_PAIR_SLOPE_DEG`, or on a development server a candidate a picture script named through
 * `window.__shaper3dStripeSlopeDeg` (a whole divisor of 180, so the bands still meet where the reflection points
 * straight down), as the lighting candidates are shot. A production build never reads it.
 */
function stripeSlopeInForce(): number {
  if (process.env.NODE_ENV === "production") return STRIPE_PAIR_SLOPE_DEG;
  const deg = (globalThis as { __shaper3dStripeSlopeDeg?: unknown }).__shaper3dStripeSlopeDeg;
  return typeof deg === "number" && Number.isInteger(deg) && deg >= 3 && 180 % deg === 0 ? deg : STRIPE_PAIR_SLOPE_DEG;
}

/**
 * The stripes' shader. For each fragment: the reflection of the line of sight about the surface's normal, in the room's
 * own axes (the board's length lies along the room's x at rest, deck up along y); its angle round the x axis is which
 * overhead tube it sees, so the band index is that angle over one pair's span. Unlit: the band is `onFoam` or `foam`,
 * half and half, its edge softened over about one dot by the angle's own change across the dot (the derivative is taken
 * of the reflection, never of the angle, so the wrap at straight down never shows as a seam). Where the bands crowd
 * finer than a dot (looking along the tubes), they blend to their average rather than shimmer.
 */
const STRIPE_VERTEX = `
varying vec3 vRoomNormal;
varying vec3 vRoomPosition;
void main() {
  vec4 room = modelMatrix * vec4(position, 1.0);
  vRoomPosition = room.xyz;
  vRoomNormal = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * room;
}
`;
const STRIPE_FRAGMENT = `
uniform vec3 foam;
uniform vec3 onFoam;
uniform float pairSpan;
varying vec3 vRoomNormal;
varying vec3 vRoomPosition;
void main() {
  vec3 n = normalize(vRoomNormal);
  vec3 sight = normalize(vRoomPosition - cameraPosition);
  vec3 r = reflect(sight, n);
  float across = max(r.y * r.y + r.z * r.z, 1e-6);
  float t = atan(r.z, r.y) / pairSpan;
  vec3 rx = dFdx(r);
  vec3 ry = dFdy(r);
  float w = (abs(r.y * rx.z - r.z * rx.y) + abs(r.y * ry.z - r.z * ry.y)) / across / pairSpan;
  float s = abs(fract(t) - 0.5);
  float light = clamp((s - 0.25) / max(w, 1e-4) + 0.5, 0.0, 1.0);
  light = mix(light, 0.5, clamp(2.0 * w - 1.0, 0.0, 1.0));
  gl_FragColor = vec4(mix(onFoam, foam, light), 1.0);
  #include <colorspace_fragment>
}
`;

/** The blank's veil (UI-SPEC § Color): `--surf-ink-muted` at 18%, a little glossier than the foam so it reads as glass. */
const GHOST_OPACITY = 0.18;
const GHOST_ROUGHNESS = 0.35;

/**
 * One fin's solid, in the board's own axes: its outline extruded to its thickness with rounded edges, centred on its
 * base line, standing square to the bottom (tilted along the board by the rocker's slope at its centre), with the
 * solid carried `FIN_ROOT_SINK` (plus the rounding) up into the foam so no gap shows under its root.
 */
function finSolid(fin: PlacedFin): { geometry: BufferGeometry; matrix: Matrix4 } {
  const { outline, thickness } = fin;
  const round = thickness * FIN_EDGE_ROUND_SHARE;
  const into = FIN_ROOT_SINK + round;
  const shape = new Shape();
  shape.moveTo(0, -into);
  for (const p of outline.points) shape.lineTo(p.u, p.v);
  shape.lineTo(outline.base, -into);
  shape.closePath();
  const core = Math.max(thickness - 2 * round, thickness * 0.05);
  const geometry = new ExtrudeGeometry(shape, {
    depth: core,
    bevelEnabled: true,
    bevelThickness: round,
    bevelSize: round,
    bevelOffset: -round,
    bevelSegments: 3,
    curveSegments: 1,
  });
  geometry.translate(0, 0, -core / 2);

  // The fin's own axes in the board's: u along the base toward the tail, following the bottom's slope; v straight
  // down off the bottom (square to it); and across its thickness.
  const slope = Math.tan(fin.tiltRad);
  const run = new Vector3(fin.trailing[0] - fin.leading[0], fin.trailing[1] - fin.leading[1], 0);
  if (run.lengthSq() === 0) run.set(-1, 0, 0);
  run.normalize();
  const u = new Vector3(run.x, run.y, slope * run.x).normalize();
  const v = new Vector3(slope, 0, -1).normalize();
  const across = new Vector3().crossVectors(u, v).normalize();
  const middle = new Vector3(
    (fin.leading[0] + fin.trailing[0]) / 2,
    (fin.leading[1] + fin.trailing[1]) / 2,
    fin.rootZ,
  );
  const origin = middle.addScaledVector(u, -outline.base / 2);
  const matrix = new Matrix4().makeBasis(u, v, across).setPosition(origin);
  return { geometry, matrix };
}

/**
 * How close to the eye a shelf is drawn at all. A viewer walking along a wall stands under or over its shelf, which would
 * otherwise fill the picture.
 */
const BENCH_EYE_CLEAR_MM = 900;

/** The founder's two logos, white on nothing (`brand/README.md`): the circle on the side walls, the line logo on the back wall. */
const CIRCLE_LOGO_URL = "/bay-logo-circle.png";
const LINE_LOGO_URL = "/bay-logo-wordmark.png";
/** How much wider the line logo is than it is tall: the box `components/wordmark-path.ts` is drawn in. */
const LINE_LOGO_ASPECT = 806.1 / 100;
/** How far a logo stands off its wall, so the two never fight over which is nearer. */
const LOGO_STANDOFF_MM = 5;

/** The drawn bay and what the scene needs to keep hold of. */
interface DrawnBay {
  room: Group;
  racks: Group;
  light: BayLightUniforms;
  patch: { centre: Vector3; size: Vector2; axis: Vector2 };
  setRacks(seat: RackSeat): void;
  dispose(): void;
}

/**
 * The bay: floor, walls and ceiling as planes drawn from the inside only, so none of them ever stands between the viewer
 * and the board, and a viewer overhead sees down through the ceiling; the shelves and strips down both side
 * walls; and two racks, which never move. The room's colours are its own in every theme (D-43).
 */
function buildBay(treatment: BayTreatment, sharpestAtAnAngle: number, onLogos: () => void): DrawnBay {
  const { lengthMm: L, widthMm: W, heightMm: H } = BAY;
  const owned: { dispose(): void }[] = [];
  const room = new Group();
  const [[a0, a1], [b0, b1]] = stripEnds().map((pair) => pair.map((end) => new Vector3(...end)));
  const light: BayLightUniforms = {
    bayA0: { value: a0 },
    bayA1: { value: a1 },
    bayB0: { value: b0 },
    bayB1: { value: b1 },
    bayStrength: { value: new Color(BAY_PAINT.strip).multiplyScalar(treatment.strip) },
  };
  const patch = { centre: new Vector3(), size: new Vector2(1, 1), axis: new Vector2(1, 0) };

  const paint = (colour: string, base: number, glow: number, kind: 0 | 1, eyeClear = 0) => {
    const material = new ShaderMaterial({
      uniforms: {
        albedo: { value: new Color(colour) },
        stripColour: { value: new Color(BAY_PAINT.strip) },
        bayA0: light.bayA0,
        bayA1: light.bayA1,
        bayB0: light.bayB0,
        bayB1: light.bayB1,
        base: { value: base },
        glow: { value: glow },
        kind: { value: kind },
        underShelf: { value: BAY.benchTopMm - BAY.benchThickMm },
        patchCentre: { value: patch.centre },
        patchSize: { value: patch.size },
        patchAxis: { value: patch.axis },
        eyeClear: { value: eyeClear },
      },
      vertexShader: ROOM_VERTEX,
      fragmentShader: ROOM_FRAGMENT,
      side: FrontSide,
    });
    owned.push(material);
    return material;
  };
  const wall = paint(BAY_PAINT.wall, treatment.wallBase, treatment.wallGlow, 0);
  const floor = paint(treatment.floor, treatment.floorBase, treatment.floorGlow, 1);
  const bench = paint(BAY_PAINT.bench, treatment.benchBase, treatment.benchGlow, 0, BENCH_EYE_CLEAR_MM);
  const ceiling = new MeshBasicMaterial({ color: new Color(BAY_PAINT.ceiling), side: FrontSide });
  const strip = new MeshBasicMaterial({ color: new Color(BAY_PAINT.strip), toneMapped: false });
  owned.push(ceiling, strip);

  const plane = (w: number, h: number, material: Material, at: Vec3, turn: Vec3) => {
    const geometry = new PlaneGeometry(w, h);
    const mesh = new Mesh(geometry, material);
    mesh.position.set(...at);
    mesh.rotation.set(...turn);
    room.add(mesh);
    owned.push(geometry);
  };
  plane(L, W, floor, [0, 0, 0], [-Math.PI / 2, 0, 0]);
  plane(L, W, ceiling, [0, H, 0], [Math.PI / 2, 0, 0]);
  plane(L, H, wall, [0, H / 2, -W / 2], [0, 0, 0]);
  plane(L, H, wall, [0, H / 2, W / 2], [0, Math.PI, 0]);
  plane(W, H, wall, [-L / 2, H / 2, 0], [0, Math.PI / 2, 0]);
  plane(W, H, wall, [L / 2, H / 2, 0], [0, -Math.PI / 2, 0]);

  const box = (parent: Group, size: Vec3, material: Material, at: Vec3) => {
    const geometry = new BoxGeometry(...size);
    const mesh = new Mesh(geometry, material);
    mesh.position.set(...at);
    parent.add(mesh);
    owned.push(geometry);
  };
  for (const side of [-1, 1]) {
    // One long shelf over each strip, its underside catching the strip's light.
    const depth = BAY.benchDepthMm;
    plane(L, depth, bench, [0, BAY.benchTopMm, side * (W / 2 - depth / 2)], [-Math.PI / 2, 0, 0]);
    plane(L, BAY.benchThickMm, bench, [0, BAY.benchTopMm - BAY.benchThickMm / 2, side * (W / 2 - depth)], [0, side > 0 ? Math.PI : 0, 0]);
    plane(L, depth, bench, [0, BAY.benchTopMm - BAY.benchThickMm, side * (W / 2 - depth / 2)], [Math.PI / 2, 0, 0]);
    box(room, [L - 2 * BAY.stripEndInsetMm, BAY.stripFaceMm, BAY.stripFaceMm], strip, [
      0,
      BAY.stripHeightMm,
      side * (W / 2 - BAY.stripInsetMm),
    ]);
  }

  // The logos are pictures, so each one stays hidden until its file has come, and a wall that never gets one stays bare.
  // White and unlit, like the strips, whatever the light on the wall around them.
  let gone = false;
  let logosToCome = 2;
  const loader = new TextureLoader();
  const logo = (url: string, width: number, height: number, places: readonly { at: Vec3; turn: Vec3 }[]) => {
    const material = new MeshBasicMaterial({ transparent: true, depthWrite: false, toneMapped: false, visible: false });
    owned.push(material);
    for (const { at, turn } of places) plane(width, height, material, at, turn);
    loader.load(url, (texture) => {
      if (gone) {
        texture.dispose();
        return;
      }
      texture.colorSpace = SRGBColorSpace;
      texture.anisotropy = sharpestAtAnAngle;
      owned.push(texture);
      material.map = texture;
      material.visible = true;
      material.needsUpdate = true;
      logosToCome -= 1;
      if (logosToCome === 0) onLogos();
    });
  };
  const side = baySideLogo();
  logo(CIRCLE_LOGO_URL, side.sizeMm, side.sizeMm, [
    { at: [0, side.centreYMm, -(W / 2 - LOGO_STANDOFF_MM)], turn: [0, 0, 0] },
    { at: [0, side.centreYMm, W / 2 - LOGO_STANDOFF_MM], turn: [0, Math.PI, 0] },
  ]);
  const back = bayBackLogo(LINE_LOGO_ASPECT);
  logo(LINE_LOGO_URL, back.widthMm, back.heightMm, [{ at: [-(L / 2 - LOGO_STANDOFF_MM), back.centreYMm, 0], turn: [0, Math.PI / 2, 0] }]);

  const racks = new Group();
  room.add(racks);
  const steel = new MeshStandardMaterial({ color: new Color(BAY_PAINT.rack), roughness: 0.7, metalness: 0.1 });
  const pad = new MeshStandardMaterial({ color: new Color(BAY_PAINT.pad), roughness: 0.95, metalness: 0 });
  applyBayLight(steel, light);
  applyBayLight(pad, light);
  owned.push(steel, pad);
  const stands = [-1, 1].map(() => {
    const stand = new Group();
    const top = BAY.rackTopMm;
    const headDepth = 2 * BAY.padHalfDepthMm;
    box(stand, [60, top - 50, 60], steel, [0, (top - 50) / 2, 0]);
    box(stand, [headDepth, 50, 2 * BAY.padHalfSpanMm], pad, [0, top - 25, 0]);
    box(stand, [70, 40, 620], steel, [0, 20, 0]);
    box(stand, [420, 40, 70], steel, [0, 20, 0]);
    racks.add(stand);
    return stand;
  });

  return {
    room,
    racks,
    light,
    patch,
    setRacks(seat) {
      stands[0].position.x = -seat.at;
      stands[1].position.x = seat.at;
    },
    dispose() {
      gone = true;
      for (const d of owned) d.dispose();
    },
  };
}

/**
 * Makes the scene's canvas inside `host`, draws `input`'s board in the room, and returns the handle the screen
 * drives it with. With no drawing context to be had it reports `no-webgl`, removes its canvas and returns a
 * handle that does nothing. Each call makes its own canvas, so React's development double-mount never re-uses a
 * canvas whose context was given up (research Pitfall 4).
 */
export function mountBoardScene(
  host: HTMLElement,
  input: BoardSceneInput,
  events: { onState(state: BoardSceneState): void },
): BoardSceneHandle {
  const canvas = document.createElement("canvas");
  canvas.setAttribute("aria-hidden", "true");
  canvas.style.display = "block";
  canvas.style.width = "100%";
  canvas.style.height = "100%";
  host.appendChild(canvas);

  let renderer: WebGLRenderer;
  try {
    renderer = new WebGLRenderer({ canvas, antialias: true });
  } catch {
    canvas.remove();
    events.onState("no-webgl");
    return NOOP_HANDLE;
  }
  renderer.setPixelRatio(drawingDensity(false));
  renderer.toneMapping = NeutralToneMapping;
  const treatment = bayTreatmentInForce();
  renderer.toneMappingExposure = 1;

  const scene = new Scene();
  const camera = new PerspectiveCamera(ROOM_CAMERA.fovDeg, 1, CAMERA_NEAR_MM, CAMERA_FAR_MM);

  // The room and its light, placed once (D-10, D-43). The strips never move; the fill stands for the room's own light.
  const bay = buildBay(treatment, renderer.capabilities.getMaxAnisotropy(), () => {
    host.dataset.bayLogos = "ready";
    schedule();
  });
  scene.add(bay.room);
  scene.add(new AmbientLight(treatment.fillColour, treatment.fill));
  scene.add(new HemisphereLight(BAY_PAINT.hemisphereSky, BAY_PAINT.hemisphereGround, treatment.bounce * 3));

  // The board: `turned` carries the turn and its place on the racks; `centred` moves the surface so it turns about its
  // own middle.
  const turned = new Group();
  const centred = new Group();
  turned.add(centred);
  scene.add(turned);
  // The fins (16-10): in the board's own axes beside the foam, so they turn with it.
  const finGroup = new Group();
  // The blank's ghost (16-11): likewise in the board's own axes, hidden until the Blank box is ticked.
  const ghostGroup = new Group();
  ghostGroup.visible = false;

  let current = input;
  let turn: Quat = REST_TURN;
  let viewer: Viewer = REST_VIEWER;
  let seat: RackSeat = rackSeat(current.framePoints);
  let lens: BayLens = { distanceMm: BAY.nearestMm, lensDeg: ROOM_CAMERA.fovDeg };
  let freeShare = 0;
  let size = { width: Math.max(1, host.clientWidth), height: Math.max(1, host.clientHeight) };
  let disposables: { dispose(): void }[] = [];
  let fins: readonly PlacedFin[] = [];
  let finDisposables: { dispose(): void }[] = [];
  let ghost: BlankGhost | null = null;
  let ghostDisposables: { dispose(): void }[] = [];
  let stripes = false;
  let wire = false;
  /** The foam and its three looks — lit by the room, striped, or plain under the wire view's lines. */
  let foamMesh: Mesh | null = null;
  let foamMaterials: { lit: MeshStandardMaterial; striped: ShaderMaterial; plain: MeshBasicMaterial } | null = null;
  let wireMesh: LineSegments | null = null;
  /** The stringer as the wire view changes it: its ribbon hidden, and its one-dot line in the wire's pen. */
  let stringerDrawn: { ribbons: Mesh[]; lines: Line[]; pen: LineBasicMaterial; wirePen: LineBasicMaterial } | null = null;
  /** Every colour the scene paints with and the theme's token it comes from, so a theme change repaints in place. */
  type Tint = [Color, keyof SceneColours];
  let boardTints: Tint[] = [];
  let ghostTints: Tint[] = [];
  let pending = 0;
  let frames = 0;
  let lost = false;
  let reportedReady = false;
  let restoreTimer: ReturnType<typeof setTimeout> | null = null;
  let disposed = false;

  /** The foam's look for the switches as they stand, and the wire view's lines with it. */
  const foamLook = () => {
    if (foamMesh && foamMaterials) {
      foamMesh.material = wire ? foamMaterials.plain : stripes ? foamMaterials.striped : foamMaterials.lit;
    }
    if (wireMesh) wireMesh.visible = wire;
    if (stringerDrawn) {
      for (const ribbon of stringerDrawn.ribbons) ribbon.visible = !wire;
      for (const line of stringerDrawn.lines) line.material = wire ? stringerDrawn.wirePen : stringerDrawn.pen;
    }
  };

  /** The board's group turned by `turn` and rested on its racks. */
  const placeBoard = () => {
    const q = quatMultiply(turn, BOARD_TO_ROOM);
    turned.quaternion.copy(new Quaternion(q[0], q[1], q[2], q[3]));
    const angles = rackAngles(turn);
    const racked = boardPlace(current.framePoints, angles, seat);
    const free = freePlace(seat);
    turned.position.set(
      racked[0] + (free[0] - racked[0]) * freeShare,
      racked[1] + (free[1] - racked[1]) * freeShare,
      racked[2] + (free[2] - racked[2]) * freeShare,
    );
    const under = floorPatch(racked, angles, seat);
    bay.patch.centre.set(under.centre[0], 0, under.centre[1]);
    bay.patch.size.set(under.size[0], under.size[1]);
    bay.patch.axis.set(under.axis[0], under.axis[1]);
  };

  /** The camera where the viewer stands, for this window's lens. Its aim and its crop are the only things it carries. */
  const placeViewer = () => {
    const place = viewerPlace(viewer, lens, seat);
    camera.position.set(...place.position);
    camera.up.set(...place.axes.up);
    camera.lookAt(
      place.position[0] + place.axes.forward[0],
      place.position[1] + place.axes.forward[1],
      place.position[2] + place.axes.forward[2],
    );
    camera.fov = place.lensDeg;
    camera.aspect = size.width / size.height;
    camera.updateProjectionMatrix();
  };

  /** The lens for this board and this window: on a new board or a new size only. */
  const fitLens = () => {
    seat = rackSeat(current.framePoints);
    bay.setRacks(seat);
    lens = bayLens(current.framePoints, seat, size.width / size.height);
  };

  /** The fins' solids, made again from `fins`, in the bay's dark fin paint in every theme (F5). */
  const buildFins = () => {
    for (const d of finDisposables) d.dispose();
    finDisposables = [];
    finGroup.clear();
    if (fins.length === 0) return;
    const material = new MeshStandardMaterial({ color: new Color(BAY_PAINT.fin), roughness: FIN_ROUGHNESS, metalness: 0 });
    applyBayLight(material, bay.light);
    finDisposables.push(material);
    for (const fin of fins) {
      const { geometry, matrix } = finSolid(fin);
      const mesh = new Mesh(geometry, material);
      mesh.matrixAutoUpdate = false;
      mesh.matrix.copy(matrix);
      finGroup.add(mesh);
      finDisposables.push(geometry);
    }
  };

  /**
   * The blank's ghost, made again from `ghost`: a lit, see-through skin drawn after the board (`renderOrder`) that
   * writes no depth, so the board always shows through it; and its widest line, one dot wide, after that.
   */
  const buildGhost = () => {
    for (const d of ghostDisposables) d.dispose();
    ghostDisposables = [];
    ghostTints = [];
    ghostGroup.clear();
    if (!ghost) return;
    const geometry = new BufferGeometry();
    geometry.setAttribute("position", new BufferAttribute(ghost.positions, 3));
    geometry.setAttribute("normal", new BufferAttribute(ghost.normals, 3));
    geometry.setIndex(new BufferAttribute(ghost.indices, 1));
    const veil = new MeshStandardMaterial({
      color: new Color(current.colours.inkMuted),
      roughness: GHOST_ROUGHNESS,
      metalness: 0,
      transparent: true,
      opacity: GHOST_OPACITY,
      depthWrite: false,
    });
    applyBayLight(veil, bay.light);
    const skin = new Mesh(geometry, veil);
    skin.renderOrder = 1;
    const lineGeometry = new BufferGeometry();
    lineGeometry.setAttribute("position", new BufferAttribute(Float32Array.from(ghost.outline.flat()), 3));
    const pen = new LineBasicMaterial({ color: new Color(current.colours.blankLine), toneMapped: false });
    const line = new LineLoop(lineGeometry, pen);
    line.renderOrder = 2;
    ghostGroup.add(skin, line);
    ghostDisposables.push(geometry, veil, lineGeometry, pen);
    ghostTints = [
      [veil.color, "inkMuted"],
      [pen.color, "blankLine"],
    ];
  };

  const build = () => {
    for (const d of disposables) d.dispose();
    disposables = [];
    centred.clear();
    const { mesh, stringer, centre, colours } = current;
    renderer.setClearColor(new Color(colours.canvas), 1);

    const geometry = new BufferGeometry();
    geometry.setAttribute("position", new BufferAttribute(mesh.positions, 3));
    geometry.setAttribute("normal", new BufferAttribute(mesh.normals, 3));
    geometry.setIndex(new BufferAttribute(mesh.indices, 1));
    const foam = new MeshStandardMaterial({ color: new Color(colours.foam), roughness: 0.92, metalness: 0 });
    applyBayLight(foam, bay.light);
    const striped = new ShaderMaterial({
      uniforms: {
        foam: { value: new Color(colours.foam) },
        onFoam: { value: new Color(colours.onFoam) },
        pairSpan: { value: (2 * stripeSlopeInForce() * Math.PI) / 180 },
      },
      vertexShader: STRIPE_VERTEX,
      fragmentShader: STRIPE_FRAGMENT,
    });
    // The wire view's foam: unlit, and set a hair back, so the lines lying on its skin draw and the far side's don't.
    const plain = new MeshBasicMaterial({
      color: new Color(colours.foam),
      toneMapped: false,
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 2,
    });
    foamMaterials = { lit: foam, striped, plain };
    foamMesh = new Mesh(geometry, foam);
    centred.add(foamMesh);
    disposables.push(geometry, foam, striped, plain);
    boardTints = [
      [foam.color, "foam"],
      [striped.uniforms.foam.value as Color, "foam"],
      [striped.uniforms.onFoam.value as Color, "onFoam"],
      [plain.color, "foam"],
    ];

    // The wire view's lines (D-42): one set of lines, pure black in every theme and never tinted by one. A line in
    // this drawing context is always one pixel of the drawing, so the stroke is set by the picture's density.
    const wireGeometry = new BufferGeometry();
    wireGeometry.setAttribute("position", new BufferAttribute(current.wire, 3));
    const wirePen = new LineBasicMaterial({ color: new Color(WIRE_INK), toneMapped: false });
    wireMesh = new LineSegments(wireGeometry, wirePen);
    centred.add(wireMesh);
    disposables.push(wireGeometry, wirePen);

    // The stringer (D-07): a 3 mm ribbon so it has a real stringer's width up close, and a one-dot line on the
    // same points so it is never thinner than a dot far away. Painted, so the lights don't shade it.
    const paint = new MeshBasicMaterial({
      color: new Color(colours.onFoam),
      side: DoubleSide,
      toneMapped: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -4,
    });
    const pen = new LineBasicMaterial({ color: new Color(colours.onFoam), toneMapped: false });
    disposables.push(paint, pen);
    boardTints.push([paint.color, "onFoam"], [pen.color, "onFoam"]);
    stringerDrawn = { ribbons: [], lines: [], pen, wirePen };
    for (const [points, outward] of [
      [stringer.deck, 1],
      [stringer.bottom, -1],
    ] as const) {
      if (points.length < 2) continue;
      const g = ribbon(points, outward);
      const drawnRibbon = new Mesh(g.ribbon, paint);
      const drawnLine = new Line(g.line, pen);
      centred.add(drawnRibbon, drawnLine);
      stringerDrawn.ribbons.push(drawnRibbon);
      stringerDrawn.lines.push(drawnLine);
      disposables.push(g.ribbon, g.line);
    }
    foamLook();
    centred.add(finGroup, ghostGroup);
    buildFins();
    buildGhost();
    centred.position.set(-centre[0], -centre[1], -centre[2]);
    fitLens();
    placeBoard();
    placeViewer();
  };

  const round = (v: number) => Math.round(v * 1e6) / 1e6 + 0;
  const roomReport = (): RoomReport => ({
    camera: [round(camera.position.x), round(camera.position.y), round(camera.position.z)],
    lights: [bay.light.bayA0, bay.light.bayA1, bay.light.bayB0, bay.light.bayB1].map(({ value }) => [
      round(value.x),
      round(value.y),
      round(value.z),
    ]),
  });

  const draw = () => {
    pending = 0;
    if (disposed || lost) return;
    renderer.render(scene, camera);
    frames += 1;
    host.dataset.frames = String(frames);
    // Read back from the room's own objects after every frame, so a test can see they never moved.
    host.dataset.room = JSON.stringify(roomReport());
    host.dataset.place = turned.position.toArray().map((v) => v.toFixed(1)).join(" ");
    host.dataset.racks = ((-bay.racks.rotation.y * 180) / Math.PI).toFixed(2);
    if (!reportedReady) {
      reportedReady = true;
      events.onState("ready");
    }
  };
  const schedule = () => {
    if (pending || disposed || lost) return;
    pending = requestAnimationFrame(draw);
  };

  // A drawing context can be taken away (a phone backgrounding the tab, a graphics driver resetting). Keep the
  // board and the view, wait for it to come back, and only give up after CONTEXT_RESTORE_WAIT_MS. three's own
  // listeners run first (it registered them when it was made): they stop it drawing, and on the way back they
  // make a fresh context, which this rebuilds the board's buffers into.
  const onLost = (event: Event) => {
    event.preventDefault();
    lost = true;
    if (pending) cancelAnimationFrame(pending);
    pending = 0;
    events.onState("lost");
    restoreTimer = setTimeout(() => {
      restoreTimer = null;
      if (lost && !disposed) events.onState("no-webgl");
    }, CONTEXT_RESTORE_WAIT_MS);
  };
  const onRestored = () => {
    if (restoreTimer) clearTimeout(restoreTimer);
    restoreTimer = null;
    lost = false;
    // A Wire View press while the context was gone could not reach the renderer.
    renderer.setPixelRatio(drawingDensity(wire));
    build();
    reportedReady = false;
    schedule();
  };
  canvas.addEventListener("webglcontextlost", onLost);
  canvas.addEventListener("webglcontextrestored", onRestored);

  renderer.setSize(size.width, size.height, false);
  build();
  host.dataset.room = JSON.stringify(roomReport());
  schedule();

  return {
    setBoard(next) {
      if (disposed) return;
      current = next;
      if (lost) return;
      build();
      schedule();
    },
    setTurn(next) {
      if (disposed) return;
      turn = next;
      placeBoard();
      schedule();
    },
    setViewer(next) {
      if (disposed) return;
      viewer = next;
      placeViewer();
      schedule();
    },
    setRoom(on) {
      if (disposed) return;
      bay.room.visible = on;
      schedule();
    },
    setFree(share) {
      if (disposed) return;
      freeShare = share;
      placeBoard();
      schedule();
    },
    setCrop(rect) {
      if (disposed) return;
      // A crop of the camera's own picture: its position, its aim and the lights are untouched.
      if (rect) camera.setViewOffset(size.width, size.height, rect.x, rect.y, rect.width, rect.height);
      else camera.clearViewOffset();
      schedule();
    },
    setFins(next, visible) {
      if (disposed) return;
      if (next !== fins) {
        fins = next;
        if (!lost) buildFins();
      }
      finGroup.visible = visible;
      schedule();
    },
    setStripes(on) {
      if (disposed) return;
      stripes = on;
      foamLook();
      schedule();
    },
    setWire(on) {
      if (disposed) return;
      wire = on;
      foamLook();
      if (!lost) renderer.setPixelRatio(drawingDensity(on));
      schedule();
    },
    setColours(colours) {
      if (disposed) return;
      current = { ...current, colours };
      renderer.setClearColor(new Color(colours.canvas), 1);
      for (const [color, token] of [...boardTints, ...ghostTints]) color.set(colours[token]);
      schedule();
    },
    setGhost(next, visible) {
      if (disposed) return;
      if (next !== ghost) {
        ghost = next;
        if (!lost) buildGhost();
      }
      ghostGroup.visible = visible && ghost !== null;
      schedule();
    },
    roomReport,
    resize(width, height) {
      if (disposed || !(width > 0) || !(height > 0)) return;
      if (width === size.width && height === size.height) return;
      size = { width, height };
      renderer.setSize(width, height, false);
      fitLens();
      placeBoard();
      placeViewer();
      schedule();
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      if (pending) cancelAnimationFrame(pending);
      if (restoreTimer) clearTimeout(restoreTimer);
      canvas.removeEventListener("webglcontextlost", onLost);
      canvas.removeEventListener("webglcontextrestored", onRestored);
      for (const d of [...disposables, ...finDisposables, ...ghostDisposables]) d.dispose();
      bay.dispose();
      disposables = [];
      finDisposables = [];
      ghostDisposables = [];
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
    },
  };
}
