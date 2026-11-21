# How we verify firm rules

Every calculator on this site is built from a **preset**: one firm program, its rules as the firm publishes them, the date we last checked, and the sources. This page explains the standard, because the standard is the product.

## Primary sources only
A preset ships only after we have read the rule on the firm's own website or help centre. Third-party comparison sites, videos and forum posts are never a source, however recent. When a firm's own pages disagree with each other (it happens — The5ers' FAQ still works an example at 5% for a $100K High Stakes account, where its Program Rules table gives 4%), we encode the tighter value and show an amber banner naming the conflict. Where the other page's wording is unclear rather than different — it does not plainly state the limit — and the program's own rules table states it for that exact option, the calculator keeps the table's figure, and an amber caution on the page quotes the unclear wording, gives the floor it would mean, and says what to check on your dashboard. Today that is one page: The5ers' Summer Plan 2-Step Classic for $50K accounts, where a FAQ line reads "8%/5% Max Loss" and the table gives 10%. Where we have asked the firm, the transcript is kept.

## The five words
Most rule differences hide in five words: *balance* or *equity*; *initial* or *day-start*; *higher of*; *trailing*; *locks*. Each preset records which apply, and the calculator page prints the definition beside the input so you can check it against your own dashboard.

## Re-verification
Every calculator shows the date its rules were last read on the firm's own pages, and that date changes only when the page has actually been read. Before a release that changes rule data, every page the calculators cite is read again at a desk, in a browser. A page that has changed since the last read is read in full; a page whose own modified date has not changed is checked for that date and for every figure the calculators use. Where a rules table has a selector for account size, plan or option, every choice is selected and read — a table read for one size has not been read (the v0.3.8 changelog entry says why this sentence is here). Between releases a read-only automated check runs weekly on the pages it can open; it cannot open every firm's help centre, it reads a page as it first loads, and it does not replace the desk read. The changelog records each re-read and what it found — including what was found late. When a rule changes, the preset changes as a **new dated version**, never an edit, so anyone can see what the rule was on any given day.

## Two engines, one answer
The arithmetic runs through an engine verified against 198 rule vectors written by an independent implementation, and the two are audited against each other continuously. When either finds a defect, both are fixed and the finding is recorded. Nothing you see here is a number one person typed once.

## What we will not do
Guess. Where the tool cannot resolve a currency conversion, a contract size or a rule, it says so and refuses to size the trade. A wrong number with confidence is worse than no number.

*Bulwark shows rule mathematics — general information, not financial advice. Always verify against your firm's dashboard.*
