import { computeState, computeMaxSize } from "./engine.js";
import { nextReset } from "./reset.js";

const $ = (id) => document.getElementById(id);
const fmt = (v, d = 0) => (v < 0 ? "−" : "") + Math.abs(v).toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: Math.max(d, 2) });
const num = (id, dflt = 0) => { const v = parseFloat(($(id)?.value ?? "").toString().replace(/,/g, "")); return Number.isFinite(v) ? v : dflt; };

export function mountCalculator(preset) {
  const P = preset;
  const hasDaily = P.daily !== null && P.daily !== undefined;
  const trails = P.max.model !== "static";

  const state = () => ({
    initialSize: num("initialSize", 100000),
    dayStartBalance: num("dayStartBalance", 100000),
    dayStartAnchorValue: num("dayStartAnchor", num("dayStartBalance", 100000)),
    todayClosedPnl: parseLog($("todayLog").value).total,
    openPnl: num("openPnl", 0),
    highestEodBalance: trails ? num("highestEod", num("initialSize", 100000)) : undefined,
    hwmLiveEquity: trails ? num("highestEod", num("initialSize", 100000)) : undefined,
    phaseIndex: parseInt($("phase")?.value ?? "0", 10) || 0,
    profitableDaysCompleted: P.profitableDays ? num("profitableDays", 0) : undefined,
    bestPrevDayPnl: P.consistency ? num("bestPrevDay", 0) : undefined,
    positiveDaysProfit: P.consistency ? num("positiveDays", 0) : undefined,
    // v0.3.6: a total-profit consistency rule (FTMO 1-Step, orders from 12 Oct 2026) is measured on the cumulative closed
    // profit of the account = (day-start balance + today's closed P&L) − account size; derived, never typed, so the meter
    // can never disagree with the floors it sits beside. Floating P&L is excluded — the firm counts closed trades.
    totalClosedProfit: P.consistency && P.consistency.denominator === "totalProfit"
      ? num("dayStartBalance", 100000) + parseLog($("todayLog").value).total - num("initialSize", 100000) : undefined,
  });

  function parseLog(raw) {
    // Loud-failure parser: commas between digits are ambiguous → error, never a guess (adopted from the Pine parity review).
    const s = (raw || "").replace(/−/g, "-").trim();
    if (!s) return { total: 0, count: 0, wins: 0, losses: 0, error: null };
    const amb = s.match(/\d,\d/);
    if (amb) return { total: 0, count: 0, wins: 0, losses: 0, error: `Ambiguous comma in "${amb[0]}" — separate trades with spaces and use a dot for decimals.` };
    const toks = s.split(/[\s,]+/).filter(Boolean);
    let total = 0, count = 0, wins = 0, losses = 0;
    for (const t of toks) { const v = parseFloat(t); if (!Number.isFinite(v)) return { total: 0, count: 0, wins: 0, losses: 0, error: `"${t}" is not a number.` }; total += v; count++; if (v > 0) wins++; else if (v < 0) losses++; }
    return { total, count, wins, losses, error: null };
  }

  function render() {
    const dailyOverride = document.getElementById('dailyPctIn'); const maxOverride = document.getElementById('maxPctIn');
    const dailyRule = P.daily ? { ...P.daily, ...(dailyOverride ? { pct: num('dailyPctIn', P.daily.pct) } : {}) } : null;
    const maxRule = { ...P.max, ...(maxOverride ? { pct: num('maxPctIn', P.max.pct) } : {}) };
    const fp = { firmId: P.firm, programId: P.id, displayName: P.program, daily: dailyRule, max: maxRule, target: P.target, consistency: P.consistency, profitableDays: P.profitableDays, minDays: P.minDays, breach: P.breach, verifiedAsOf: P.verifiedAsOf, sources: P.sources, status: P.status === "verified-with-conflict" ? "verified-with-conflict" : "verified" };
    const st = state();
    const buffer = num("buffer", 75);
    const o = computeState(fp, st, { bufferPct: buffer });
    const log = parseLog($("todayLog").value);

    // status
    const el = $("status");
    let cls = "ok", txt = "OK — trade your plan";
    if (o.breachedMax) { cls = "breach"; txt = "✖ MAX LOSS BREACHED"; }
    else if (o.breachedDaily) { cls = "breach"; txt = "✖ DAILY LIMIT BREACHED"; }
    else if (o.pastStop) { cls = "stop"; txt = "■ STOP FOR TODAY — buffer line hit"; }
    else if (!hasDaily) { cls = "none"; txt = "No daily loss limit in this program — protection derives from the max floor"; }
    el.className = "status " + cls; el.textContent = txt;

    // figures
    const set = (id, v, c) => { const e = $(id); e.textContent = v; e.className = "v " + (c || ""); };
    set("f-equity", fmt(o.liveEquity), o.breachedDaily || o.breachedMax ? "red" : o.pastStop ? "orange" : "");
    set("f-stop", fmt(o.stopLine) + "  · room " + fmt(o.roomToStop), o.roomToStop > 0 ? "amber" : "orange");
    set("f-daily", hasDaily ? fmt(o.dailyFloor) : "no daily rule", "red");
    set("f-max", fmt(o.maxFloor), "red");
    const used = o.dailyUsedPct ?? 0; $("bar").style.width = Math.min(100, used) + "%"; $("bar").style.background = used >= buffer ? "var(--red)" : used >= 50 ? "var(--amber)" : "var(--green)";
    $("usedTxt").textContent = hasDaily ? used.toFixed(1) + "% of daily limit used" : "—";

    // log echo
    $("logEcho").textContent = log.error ? "⛔ " + log.error : `${log.count} trades · ${log.wins}W ${log.losses}L · P&L ${fmt(log.total)} — verify this matches what you typed.`;
    $("logEcho").className = log.error ? "refuse" : "hint";

    // tape
    drawTape(o);

    // target / consistency / profitable days
    let extra = [];
    if (o.target) { const raised = o.target.raisedByConsistency ? " (raised by the consistency rule)" : ""; extra.push(o.target.reachedBanked ? `Target ${fmt(o.target.targetEquity)}${raised}: reached — banked ✓` : o.target.floatingPastTarget ? `Target${raised}: floating past target — ${fmt(o.target.toTargetClosed)} not yet banked` : `Target ${fmt(o.target.targetEquity)}${raised}: ${fmt(o.target.toTargetClosed)} to go (closed balance)`); }
    if (o.consistency && o.consistency.pct !== null) {
      const den = o.consistency.denominatorType === "profitTarget" ? "the profit target" : o.consistency.denominatorType === "positiveDaysProfit" ? "positive-days profit" : "total closed profit";
      const tail = !o.consistency.exceeded ? "" : o.consistency.breachConsequence === "raisesTarget" ? ` — exceeded: not a breach; the target rises to ${fmt(o.consistency.raisedTargetEquity)} until the best day is back under the cap` : o.consistency.breachConsequence === "defersPass" ? " — exceeded: not a breach, passing deferred" : " — exceeded: rule breach";
      // Display: two decimals; when the share is within 0.01 of the cap AND exceeded, show four decimals from the raw ratio so a hair over the cap never prints as "50.00% … exceeded".
      const raw = o.consistency.denominatorValue > 0 ? (o.consistency.bestDayRef / o.consistency.denominatorValue) * 100 : o.consistency.pct;
      const pctTxt = (o.consistency.exceeded && Math.abs(raw - o.consistency.capPct) < 0.01) ? raw.toFixed(4) : o.consistency.pct.toFixed(2);
      extra.push(`Best-Day: ${pctTxt}% of ${den} (cap ${o.consistency.capPct}%)${tail}`);
    }
    if (o.profitableDays) extra.push(`Profitable days: ${o.profitableDays.completedBeforeToday}/${o.profitableDays.required} before today; today ${o.profitableDays.todayQualifiesNow ? "would qualify if held to midnight" : "not yet qualifying"} (threshold ${fmt(o.profitableDays.thresholdAmount)})`);
    $("extra").innerHTML = extra.map(x => `<div class="hint" style="margin-top:6px">${x}</div>`).join("");

    // sizing
    const vpu = num("valuePerUnit", 0);
    const sz = computeMaxSize(o, { riskPct: num("riskPct", 0.5), stopDistance: num("stopDist", 20), valuePerUnitPerLot: vpu > 0 ? vpu : null, unitLabel: "lots" });
    const szEl = $("sizeOut");
    if (sz.maxSize === null) { szEl.className = "v refuse"; szEl.textContent = "⛔ " + sz.refusalReason; }
    else if (sz.maxSize === 0) { szEl.className = "v orange"; szEl.textContent = "0 — past STOP, no size today"; }
    else { szEl.className = "v green"; szEl.textContent = sz.maxSize.toFixed(2) + " lots  · risk allowed " + fmt(sz.riskAllowed, 2); }

    // reset countdown
    try { if (hasDaily) { const r = nextReset(P.daily.resetTz, P.daily.resetHour, Date.now()); $("reset").textContent = `Next reset in ${Math.floor(r.minutesUntil / 60)}h ${String(r.minutesUntil % 60).padStart(2, "0")}m (${P.daily.resetTz})`; } else $("reset").textContent = ""; } catch { $("reset").textContent = "Reset timezone unavailable"; }

    // working
    $("working").innerHTML = [...o.explanations, ...sz.explanations].map(e => `<li>${e}</li>`).join("");
  }

  function drawTape(o) {
    const top = Math.max(o.dailyAnchor ?? o.liveEquity, o.liveEquity) + (o.dailyLimitAmt ?? o.liveEquity * 0.02) * 0.3;
    const bottom = Math.min(o.effectiveFloor, o.maxFloor) - (o.dailyLimitAmt ?? o.liveEquity * 0.02) * 0.3;
    const y = v => ((1 - (v - bottom) / Math.max(top - bottom, 1)) * 100) + "%";
    const lvl = (v, label, color, dash) => v == null ? "" : `<div class="lvl" style="top:${y(v)};color:${color}"><div class="rule${dash ? " dash" : ""}"></div><div class="lab">${label} ${fmt(v)}</div></div>`;
    const c = o.breachedDaily || o.breachedMax ? "var(--red)" : o.pastStop ? "var(--orange)" : "var(--green)";
    $("tape").innerHTML = lvl(o.dailyAnchor, "ANCHOR", "var(--dim)") + lvl(o.stopLine, "STOP", "var(--amber)", true) + lvl(o.dailyFloor, "DAILY FLOOR", "var(--red)") + (o.maxFloor !== o.dailyFloor ? lvl(o.maxFloor, "MAX FLOOR", "var(--red)", true) : "") + `<div class="needle" style="top:${y(o.liveEquity)}"><span class="chip" style="background:${c}">▶ ${fmt(o.liveEquity)}</span></div>`;
  }

  document.querySelectorAll("input,select").forEach(e => e.addEventListener("input", render));
  render();
  setInterval(render, 30000);
}
