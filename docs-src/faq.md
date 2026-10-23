# FAQ — the questions traders actually ask

**Does floating P&L count toward the daily loss?** At FTMO, FundedNext and FundingPips, yes: the check runs on equity, floating included. What differs is the anchor it is measured from — the calculator page prints your firm's anchor beside the input.

**My account is up 8% — is my daily limit bigger now?** At FTMO and FundedNext, no: the limit is a percentage of your initial capital and stays a fixed dollar amount. At The5ers and FundingPips, yes: it is a percentage of the day-start value.

**What time does the day reset?** FTMO at midnight Prague (CE(S)T). FundedNext and The5ers at 00:00 MT5 server time, which both firms state as GMT+3 in summer and GMT+2 in winter — the calculator uses the Europe/Athens zone for the countdown. FundingPips at 00:00 Platform Time, which the firm states as a fixed UTC+3. Topstep's day rolls at 5:00 PM Central. In the few weeks each year when European and US daylight-saving dates differ, confirm the reset moment on your dashboard.

**I held a losing trade overnight — am I safe after the reset?** Not necessarily. The new floor is set from balance (or the higher of balance and equity, at some firms) while your equity still carries the loss. See the "give-back day" explainer.

**How do I size for a $100k challenge?** Method, never a number: take the smaller of the risk you want and the room you have above a safe stop line; divide by what one lot loses at your stop; round down. The calculator does exactly this and shows its working.

**Trailing drawdown — does it ever stop trailing?** At FTMO Futures and FundedNext Instant it locks once it reaches your starting capital; at FTMO 1-Step it trails end-of-day balance without locking. Read your program's page; the calculator encodes each.

**FTMO 1-Step — which calculator, "orders from" or "orders before" 12 October 2026?** The date of the order that created your account decides it (FTMO's trading-objectives page: accounts initiated from orders created on or after 12 October 2026 — 9:00 platform time, GMT+3, per FTMO's 8 October trading update — or merged on or after that date, are on the Consistency rule — best day at most 50% of total profit, losing days included; earlier orders keep the Best Day Rule on positive days' profit). The floors are identical; only the consistency objective differs; each page links to the other. FTMO's update says the result shows in your Account MetriX.

**Is a 75% buffer too conservative?** It is a default, not a law. The question is whether your execution variance — slippage, spread at news, a requote on the exit — fits inside the last 25%. Adjust the slider.

**The5ers — 3% or 5%?** Two products: the standard 2-Step Plan is 3%; High Stakes 2-Step is 5%, anchored to the higher of starting balance and equity. The firm's live-chat assistant stated this on 21 September 2026; use the page that matches your account and verify on your dashboard. High Stakes also requires three profitable days of at least 0.5% of the initial balance, and its page now lists 10% / 5% targets.

**FundingPips — 5% or 3% daily?** The 2-Step Standard is sold with a 5% daily loss limit by default or a 3% daily-loss add-on chosen at purchase (which also removes the minimum trading days). There is a calculator for each; use the one that matches what you bought.

**Topstep — how does the consistency rule show?** Topstep's consistency target is your best day at or below 55% of the profit target; exceeding it raises the target rather than failing the account. The Topstep calculators model exactly that: enter your best prior day and the page shows the share of the target it represents and, if the cap is exceeded, the raised target you now need to bank.

**Can a tool stop me from breaching?** No tool can. A tool can only show the floor correctly and size honestly. Anyone promising more is selling something.

**Gold sizing — why is my lot size different?** Gold trades in 100-ounce contracts with price-unit stops; most calculators assume FX lots. Bulwark uses the contract size and refuses to size if it cannot resolve the conversion.

**Where does my data go?** Nowhere. The calculators compute in your browser; nothing is transmitted or stored. The cockpit's Pro features will store what you choose to save, under the privacy policy.

**How is Bulwark different from other free prop-firm calculators?** Several exist, and some are good. The differences we can prove: every rule here is taken from the firm's own pages, dated, and linked; where a firm's pages disagree we say so instead of picking one; the arithmetic runs through an engine verified against 198 rule vectors written by an independent implementation; anchor and basis semantics (balance vs equity, initial vs day-start, higher-of, lower-of, trailing, locks) are modelled per firm rather than as a generic percentage; and we make no claims about pass rates or outcomes — ever.

*General information, not financial advice. Verify every rule against your firm's dashboard.*
