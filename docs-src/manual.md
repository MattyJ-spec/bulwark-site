# Bulwark — User Manual v1.2

*For the free per-firm calculators and the Bulwark TradingView cockpit. Everything here is general information about rule mathematics, not financial advice. Bulwark never recommends trades and makes no claims about trading outcomes. Rules change — always verify against your firm's official dashboard.*

## 1 · The one idea

A prop-firm challenge is lost at a **floor**, not at a target. Every firm publishes two floors — a daily loss limit and a maximum loss limit — but each firm defines them differently: from which starting point, as a percentage of what, moving or fixed. Bulwark computes *your* firm's floors the way *your* firm defines them, draws a **STOP line** a safe distance above the floor, and tells you the **largest position a full stop-loss can survive** without crossing it. That is the whole product. Everything else is how you feed it numbers and how it shows its working.

## 2 · Vocabulary

| Term | Meaning |
|---|---|
| **Anchor** | The value your daily limit hangs from — FTMO: balance at midnight Prague; FundedNext: day-start balance at 00:00 server time; The5ers: the *higher* of yesterday's closing balance and closing equity. |
| **Basis** | What the percentage is of — FTMO and FundedNext: your *initial* capital (so $5,000 on a $100k account stays $5,000 forever); The5ers: the day-start value itself. |
| **Daily floor** | Anchor minus the daily limit amount. Touch it (on equity, floating included) and the day, or the account, is over. |
| **Max floor** | Initial capital minus the max limit — or, for trailing programs, the highest balance/equity reached minus the limit, sometimes locking once it reaches initial. |
| **STOP line** | The daily floor plus a safety buffer — by default 75% of the limit used, 25% kept for slippage and spread. Professionals stop before the firm stops them. |
| **Room** | Live equity minus the STOP line. When room runs out, size runs out. |
| **Limit used** | How far you've travelled from the anchor toward the floor, as a percentage of the limit. |
| **Max safe size** | The smaller of the risk you *want* and the room you *have*, divided by what one lot loses at your stop. Always rounded **down**. |

## 3 · The calculators (this site)

**No prop firm? Use "Your own rules."** Self-funded traders set the daily loss they will stop at and the maximum drawdown they will pause at; the same engine computes the floors, the STOP line and the max safe size from your own numbers. The defaults are examples, not recommendations.

**Three firms need a note.** The5ers publishes several products, and High Stakes limits depend on the account size: High Stakes 2-Step is 5% daily and 10% maximum on $2.5K to $25K accounts and 4% daily and 8% maximum on $50K and $100K accounts (anchored to the higher of the previous day's closing balance and equity); the 2-Step plan of its Summer Plan is 3% daily and 10% maximum in its own table for every option ($50K, $100K, $200K) — pick the page that matches your product and account size. FundingPips measures a max-loss breach on the **lower** of equity and balance; the calculator does the same, so a balance sitting on the floor reads BREACHED even while equity floats above it; FundingPips also sells its 2-Step Standard with an optional 3% daily-loss add-on, which has its own calculator. Topstep and FTMO Futures define their limits in **dollars** per account size — the calculator shows the dollar figure and its percentage, and each account size has its own page, so pick the size you trade.

**Seasonal reset times.** FundedNext and The5ers reset at 00:00 MT5 server time, which the firms state as GMT+3 in summer and GMT+2 in winter; the countdown uses the Europe/Athens zone. FundingPips resets at 00:00 Platform Time, which it states as UTC+3 in summer and UTC+2 in winter with winter time from the first Sunday of November; the countdown uses 5:00 p.m. New York time. In the few weeks each year when European and US daylight-saving dates differ (and, for FundingPips, the week between the first and second Sundays of March, when its stated reset comes an hour before the countdown reaches zero), confirm the reset moment on your dashboard.

**Cohort pages.** When a firm changes a rule for new accounts only, the program gets two calculators, each linking to the other: FTMO 1-Step (orders from / before 12 October 2026) and FTMO Futures Growth $100K and $150K (evaluations created from / before 5 November 2026). The cut-over stated on each page decides which is yours; where the firm does not say — a Reset, a re-issued account — the pages default to the tighter figure.

One page per firm program, computed entirely in your browser — no signup, no account, nothing sent anywhere.

**Enter, in order:** your account size · your **day-start value** (the page tells you which definition your firm uses — read it off the firm's dashboard, not your platform) · today's closed trades as a space-separated list (`450 -520 300`) · floating P&L of anything open · for trailing programs, your highest balance so far · your risk % and stop distance, and what one stop unit is worth per lot (leave it blank if unsure — Bulwark refuses to size rather than guess).

**Read:** the STATUS banner first (OK / STOP FOR TODAY / BREACHED). Then the tape — your equity needle against the anchor, STOP, daily floor and max floor. Then the four figures. Then the size. **Show working** lists every step of the arithmetic — if a number surprises you, that is where to look, and where a wrong input reveals itself.

**The parse echo.** After you type trades, the line under the box says what Bulwark read: "3 trades · 2W 1L · P&L 230". If it doesn't match what you meant, fix the entry. A comma between digits is refused as ambiguous rather than guessed — use spaces between trades and a dot for decimals.

**Conflict banners.** Where a firm's own pages disagree (The5ers' FAQ still works an example at 5% for a $100K High Stakes account, where its Program Rules table gives 4%), the page uses the tighter value and says so in an amber banner that can't be dismissed.

## 4 · The TradingView cockpit

*Status:* the cockpit script is being relaunched together with this site (private first, then public). Beta testers receive the script file directly and add it through the Pine Editor; the steps are the same.

The same engine as an on-chart panel: floors, STOP, limit used, size — and, when you enter an open position's direction, size and entry price, floating P&L, equity and alerts that update **tick by tick**. It ships free, in a single edition, with the Bulwark launch. Setup is six settings groups, covered step by step in the [Quick-start](quickstart.html). Three alert conditions are available: STOP line hit, limit breached, and FX conversion unavailable.

## 5 · The honesty system

Bulwark is built to refuse rather than guess, and to say what it can't see. Sizes never round up. A profit target hit to the exact cent reads reached (the level is computed exactly, not from a floating-point product). If a currency conversion can't be resolved, the size reads "n/a" instead of a wrong number. Floating profit past the target reads "not yet banked". Equity that hasn't been updated says so. When you see a refusal or a warning, it isn't a bug — it's the tool declining to invent a figure that could cost you an account.

## 6 · Troubleshooting

**No panel appears after adding the TradingView script** — reload the chart. TradingView's "move tables to bottom panel" feature can stall table rendering; it's a platform quirk, not your settings. **Size shows "n/a (conversion)"** — the account currency and the chart's quote currency can't be bridged on that symbol; size the trade from your platform's own calculator for that pair. **The trade count is wrong** — check for commas: `1,250` is read as one trade of 1250; `450 520` is two trades. **The reset countdown looks frozen** — on a closed market the chart doesn't tick; it corrects at the first tick. **The floor looks too high/low** — nine times in ten the day-start value was read from the platform instead of the firm dashboard; the definitions differ.

## 7 · Limitations, plainly

Bulwark cannot see trades or positions your platform doesn't show it — anything on other symbols is manual. It cannot see peaks between your updates unless the chart is open. Non-FX contract sizes follow the chart symbol's specification; verify against your broker. Every preset carries the date its rules were last read on the firm's own pages; every cited page is read again before a release that changes rule data, each re-read is recorded in the changelog, and a firm can change a rule between them — the firm's dashboard, not Bulwark, is the authority on your account.

## 8 · Editions and privacy

The engine is free for one account — calculators and the cockpit alike. A Pro tier for the web cockpit (multiple accounts, statement import, alerts, audit export) comes later for those who want it; the floors will never be paywalled. Bulwark asks for no credentials, stores nothing from the calculators, and runs no advertising or affiliate arrangements with any firm or broker. Terms, privacy and refunds: [legal](legal.html).
