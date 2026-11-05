# 16-18 — Brief for the planner: the shaping bay, a drawn room lit like the founder's photo, and two ways to turn (D-43)

Written by the orchestrator on 2026-11-05 at the founder's ask during 16-17. 16-18 runs in its own wave after 16-17 and
before go-live 2 (16-13). The 3D screen has not gone public: it ships at go-live 2, so this is its first impression.

## The founder's words

- With `pictures/founder-bay-lighting.png`: "This is the type of lighting that I'd like to see on the 3d Rendering. in
  fact, I think it would be cool if the lights can be fixed and the board rotated between them (like picking up and
  turning over the board, etc.), or if the user can choose to rotate the whole room, keeping the lights as they are
  (like walking around the board in the room)."
- Asked whether to draw the room or only light the board like it: "Draw a simple room" — blue walls, a floor, and the two
  long lit strips visible.
- Asked when: "Before go-live 2."
- Then, on how it moves: "I'd like it to be like in a shaping room. The user should be able to flip the board ("on the racks"), and pick up the nose or tail and watch the shadows change. The board needs to also rotate on its side, at least from 45deg toward the left to 45deg toward the right (great for shadows down a rail), but I think for a computer a full 360 deg spin should be possible. I'd be good with controls to make this happen, 1 per plane, as dragging can be a bit of a challenge sometimes."
  This settles the stand question below: racks are drawn and the board rests on them.

## What the photo shows

Deep blue walls and door; a pale floor thick with foam dust; two long warm-white strip lights low along both side walls,
about bench height, running the length of the room; almost no light from above. A blank on a stand glows where the strips
rake it: bright toward the rails, falling off across the deck, the blue room reading in the shadow. The founder has
already said he likes side light with no overhead (16-06, lighting B).

## Locked facts (verified in the session)

- F1. `components/3d/board-scene.ts` (16-06, read fresh after 16-17's merge): two `DirectionalLight`s, near and far rail
  (1.0 / 0.7), overhead 0, an `AmbientLight` fill 0.08, a ground token `--surf-3d-ground` as the clear colour. Directional
  lights are parallel and endless: no length, no fall-off across the board. That is the look to replace.
- F2. D-10 stands for the first mode: lights fixed, only the board's group turns (`setTurn`, a quaternion, 16-07), the camera
  never moves, zoom and slide crop the picture with `camera.setViewOffset` (16-09).
- F3. Contour Stripes and the wire view (16-17, Task 2b) replace the foam's look; the ghost blank and the fins sit under the
  lights. Export reads none of this. All of it is screen state, never saved (D-17), `data-lock-exempt`.
- F4. 16-17 is changing the corner row and the panel (HARD EDGE gone to TAIL RAIL, SHOW gone, four corner icons). Plan
  against its merged state, by name.
- F5. The views (Deck, Bottom, Side, Nose, Tail, Reset View, 16-09) and the drawing-failure fallback (16-12) must keep working.

## What the planner settles

1. The lights: how to get long strips with fall-off in the three.js already pinned (0.186.1) on a phone as well as a
   computer, for example `RectAreaLight` (it needs its uniforms library and a standard material) or a cheaper stand-in.
   Measure frame cost on the iphone project.
2. The room: walls, floor, the two visible strips; how simple it can be and still read as the photo. Colours are the room's
   own, not the theme's, unless pictures say otherwise. The ground token's job after this. Whether a stand is drawn:
   turning the board in place collides with one, so propose.
3. The two modes: "turn the board" (D-10, today) and "walk around" (the room, lights and board stay together and the
   viewer moves). What a drag does in each, keeping the viewer inside the room and above the floor; what the five views and
   Reset View do in walk mode, including the Bottom view; where the switch lives (the orchestrator's starting point: the
   panel's VIEW group, a two-way toggle, since the corner already holds five icons on a computer); its spoken names.
4. Contour Stripes and the wire view inside the room.
5. Candidate pictures for the founder, BEFORE the plan is final: the real board in the real scene, Shortboard and Fish, two
   or three lighting and room treatments beside the photo, in both turn modes, on a computer and a phone.

## Shape

Task 1 tracer, Task 2 auto/tdd, a final blocking founder look, `autonomous: false`, wave 13, `depends_on: ["16-17"]`,
PW_PORT=3218, no database change, nothing stored; 16-13 (go-live 2) moves to wave 14 and depends on 16-18.
