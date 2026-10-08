# Bulwark — static site (v0.3.4, built 2026-10-08 — weekly re-verification: presets v1.6, 19 calculators (FTMO Futures Growth split by size; FundingPips 3% add-on), seasonal reset zones, Topstep fully primary-sourced)

Static, no backend. Everything computes in the visitor's browser using the compiled Bulwark engine (js/engine.js — the engine that passes 25 goldens and 198/198 HELM vectors). Live on-page demo; data-driven Compare-firms page with engine-computed floors; Inter/JetBrains Mono typography; light/dark themes; OpenGraph + JSON-LD. 19 calculators: FTMO x5 (2-Step, 1-Step, Futures Growth 50K/100K/150K), FundedNext x3, FundingPips x4 (incl. the 3% daily-loss add-on), The5ers x3, Topstep x3, and "Your own rules" for self-funded traders. Manual v1.2; "How we verify" page; per-page SEO titles. Docs are built from docs-src/ inside this folder.

## Deploy in 5 minutes with GitHub Pages (free)
1. Unzip this folder to `Documents\GitHub\bulwark-site`.
2. GitHub Desktop -> File -> Add local repository -> choose the folder -> create a repository when prompted -> Publish repository (Public).
3. github.com -> the repo -> Settings -> Pages -> Source "Deploy from a branch" -> Branch main, folder / (root) -> Save.
4. Live at https://<your-github-username>.github.io/bulwark-site/ within minutes.
5. Custom domain (after buying bulwarktrader.com): Settings -> Pages -> Custom domain; add the DNS records GitHub shows; tick Enforce HTTPS.

## Before going live
- Replace BUTTONDOWN_USERNAME in index.html with your Buttondown username (until then the form shows "opens with the launch" — guarded).
- docs/legal.html is a non-lawyer draft (v0.1) — solicitor review is a Stage-1 item.
- Rebuild after any preset change: `node build.mjs` (needs `npm i marked@18.0.13` once; docs come from ./docs-src). Never hand-edit js/engine.js — compiled from Documents\PCAS\03_engine.
- Standing obligation: presets re-verified weekly (Founding Rule 7); update verifiedAsOf and rebuild.
