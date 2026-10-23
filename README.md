# Bulwark — static site (v0.3.6, built 2026-10-23 — engine v0.2.2 unchanged (40 goldens), presets v1.8: FTMO 1-Step split into the 12 Oct 2026 Consistency cohort and a legacy cohort, no minimum-days objective on the 1-Step; header navigation aligned; 22 calculators)

Static, no backend. Everything computes in the visitor's browser using the compiled Bulwark engine (js/engine.js — the engine that passes 40 goldens and, on the sibling desk's fixtures, 198/198 HELM vectors). Live on-page demo; data-driven Compare-firms page with engine-computed floors; Inter/JetBrains Mono typography; light/dark themes; OpenGraph + JSON-LD. 22 calculators: FTMO x6 (2-Step, 1-Step ×2 — orders from / before 12 Oct 2026, Futures Growth 50K/100K/150K), FundedNext x3, FundingPips x6 (2-Step Standard incl. the 3% add-on, Flex, Pro; 1-Step Flex 2%/3%), The5ers x3, Topstep x3, and "Your own rules" for self-funded traders. Manual v1.2; "How we verify" page; per-page SEO titles. Docs are built from docs-src/ inside this folder.

## Deploy in 5 minutes with GitHub Pages (free)
1. Unzip this folder to `Documents\GitHub\bulwark-site`.
2. GitHub Desktop -> File -> Add local repository -> choose the folder -> create a repository when prompted -> Publish repository (Public).
3. github.com -> the repo -> Settings -> Pages -> Source "Deploy from a branch" -> Branch main, folder / (root) -> Save.
4. Live at https://<your-github-username>.github.io/bulwark-site/ within minutes.
5. Custom domain (after buying bulwarktrader.com): Settings -> Pages -> Custom domain; add the DNS records GitHub shows; tick Enforce HTTPS.

## Before going live
- ORIGIN in build.mjs is the site's public URL (verified live 2026-10-23: https://mattyj-spec.github.io/bulwark-site/) and feeds sitemap.xml and robots.txt — change it when the custom domain goes live, then rebuild.
- Replace BUTTONDOWN_USERNAME in index.html with your Buttondown username (until then the form shows "opens with the launch" — guarded).
- docs/legal.html is a non-lawyer draft (v0.1) — solicitor review is a Stage-1 item.
- Rebuild after any preset change: `node build.mjs` (needs `npm i marked@18.0.13` once; docs come from ./docs-src). Never hand-edit js/engine.js — compiled from Documents\PCAS\03_engine.
- Standing obligation: presets re-verified weekly (Founding Rule 7); update verifiedAsOf and rebuild.
