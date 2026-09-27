# Vision Therapy — HTS2 Modes

A client-side-only vision therapy web app that replicates the exercise mechanics of HTS2
(Home Therapy System) using red/cyan anaglyph 3D rendered with Three.js.

## Routes

- `/` — exercise menu (9 cards)
- `/exercise/[id]` — per-exercise configuration (duration, speed, stereo demand)
- `/exercise/[id]/session` — full-screen anaglyph session
- `/exercise/[id]/results` — session summary
- `/history` — all results from this browser session

`[id]` ∈ `pursuits`, `saccades`, `convergence`, `divergence`, `jump-ductions`,
`jump-random`, `accommodative-rock`, `vergence-base-up`, `vergence-base-down`
(all pre-rendered via `generateStaticParams`).

## Architecture

- **Next.js 14 (App Router) with path-based navigation** (`/`, `/exercise/[id]`, `/exercise/[id]/session`, `/exercise/[id]/results`, `/history`) — and `output: 'export'` so the build in `out/` is fully static
  and can be dropped into any S3 bucket behind a CDN. No server, no API routes, no SSR.
- **React Three Fiber + three + three-stdlib** — the scene is rendered twice per frame
  (left/right eye) and composited through `AnaglyphEffect` (Dubois matrices) in a custom
  `useFrame` loop that hijacks R3F's default render (`components/AnaglyphRig.tsx`).
- **No state libraries, no React Context** — a plain vanilla module-level store
  (`store/therapy.ts`) holds session state and history; components subscribe via
  `useSyncExternalStore`, actions are plain exported functions, and sessionStorage
  persistence lives inside the store itself.
- **Synthetic audio** — Web Audio API beeps (880 Hz sine) for correct and boops
  (180 Hz square) for incorrect responses (`lib/audio.ts`).
- **Three.js canvas is dynamically imported with `ssr: false`** so no WebGL code runs
  during static generation or hydration.

## Run

```bash
npm install
npm run dev      # development
npm run build    # static export into out/
npm start        # serve the production build
```

## Deploy to S3 + CDN

```bash
npm run build
aws s3 sync out/ s3://YOUR_BUCKET/ --delete
```

`trailingSlash: true` is set in `next.config.js`, so every route emits an `index.html`
inside a folder — S3 + CloudFront resolve `/` → `/index.html` with no rewrite rules.
Content is read-only client-side; no cache invalidation concerns beyond normal deploys.

## The 9 exercise modes

| # | Mode | Mechanic |
|---|------|----------|
| 1 | Pursuits | Smooth XY drift; E orientation flips; correct answers speed it up and shrink the target |
| 2 | Saccades | Instant random position jumps; identify E orientation at each jump |
| 3 | Convergence (Base-Out) | Sub-target displaces on +Z (pops out); progressive demand on success |
| 4 | Divergence (Base-In) | Sub-target displaces on −Z (sinks in); progressive demand on success |
| 5 | Jump Ductions | Depth snaps between fixed near/far every 1.5 s; report sub-target position |
| 6 | Jump Random | Depth magnitude randomized within stereo range each presentation |
| 7 | Accommodative Rock | Toggles small/fine (far focus) vs. large/bold (near focus); report orientation |
| 8 | Vergence Base Up | Left-eye render shifted vertically up; fuse and report sub-target position |
| 9 | Vergence Base Down | Left-eye render shifted vertically down; same task, opposite demand |

All modes use the same input contract: arrow keys answer, `Esc` exits early, and the
session ends when the countdown reaches zero (3/5/7-minute defaults per mode).

### How vertical vergence (Base Up/Down) works

three-stdlib's `AnaglyphEffect` owns a private `StereoCamera`, so
`lib/anaglyphEyeOffset.ts` wraps `StereoCamera.prototype.update` (the exact class the
effect instantiates) and shifts the left eye's world matrix vertically after each stock
update. The active offset is set per frame from the exercise engine.

## Tuning difficulty

Difficulty constants live at the top of each engine in `components/exercises/`:

- `BOUNDS` — XY travel range (pursuits/saccades)
- `SUB_BASE` escalation steps and caps — stereo demand ramp (vergence family)
- `timeout` floors — seconds allowed per response before an auto-miss
- `FAR_SIZE` / `NEAR_SIZE`, `halfPeriod` — accommodative rock amplitude and rate

`baseDepth` (initial Z demand) is set from the config page in
`components/ExerciseConfigForm.tsx`.

## Clinical note

This is a mechanics replica for experimentation, not a medical device and not a
substitute for prescribed office-based vision therapy.
