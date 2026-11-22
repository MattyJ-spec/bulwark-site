# Bulwark — static site (v0.3.9, built 2026-11-22 — engine v0.2.2 unchanged (48 tests), presets v1.11: no limit changed; unreadable entries and account sizes a page does not cover are refused in the page; NO BUFFER instead of OK when nothing is held back above a floor; futures pages size in whole contracts; amber "not for" lines (FundingPips, FTMO 1-Step, Topstep, FundedNext Stellar Lite); Topstep minimum trading days 2. v0.3.8 / presets v1.10, 2026-11-21: The5ers High Stakes split by account size (4% daily / 8% maximum at $50K and $100K; 5% / 10% up to $25K); The5ers 2-Step Plan ×2 named as the 2-Step plan of the Summer Plan, High Stakes pages say they are not for Summer Plan accounts; FundingPips 2-Step Flex and Pro notes for accounts bought before 28 Sep 2026; 25 calculators)

Static, no backend. Everything computes in the visitor's browser using the compiled Bulwark engine (js/engine.js — the engine that passes 48 tests and, on the sibling desk's fixtures, 198/198 HELM vectors). Live on-page demo; data-driven Compare-firms page with engine-computed floors; Inter/JetBrains Mono typography; light/dark themes; OpenGraph + JSON-LD. 25 calculators: FTMO x8 (2-Step, 1-Step ×2 — orders from / before 12 Oct 2026, Futures Growth 50K, 100K ×2 and 150K ×2 — evaluations created from / before 5 Nov 2026), FundedNext x3, FundingPips x6 (2-Step Standard incl. the 3% add-on, Flex, Pro; 1-Step Flex 2%/3%), The5ers x4 (High Stakes 2-Step by account size ×2; the Summer Plan's 2-Step Plan, New and Classic), Topstep x3, and "Your own rules" for self-funded traders. Manual v1.2; "How we verify" page; per-page SEO titles. Docs are built from docs-src/ inside this folder.

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
- Standing obligation: every page the presets cite is read again at a desk before each release that changes rule data — in full where the page has changed, for its date and every figure used where it has not, and with every account size, plan and option selected where a table has a selector (verifiedAsOf rolls only on such a read; a rule change is a new dated id — Founding Rule 7); a weekly automated check covers only the pages it can open.
