const r2 = (v) => Math.round(v * 100) / 100;
/** Risk figures round DOWN to the cent — a guardian never rounds risk up. */
const floor2 = (v) => Math.floor(v * 100 + 1e-9) / 100; // E-7: epsilon-safe (1.4999999999999998 → 1.50, never 1.49)
const money = (v) => (v < 0 ? "-" : "") + Math.abs(v).toLocaleString("en-US", { maximumFractionDigits: 2 });
export function computeState(preset, s, opts = { bufferPct: 75 }) {
    const ex = [];
    const closedBalance = s.dayStartBalance + s.todayClosedPnl;
    const liveEquity = closedBalance + s.openPnl;
    ex.push(`Live equity ${money(liveEquity)} = day-start balance ${money(s.dayStartBalance)} ` +
        `+ today's closed P&L ${money(s.todayClosedPnl)} + floating P&L ${money(s.openPnl)}.`);
    // ── Daily rule (E-2: may be absent) ──
    // RV-3: a non-positive daily pct is a misconfiguration; treat as "no daily rule" rather than a floor at the anchor.
    const d = preset.daily && preset.daily.pct > 0 ? preset.daily : null;
    let dailyAnchor = null;
    let dailyLimitAmt = null;
    let dailyFloor = null;
    let dailyUsedPct = null;
    let stopDaily = null;
    if (d) {
        dailyAnchor = s.dayStartAnchorValue;
        if (d.model === "trailingIntraday") {
            dailyAnchor = Math.max(s.dayStartAnchorValue, s.intradayHighEquity ?? -Infinity, liveEquity);
            ex.push(`Daily anchor ${money(dailyAnchor)} = highest of day-start anchor ${money(s.dayStartAnchorValue)}, ` +
                `intraday equity high ${money(s.intradayHighEquity ?? liveEquity)}, and live equity (trailing-intraday model).`);
        }
        else {
            ex.push(`Daily anchor ${money(dailyAnchor)} = day-start ${d.anchorSemantic === "maxOf"
                ? "higher of balance/equity" : d.anchorSemantic} (static model — the floor does not move during the day).`);
        }
        const basisValue = d.basis === "initial" ? s.initialSize : s.dayStartAnchorValue;
        dailyLimitAmt = basisValue * (d.pct / 100);
        ex.push(`Daily limit amount ${money(dailyLimitAmt)} = ${d.pct}% of ` +
            `${d.basis === "initial" ? `initial size ${money(s.initialSize)}` : `day-start value ${money(s.dayStartAnchorValue)}`}.`);
        dailyFloor = dailyAnchor - dailyLimitAmt;
        ex.push(`Daily breach floor ${money(dailyFloor)} = anchor ${money(dailyAnchor)} − ${money(dailyLimitAmt)}.`);
        stopDaily = dailyAnchor - dailyLimitAmt * (opts.bufferPct / 100);
        dailyUsedPct = dailyLimitAmt > 0 ? Math.max(0, ((dailyAnchor - liveEquity) / dailyLimitAmt) * 100) : null;
    }
    else {
        ex.push(`No daily loss limit applies to this program — protection derives from the max-loss floor only.`);
    }
    // ── Max-loss floor ──
    const maxAmt = s.initialSize * (preset.max.pct / 100);
    let maxFloor;
    switch (preset.max.model) {
        case "static":
            maxFloor = s.initialSize - maxAmt;
            ex.push(`Max-loss floor ${money(maxFloor)} = initial ${money(s.initialSize)} − ${preset.max.pct}% (static).`);
            break;
        case "trailingEodBalance": {
            const hwm = Math.max(s.highestEodBalance ?? s.initialSize, s.initialSize);
            maxFloor = hwm - maxAmt;
            ex.push(`Max-loss floor ${money(maxFloor)} = highest end-of-day balance ${money(hwm)} − ${money(maxAmt)} (trailing EOD, never decreases).`);
            break;
        }
        case "trailingLiveEquity": {
            // E-6 (from HELM vectors + FTMO/Apex docs): an intraday-peak trail may also LOCK at a level.
            const hwm = Math.max(s.hwmLiveEquity ?? s.initialSize, s.initialSize, liveEquity);
            const trailed = hwm - maxAmt;
            const lockAtLive = preset.max.lockAt === "initialSize" ? s.initialSize : preset.max.lockAt;
            maxFloor = lockAtLive == null ? trailed : Math.min(trailed, lockAtLive);
            ex.push(`Max-loss floor ${money(maxFloor)} = live-equity high-water mark ${money(hwm)} − ${money(maxAmt)} (trailing live` +
                (lockAtLive == null ? `).` : `, capped at lock level ${money(lockAtLive)}).`));
            break;
        }
        case "trailingWithLock": {
            const hwm = Math.max(s.highestEodBalance ?? s.initialSize, s.initialSize);
            const lockAt = preset.max.lockAt === "initialSize" || preset.max.lockAt == null ? s.initialSize : preset.max.lockAt;
            const trailed = hwm - maxAmt;
            maxFloor = Math.min(trailed, lockAt);
            ex.push(`Max-loss floor ${money(maxFloor)} = trailing floor ${money(trailed)} capped at lock level ${money(lockAt)} ` +
                `(rises with your highest end-of-day balance, never decreases, locks at the lock level).`);
            break;
        }
    }
    const effectiveFloor = Math.max(dailyFloor ?? -Infinity, maxFloor);
    ex.push(`Effective floor ${money(effectiveFloor)} = the NEARER of daily ${dailyFloor === null ? "(none)" : money(dailyFloor)} and max ${money(maxFloor)}.`);
    // STOP line: buffer on the daily allowance when one exists; otherwise buffer on
    // the max allowance (stop when bufferPct of the max limit is consumed). Never below max floor.
    const stopLine = stopDaily !== null
        ? Math.max(stopDaily, maxFloor)
        : maxFloor + maxAmt * (1 - opts.bufferPct / 100);
    ex.push(stopDaily !== null
        ? `STOP line ${money(stopLine)} = daily anchor − ${opts.bufferPct}% of the daily limit (the last ${100 - opts.bufferPct}% absorbs slippage/spread), never below the max floor.`
        : `STOP line ${money(stopLine)} = max floor + ${100 - opts.bufferPct}% of the max allowance — a fixed buffer above the floor (no daily rule applies).`);
    const roomToStop = liveEquity - stopLine;
    // E-11 (HELM FA-33 class): each floor is checked against the measure its firm specifies.
    const measureFor = (b) => b === "balance" ? closedBalance : b === "lowerOf" ? Math.min(liveEquity, closedBalance) : liveEquity;
    const dailyMeasure = measureFor(preset.daily?.breachBasis);
    const maxMeasure = measureFor(preset.max.breachBasis);
    const roomToFloor = Math.min(dailyFloor !== null ? dailyMeasure - dailyFloor : Infinity, maxMeasure - maxFloor);
    if (preset.max.breachBasis === "lowerOf")
        ex.push(`Max-loss breach is measured on the LOWER of equity ${money(liveEquity)} and balance ${money(closedBalance)} (firm rule: equity or balance may not touch the level).`);
    if (preset.daily?.breachBasis === "lowerOf")
        ex.push(`Daily breach is measured on the LOWER of equity and balance (firm rule).`);
    if (dailyUsedPct !== null) {
        ex.push(`Daily limit used ${dailyUsedPct.toFixed(1)}% = (anchor − live equity) ÷ daily limit.`);
    }
    const breachedDaily = dailyFloor !== null && dailyMeasure <= dailyFloor;
    const breachedMax = maxMeasure <= maxFloor;
    const pastStop = !breachedDaily && !breachedMax && liveEquity <= stopLine;
    // ── Target (F4: closed balance) and Best-Day consistency ──
    // E-14 (HELM FA-54, 2026-10-08): a consistency rule may be denominated by the PROFIT TARGET amount (Topstep: best day
    // ≤ 55% of the target) and, when exceeded, RAISE the target instead of failing the account — so the target is assessed
    // after the consistency check. E-15 (FA-13/15 class, 2026-10-08): cap comparisons absorb IEEE noise with a relative
    // 1e-9 epsilon so a day sitting exactly ON the cap reads OK ("at or below"): 1650/3000×100 is 55.00000000000001 in float.
    const REL_EPS = 1e-9;
    const atOrBelow = (value, cap) => value <= cap + REL_EPS * Math.max(1, Math.abs(cap));
    const targetPct = preset.target && preset.target.pctByPhase.length > 0
        ? preset.target.pctByPhase[Math.min(s.phaseIndex ?? 0, preset.target.pctByPhase.length - 1)] : 0;
    const targetAmountBase = targetPct > 0 ? (s.initialSize * targetPct) / 100 : 0;
    let consistency;
    let raisedTargetAmount = null;
    if (preset.consistency) {
        const bestDayRef = Math.max(s.todayClosedPnl, s.bestPrevDayPnl ?? 0);
        const den = preset.consistency.denominator;
        const denominatorValue = den === "positiveDaysProfit" ? (s.positiveDaysProfit ?? 0)
            : den === "profitTarget" ? targetAmountBase
                : (s.totalClosedProfit ?? 0);
        const pct = denominatorValue > 0 && bestDayRef > 0 ? (bestDayRef / denominatorValue) * 100 : null;
        const exceeded = pct !== null && !atOrBelow(pct, preset.consistency.capPct);
        if (exceeded && preset.consistency.breachConsequence === "raisesTarget" && preset.consistency.capPct > 0) {
            raisedTargetAmount = bestDayRef / (preset.consistency.capPct / 100);
        }
        consistency = {
            bestDayRef, denominatorValue, denominatorType: den,
            pct: pct === null ? null : r2(pct), capPct: preset.consistency.capPct,
            exceeded,
            breachConsequence: preset.consistency.breachConsequence,
            raisedTargetAmount: raisedTargetAmount === null ? null : r2(raisedTargetAmount),
            raisedTargetEquity: raisedTargetAmount === null ? null : r2(s.initialSize + raisedTargetAmount),
        };
        const denLabel = den === "positiveDaysProfit" ? "positive-days profit" : den === "profitTarget" ? "the profit target" : "total closed profit";
        ex.push(`Best-Day check: best day ${money(bestDayRef)} vs ${denLabel} ${money(denominatorValue)}` +
            (pct === null ? ` — meter inactive (denominator ≤ 0).`
                : ` = ${pct.toFixed(1)}% (cap ${preset.consistency.capPct}%${exceeded
                    ? `, EXCEEDED — ${preset.consistency.breachConsequence === "defersPass" ? "not a breach; defers passing"
                        : preset.consistency.breachConsequence === "raisesTarget"
                            ? `not a breach; the profit target rises to ${money(s.initialSize + (raisedTargetAmount ?? 0))} (${money(raisedTargetAmount ?? 0)} profit) so the best day is back at the cap`
                            : "rule breach"}` : ""}).`));
    }
    let target;
    if (targetPct > 0) {
        // E-10 (HELM FA-15 class): initialSize * (1 + pct/100) is 110000.00000000001 in IEEE for a 10% target;
        // compute additively (exact for money inputs) and compare with a sub-cent epsilon, so a target hit
        // to the cent reads MET and a real cent-shortfall still does not.
        const MONEY_EPS = 1e-6;
        const raised = raisedTargetAmount !== null && raisedTargetAmount > targetAmountBase;
        const targetEquity = s.initialSize + (raised ? raisedTargetAmount : targetAmountBase);
        const toTargetClosed = targetEquity - closedBalance;
        target = {
            targetEquity,
            toTargetClosed: r2(toTargetClosed),
            reachedBanked: toTargetClosed <= MONEY_EPS,
            floatingPastTarget: toTargetClosed > MONEY_EPS && liveEquity >= targetEquity - MONEY_EPS,
            raisedByConsistency: raised,
        };
        ex.push(`Target ${money(targetEquity)}${raised ? " (RAISED by the consistency rule)" : ""} assessed on CLOSED balance ${money(closedBalance)} — ` +
            (target.reachedBanked ? `reached (banked).`
                : target.floatingPastTarget ? `floating equity is past target but ${money(toTargetClosed)} is not yet banked.`
                    : `${money(toTargetClosed)} to go.`));
    }
    // ── Profitable-days requirement (E-3) ──
    let profitableDays;
    if (preset.profitableDays) {
        const thresholdAmount = s.initialSize * (preset.profitableDays.minDayProfitPctOfInitial / 100);
        // Firm definition: min(midnight balance, midnight equity) − previous day balance.
        // Intraday, the best available proxy uses current closed balance and live equity.
        const todayProfitNow = Math.min(closedBalance, liveEquity) - s.dayStartBalance;
        const completedBeforeToday = s.profitableDaysCompleted ?? 0;
        profitableDays = {
            required: preset.profitableDays.required,
            completedBeforeToday,
            thresholdAmount: r2(thresholdAmount),
            todayProfitNow: r2(todayProfitNow),
            // FA-56 absorb (2026-10-08): a day sitting exactly on the firm's threshold qualifies; relative-1e-9 epsilon.
            todayQualifiesNow: todayProfitNow + REL_EPS * Math.max(1, Math.abs(thresholdAmount)) >= thresholdAmount,
            met: completedBeforeToday >= preset.profitableDays.required,
        };
        ex.push(`Profitable days: ${completedBeforeToday}/${preset.profitableDays.required} completed before today; ` +
            `today's qualifying profit so far ${money(todayProfitNow)} vs threshold ${money(thresholdAmount)} ` +
            `(${profitableDays.todayQualifiesNow ? "would qualify if held to midnight" : "not yet qualifying"}; the firm assesses at midnight).`);
    }
    return {
        liveEquity: r2(liveEquity),
        closedBalance: r2(closedBalance),
        dailyRule: d !== null,
        dailyAnchor: dailyAnchor === null ? null : r2(dailyAnchor),
        dailyLimitAmt: dailyLimitAmt === null ? null : r2(dailyLimitAmt),
        dailyFloor: dailyFloor === null ? null : r2(dailyFloor),
        maxFloor: r2(maxFloor),
        effectiveFloor: r2(effectiveFloor),
        stopLine: r2(stopLine),
        roomToStop: r2(roomToStop),
        roomToFloor: r2(roomToFloor),
        dailyUsedPct: dailyUsedPct === null ? null : r2(dailyUsedPct),
        breachedDaily, breachedMax, pastStop,
        target, consistency, profitableDays,
        minDays: {
            required: preset.minDays,
            completed: s.daysCompleted ?? 0,
            met: (s.daysCompleted ?? 0) >= preset.minDays,
        },
        explanations: ex,
    };
}
/** Max-safe-size for the next trade. F1: refuse rather than guess. E-1: never round risk up. */
export function computeMaxSize(out, inp) {
    const ex = [];
    const riskWanted = out.liveEquity * (inp.riskPct / 100);
    const riskAllowed = floor2(Math.max(0, Math.min(riskWanted, out.roomToStop)));
    ex.push(`Risk allowed ${money(riskAllowed)} = lesser of your ${inp.riskPct}% (${money(riskWanted)}) ` +
        `and room above the STOP line (${money(out.roomToStop)}).`);
    if (inp.valuePerUnitPerLot == null || !isFinite(inp.valuePerUnitPerLot) || inp.valuePerUnitPerLot <= 0) {
        return { riskWanted: r2(riskWanted), riskAllowed, maxSize: null,
            refusalReason: "Currency/contract conversion unavailable — refusing to size rather than guess.",
            cappedByBuffer: riskAllowed < riskWanted, explanations: ex };
    }
    if (inp.stopDistance <= 0) {
        return { riskWanted: r2(riskWanted), riskAllowed, maxSize: null,
            refusalReason: "Stop distance must be positive.",
            cappedByBuffer: riskAllowed < riskWanted, explanations: ex };
    }
    if (riskAllowed <= 0) {
        ex.push("Past the STOP line — no size available today.");
        return { riskWanted: r2(riskWanted), riskAllowed: 0, maxSize: 0, cappedByBuffer: true, explanations: ex };
    }
    const riskPerLot = inp.stopDistance * inp.valuePerUnitPerLot;
    const maxSize = Math.floor((riskAllowed / riskPerLot) * 100 + 1e-9) / 100; // E-7
    ex.push(`Max size ${maxSize.toFixed(2)} ${inp.unitLabel ?? "lots"} = ${money(riskAllowed)} ÷ ` +
        `(${inp.stopDistance} × ${money(inp.valuePerUnitPerLot)} per unit), floored — never rounded up.`);
    return { riskWanted: r2(riskWanted), riskAllowed, maxSize, cappedByBuffer: riskAllowed < riskWanted, explanations: ex };
}
