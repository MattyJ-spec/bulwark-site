# Changelog and credits

Every change to the rules, the engine or the pages is listed here as a dated entry, newest first. Presets never change in place: a rule change is a new dated version, so the record shows what the rule was on any given day. Findings from testers are credited by first name or handle, with permission.

## 2026-10-08 — v0.3.5 (engine v0.2.2; presets v1.7)
- **Engine E-14:** a consistency rule can now be measured against the **profit target** rather than profit earned, with the firm's "the target rises, the account does not fail" semantics. Topstep's Trading Combine rule (best day at or below 55% of the target, from Topstep's own help centre) is therefore modelled: the three Topstep calculators show the raised target when a single day is too large. Agreed with the second engineering desk the same day; vectors pinned on both sides.
- **Engine E-15:** a day sitting *exactly* on a consistency cap, or exactly on a profitable-day threshold, now reads as meeting it. The old comparison could tip an exact 55% into "exceeded" by a floating-point hair (1,650 of 3,000 is 55.00000000000001 in binary). Found by reading the other desk's fix for the same class of defect.
- **FundingPips 1-Step Flex** added, two calculators (2% and 3% daily-loss configurations), from the firm's own page: 12% target, 12% static max on the lower of equity and balance, no minimum trading days.
- Topstep 50K/100K/150K re-issued as new dated presets carrying the consistency rule; the morning's versions are retained as superseded.

## 2026-10-08 — v0.3.4 (weekly re-verification; presets v1.6)
Every preset was re-read on the firms' own pages. Floors are unchanged for every program; the changes below are new dated preset versions (the old versions are retained as superseded).
- **FTMO 2-Step and 1-Step:** unchanged (page modified 30 Sep 2026). **FTMO Futures Growth** is now three calculators — $50K, $100K, $150K — because FTMO defines the drawdown as $2,000 / $3,500 / $5,000; the single 4% preset was wrong for the larger sizes. Profit targets ($3,000 / $6,000 / $9,000) encoded from FTMO's page.
- **FundedNext Stellar 2-Step, 1-Step, Lite:** floors unchanged. Reset timezone re-encoded from a fixed UTC+3 to the seasonal server time the firm states (GMT+3 summer / GMT+2 winter); profit targets and minimum days encoded from fundednext.com.
- **FundingPips:** the firm's help centre moved (new URLs; same article numbers). Floors unchanged. Profit targets and minimum days are now encoded from the firm's own pages, so the amber "targets not encoded" banner is gone. The 2-Step Standard is sold with a 5% daily limit or a **3% daily-loss add-on** — the add-on now has its own calculator.
- **The5ers standard 2-Step (New, Classic):** floors unchanged; the 3-profitable-days rule was removed because the 2-Step Plan Rules page (last update 7 Sep 2026) does not state it; seasonal reset timezone. **High Stakes 2-Step:** the firm's page now lists targets of 10% / 5% (previously 8% / 5% from the June FAQ); minimum 3 profitable days of 0.5% encoded from the page.
- **Topstep 50K / 100K / 150K:** the Daily Loss Limit ($1,000 / $2,000 / $3,000) and profit targets ($3,000 / $6,000 / $9,000) are now read from Topstep's own help centre, so these calculators are fully primary-sourced. The secondary-sourced "50% of total profit" consistency rule was removed: Topstep's rule is best day ≤ 55% of the profit target, a construct queued for the engine (E-14).
- Engine backlog opened: E-13 dollar-defined limits; E-14 consistency measured against the profit target.
- Found by the treadmill, not by a tester: three of the sixteen presets were quietly imprecise (the Growth sizes, the seasonal zone, the High Stakes targets). This is what the weekly re-check is for.

## 2026-09-22 — v0.3.2
- **Topstep Trading Combine calculators (50K, 100K, 150K)** added. The Maximum Loss Limit is taken from Topstep's own help centre (trails the highest end-of-day balance; locks at the starting balance). The daily limit and profit targets are disclosed as secondary-sourced until Topstep's own page is read.
- **"Your own rules" calculator** for self-funded traders: set your own daily-loss and maximum-drawdown percentages.
- **Compare firms** page: every verified program in one table, with the floors a $100,000 account would have today, computed by the same engine.
- **Live demo** on the homepage; **How we verify** and **FAQ** pages; per-page titles; light and dark themes.
- Manual v1.1: personal rules, The5ers' two products, FundingPips' lower-of breach basis, the exact-cent target note.

## 2026-09-22 — engine v0.2.1 (E-10, E-11, E-12)
- **E-10:** a profit target hit to the exact cent now reads *reached*; the level is computed exactly rather than from a floating-point product. Found by cross-checking against an independent engine's pinned test.
- **E-11:** a breach basis of *lower of equity and balance* for firms that define it that way (FundingPips). Found the same way; fixed on both engines the same day.
- **E-12:** daylight-saving resolution made explicit — a wall-clock time that occurs twice at the autumn change resolves to the earlier instant in every timezone; a time that does not exist at the spring change shifts forward. No shipped preset was affected (all reset at 00:00 or 17:00).

## 2026-09-21 — presets v1.2–v1.4
- **The5ers:** two products, not one conflict. The standard 2-Step Plan is 3% daily; High Stakes 2-Step is 5%, anchored to the higher of starting balance and equity — confirmed with the firm directly on 21 September. Both pages exist; pick the one that matches your account.
- **FundingPips** Standard, Flex and Pro added from the firm's help centre (floors only; targets disclosed as not encoded).
- **FTMO** and **FundedNext** re-verified against the firms' pages.

## Credits
The engine is audited continuously by a second, independent engineering desk; several of the defects above were found by that desk's tests and fixed on both sides. Beta testers who find a wrong number, a confusing label or a missing rule are credited here by first name or handle, with permission, from the first cohort onward.

*General information, not financial advice. Verify every rule against your firm's dashboard.*
