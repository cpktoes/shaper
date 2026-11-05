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
 * The room (D-10): the camera is placed once, 50° above the floor on the shaper's side, and never moves; the four
 * lights are placed once and never move. Only the board's group turns (`setTurn`, 16-07), so a highlight
 * slides across the foam as the board turns rather than riding along with it. The group's orientation is
 * `turn × BOARD_TO_ROOM` and its place in front of the camera is `frameAtOne`'s (lib/geometry/view-3d.ts). Zoom and
 * slide (`setCrop`, 16-09) crop the picture the camera takes — `setViewOffset` — and never move it either.
 *
 * It draws on demand — one frame per change, no loop at rest — and counts its frames on the host's
 * `data-frames`, which is how the browser tests know a board was actually drawn.
 */

import {
  AmbientLight,
  BufferAttribute,
  BufferGeometry,
  Color,
  DirectionalLight,
  DoubleSide,
  ExtrudeGeometry,
  Group,
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
  Quaternion,
  Scene,
  ShaderMaterial,
  Shape,
  Vector3,
  WebGLRenderer,
} from "three";
import type { BlankGhost } from "@/lib/geometry/blank-ghost";
import type { Vec3 } from "@/lib/geometry/board-surface";
import { FIN_ROOT_SINK, type PlacedFin } from "@/lib/geometry/fin-outline";
import type { renderMesh, stringerLines } from "@/lib/geometry/board-surface-render";
import {
  BOARD_TO_ROOM,
  frameAtOne,
  quatMultiply,
  REST_TURN,
  ROOM_CAMERA,
  roomCameraAxes,
  type Frame,
  type Quat,
} from "@/lib/geometry/view-3d";

/** The theme's colours the scene paints with, read from the page's tokens (any CSS colour three can parse). */
export interface SceneColours {
  /** The ground the canvas clears to: `--surf-3d-ground` (darker than the canvas in the light themes). */
  canvas: string;
  /** Raw foam before the lights: `--surf-foam`. */
  foam: string;
  /** The stringer, painted on the foam: `--surf-on-foam`. */
  onFoam: string;
  /** Fins and the blank's veil (16-10, 16-11): `--surf-ink-muted`. */
  inkMuted: string;
  /** The blank's outline (16-11): `--outline-blank-line`. */
  blankLine: string;
}

/** Everything the scene needs to draw one board. */
export interface BoardSceneInput {
  mesh: ReturnType<typeof renderMesh>;
  stringer: ReturnType<typeof stringerLines>;
  /** The board's points relative to `centre`, for framing at 1x (`framePointsOf`). */
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
  /**
   * Turns the board (16-07): the board's group only — the camera and the lights never move (D-10). With a
   * `frame` the board is also placed there in front of the camera (a view button's re-framing at 1x); without
   * one it keeps its place.
   */
  setTurn(turn: Quat, frame?: Frame): void;
  /** Where the board sits in front of the camera now. */
  frame(): Frame;
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
   * The wire view (D-42): the foam drawn plain and unlit with the board's lines on it, near side only — the foam still
   * hides what is behind it. It replaces Contour Stripes while it is on. The stringer, the fins and the ghost draw as
   * usual. One frame per call; the view is untouched.
   */
  setWire(on: boolean): void;
  /**
   * The theme's colours again (16-11): the ground, the foam, the stringer and stripes, the fins and the ghost repainted
   * in place — nothing is rebuilt and nothing moves, so the turn, the frame, the zoom and the slide stay as they are.
   */
  setColours(colours: SceneColours): void;
  /** Where the camera and the four lights are in the room — for the tests, which prove a turn never moves them. */
  roomReport(): RoomReport;
  resize(width: number, height: number): void;
  dispose(): void;
}

/** The camera's position and the four lights' positions in the room, each rounded to 1e-6. */
export interface RoomReport {
  camera: Vec3;
  lights: Vec3[];
}

/** How long a lost drawing context may take to come back before the screen says it can't draw (UI-SPEC §8). */
export const CONTEXT_RESTORE_WAIT_MS = 5000;

/** The stringer's width in millimetres (D-07), and how far it is lifted off the foam so it never sinks into it. */
const STRINGER_WIDTH_MM = 3;
const STRINGER_LIFT_MM = 0.3;

/** Where the camera stands, in millimetres from the room's centre along its view axis. Never changes. */
const CAMERA_STANDOFF_MM = 4000;

/**
 * The room's lighting: each light's strength as a share of one key level, and the tone curve's exposure. Three's
 * lights are in physical units, so a white surface square to a light of strength π shows its own colour. The
 * contract's starting shares (UI-SPEC §3) were near rail 1.0, far rail 0.7, overhead 0.45 and fill 0.2. There is no
 * hemisphere or floor-bounce light in this room; the fill is the only light that reaches a face turned away from
 * every tube.
 *
 * The named settings are the candidates shot for the founder (16-06, the first look and the second). `ROOM_LIGHTING`
 * is the one every theme uses. On a development server only, a picture script may pick another by name through
 * `window.__shaper3dLighting`, so candidates can be shot without editing the app; a production build never reads it.
 */
export interface RoomLighting {
  key: number;
  nearRail: number;
  farRail: number;
  overhead: number;
  fill: number;
  exposure: number;
}

export const LIGHTING_CANDIDATES = {
  /** The first look (2026-11-04): the overhead lowered from 0.45 to 0.2 so the far rail's edge read. */
  firstLook: { key: 2.9, nearRail: 1.0, farRail: 0.7, overhead: 0.2, fill: 0.2, exposure: 1 },
  /** A: the overhead off — the two low rail tubes and the fill alone. */
  A: { key: 2.9, nearRail: 1.0, farRail: 0.7, overhead: 0, fill: 0.2, exposure: 1 },
  /** B: A with the fill lowered, so the shadow side of the dome and the rail's roll go darker. */
  B: { key: 2.9, nearRail: 1.0, farRail: 0.7, overhead: 0, fill: 0.08, exposure: 1 },
  /** C: B with the far tube lowered too (this room has no floor bounce to lower): the strongest shadowing. */
  C: { key: 2.9, nearRail: 1.0, farRail: 0.45, overhead: 0, fill: 0.04, exposure: 1 },
} as const satisfies Record<string, RoomLighting>;

/**
 * The lighting the screen uses, in every theme: B, the two rail tubes with the overhead off and the fill lowered.
 * The founder at the first look: "The shadowing can be stronger. Maybe no overhead light just the side lights."; and
 * from the candidates picture: "I like the look of B best with ground 2, even on the slate/dark background."
 */
export const ROOM_LIGHTING: RoomLighting = LIGHTING_CANDIDATES.B;

/** The tubes' colours: neutral white near 5000 K for the rail tubes, a little warmer overhead (UI-SPEC §3). */
const LIGHT_COLOURS = { rail: "#fff4e8", overhead: "#ffeedd", fill: "#ffffff" } as const;

/** The lighting in force: `ROOM_LIGHTING`, or on a development server a candidate a picture script named. */
function lightingInForce(): RoomLighting {
  if (process.env.NODE_ENV === "production") return ROOM_LIGHTING;
  const name = (globalThis as { __shaper3dLighting?: unknown }).__shaper3dLighting;
  return typeof name === "string" && name in LIGHTING_CANDIDATES
    ? LIGHTING_CANDIDATES[name as keyof typeof LIGHTING_CANDIDATES]
    : ROOM_LIGHTING;
}

/** The rail lights' height above the deck's plane (UI-SPEC §3). */
const RAIL_LIGHT_ELEVATION_DEG = 8;

const NOOP_HANDLE: BoardSceneHandle = {
  setBoard() {},
  setTurn() {},
  frame: () => ({ distance: CAMERA_STANDOFF_MM, right: 0, up: 0 }),
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
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.toneMapping = NeutralToneMapping;
  const lighting = lightingInForce();
  renderer.toneMappingExposure = lighting.exposure;

  const scene = new Scene();
  const axes = roomCameraAxes();
  const camera = new PerspectiveCamera(ROOM_CAMERA.fovDeg, 1, 1, 10);
  const cameraAt = new Vector3(...axes.forward).multiplyScalar(-CAMERA_STANDOFF_MM);
  camera.position.copy(cameraAt);
  camera.up.set(0, 1, 0);
  camera.lookAt(0, 0, 0);

  // The room's lights, placed once (D-10). A directional light shines from its position toward its target, the
  // room's centre. The near rail is the room's +Z side, the camera's side.
  const e = (RAIL_LIGHT_ELEVATION_DEG * Math.PI) / 180;
  const nearRail = new DirectionalLight(LIGHT_COLOURS.rail, lighting.nearRail * lighting.key);
  nearRail.position.set(0, Math.sin(e), Math.cos(e));
  const farRail = new DirectionalLight(LIGHT_COLOURS.rail, lighting.farRail * lighting.key);
  farRail.position.set(0, Math.sin(e), -Math.cos(e));
  const overhead = new DirectionalLight(LIGHT_COLOURS.overhead, lighting.overhead * lighting.key);
  overhead.position.set(0, 1, 0);
  const fill = new AmbientLight(LIGHT_COLOURS.fill, lighting.fill * lighting.key);
  scene.add(nearRail, farRail, overhead, fill);

  // The board: `turned` carries the turn and the place in front of the camera; `centred` moves the surface so it
  // turns about its own middle.
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
  let frame: Frame = { distance: CAMERA_STANDOFF_MM, right: 0, up: 0 };
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
  /** Every colour the scene paints with and the theme's token it comes from, so a theme change repaints in place. */
  type Tint = [Color, keyof SceneColours];
  let boardTints: Tint[] = [];
  let finTints: Tint[] = [];
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
  };

  /** The board's group at `frame`, turned by `turn`: the only thing in the room that ever moves. */
  const placeBoard = (reframe = true) => {
    if (reframe) frame = frameAtOne(current.framePoints, turn, size.width / size.height);
    const q = quatMultiply(turn, BOARD_TO_ROOM);
    turned.quaternion.copy(new Quaternion(q[0], q[1], q[2], q[3]));
    turned.position
      .copy(cameraAt)
      .addScaledVector(new Vector3(...axes.forward), frame.distance)
      .addScaledVector(new Vector3(...axes.right), frame.right)
      .addScaledVector(new Vector3(...axes.up), frame.up);
    // The board stays within its own reach of its centre whichever way it turns, so the depth range can hug it.
    let reach = 1;
    for (const p of current.framePoints) reach = Math.max(reach, Math.hypot(p[0], p[1], p[2]));
    camera.near = Math.max(1, frame.distance - reach * 1.5);
    camera.far = frame.distance + reach * 1.5;
    camera.aspect = size.width / size.height;
    camera.updateProjectionMatrix();
  };

  /** The fins' solids, made again from `fins` in the board's fin colour. */
  const buildFins = () => {
    for (const d of finDisposables) d.dispose();
    finDisposables = [];
    finTints = [];
    finGroup.clear();
    if (fins.length === 0) return;
    const material = new MeshStandardMaterial({
      color: new Color(current.colours.inkMuted),
      roughness: FIN_ROUGHNESS,
      metalness: 0,
    });
    finDisposables.push(material);
    finTints = [[material.color, "inkMuted"]];
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

    // The wire view's lines (D-42): one thin set of lines, in the stringer's ink.
    const wireGeometry = new BufferGeometry();
    wireGeometry.setAttribute("position", new BufferAttribute(current.wire, 3));
    const wirePen = new LineBasicMaterial({ color: new Color(colours.onFoam), toneMapped: false });
    wireMesh = new LineSegments(wireGeometry, wirePen);
    centred.add(wireMesh);
    disposables.push(wireGeometry, wirePen);
    boardTints.push([wirePen.color, "onFoam"]);
    foamLook();

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
    for (const [points, outward] of [
      [stringer.deck, 1],
      [stringer.bottom, -1],
    ] as const) {
      if (points.length < 2) continue;
      const g = ribbon(points, outward);
      centred.add(new Mesh(g.ribbon, paint), new Line(g.line, pen));
      disposables.push(g.ribbon, g.line);
    }
    centred.add(finGroup, ghostGroup);
    buildFins();
    buildGhost();
    centred.position.set(-centre[0], -centre[1], -centre[2]);
    placeBoard();
  };

  const round = (v: number) => Math.round(v * 1e6) / 1e6 + 0;
  const roomReport = (): RoomReport => ({
    camera: [round(camera.position.x), round(camera.position.y), round(camera.position.z)],
    lights: [nearRail, farRail, overhead, fill].map((light) => [
      round(light.position.x),
      round(light.position.y),
      round(light.position.z),
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
    setTurn(next, at) {
      if (disposed) return;
      turn = next;
      if (at) frame = at;
      placeBoard(false);
      schedule();
    },
    frame: () => frame,
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
      schedule();
    },
    setColours(colours) {
      if (disposed) return;
      current = { ...current, colours };
      renderer.setClearColor(new Color(colours.canvas), 1);
      for (const [color, token] of [...boardTints, ...finTints, ...ghostTints]) color.set(colours[token]);
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
      placeBoard();
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
      disposables = [];
      finDisposables = [];
      ghostDisposables = [];
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
    },
  };
}
