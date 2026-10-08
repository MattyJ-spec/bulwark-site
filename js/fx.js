/** Contract size (units per 1 lot) for per-lot loss = |entry − stop| × contract × fx. */
export function contractSize(symbol) {
    if (symbol.startsWith("XAU"))
        return 100; // gold: 100 oz per lot
    if (symbol.startsWith("XAG"))
        return 5000; // silver: 5,000 oz per lot
    return 100000; // FX standard lot
}
export function resolveFx(inp) {
    const sym = inp.symbol.toUpperCase(), acct = inp.accountCurrency.toUpperCase();
    const base = sym.slice(0, 3), quote = sym.slice(3, 6);
    const obs = inp.observedPrices ?? {}, sup = inp.suppliedRates ?? {};
    if (quote === acct)
        return { rate: 1, route: "IDENTITY" };
    if (sup[quote] != null && sup[quote] > 0)
        return { rate: sup[quote], route: "SUPPLIED" };
    if (base === acct && obs[sym] != null && obs[sym] > 0)
        return { rate: 1 / obs[sym], route: "SELF_PRICE" };
    if (obs[quote + acct] != null && obs[quote + acct] > 0)
        return { rate: obs[quote + acct], route: "DIRECT" };
    if (obs[acct + quote] != null && obs[acct + quote] > 0)
        return { rate: 1 / obs[acct + quote], route: "INVERSE" };
    for (const via of ["USD", "EUR", "GBP"]) {
        if (via === quote || via === acct)
            continue;
        const a = obs[quote + via] != null ? obs[quote + via] : obs[via + quote] != null ? 1 / obs[via + quote] : null;
        const b = obs[via + acct] != null ? obs[via + acct] : obs[acct + via] != null ? 1 / obs[acct + via] : null;
        if (a != null && b != null && a > 0 && b > 0)
            return { rate: a * b, route: "CROSS", via };
    }
    return null;
}
