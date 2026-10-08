/**
 * @pcas/engine — reset-boundary generator (E-9). DST-aware instants at which a firm's
 * trading day rolls, for an IANA timezone and a local reset hour. Two-pass offset
 * resolution (HELM F8) handles reset hours on the far side of a same-day DST switch.
 * Interval semantics: (start, end] — verified against 30 HELM reset vectors.
 */
export function tzOffsetMs(tz, atMs) {
    const f = new Intl.DateTimeFormat("en-US", { timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" });
    const p = Object.fromEntries(f.formatToParts(new Date(atMs)).map(x => [x.type, x.value]));
    const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
    return asUtc - Math.floor(atMs / 1000) * 1000;
}
/** UTC instant of local wall-clock time (y, m, d, h:00) in tz.
 *  E-12 (HELM FA-9 class): resolve DST explicitly. A wall-time that occurs twice (fall-back) resolves to the
 *  EARLIER instant in every alignment; a wall-time that does not exist (spring-forward gap) shifts forward by the
 *  gap (the pre-transition offset is applied), matching the java.time convention. */
export function zonedToUtc(y, m, d, h, tz) {
    const guess = Date.UTC(y, m - 1, d, h);
    const offsets = Array.from(new Set([tzOffsetMs(tz, guess - 86400000), tzOffsetMs(tz, guess), tzOffsetMs(tz, guess + 86400000)]));
    const valid = offsets.map(o => guess - o).filter(t => tzOffsetMs(tz, t) === guess - t);
    if (valid.length > 0)
        return Math.min(...valid); // ambiguous → earlier occurrence
    return guess - tzOffsetMs(tz, guess - 86400000); // gap → shift forward (pre-transition offset)
}
/** All reset instants in (startMs, endMs] for the zone/hour. Throws on an invalid tz (loud failure by design). */
export function resetBoundariesBetween(tz, hourLocal, startMs, endMs) {
    const out = [];
    for (let d = new Date(startMs - 2 * 86400000); d.getTime() <= endMs + 2 * 86400000; d = new Date(d.getTime() + 86400000)) {
        const t = zonedToUtc(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate(), hourLocal, tz);
        if (t > startMs && t <= endMs && !out.includes(t))
            out.push(t);
    }
    return out.sort((a, b) => a - b);
}
/** Next reset after nowMs, and minutes until it — the cockpit's countdown. */
export function nextReset(tz, hourLocal, nowMs) {
    const [atMs] = resetBoundariesBetween(tz, hourLocal, nowMs, nowMs + 3 * 86400000);
    return { atMs, minutesUntil: Math.ceil((atMs - nowMs) / 60000) };
}
