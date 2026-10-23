# Bulwark — Quick-Start (ships with the TradingView listing) · v1.0.1
*One page. Everything a trader needs to set Bulwark up in five minutes, and nothing that isn't true.*

> **Status:** the Bulwark TradingView cockpit script is being relaunched together with this site. The installation steps below apply from relaunch day; the calculators on this site are live now.

## What Bulwark is
An on-chart cockpit that shows your prop firm's real floors — daily and max — a buffered STOP line, how much of today's limit you've used, and the largest position a full stop-loss can survive. It computes rule mathematics from your firm's published rules and the numbers you enter. It is general information, not financial advice; it never recommends trades and makes no claims about outcomes. Rules change — always verify against your firm's dashboard.

## Install (2 minutes)
Indicators → Community scripts → search **Bulwark** → add to chart. If no panel appears, **reload the chart** (TradingView's "move tables to bottom panel" feature can stall table rendering — this is a TradingView quirk, not a fault in your settings).

## Set it up once (3 minutes) — the six groups in the settings gear
**1 · Account.** Account size (your initial capital). *Closed P&L before today* — the number that makes "account size + this" equal your firm's **day-start anchor** (see the table below — the definition differs by firm). *Highest equity ever* — only matters for trailing max-loss firms.
**2 · Open position.** When you open a trade on the charted symbol, enter Direction, Size and Entry price: floors, equity and alerts then update tick-by-tick. Trades on other symbols: enter their floating P&L manually and update it as it moves.
**3 · Firm rules.** Daily loss %, whether it's a % of *initial* size or of the *day-start* value, static or trailing, max loss % and model, target %, minimum days, and the firm's reset timezone and hour.
**4 · Today's trading.** After each closed trade, type its P&L into the log — **separate trades with spaces** (`450 -520 300`). Then read the **"Today (verify count!)"** row: if the count isn't what you typed, fix the entry. Commas are read as thousands or decimals (`1,250` = 1250; `450,50` = 450.50), so an all-positive comma list like `450,520` would merge into one number — the count row exists to catch exactly that. (The calculators on this site are stricter: an ambiguous comma is refused rather than guessed.)
**5 · Next trade sizing.** Your risk % and the stop distance (pips on FX; price units on gold, indices, crypto). The cockpit shows the largest size a full stop can survive — floored, never rounded up — or refuses ("size n/a") when it can't convert the currency, rather than guessing.
**6 · Panel.** Position and text size.

## Day-start anchor by firm (verified against each firm's own documentation, 2026-10-23)
| Firm / program | Enter as day-start | Daily limit is | Reset |
|---|---|---|---|
| FTMO 2-Step / 1-Step (two calculators: orders from / before 12 Oct 2026) | your **balance** at midnight Prague time | 5% / 3% of **initial** capital | Europe/Prague, hour 0 |
| FundedNext Stellar 2-Step / 1-Step / Lite | your **balance** at 00:00 server time | 5% / 3% / 4% of **initial** balance | MT5 server time — GMT+3 summer / GMT+2 winter (Europe/Athens), hour 0 |
| FundingPips 2-Step Standard / Flex / Pro · 1-Step Flex | the **higher** of today's opening balance and opening equity | 5% (or 3% with the add-on) / 4% / 3% · 2% or 3% of the **day-start** value | Platform Time, fixed UTC+3 (Etc/GMT-3), hour 0 |
| The5ers 2-Step (New / Classic) · High Stakes 2-Step | the **higher** of yesterday's closing balance and closing equity | 3% (standard plan) · 5% (High Stakes) of the **day-start** value — two products, two pages | MT5 server time — GMT+2 winter / GMT+3 summer (Europe/Athens), hour 0 |
| Topstep Trading Combine 50K / 100K / 150K | your balance at the start of the session | $1,000 / $2,000 / $3,000 (2% of the account size) — an objective, not a violation | America/Chicago, hour 17 |
| FTMO Futures Growth 50K / 100K / 150K (eval) / FundedNext Instant | no daily rule — set daily % to the minimum and watch the max floor | trailing max ($2,000 / $3,500 / $5,000 at FTMO) that locks at initial | — |

## Read the panel like an instrument
STATUS is the headline (OK → warnings → STOP FOR TODAY → BREACHED). **STOP line** is where professionals stop — 75% of the daily limit by default, leaving the last quarter for slippage and spread. **Daily limit used** is measured from the anchor your firm actually uses, so on a trailing model a give-back day shows the real number, not zero. **Distance to target** is on closed balance — floating profit past the target reads "not yet banked".

## Honest limits
Without open-position inputs, equity only updates when you edit the inputs — alerts then confirm rather than protect. Peaks between your log updates aren't seen (a live session tracker covers peaks while the chart is open; it resets on reload). The countdown can be stale on a closed market until the chart ticks. Non-FX sizes follow the chart symbol's contract spec — verify against your broker. Bulwark has no affiliation with any firm or broker.

Free for one account — the full rule engine. Questions and rule corrections: via the contact address published on this site at launch — corrections are worth more to us than compliments.
