import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { marked } from "marked";
import { computeState } from "./js/engine.js";

const presets = JSON.parse(readFileSync("js/presets.json", "utf8")).presets;
// The page script is fetched under an address that changes with its bytes: a browser that still holds an older js/calc.js
// cannot run a newer page on it (v0.3.9, review N-01).
const calcTag = createHash("sha256").update(readFileSync("js/calc.js")).digest("hex").slice(0, 10);
const eligible = presets.filter(p => p.calculatorEligible);
const FOOTER_LINE = "Bulwark shows rule mathematics — general information, not financial advice. It never recommends trades and makes no claims about trading outcomes. Rules change; always verify against your firm's dashboard.";
const fmt = v => v.toLocaleString("en-US");
const TZ_LABEL = { "Europe/Prague": "Prague (CET/CEST)", "Europe/Athens": "server time (GMT+2 winter / GMT+3 summer)", "Etc/GMT-3": "platform time (UTC+3, fixed)", "America/Chicago": "Chicago (CT)", "America/New_York": "New York (ET)" };
const tzLabel = tz => TZ_LABEL[tz] ?? tz;
// Restored tabs: every calculator control carries its id as its name and autocomplete="off", so a browser neither keeps what was
// typed nor puts it back by position after a release that adds or removes a box.
const noRestore = h => h.replace(/<(input|select) id="([^"]+)"/g, '<$1 id="$2" name="$2" autocomplete="off"');
const pctTxt = v => Number.isInteger(v) ? String(v) : (Math.round(v * 100) / 100).toString();
// A LIMIT's percentage is shown rounded DOWN: a figure rounded up and re-keyed elsewhere would be more room than the firm's dollar amount.
const pctDown = v => Number.isInteger(v) ? String(v) : (Math.floor(v * 100 + 1e-9) / 100).toString();
const amt = (rule, pct) => rule.displayAmount != null ? `$${fmt(rule.displayAmount)} (${pctDown(pct)}%)` : `${pctDown(pct)}%`;
// "$2,500, $5,000, $10,000 and $25,000": the account sizes a page with a size list gives figures for (v0.3.9)
const sizeList = a => a.length > 1 ? a.slice(0, -1).map(v => "$" + fmt(v)).join(", ") + " and $" + fmt(a[a.length - 1]) : "$" + fmt(a[0]);

const head = (title, desc, depth = "", extra = "") => `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${title}</title><meta name="description" content="${desc}"><meta name="theme-color" content="#0D1422">
<meta property="og:type" content="website"><meta property="og:title" content="${title}"><meta property="og:description" content="${desc}"><meta property="og:site_name" content="Bulwark"><meta name="twitter:card" content="summary"><meta name="twitter:title" content="${title}"><meta name="twitter:description" content="${desc}">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">${extra}
<link rel="stylesheet" href="${depth}css/cockpit.css"><link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='6' fill='%230D1422'/%3E%3Crect x='6' y='18' width='20' height='4' fill='%23F2B441'/%3E%3Crect x='6' y='10' width='20' height='2' fill='%232BD17E'/%3E%3C/svg%3E"></head><body><div class="wrap">
<header><a class="mark" href="${depth}index.html">BULWARK<span>prop challenge survival cockpit</span></a><nav><a href="${depth}index.html#calculators">Calculators</a><a href="${depth}compare.html">Compare firms</a><a href="${depth}docs/verify.html">How we verify</a><a href="${depth}docs/faq.html">FAQ</a><a href="${depth}docs/changelog.html">Changelog</a><a href="${depth}docs/quickstart.html">Quick-start</a><a href="${depth}docs/manual.html">Manual</a><a href="${depth}index.html#waitlist">Waitlist</a></nav></header>`;
const foot = (depth = "") => `<footer><p><b>${FOOTER_LINE}</b></p><p>Bulwark is not affiliated with, endorsed by, or acting for any proprietary-trading firm or broker, and receives no commissions from any. Firm names are used to identify their published rules. No account credentials are ever requested. Computation happens in your browser; no numbers leave your device. © ${new Date().getFullYear()} Bulwark · <a href="${depth}docs/legal.html">Terms · Privacy · Refunds</a></p></footer></div></body></html>`;

// ── Calculator pages ──
mkdirSync("calculators", { recursive: true });
for (const p of eligible) {
  const hasDaily = !!p.daily, trails = p.max.model !== "static", conflict = p.status === "verified-with-conflict";
  const fullName = p.program.startsWith(p.firm) ? p.program : `${p.firm} ${p.program}`;
  // Futures programs size in whole contracts. A preset can say so (sizeUnit); the ids published before that field existed
  // (Topstep, FTMO Futures) are recognised by their program name.
  const contractMode = p.sizeUnit === "contracts" || /futures/i.test(p.program);
  const pauses = !!p.breach && (p.breach.daily === "pause" || p.breach.daily === "lockout");
  const live = p.max.model === "trailingLiveEquity";
  const famKey = s => s.replace(/(^|-)\d+k(?=-|$)/, "$1#");
  const siblings = p.max.displayAmount != null ? eligible.filter(q => q !== p && q.firm === p.firm && famKey(q.slug) === famKey(p.slug)).sort((a, b) => a.defaultInitialSize - b.defaultInitialSize) : [];
  const dailyLine = hasDaily ? `${amt(p.daily, p.daily.pct)} daily (${p.daily.basis === "initial" ? "of initial size" : "of the day-start value"}, anchored to ${p.daily.anchorSemantic === "maxOf" ? "the higher of balance and equity" : "balance"})` : "no daily loss limit";
  const maxLine = `${amt(p.max, p.max.pct)} max (${p.max.model === "static" ? "static" : p.max.model === "trailingWithLock" ? "trailing your highest end-of-day balance, locks at initial" : live ? "trailing your peak balance in real time" : "trailing your highest end-of-day balance"})`;
  const SEO = { "ftmo-2-step": ["FTMO Daily Loss & Max Loss Calculator (2-Step) — Bulwark", "Free FTMO 2-Step calculator: daily loss floor from midnight balance, max floor, buffered STOP line, max safe size."], "ftmo-1-step": ["FTMO 1-Step Calculator (orders from 12 Oct 2026): 3% Daily, Trailing Max, Consistency Rule — Bulwark", "FTMO 1-Step floors, trailing max loss, the Consistency check (best day vs total profit) and max safe size, in your browser."], "ftmo-1-step-legacy": ["FTMO 1-Step Calculator (orders before 12 Oct 2026): 3% Daily, Trailing Max, Best Day Rule — Bulwark", "FTMO 1-Step legacy cohort: floors, trailing max loss, the Best Day Rule (best day vs positive days' profit) and max safe size, in your browser."], "ftmo-futures-growth-50k": ["FTMO Futures Growth $50K Drawdown Calculator ($2,000 trailing, locks at initial) — Bulwark", "FTMO Futures Growth $50K evaluation: $2,000 end-of-day trailing drawdown that locks at initial, the 40% Consistency Rule, and max safe size."], "ftmo-futures-growth-100k": ["FTMO Futures Growth $100K Drawdown Calculator ($3,000 trailing — evaluations created from 5 Nov 2026) — Bulwark", "FTMO Futures Growth $100K for evaluations created from 5 November 2026: $3,000 end-of-day trailing drawdown that locks at initial, the 40% Consistency Rule, and max safe size."], "ftmo-futures-growth-100k-legacy": ["FTMO Futures Growth $100K Drawdown Calculator ($3,500 trailing — evaluations created before 5 Nov 2026) — Bulwark", "FTMO Futures Growth $100K for evaluations created before 5 November 2026 and not reset since: $3,500 end-of-day trailing drawdown that locks at initial, the 40% Consistency Rule, and max safe size."], "ftmo-futures-growth-150k": ["FTMO Futures Growth $150K Drawdown Calculator ($4,500 trailing — evaluations created from 5 Nov 2026) — Bulwark", "FTMO Futures Growth $150K for evaluations created from 5 November 2026: $4,500 end-of-day trailing drawdown that locks at initial, the 40% Consistency Rule, and max safe size."], "ftmo-futures-growth-150k-legacy": ["FTMO Futures Growth $150K Drawdown Calculator ($5,000 trailing — evaluations created before 5 Nov 2026) — Bulwark", "FTMO Futures Growth $150K for evaluations created before 5 November 2026 and not reset since: $5,000 end-of-day trailing drawdown that locks at initial, the 40% Consistency Rule, and max safe size."], "fundingpips-1-step-flex": ["FundingPips 1-Step Flex (2% daily) Calculator — Bulwark", "FundingPips 1-Step Flex: 2% daily floor from the higher of opening balance and equity, 12% static max on the lower of equity and balance, 12% target, STOP line and max safe size."], "fundingpips-1-step-flex-3pct": ["FundingPips 1-Step Flex (3% daily) Calculator — Bulwark", "FundingPips 1-Step Flex bought with the 3% daily configuration: daily floor from the higher of opening balance and equity, 12% static max, 12% target, STOP line and max safe size."], "fundingpips-2-step-standard-3pct-addon": ["FundingPips 2-Step Standard with the 3% Daily-Loss Add-on — Calculator — Bulwark", "FundingPips 2-Step Standard bought with the 3% daily-loss add-on: daily floor from the higher of opening balance and equity, 10% static max on the lower of equity and balance, STOP line and max safe size."], "your-own-rules": ["Your Own Rules — Daily Loss & Max Drawdown Calculator for Self-Funded Traders — Bulwark", "Set your own daily loss and maximum drawdown limits and see your floors, STOP line and max safe position size. Nothing leaves your device."] };
  const seo = SEO[p.slug] || [`${fullName} Daily Loss & Max Loss Calculator — Bulwark`, `Free ${fullName} calculator: daily loss floor, max-loss floor, buffered STOP line, limit used, and max safe position size — computed in your browser from the firm's published rules.`];
  const html = `${head(seo[0], seo[1], "../")}
<section style="border-top:0;padding-top:12px">
<div class="eyebrow">${p.firm} · ${p.program.startsWith(p.firm) ? p.program.slice(p.firm.length).replace(/^\s*[—-]?\s*/, "") : p.program}</div>
<h1>${fullName} <em>survival calculator</em></h1>
<p class="lede">${hasDaily ? "Your daily floor, max floor, buffered STOP line" : "Your max-loss floor, a buffered STOP line"} and the largest position a full stop can survive — computed from ${p.firm}'s published rules: ${dailyLine}; ${maxLine}${p.target ? `; target ${p.target.displayAmount != null ? `$${fmt(p.target.displayAmount)} (${pctTxt(p.target.pctByPhase[0])}%)` : p.target.pctByPhase.map(pctTxt).join("% / ") + "%"} on closed balance` : ""}.</p>
<p class="micro" style="margin-top:8px"><span class="ver${conflict ? " conflict" : ""}">rules verified ${p.verifiedAsOf}${conflict ? " · with disclosed conflict" : ""}</span> &nbsp; <details style="display:inline-block;margin:0"><summary style="display:inline">sources</summary><ul>${p.sources.map(s => /^https?:\/\//.test(s) ? `<li><a href="${s}" rel="nofollow noopener" target="_blank">${s}</a></li>` : `<li>${s}</li>`).join("")}</ul></details></p>
${conflict ? `<div class="disclosure">⚠ ${p.disclosure}</div>` : ""}${p.notice ? `<div class="disclosure">⚠ ${p.notice}</div>` : ""}${p.notes ? `<p class="hint" style="margin-top:8px">${p.notes}</p>` : ""}${p.related ? [].concat(p.related).map(r => `<p class="hint" style="margin-top:6px"><a href="${r.slug}.html">${r.label}</a></p>`).join("") : ""}
<div class="calc">
<div class="card">
<h3>Your numbers</h3>
${p.custom ? `<label>Daily loss you will stop at (% of account)<input id="dailyPctIn" type="text" inputmode="decimal" value="${p.daily.pct}"></label><label>Maximum drawdown you will pause at (% of account)<input id="maxPctIn" type="text" inputmode="decimal" value="${p.max.pct}"></label>` : ""}<label>Account size (initial capital)<input id="initialSize" type="text" inputmode="decimal" value="${p.defaultInitialSize ?? 100000}"${p.max.displayAmount != null ? ` readonly aria-readonly="true" style="opacity:.65;cursor:default"` : ""}>${p.max.displayAmount != null ? `<span class="hint">Fixed: this program's limits are dollar amounts for this account size. ${siblings.length ? "Other sizes: " + siblings.map(q => `<a href="${q.slug}.html">$${q.defaultInitialSize / 1000}K</a>`).join(" · ") + "." : "Another size has its own calculator."}</span>` : ""}${p.sizeLimit ? `<span class="hint">This page gives figures for ${p.sizeLimit.sizes ? sizeList(p.sizeLimit.sizes) + " accounts" : "account sizes from $" + fmt(p.sizeLimit.min) + " to $" + fmt(p.sizeLimit.max)} only, and it goes by this box: it must hold your account's own size.</span>` : ""}</label>
<label>Day-start balance<input id="dayStartBalance" type="text" inputmode="decimal" value="${p.defaultInitialSize ?? 100000}"><span class="hint">${hasDaily && p.daily.anchorSemantic === "maxOf" ? "Your closed balance at the start of the trading day (the reset). The anchor below is never taken as less than this figure." : (p.anchorHint ?? "")}</span></label>
${hasDaily && p.daily.anchorSemantic === "maxOf" ? `<label>Day-start anchor (the HIGHER of closing balance and closing equity)<input id="dayStartAnchor" type="text" inputmode="decimal" value="${p.defaultInitialSize ?? 100000}"><span class="hint">${p.anchorHint ?? ""}</span></label>` : `<input id="dayStartAnchor" type="hidden" value="">`}
<label>Today's closed trades${live ? ", in the order they closed" : ""} (space-separated, e.g. <code>450 -520 300</code>)<input id="todayLog" type="text" value=""><span id="logEcho" class="hint">0 trades</span></label>
<label>Floating P&amp;L of open positions (manual — update as it moves)<input id="openPnl" type="text" inputmode="decimal" value="0"></label>
${trails ? `<label>${live ? "Highest balance the account has reached — open-trade gains included" : "Highest end-of-day balance so far"}<input id="highestEod" type="text" inputmode="decimal" value="${p.defaultInitialSize ?? 100000}"><span class="hint">${live ? "The max-loss floor trails this figure in real time and never moves down. The page raises it whenever your entries show a new high; a high it was never shown — an open trade's best moment, or an earlier day's — has to be typed here." : `The max-loss floor trails this figure${p.max.lockAt ? " and locks once it reaches your starting capital" : ""}. It is never taken as less than your day-start balance.`}</span>${live ? `<span id="peakNote" class="hint"></span>` : ""}</label>` : `<input id="highestEod" type="hidden" value="">`}
${p.target && p.target.pctByPhase.length > 1 ? `<label>Phase<select id="phase">${p.target.pctByPhase.map((t, i) => `<option value="${i}">Phase ${i + 1} — target ${t}%</option>`).join("")}</select></label>` : `<input id="phase" type="hidden" value="0">`}
${p.profitableDays ? `<label>Profitable days completed before today<input id="profitableDays" type="text" inputmode="numeric" value="0"></label>` : ""}
${p.consistency ? `<label>Best prior day's profit<input id="bestPrevDay" type="text" inputmode="decimal" value="0"><span class="hint">${p.consistency.denominator === "profitTarget" ? `Your single best day must stay at or below ${p.consistency.capPct}% of the profit target; a bigger day raises the target rather than failing the account.` : p.consistency.denominator === "positiveDaysProfit" ? `The best day is compared with the profit from positive days (cap ${p.consistency.capPct}%).` : `The best day is compared with your total closed profit — every trading day, losing days included (cap ${p.consistency.capPct}%). Total profit is derived from the account size, your day-start balance and today's closed trades; nothing extra to type.`}</span></label>${p.consistency.denominator === "positiveDaysProfit" ? `<label>Total profit from positive days (incl. today)<input id="positiveDays" type="text" inputmode="decimal" value="0"></label>` : `<input id="positiveDays" type="hidden" value="0">`}` : ""}
<h3 style="margin-top:14px">Next trade</h3>
<label>Risk per trade, % of equity<input id="riskPct" type="text" inputmode="decimal" value="0.5"></label>
${contractMode ? `<label>Stop distance, in points (price units)<input id="stopDist" type="text" inputmode="decimal" value="" placeholder="points"></label>` : `<label>Stop distance (pips for FX; price units otherwise)<input id="stopDist" type="text" inputmode="decimal" value="20"></label>`}
${contractMode ? `<label>Dollar value of one point, per contract<input id="valuePerUnit" type="text" inputmode="decimal" value="" placeholder="$ per point"><span class="hint">From the exchange's specification for the contract you trade: what one contract gains or loses when the price moves one point. Until the stop and this value are entered, Bulwark refuses to size rather than guess.</span></label>${p.maxContracts != null ? `<label style="flex-direction:row;align-items:center;gap:8px"><input id="isMicro" type="checkbox" style="width:auto"> This is a micro contract (ten micros count as one contract toward the limit)</label>` : ""}` : `<label>Value of one stop unit per lot, in account currency<input id="valuePerUnit" type="text" inputmode="decimal" value="10"><span class="hint">EURUSD on a USD account: about 10 per pip per standard lot. Leave blank if unsure — Bulwark refuses to size rather than guess.</span></label>`}
<label>${hasDaily ? "Safety buffer — STOP at this % of the daily limit" : "Safety buffer — STOP at this % of the max drawdown (the STOP line sits the rest above the max-loss floor)"}<input id="buffer" type="range" min="50" max="100" step="5" value="75" oninput="this.nextElementSibling.textContent=this.value+'%'"><span class="hint">75%</span></label>
<p class="hint">Professionals stop before the firm stops them.</p>
</div>
<div class="card">
<div id="status" class="status ok" aria-live="polite">—</div>
<div id="tape" class="tape"></div>
<div class="figs">
<div class="fig"><div class="l">Live equity</div><div id="f-equity" class="v">—</div></div>
<div class="fig"><div class="l">STOP line · room</div><div id="f-stop" class="v amber">—</div></div>
<div class="fig"><div class="l">${pauses ? "Daily limit · pauses the day" : "Daily floor"}</div><div id="f-daily" class="v red">—</div></div>
<div class="fig"><div class="l">Max-loss floor</div><div id="f-max" class="v red">—</div></div>
</div>
<div class="bar"><i id="bar" style="width:0%"></i></div><div id="usedTxt" class="hint">—</div>
<div style="margin-top:14px"><div class="l hint">Next trade — max safe size${contractMode ? " (whole contracts)" : ""}</div><div id="sizeOut" class="v">—</div>${contractMode ? `<div class="hint" style="margin-top:4px">${p.maxContracts != null ? `Rounded down to whole contracts and capped at ${p.firm}'s limit for this account: ${p.maxContracts} contracts, or ${p.maxContracts * 10} micros. The firm counts every open position against that limit, minis and micros together; contracts you already hold are not subtracted here.` : "Rounded down to whole contracts. Your firm's contract limit is not applied here — check it on your dashboard."}</div>` : ""}</div>
<div id="extra"></div>
<div id="reset" class="hint" style="margin-top:10px"></div>
<details><summary>Show working</summary><ul id="working"></ul></details>
</div>
</div>
<p class="micro" style="margin-top:18px">Want this live on every trade, with your firm's preset and a receipts log? <a href="../index.html#waitlist">Bulwark cockpit — free for one account.</a></p>
</section>
<script type="module">import { mountCalculator } from "../js/calc.js?v=${calcTag}"; mountCalculator(${JSON.stringify(p)}, ${JSON.stringify(contractMode ? { sizeUnit: "contracts", maxContracts: p.maxContracts ?? null } : {})});</script>
${foot("../")}`;
  writeFileSync(`calculators/${p.slug}.html`, noRestore(html));
}


// ── Compare page (data-driven from presets; worked examples computed by the engine at build time) ──
const toFP = (p) => ({ firmId: p.firm, programId: p.id, displayName: p.program, daily: p.daily, max: p.max, target: p.target, consistency: p.consistency, profitableDays: p.profitableDays, minDays: p.minDays, breach: p.breach, verifiedAsOf: p.verifiedAsOf, sources: p.sources, status: "verified" });
const exSize = (p) => p.defaultInitialSize ?? 100000;
const ex = (p) => { const S = exSize(p); return computeState(toFP(p), { initialSize: S, dayStartBalance: S, dayStartAnchorValue: p.daily && p.daily.anchorSemantic === "maxOf" ? S + 1000 : S, todayClosedPnl: 0, openPnl: 0, highestEodBalance: S, hwmLiveEquity: S }); };
const rowsC = eligible.filter(p => !p.custom).map(p => { const o = ex(p); const d = p.daily; return `<tr><td><a href="calculators/${p.slug}.html"><b>${p.firm}</b><br><span class="micro">${p.program}</span></a>${exSize(p) !== 100000 ? `<br><span class="micro">example at $${fmt(exSize(p))}</span>` : ""}</td><td class="num">${d ? amt(d, d.pct) : "—"}</td><td>${d ? (d.basis === "initial" ? "of initial" : "of day-start") : "—"}</td><td>${d ? (d.anchorSemantic === "maxOf" ? "higher of balance &amp; equity" : "balance") : "—"}</td><td class="num">${amt(p.max, p.max.pct)}</td><td>${p.max.model === "static" ? "static" : p.max.model === "trailingWithLock" ? "trailing (end-of-day), locks" : p.max.model === "trailingLiveEquity" ? "trailing (peak, real time)" : "trailing (end-of-day)"}${p.max.breachBasis === "lowerOf" ? " · lower of eq/bal" : ""}</td><td>${d ? (p.resetLabel ?? (tzLabel(d.resetTz) + " " + String(d.resetHour).padStart(2, "0") + ":00")) : "—"}</td><td class="num">${d ? o.dailyFloor.toLocaleString("en-US") : "—"}</td><td class="num">${o.maxFloor.toLocaleString("en-US")}</td><td><span class="ver${p.status === "verified-with-conflict" ? " conflict" : ""}">${p.verifiedAsOf}</span></td></tr>`; }).join("");
const three = ["ftmo-2-step", "fundednext-stellar-2-step", "fundingpips-2-step-standard"].map(s => eligible.find(p => p.slug === s)).filter(Boolean).map(p => { const o = ex(p); return `<div class="card"><div class="eyebrow">${p.firm}</div><div class="fig"><div class="l">${p.daily.pct}% daily · ${p.daily.basis === "initial" ? "of initial" : "of day-start"} · ${p.daily.anchorSemantic === "maxOf" ? "higher of balance &amp; equity" : "balance"}</div><div class="v red" style="font-size:26px">${o.dailyFloor.toLocaleString("en-US")}</div><div class="micro">daily floor today</div></div></div>`; }).join("");
const comparePage = `${head("Prop firm daily-loss rules compared — FTMO, FundedNext, FundingPips, The5ers — Bulwark", "One table, every verified program: daily limit, basis, anchor, max-loss model, reset time, and the floors a $100,000 account would have today — computed by the verified engine, sourced and dated.", "", `<script type="application/ld+json">{"@context":"https://schema.org","@type":"Dataset","name":"Prop firm daily-loss and max-loss rules, verified","description":"Per-program rule parameters and worked floors, primary-sourced and dated.","creator":{"@type":"Organization","name":"Bulwark"},"license":"https://creativecommons.org/licenses/by/4.0/"}</script>`)}
<section style="border-top:0;padding-top:12px">
<div class="eyebrow">Compare firms</div>
<h1>Same "5% daily loss," <em>different floors.</em></h1>
<p class="lede">Every verified program in one table, with the floors a $100,000 account would have today at the default inputs (day-start balance $100,000; for higher-of firms, day-start equity $101,000 to show the anchor working). Programs sold in a fixed size (Topstep, FTMO Futures) are shown at that size, and The5ers' High Stakes accounts up to $25K at $25,000 (day-start equity $26,000). Every number is computed by the same engine as the calculators; every rule links to its source on the firm's own pages.</p>
<div class="grid2" style="margin-top:22px;grid-template-columns:repeat(3,1fr)">${three}</div>
<p class="micro" style="margin-top:8px">Three firms, one trader. FundingPips anchors to the higher of balance and equity and takes the percentage of that value; FTMO and FundedNext take a fixed percentage of initial capital from the day-start balance.</p>
<div style="overflow-x:auto;margin-top:26px"><table class="cmp"><thead><tr><th>Program</th><th>Daily</th><th>Basis</th><th>Anchor</th><th>Max</th><th>Max model</th><th>Reset</th><th>Daily floor (example)</th><th>Max floor (example)</th><th>Verified</th></tr></thead><tbody>${rowsC}</tbody></table></div>
<p class="micro" style="margin-top:12px">Amber "verified" badges mark programs where the firm's own pages disagree; the calculator page states the conflict and uses the tighter value. Programs that define their limits in dollars (Topstep, FTMO Futures) are shown with the dollar figure and its percentage of the account size; the worked floors use the $100,000 example, or the size named in the row. Each row shows the date its rules were last read on the firm's own pages: every page the rows cite was read on 2026-11-21, and the pages of the rows dated 2026-11-22 again on that day. The changelog records each re-read and what it found. <a href="docs/verify.html">How we verify →</a></p>
</section>
${foot()}`;
writeFileSync("compare.html", comparePage);

// ── Homepage ──
const cards = eligible.map(p => `<a class="firm" href="calculators/${p.slug}.html"><b>${p.firm}</b><small>${p.program}</small><span class="ver${p.status === "verified-with-conflict" ? " conflict" : ""}">verified ${p.verifiedAsOf}${p.status === "verified-with-conflict" ? " · conflict disclosed" : ""}</span></a>`).join("");
const index = `${head("Bulwark — the prop challenge survival cockpit", "Bulwark shows prop-firm traders what they can afford right now: daily and max floors modelled the firm's way, a buffered STOP line, limit used, and the largest position a full stop can survive. Free calculators for FTMO, FundedNext, FundingPips, The5ers and Topstep.", "", `<script type="application/ld+json">{"@context":"https://schema.org","@type":"SoftwareApplication","name":"Bulwark","applicationCategory":"FinanceApplication","operatingSystem":"Web","offers":{"@type":"Offer","price":"0","priceCurrency":"USD"},"description":"Prop-firm rule mathematics: daily and max-loss floors modelled per firm, buffered STOP line, max safe position size. General information, not financial advice."}</script>`)}
<section style="border-top:0;padding-top:24px">
<div class="eyebrow">For prop-firm challenge traders</div>
<h1>Journals tell you what happened yesterday.<br><em>Bulwark shows what you can afford right now.</em></h1>
<p class="lede" style="margin-top:14px">Your daily floor and max floor — modelled your firm's way, not a generic one. A buffered STOP line that leaves room for slippage. The percentage of today's limit you've really used. And, before you click, the largest position a full stop-loss can survive.</p>
<p style="margin-top:20px"><a class="btn primary" href="#calculators">Open a free calculator</a> &nbsp; <a class="btn ghost" href="#waitlist">Join the cockpit waitlist</a></p>
<p class="micro" style="margin-top:12px">No signup for the calculators. Everything computes in your browser; nothing leaves your device.</p>
<div class="card demo" style="margin-top:22px"><div class="eyebrow">Try it — FTMO 2-Step, live in your browser</div>
<div class="calc" style="margin-top:10px">
<div>
<label>Account size<input id="initialSize" type="text" inputmode="decimal" value="100000"></label>
<label>Day-start balance (FTMO: balance at midnight Prague)<input id="dayStartBalance" type="text" inputmode="decimal" value="100000"></label>
<input id="dayStartAnchor" type="hidden" value=""><input id="highestEod" type="hidden" value=""><input id="phase" type="hidden" value="0">
<label>Today's closed trades<input id="todayLog" type="text" value="450 -520 300"><span id="logEcho" class="hint"></span></label>
<label>Floating P&amp;L<input id="openPnl" type="text" inputmode="decimal" value="0"></label>
<label>Risk % · stop (pips) · $ per pip per lot<div style="display:flex;gap:8px"><input id="riskPct" type="text" inputmode="decimal" value="0.5"><input id="stopDist" type="text" inputmode="decimal" value="20"><input id="valuePerUnit" type="text" inputmode="decimal" value="10"></div></label>
<input id="buffer" type="hidden" value="75">
</div>
<div>
<div id="status" class="status ok" aria-live="polite">—</div>
<div id="tape" class="tape" style="height:170px"></div>
<div class="figs"><div class="fig"><div class="l">Live equity</div><div id="f-equity" class="v">—</div></div><div class="fig"><div class="l">STOP line · room</div><div id="f-stop" class="v amber">—</div></div><div class="fig"><div class="l">Daily floor</div><div id="f-daily" class="v red">—</div></div><div class="fig"><div class="l">Max-loss floor</div><div id="f-max" class="v red">—</div></div></div>
<div class="bar"><i id="bar" style="width:0%"></i></div><div id="usedTxt" class="hint">—</div>
<div style="margin-top:10px"><div class="l hint">Max safe size for the next trade</div><div id="sizeOut" class="v">—</div></div>
<div id="extra"></div><div id="reset" class="hint" style="margin-top:6px"></div>
<details><summary>Show working</summary><ul id="working"></ul></details>
</div></div>
<p class="micro">Full calculator with every input: <a href="calculators/ftmo-2-step.html">FTMO 2-Step →</a> · numbers are arithmetic on the firm's published rules, not predictions.</p></div>
</section>
<script type="module">import { mountCalculator } from "./js/calc.js?v=${calcTag}"; mountCalculator(${JSON.stringify(eligible.find(p => p.slug === "ftmo-2-step"))});</script>
<section id="calculators">
<div class="eyebrow">Per-firm calculators</div>
<h2>Each firm's rules, as the firm publishes them — verified, dated, sourced.</h2>
<p class="sub">Same "5% daily loss" phrase, three different anchors. Bulwark models each firm's definition and shows the sources. When a firm's own pages disagree, we use the tighter value and say so. Every preset was re-read on the firms' own pages on 21 November 2026.</p>
<p class="micro" style="margin-top:10px">Not sure which program you are on? Your firm&rsquo;s dashboard shows it under Plan or Account type; The5ers and FundingPips publish several.</p>
<div class="firmrow" style="margin-top:14px">${cards}</div>
<p class="micro" style="margin-top:12px"><a href="compare.html">Compare every firm's rules in one table →</a> Self-funded, no prop firm? Use <a href="calculators/your-own-rules.html">Your own rules</a>. Pending: Apex (rules re-read on the firm's own pages on 15 November 2026; its calculators follow in a separate release), Funded Trading Plus, Alpha Capital, E8, and FundingPips Zero (its max-open-risk rule needs an engine addition) — calculators ship only after the firm's own page has been read.</p>
</section>
<section>
<div class="eyebrow">Why it's different</div>
<div class="grid3">
<div class="card"><h3>Pre-trade, not post-mortem</h3><p>Journals import yesterday's statement. Bulwark computes the ceiling for the trade you're about to take — the smaller of the risk you want and the room you have above the STOP line.</p></div>
<div class="card"><h3>The right anchor</h3><p>FTMO uses balance at midnight Prague; The5ers the higher of closing balance and equity; FundedNext the day-start balance. Get the anchor wrong and your floor is wrong by hundreds. Bulwark gets it right per firm.</p></div>
<div class="card"><h3>Receipts, not vibes</h3><p>Every rule preset carries a verified-as-of date and source links, and every number can show its working. The cockpit's receipts log (coming with the launch) will record what the rules said on the day, so a breach dispute rests on evidence rather than memory.</p></div>
</div>
</section>
<section>
<div class="eyebrow">What Bulwark will never do</div>
<ul class="never">
<li><b>Recommend a trade.</b> No signals, no direction, no "buy here". Ever.</li>
<li><b>Touch your money or your logins.</b> No broker credentials, no custody, no auto-trading in the free tools.</li>
<li><b>Promise outcomes.</b> No pass rates, no profit claims, no testimonials about results.</li>
<li><b>Take affiliate money from firms or brokers.</b> The rule data has to stay honest; that means no incentives to flatter anyone.</li>
<li><b>Show stale data as live.</b> Every figure says what it's computed from and when.</li>
</ul>
</section>
<section id="waitlist">
<p class="sub" style="margin-bottom:22px"><b>Before you trust a number here:</b> every rule comes from the firm&rsquo;s own pages, dated and linked; each calculator shows the date its rules were last read there, the changelog records every re-read and what it found, and a rule changes only as a new dated version; the arithmetic runs through an engine verified against 198 independent vectors and audited by a second engine; where the tool cannot resolve something it refuses rather than guesses. <a href="docs/verify.html">How we verify &rarr;</a></p>
<div class="eyebrow">The cockpit</div>
<h2>Live floors on every trade, with your firm's preset, a receipts log and alerts.</h2>
<p class="sub">Free for one account. Multi-account, statement import and audit export come later, for people who want them. Leave an email and we'll tell you when it opens — nothing else, ever.</p>
<form id="wl" method="post" action="https://buttondown.com/api/emails/embed-subscribe/BUTTONDOWN_USERNAME" target="_blank" style="margin-top:14px;display:flex;gap:10px;flex-wrap:wrap;max-width:520px">
<input type="email" name="email" placeholder="you@example.com" required style="flex:1;min-width:220px"><button class="btn primary" type="submit">Notify me</button>
</form>
<p class="micro" style="margin-top:8px">Waitlist emails are sent by Buttondown; unsubscribe in one click. No tracking pixels on this site.</p>
<script>(function(){var f=document.getElementById("wl");if(f&&f.action.indexOf("BUTTONDOWN_USERNAME")>-1){f.innerHTML='<span class="hint">The waitlist opens with the launch — check back shortly.</span>';}})();</script>
</section>
${foot()}`;
writeFileSync("index.html", noRestore(index));

// ── Docs from markdown ──
mkdirSync("docs", { recursive: true });
for (const [src, out, title] of [["docs-src/quickstart.md", "docs/quickstart.html", "Quick-start — Bulwark"], ["docs-src/manual.md", "docs/manual.html", "User manual — Bulwark"], ["docs-src/legal.md", "docs/legal.html", "Terms, Privacy & Refunds — Bulwark"], ["docs-src/verify.md", "docs/verify.html", "How we verify firm rules — Bulwark"], ["docs-src/faq.md", "docs/faq.html", "FAQ — Bulwark"], ["docs-src/changelog.md", "docs/changelog.html", "Changelog and credits — Bulwark"]]) {
  if (!existsSync(src)) continue;
  writeFileSync(out, `${head(title, title, "../")}<section style="border-top:0;padding-top:12px"><div class="doc">${marked.parse(readFileSync(src, "utf8"))}</div></section>${foot("../")}`);
}
writeFileSync("404.html", `${head("Not found — Bulwark", "Not found")}<section style="border-top:0"><h1>Nothing here.</h1><p class="sub"><a href="index.html">Back to Bulwark</a></p></section>${foot()}`);
const ORIGIN = "https://mattyj-spec.github.io/bulwark-site/"; // change when the custom domain goes live
writeFileSync("robots.txt", `User-agent: *\nAllow: /\nSitemap: ${ORIGIN}sitemap.xml\n`);
writeFileSync("sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${["index.html","compare.html","docs/quickstart.html","docs/manual.html","docs/legal.html","docs/verify.html","docs/faq.html","docs/changelog.html",...eligible.map(p=>`calculators/${p.slug}.html`)].map(u=>`  <url><loc>${ORIGIN}${u}</loc></url>`).join("\n")}\n</urlset>\n`);
console.log(`built: index.html, ${eligible.length} calculators (${eligible.map(p => p.slug).join(", ")}), docs, 404`);
