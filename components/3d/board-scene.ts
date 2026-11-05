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
  Group,
  Line,
  LineBasicMaterial,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  NeutralToneMapping,
  PerspectiveCamera,
  Quaternion,
  Scene,
  Vector3,
  WebGLRenderer,
} from "three";
import type { Vec3 } from "@/lib/geometry/board-surface";
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

  let current = input;
  let turn: Quat = REST_TURN;
  let frame: Frame = { distance: CAMERA_STANDOFF_MM, right: 0, up: 0 };
  let size = { width: Math.max(1, host.clientWidth), height: Math.max(1, host.clientHeight) };
  let disposables: { dispose(): void }[] = [];
  let pending = 0;
  let frames = 0;
  let lost = false;
  let reportedReady = false;
  let restoreTimer: ReturnType<typeof setTimeout> | null = null;
  let disposed = false;

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
    centred.add(new Mesh(geometry, foam));
    disposables.push(geometry, foam);

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
    for (const [points, outward] of [
      [stringer.deck, 1],
      [stringer.bottom, -1],
    ] as const) {
      if (points.length < 2) continue;
      const g = ribbon(points, outward);
      centred.add(new Mesh(g.ribbon, paint), new Line(g.line, pen));
      disposables.push(g.ribbon, g.line);
    }
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
      for (const d of disposables) d.dispose();
      disposables = [];
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
    },
  };
}
