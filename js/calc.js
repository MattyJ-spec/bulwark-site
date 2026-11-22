import { computeState, computeMaxSize } from "./engine.js";
import { nextReset } from "./reset.js";

const $ = (id) => document.getElementById(id);
const fmt = (v, d = 0) => (v < 0 ? "−" : "") + Math.abs(v).toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: Math.max(d, 2) });

// v0.3.9 — strict readers (written and audited on 15–16 Nov 2026). The page refuses rather than guesses: an entry that cannot be read stops the figures instead of
// being replaced by a default. A box left EMPTY still takes the page's documented default (the program's own account size
// for a balance, zero for floating P&L), and a lone sign, "$" or "." is an unfinished entry, treated as empty.

/** Read one typed number → { value, error }. Empty or unfinished → { value: null, error: null }.
 *  Accepted: an optional sign (ASCII or the U+2212 minus this site prints), an optional $ sign, digits with optional thousands
 *  separators (commas or spaces, in groups of three, the first group not starting with a zero), and a decimal part after a
 *  dot — or after a single comma followed by one or two final digits ("0,5", "98 500,50"), which cannot be a thousands
 *  separator.
 *  Refused: letters, brackets or exponents ("25k", "(1500)", "1e5"); separators that fit no number format ("1,2345",
 *  "12 34", "104'000", "- 1200", "1200-", "0,5%"); and whatever has two readings — one dot followed by exactly three digits
 *  where a thousands separator could be meant (`dot3`: the money boxes, "104.000": 104 or 104,000? — and the stop-distance
 *  and value-per-unit boxes, "1.500": 1.5 or 1,500?, where the smaller reading makes the size a thousand times larger), and
 *  one comma followed by exactly three digits where it could be a decimal ("0,125" in any box; "1,250" in a box that is not
 *  money: 1250 or 1.25?). In a money box "1,250" is one thousand two hundred and fifty, as it has always been read; in a
 *  percentage box "1.500" is one and a half, the only thing it can mean there. */
export function readNumber(raw, money = false, dot3 = money) {
  const shown = (raw ?? "").toString().trim();
  let s = shown.replace(/−/g, "-").replace(/[   ]/g, " ");
  if (s === "" || /^[+-]?\s*\$?\s*\.?$/.test(s)) return { value: null, error: null };
  s = s.replace(/^([+-]?)\s*\$\s*/, "$1").replace(/^\+/, "");
  if (/^-?(?:\d+|[1-9]\d{0,2}(?: \d{3})+),\d{1,2}$/.test(s)) s = s.replace(",", ".");
  const c3 = /^-?(\d{1,3}),(\d{3})$/.exec(s); // one comma, exactly three digits after it
  // the decimal reading, written in a form this box accepts: where a dot before exactly three digits is itself refused
  // (dot3), "1.250" is offered as 1.25 and "1.125" as 1.1250
  const asDecimal = (d) => (dot3 && /^[1-9]\d{0,2}\.\d{3}$/.test(d) ? (/0$/.test(d) ? String(parseFloat(d)) : d + "0") : d);
  if (c3 && (!money || /^0+$/.test(c3[1]))) return { value: null, error: `"${shown}" is ambiguous: type ${String(parseInt(c3[1] + c3[2], 10))} or ${asDecimal(s.replace("-", "").replace(",", "."))}` };
  const ok = /^-?(?:\d+|[1-9]\d{0,2}(?:,\d{3})+|[1-9]\d{0,2}(?: \d{3})+)(?:\.\d*)?$/.test(s) || /^-?\.\d+$/.test(s);
  if (!ok) return { value: null, error: `"${shown}" is not a number` };
  if (dot3 && /^-?[1-9]\d{0,2}\.\d{3}$/.test(s)) {
    const whole = s.replace(".", "");
    return { value: null, error: money ? `"${shown}" is ambiguous: type ${whole} for thousands, or two decimals for cents` : `"${shown}" is ambiguous: type ${whole.replace("-", "")} or ${asDecimal(s.replace("-", ""))}` };
  }
  // v0.3.9, after the pre-deploy review of 22 Nov 2026 (R-06): a figure too long to be a number (more than about 308 digits) parses
  // to infinity. Refused by name like any other entry that is not a number; the echo is cut short.
  const value = parseFloat(s.replace(/[, ]/g, ""));
  if (!Number.isFinite(value)) return { value: null, error: `"${shown.length > 24 ? shown.slice(0, 24) + "…" : shown}" is not a number` };
  return { value, error: null };
}

/** Today's closed trades, in the order they closed → { total, count, wins, losses, peak, error }. `peak` is the highest
 *  running total reached along the way (never below zero): the closed-trade high of the day, measured from the day-start
 *  balance. Loud failure: a comma between digits is ambiguous and anything that is not plainly a number is an error. A lone
 *  sign, "$" or "." at the very end is an entry still being typed and is left out. */
export function parseLog(raw) {
  const none = (error) => ({ total: 0, count: 0, wins: 0, losses: 0, peak: 0, error });
  const s = (raw || "").replace(/−/g, "-").trim();
  if (!s) return none(null);
  const amb = s.match(/\d,\d/);
  if (amb) return none(`Ambiguous comma in "${amb[0]}" — separate trades with spaces and use a dot for decimals`);
  const toks = s.split(/[\s,]+/).filter(Boolean);
  if (toks.length && /^[+-]?\$?\.?$/.test(toks[toks.length - 1])) toks.pop();
  let total = 0, count = 0, wins = 0, losses = 0, peak = 0;
  for (const t of toks) {
    // v0.3.9, after the pre-deploy review of 22 Nov 2026 (R-07): one dot followed by exactly three digits has two readings
    // here as in the money boxes ("-1.500": a loss of 1.50 or of 1,500?). Refused, not guessed.
    if (/^[+-]?\$?[1-9]\d{0,2}\.\d{3}$/.test(t)) return none(`"${t}" is ambiguous: type ${t.replace(/[$+.]/g, "")} for thousands, or two decimals for cents`);
    const v = /^[+-]?\$?(?:\d+\.?\d*|\.\d+)$/.test(t) ? parseFloat(t.replace(/[$+]/g, "")) : NaN;
    if (!Number.isFinite(v)) return none(`"${t}" is not a number`);
    total += v; count++; if (v > 0) wins++; else if (v < 0) losses++;
    if (total > peak) peak = total;
  }
  return { total, count, wins, losses, peak, error: null };
}

const MONEY = new Set(["initialSize", "dayStartBalance", "dayStartAnchor", "highestEod", "openPnl", "bestPrevDay", "positiveDays"]);
// Sizing boxes where a dot before exactly three digits could be a thousands separator ("1.500" points): refused, not guessed.
const QTY = new Set(["stopDist", "valuePerUnit"]);
const SIZING = new Set(["riskPct", "stopDist", "valuePerUnit"]);
const NAMES = { initialSize: "the account size", dayStartBalance: "the day-start balance", dayStartAnchor: "the day-start anchor", highestEod: "the highest balance", openPnl: "the floating P&L", bestPrevDay: "the best prior day", positiveDays: "the positive-days profit", profitableDays: "the profitable days", dailyPctIn: "the daily %", maxPctIn: "the max %", buffer: "the buffer", todayLog: "today's trades", riskPct: "the risk %", stopDist: "the stop distance", valuePerUnit: "the value per point" };

/** opts (set by the page generator, never typed): sizeUnit "contracts" switches the size line to whole contracts;
 *  maxContracts is the firm's contract limit for this account, where the preset carries one.
 *  preset.sizeLimit {min, max, sizes, below, between, above} (optional): the account sizes the preset's limits are
 *  published for — the listed `sizes`, or, where no list is given, every size from min to max. */
export function mountCalculator(preset, opts = {}) {
  const P = preset;
  const hasDaily = P.daily !== null && P.daily !== undefined;
  const trails = P.max.model !== "static";
  const livePeak = P.max.model === "trailingLiveEquity";
  // A daily limit that pauses the day (Apex) or locks trading until the next session (Topstep) is not a failed account.
  const pauses = !!P.breach && (P.breach.daily === "pause" || P.breach.daily === "lockout");
  const contracts = opts.sizeUnit === "contracts";
  const capBase = contracts && Number.isFinite(opts.maxContracts) ? opts.maxContracts : null;

  // Input guards (v0.3.7) — definitions, not guesses. Fallbacks for an EMPTY box use the program's own size, never a generic
  // 100,000. The day-start anchor is the HIGHER of balance and equity, so it is never below the day-start balance; the
  // day-start balance is itself an end-of-day balance, so the highest end-of-day balance (or peak) is never below it. A box
  // left stale can therefore only make a floor tighter, never looser.
  const SIZE0 = P.defaultInitialSize ?? 100000;
  let bad = new Map(); // id → why it could not be read, rebuilt on every render
  const num = (id, dflt = 0) => {
    const e = $(id); if (!e) return dflt;
    const r = readNumber(e.value, MONEY.has(id), MONEY.has(id) || QTY.has(id));
    if (r.error) { bad.set(id, r.error); return dflt; }
    return r.value === null ? dflt : r.value;
  };
  const size = () => (P.max.displayAmount != null ? SIZE0 : num("initialSize", SIZE0)); // a fixed-size page takes its size from the preset, never from the box
  const bal = () => num("dayStartBalance", size());
  const high = () => Math.max(num("highestEod", size()), bal());

  // v0.3.9 (audit G-01) — a threshold that follows the peak in real time never comes back down, so on those programs the
  // page never forgets a high it has been shown: the day-start balance, the highest running total of today's closed trades,
  // and equity now. It only ever RAISES the peak box; a figure the trader typed is never lowered, and the box itself is the
  // only memory (nothing is stored, a reload starts again). A high the page was never shown still has to be typed.
  // (second audit, H-03) While the trade list or a money box cannot be read the page cannot follow the balance, and a high
  // reached in that time is NOT carried. The page says so under the box once the entries read again, and the note stays
  // until the trader edits the box. An entry that cannot be read only while it is being typed ("1," on the way to "1,200")
  // is not such a gap: nothing else can change in that moment, so the flag is raised only when the unreadable box is not
  // the one in use. (Third look, J-01) A rule that held the day-start figure back while that box was in use was tried and
  // withdrawn: a balance typed, read and later retyped lower without leaving the box was forgotten. Every figure the page
  // is shown is carried at once; a typo in that box therefore sticks in the peak box until the trader corrects it there,
  // which errs on the tight side and is what the note under the box says.
  const MISSED = "⚠ While an entry could not be read, the page could not follow your balance. If your balance or equity made a new high in that time, type it here.";
  let missedHigh = false, missedShown = false, lastRaise = "";
  function ratchetPeak(log) {
    if (!livePeak) return;
    const box = $("highestEod");
    if (!box) return;
    const inUse = document.activeElement?.id ?? "";
    if (log.error) { if (inUse !== "todayLog") missedHigh = true; return; }
    if (inUse === "highestEod") return;
    const quiet = new Map(bad); // reading the boxes here must not decide what the render reports
    const b = bal(), open = num("openPnl", 0), typed = num("highestEod", -Infinity);
    const unread = [...bad.keys()].filter(k => !quiet.has(k)); bad = quiet;
    if (unread.length) { if (unread.some(k => k !== inUse)) missedHigh = true; return; }
    const seen = Math.round(Math.max(b, b + log.peak, b + log.total + open) * 100) / 100;
    if (Number.isFinite(seen) && seen > typed) {
      box.value = String(seen);
      lastRaise = `Raised to ${fmt(seen, 2)} from your entries. The page only ever raises this box: if an entry was a typo, correct the figure here. It is not remembered after a reload.`;
    }
    if (missedHigh) missedShown = true;
    const n = $("peakNote"), msg = [lastRaise, missedHigh ? MISSED : ""].filter(Boolean).join(" ");
    if (n && msg && n.textContent !== msg) n.textContent = msg;
  }

  const state = (log) => ({
    initialSize: size(),
    dayStartBalance: bal(),
    dayStartAnchorValue: Math.max(num("dayStartAnchor", bal()), bal()),
    todayClosedPnl: log.total,
    openPnl: num("openPnl", 0),
    highestEodBalance: trails ? high() : undefined,
    hwmLiveEquity: trails ? Math.max(high(), bal() + log.peak) : undefined,
    phaseIndex: parseInt($("phase")?.value ?? "0", 10) || 0,
    profitableDaysCompleted: P.profitableDays ? num("profitableDays", 0) : undefined,
    bestPrevDayPnl: P.consistency ? num("bestPrevDay", 0) : undefined,
    positiveDaysProfit: P.consistency ? num("positiveDays", 0) : undefined,
    // v0.3.6: a total-profit consistency rule (FTMO 1-Step, orders from 12 Oct 2026) is measured on the cumulative closed
    // profit of the account = (day-start balance + today's closed P&L) − account size; derived, never typed, so the meter
    // can never disagree with the floors it sits beside. Floating P&L is excluded — the firm counts closed trades.
    totalClosedProfit: P.consistency && P.consistency.denominator === "totalProfit" ? bal() + log.total - size() : undefined,
  });

  const set = (id, v, c) => { const e = $(id); e.textContent = v; e.className = "v " + (c || ""); };
  const mark = () => document.querySelectorAll("input").forEach(e => { const b = bad.has(e.id); e.style.outline = b ? "2px solid var(--orange)" : ""; if (b) e.setAttribute("aria-invalid", "true"); else e.removeAttribute("aria-invalid"); });
  const countdown = () => { try { if (hasDaily) { const r = nextReset(P.daily.resetTz, P.daily.resetHour, Date.now()); $("reset").textContent = `Daily limit resets in ${Math.floor(r.minutesUntil / 60)}h ${String(r.minutesUntil % 60).padStart(2, "0")}m${P.resetLabel ? " — " + P.resetLabel : " (" + P.daily.resetTz + ")"}`; } else $("reset").textContent = ""; } catch { $("reset").textContent = "Reset timezone unavailable"; } };

  function render() {
    bad = new Map();
    const log = parseLog($("todayLog").value);
    ratchetPeak(log);
    if (log.error) bad.set("todayLog", log.error);
    const dailyOverride = document.getElementById('dailyPctIn'); const maxOverride = document.getElementById('maxPctIn');
    const dailyRule = P.daily ? { ...P.daily, ...(dailyOverride ? { pct: num('dailyPctIn', P.daily.pct) } : {}) } : null;
    const maxRule = { ...P.max, ...(maxOverride ? { pct: num('maxPctIn', P.max.pct) } : {}) };
    const fp = { firmId: P.firm, programId: P.id, displayName: P.program, daily: dailyRule, max: maxRule, target: P.target, consistency: P.consistency, profitableDays: P.profitableDays, minDays: P.minDays, breach: P.breach, verifiedAsOf: P.verifiedAsOf, sources: P.sources, status: P.status === "verified-with-conflict" ? "verified-with-conflict" : "verified" };
    const st = state(log);
    const buffer = num("buffer", 75);
    if (!bad.has("initialSize") && !(st.initialSize > 0)) bad.set("initialSize", "the account size must be greater than zero");

    // log echo
    $("logEcho").textContent = log.error ? "⛔ " + log.error + "." : `${log.count} trades · ${log.wins}W ${log.losses}L · P&L ${fmt(log.total)} — verify this matches what you typed.`;
    $("logEcho").className = log.error ? "refuse" : "hint";
    countdown();

    const el = $("status"), szEl = $("sizeOut");
    const paint = (c, t) => { szEl.className = "v " + c; szEl.textContent = t; };

    // An entry the page cannot read: say which one, and show no figure computed from a guess.
    if (bad.size) {
      const [id, why] = bad.entries().next().value;
      el.className = "status stop"; el.textContent = `⛔ CAN'T READ ${(NAMES[id] ?? id).toUpperCase()} — ${why}. No figures until it is fixed.`;
      for (const f of ["f-equity", "f-stop", "f-daily", "f-max"]) set(f, "—", "");
      $("bar").style.width = "0%"; $("usedTxt").textContent = "—"; $("tape").innerHTML = ""; $("extra").innerHTML = "";
      paint("refuse", "⛔ No size until the entry is fixed.");
      $("working").innerHTML = "<li>Nothing is computed while an entry cannot be read.</li>";
      mark();
      return;
    }

    // v0.3.9 — a page whose limits are published for certain account sizes only (preset field sizeLimit; The5ers High
    // Stakes: the firm's table gives other limits to other sizes, and none to a scaled-up account) shows no figure for
    // another size. The limits it would apply are not that account's — on the larger sizes they would show more room than
    // the account has. With a list (sizes) only the listed sizes are calculated; without one, every size from min to max.
    const lim = P.sizeLimit;
    const sizeOk = !lim || (Array.isArray(lim.sizes) ? lim.sizes.includes(st.initialSize) : st.initialSize >= lim.min && st.initialSize <= lim.max);
    if (!sizeOk) {
      const whySize = (st.initialSize > lim.max ? lim.above : st.initialSize < lim.min ? lim.below : lim.between) ?? "";
      const sizeTxt = st.initialSize.toLocaleString("en-US", { maximumFractionDigits: 6 }); // the size as typed, not rounded to cents
      const covers = Array.isArray(lim.sizes) ? "these account sizes: " + lim.sizes.map(v => "$" + fmt(v)).join(", ") : "account sizes from $" + fmt(lim.min) + " to $" + fmt(lim.max);
      el.className = "status stop"; el.textContent = `⛔ NOT FOR A $${sizeTxt} ACCOUNT — ${whySize} No figures for this account size.`;
      for (const f of ["f-equity", "f-stop", "f-daily", "f-max"]) set(f, "—", "");
      $("bar").style.width = "0%"; $("usedTxt").textContent = "—"; $("tape").innerHTML = ""; $("extra").innerHTML = "";
      paint("refuse", "⛔ No size: this page does not cover this account size.");
      $("working").innerHTML = `<li>This page's limits are published for ${covers}. Nothing is computed for another size.</li>`;
      bad.set("initialSize", "outside the account sizes this page covers"); // outlines the box; the text is not shown
      mark();
      return;
    }

    const o = computeState(fp, st, { bufferPct: buffer });
    // v0.3.9 (audit G-07): the engine compares unrounded sums, so cents that add up to a floor can land a hair above it and
    // read "not breached" while every figure on the page shows equity ON the floor. To the cent, touching is breaching: the
    // banner goes by the cent-rounded figures the page displays. It can only add a breach, never remove one. (The engine
    // fix — a sub-cent epsilon on floor comparisons — is in the engine backlog and has to pass both engines.)
    const measure = (basis) => basis === "balance" ? o.closedBalance : basis === "lowerOf" ? Math.min(o.liveEquity, o.closedBalance) : o.liveEquity;
    const breachedMax = o.breachedMax || measure(fp.max.breachBasis) <= o.maxFloor;
    const breachedDaily = o.breachedDaily || (o.dailyFloor !== null && measure(fp.daily?.breachBasis) <= o.dailyFloor);
    // Room to each floor ON THE MEASURE THE FIRM TESTS (equity, the closed balance, or the lower of the two) — differences of
    // the figures the page displays. Their minimum is the engine's own roomToFloor.
    const roomMax = measure(fp.max.breachBasis) - o.maxFloor;
    const roomDaily = o.dailyFloor !== null ? measure(fp.daily?.breachBasis) - o.dailyFloor : Infinity;
    const roomFloor = Math.min(roomMax, roomDaily), nearestIsMax = roomMax <= roomDaily;
    const floorName = nearestIsMax ? "max-loss floor" : pauses ? "daily loss limit" : "daily floor", floorVal = nearestIsMax ? o.maxFloor : o.dailyFloor;
    // v0.3.9 NO BUFFER (audit G-02, generalised). The STOP line holds a buffer back above the DAILY limit, on equity, and the
    // engine sizes to the room above that line. Nothing is held back when a floor is at least as near as the STOP line:
    //   · the max-loss floor is nearer than the daily STOP line (the STOP line then IS that floor);
    //   · the buffer slider is at 100% (the STOP line is set on the floor);
    //   · the floor is tested on a closed balance that sits below equity — floating profit — so a realised loss reaches it
    //     sooner than equity reaches the STOP line (firms that test "balance or equity").
    // The page then says NO BUFFER instead of OK and never sizes to more than the room to that floor.
    // v0.3.9, after the pre-deploy review of 22 Nov 2026 (R-03): a STOP line that sits on the nearest floor, to the cent, holds
    // nothing back either. Without this second test a half-cent tie in the rounding (the room to the floor is taken from the
    // cent-rounded floor, the engine's room to the STOP line from unrounded figures) could leave the two a cent apart, and the
    // slider at 100% read "OK". It can only add a NO BUFFER, never remove one.
    const noBuffer = !breachedMax && !breachedDaily && (roomFloor <= o.roomToStop + 1e-6 || Math.abs(o.stopLine - (nearestIsMax ? o.maxFloor : o.dailyFloor)) < 0.005);
    const pastStop = !breachedMax && !breachedDaily && !noBuffer && (o.pastStop || o.liveEquity <= o.stopLine);
    const stopOnFloor = Math.abs(o.stopLine - floorVal) < 0.005;
    const onBalance = (b => b === "balance" || b === "lowerOf")(nearestIsMax ? fp.max.breachBasis : fp.daily?.breachBasis) && o.closedBalance < o.liveEquity - 0.005;
    const roomEff = Math.round(Math.min(o.roomToStop, roomFloor) * 100) / 100; // what the size may use

    // Why nothing is held back (third look, J-03): the closed balance is the measure nearest a floor; or the slider is at
    // 100% AND it is the slider that puts the STOP line on this floor (the daily floor, or the max floor of a program with
    // no daily rule); otherwise the buffered daily line lies on or below a max-loss floor that is the nearer line anyway.
    const dailyLine = o.dailyFloor !== null && Number.isFinite(o.dailyAnchor) && Number.isFinite(o.dailyLimitAmt) ? o.dailyAnchor - o.dailyLimitAmt * buffer / 100 : null;
    const why = onBalance ? `It is tested on your closed balance (${fmt(o.closedBalance, 2)}), which is below your equity.`
      : buffer >= 100 && (!nearestIsMax || dailyLine === null) ? "The buffer is set to 100%."
      : dailyLine !== null && Math.abs(dailyLine - o.maxFloor) < 0.005 ? "The daily STOP line is on it." : "The daily STOP line is below it.";

    // status
    let cls = "ok", txt = "OK — trade your plan";
    if (breachedMax) { cls = "breach"; txt = "✖ MAX LOSS BREACHED"; }
    else if (breachedDaily && pauses) { cls = "stop"; txt = "■ DAILY LOSS LIMIT REACHED — no trading until the next session. This limit does not fail the account."; }
    else if (breachedDaily) { cls = "breach"; txt = "✖ DAILY LIMIT BREACHED"; }
    else if (pastStop) { cls = "stop"; txt = "■ STOP FOR TODAY — buffer line hit"; }
    else if (noBuffer) { cls = "stop"; txt = `■ NO BUFFER — the ${floorName} (${fmt(floorVal)}) is the nearest line, ${fmt(roomFloor, 2)} away. ${why}`; }
    else if (!hasDaily) { cls = "none"; txt = "No daily loss limit in this program — protection derives from the max floor"; }
    el.className = "status " + cls; el.textContent = txt;

    // figures
    set("f-equity", fmt(o.liveEquity), breachedMax || (breachedDaily && !pauses) ? "red" : breachedDaily || pastStop || noBuffer ? "orange" : "");
    set("f-stop", noBuffer ? (stopOnFloor ? `${fmt(o.stopLine)} = ${nearestIsMax ? "max floor" : pauses ? "daily limit" : "daily floor"}  · room ${fmt(roomEff)}` : `${fmt(o.stopLine)}  · room ${fmt(roomEff)} to the ${floorName}`) : fmt(o.stopLine) + "  · room " + fmt(o.roomToStop), o.roomToStop > 0 && !noBuffer ? "amber" : "orange");
    set("f-daily", hasDaily ? fmt(o.dailyFloor) : "no daily rule", "red");
    set("f-max", fmt(o.maxFloor), "red");
    const used = o.dailyUsedPct ?? 0; $("bar").style.width = Math.min(100, used) + "%"; $("bar").style.background = used >= buffer ? "var(--red)" : used >= 50 ? "var(--amber)" : "var(--green)";
    $("usedTxt").textContent = hasDaily ? used.toFixed(1) + "% of daily limit used" : "—";

    // tape
    drawTape(o, noBuffer, breachedMax, breachedDaily, pastStop);

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
    if (trails) { const typedHigh = num("highestEod", size()); if (typedHigh < bal() - 0.005) extra.push(`The ${livePeak ? "highest-balance" : "highest end-of-day balance"} box reads ${fmt(typedHigh, 2)}, which is below your day-start balance — the page uses ${fmt(bal(), 2)} instead. Bring the box up to date: it is the page's only record of ${livePeak ? "the account's highest balance" : "your highest close"}.`); }
    if (o.profitableDays) extra.push(`Profitable days: ${o.profitableDays.completedBeforeToday}/${o.profitableDays.required} before today; today ${o.profitableDays.todayQualifiesNow ? "would qualify if held to midnight" : "not yet qualifying"} (threshold ${fmt(o.profitableDays.thresholdAmount)})`);
    $("extra").innerHTML = extra.map(x => `<div class="hint" style="margin-top:6px">${x}</div>`).join("");

    // sizing — FX pages size in lots; futures pages in whole contracts (rounded down, capped at the firm's limit where the
    // preset carries one) and start with the stop and the contract value EMPTY, so the engine refuses until both are typed.
    const risk = num("riskPct", 0.5), stopD = num("stopDist", contracts ? 0 : 20), vpu = num("valuePerUnit", 0);
    const sizeBad = [...bad.keys()].find(id => SIZING.has(id));
    // The engine sizes to "room above the STOP line". The page hands it the smaller of that and the room to the nearest floor
    // on the measure the firm tests, so a size can never use room the closed balance does not have.
    const sz = computeMaxSize({ ...o, roomToStop: roomEff }, { riskPct: risk, stopDistance: stopD, valuePerUnitPerLot: vpu > 0 ? vpu : null, unitLabel: contracts ? "contracts" : "lots" });
    const micro = contracts && !!$("isMicro")?.checked;
    const cap = capBase == null ? null : capBase * (micro ? 10 : 1);
    // In the no-buffer state the room the size may use is the room to a floor itself. A size that uses all of it is one
    // whose full stop TOUCHES the floor, which is a breach — so the page gives no size unless the risk asked for leaves
    // something above the floor, and then says how much.
    const left = roomEff - (sz.riskAllowed ?? 0);
    const NB = noBuffer ? ` — NO BUFFER: a full stop leaves ${contracts ? "at least " : ""}${fmt(left, 2)} above the ${floorName}` : "";
    const unit = (n) => contracts ? `${micro ? "micro contract" : "contract"}${n === 1 ? "" : "s"}` : "lots";
    const pageNotes = []; // "Show working" lines written by the page; numbers only, never typed text
    let nbRefused = false;
    // the value box is labelled per stop unit on FX pages and per point on futures pages; the refusal uses the page's own word
    if (sizeBad) paint("refuse", `⛔ Can't read ${sizeBad === "valuePerUnit" && !contracts ? "the value of one stop unit" : NAMES[sizeBad]} — ${bad.get(sizeBad)}.`);
    else if (breachedMax) paint("orange", "0 — limit breached, no size");
    else if (breachedDaily) paint("orange", pauses ? "0 — daily loss limit reached, no size today" : "0 — limit breached, no size");
    else if (!(risk > 0)) paint("refuse", "⛔ Risk per trade must be greater than zero.");
    else if (pastStop) paint("orange", "0 — past STOP, no size today");
    else if (contracts && (!($("stopDist")?.value ?? "").trim() || !($("valuePerUnit")?.value ?? "").trim())) paint("refuse", "⛔ Enter the stop distance in points and the dollar value of one point — the page does not guess either.");
    else if (sz.maxSize === null) paint("refuse", "⛔ " + sz.refusalReason);
    else if (pastStop || (sz.maxSize === 0 && !(sz.riskAllowed > 0))) paint("orange", "0 — past STOP, no size today");
    else if (noBuffer && left < 0.005) {
      nbRefused = true;
      paint("orange", `0 — NO BUFFER: the risk you asked for (${fmt(sz.riskWanted, 2)}) is not less than the room to the ${floorName} (${fmt(roomEff, 2)}); a full stop would touch it`);
      pageNotes.push(`No size: with nothing held back above the ${floorName}, a full stop on ${fmt(sz.riskWanted, 2)} of risk would reach it (room ${fmt(roomEff, 2)}). Ask for less risk than the room, or stop for the day.`);
    }
    else if (contracts) {
      const whole = Math.floor(sz.maxSize + 1e-9);
      pageNotes.push(`Whole contracts: ${sz.maxSize.toFixed(2)} → ${whole}, rounded down — a contract cannot be split.`);
      if (whole < 1) paint("orange", `0 — less than one contract fits this stop  · risk allowed ${fmt(sz.riskAllowed, 2)}`);
      else {
        const shown = cap != null ? Math.min(whole, cap) : whole;
        if (shown < whole) pageNotes.push(`Firm limit: ${cap} ${unit(cap)} — the figure is capped at it. The firm counts every open position against that limit; contracts you already hold are not subtracted here.`);
        paint(noBuffer ? "orange" : "green", `${shown} ${unit(shown)}  · risk allowed ${fmt(sz.riskAllowed, 2)}` + (shown < whole ? `  · capped at the firm's limit of ${cap}` : "") + NB);
      }
    }
    else if (sz.maxSize === 0) paint("orange", `0 — less than 0.01 lots fits this stop  · risk allowed ${fmt(sz.riskAllowed, 2)}`);
    else paint(noBuffer ? "orange" : "green", sz.maxSize.toFixed(2) + " lots  · risk allowed " + fmt(sz.riskAllowed, 2) + NB);

    // working — the engine's own lines; in the no-buffer state its STOP-line sentence describes the usual case, so the page
    // states what applies today instead.
    const lines = [...o.explanations, ...(sizeBad || breachedMax || breachedDaily ? [] : sz.explanations.filter(e => !(nbRefused && e.startsWith("Max size ")))), ...pageNotes]
      .map(e => noBuffer && e.startsWith("STOP line ") && stopOnFloor && nearestIsMax && o.dailyRule && buffer < 100 ? `STOP line ${fmt(o.stopLine)} = the max-loss floor. The buffered daily line (the daily anchor less ${buffer}% of the daily limit) is below it, so today nothing is held back above the nearest floor.` : e)
      .map(e => noBuffer && e.startsWith("Risk allowed ") ? `Risk allowed ${fmt(sz.riskAllowed, 2)} = lesser of your ${risk}% (${fmt(sz.riskWanted, 2)}) and the room to the ${floorName} on the measure the firm tests (${fmt(roomEff, 2)}) — nothing is held back above it today.` : e);
    $("working").innerHTML = lines.map(e => `<li>${e}</li>`).join("");
    mark();
  }

  function drawTape(o, noBuffer, breachedMax, breachedDaily, pastStop) {
    const top = Math.max(o.dailyAnchor ?? o.liveEquity, o.liveEquity) + (o.dailyLimitAmt ?? o.liveEquity * 0.02) * 0.3;
    const bottom = Math.min(o.effectiveFloor, o.maxFloor) - (o.dailyLimitAmt ?? o.liveEquity * 0.02) * 0.3;
    const y = v => ((1 - (v - bottom) / Math.max(top - bottom, 1)) * 100) + "%";
    const lvl = (v, label, color, dash) => v == null ? "" : `<div class="lvl" style="top:${y(v)};color:${color}"><div class="rule${dash ? " dash" : ""}"></div><div class="lab">${label} ${fmt(v)}</div></div>`;
    const c = breachedMax || (breachedDaily && !pauses) ? "var(--red)" : breachedDaily || pastStop || noBuffer ? "var(--orange)" : "var(--green)";
    // When the STOP line sits on the max-loss floor the two labels would overprint: one line, one label.
    const stopOnMax = Math.abs(o.stopLine - o.maxFloor) < 1e-6;
    $("tape").innerHTML = lvl(o.dailyAnchor, "ANCHOR", "var(--dim)") + (stopOnMax ? "" : lvl(o.stopLine, "STOP", "var(--amber)", true)) + lvl(o.dailyFloor, pauses ? "DAILY LIMIT" : "DAILY FLOOR", "var(--red)") + (o.maxFloor !== o.dailyFloor ? lvl(o.maxFloor, stopOnMax ? "STOP = MAX FLOOR" : "MAX FLOOR", "var(--red)", true) : "") + `<div class="needle" style="top:${y(o.liveEquity)}"><span class="chip" style="background:${c}">▶ ${fmt(o.liveEquity)}</span></div>`;
  }

  // the "could not follow your balance" note is answered by the trader editing the peak box — and only once it has been shown
  $("highestEod")?.addEventListener("input", () => { if (missedShown) { missedHigh = missedShown = false; lastRaise = ""; const n = $("peakNote"); if (n) n.textContent = ""; } });
  document.querySelectorAll("input,select").forEach(e => { e.addEventListener("input", render); e.addEventListener("change", render); });
  render();
  setInterval(render, 30000);
  // If a browser restores typed values after the first render (it fires no input event), follow the boxes at once.
  addEventListener("pageshow", render);
}
