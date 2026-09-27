# Vision Therapy — HTS2 Modes

A client-side-only vision therapy web app that replicates the exercise mechanics of HTS2
(Home Therapy System) using red/cyan anaglyph 3D rendered with Three.js.

**Documentation lives in the companion repo
[oferk1/open-vision-therapy-docs](https://github.com/oferk1/open-vision-therapy-docs)** —
guides to every exercise mode, configuration, architecture, and external learning
resources.

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
- **React Three Fiber + three** — a custom two-pass anaglyph composer
  (`components/AnaglyphRig.tsx`): the scene renders once per eye through
  `THREE.StereoCamera` into render targets, composited Dubois-style (left →
  red, right → cyan) to the screen.
- **Random-dot stereogram stimuli** — a single world-locked speckle field
  camouflages every target; per-eye RDS shader materials
  (`lib/rdsEyePass.ts`) sample the noise with opposite offsets inside the
  target mask, so shapes exist only as binocular disparity. With the naked
  eye every mode is pure noise — red/cyan glasses are always required.
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
| 1 | Pursuits | Smooth XY drift; report the E orientation hidden in the dot noise |
| 2 | Saccades | Instant random position jumps; identify E orientation at each jump |
| 3 | Convergence (Base-Out) | Sub-target disparity pops toward viewer; fuse and report position |
| 4 | Divergence (Base-In) | Sub-target disparity sinks into the screen; fuse and report position |
| 5 | Jump Ductions | Disparity snaps between near/far every 1.5 s; report position |
| 6 | Jump Random | Disparity magnitude/sign randomized each presentation |
| 7 | Accommodative Rock | Disparity rocks between far (small demand) and near (large demand) |
| 8 | Vergence Base Up | Left-eye image shifted vertically up; fuse and report position |
| 9 | Vergence Base Down | Left-eye image shifted vertically down; same task, opposite demand |

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
