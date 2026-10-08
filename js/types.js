/**
 * @pcas/engine — types (v0.2, 2026-09-19)
 * v0.2 changes (from Re-verification Register Session 16):
 *  E-2  `daily` may be null — programs with NO daily loss limit
 *       (FTMO Futures Growth evaluation; FundedNext Stellar Instant) are
 *       primary-sourced realities the engine must express.
 *  E-3  `profitableDays` rule type (The5ers 2-Step: ≥3 days with closed
 *       profit ≥0.5% of initial; profit = min(midnight balance, midnight
 *       equity) − previous day balance).
 *  E-4  trailingWithLock is now PRIMARY-sourced (FTMO Futures; FundedNext).
 *  Presets carry verifiedAsOf + sources + status; changes create new
 *  versions (Founding Rule 7), never in-place edits.
 */
export {};
