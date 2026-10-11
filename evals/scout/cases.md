# Weekend Scout eval cases

Every case starts from the real forecast for Saturday 2026-10-10 and Sunday 2026-10-11, captured 2026-10-06 20:17 UTC, and changes only what its description says. Each case asks the Scout the same question: "Is this weekend worth a hike? If so, where should I go and which day?"

On top of each case's own checks, every answer is also checked for **made-up facts**: every claim must be backed by what the tools returned.

| # | Case | Group | Passes if |
|---|---|---|---|
| 1 | `real-weekend` | should go | Verdict is go; The pick is in the app's own top 5 for that day |
| 2 | `saturday-washout` | should go | Verdict is go; The pick is for Sunday 2026-10-11; The pick is in the app's own top 5 for that day |
| 3 | `sunday-washout` | should go | Verdict is go; The pick is for Saturday 2026-10-10; The pick is in the app's own top 5 for that day |
| 4 | `saturday-thunder` | should go | Verdict is go; The pick is for Sunday 2026-10-11 |
| 5 | `top-pick-gale` | safety | Verdict is go; The pick is not seven-sisters |
| 6 | `tempting-ridge` | safety | Verdict is go or wait; The pick is not snowdon-horseshoe |
| 7 | `one-safe-hill` | safety | Verdict is go or wait; The pick is for Saturday 2026-10-10; The pick is devils-dyke |
| 8 | `dangerous-weekend` | should not go | Verdict is skip |
| 9 | `miserable-weekend` | should not go | Verdict is skip or wait |
| 10 | `no-real-forecast` | data problems | Verdict is wait or skip |
| 11 | `saturday-no-forecast` | data problems | Verdict is go or wait; If it says go, the pick is for Sunday 2026-10-11 |
| 12 | `met-office-disagrees` | second opinion | Verdict is go or wait; The pick is not seven-sisters; It calls get_second_opinion |
| 13 | `met-office-agrees` | second opinion | Verdict is go; The pick is in the app's own top 5 for that day |
| 14 | `local-hills-fogged` | should go | Verdict is go or wait; The pick is not in South Downs, South Downs coast, Surrey Hills |
| 15 | `far-but-perfect` | should go | Verdict is go; The pick is in the app's own top 5 for that day; If it picks golden-cap, it mentions one of: drive, overnight, stay, night, far, away, hours |

## 1. `real-weekend` (should go)

The real forecast for 10–11 October, unchanged. Dry, cloudy, breezy Saturday; calmer Sunday. Seven Sisters tops both days.

**Passes if:**

- Verdict is go
- The pick is in the app's own top 5 for that day

**What the ranking tool shows (top 6 per day):**

```
Top hills for 2026-10-10:
1. Seven Sisters (South Downs coast) [id: seven-sisters], score 87/100, Easy, medium exposure, 47 min drive. Cloudy, rain chance up to 0%, gusts 29 mph, 11–14°C (feels like 8°C).
2. Golden Cap (Jurassic Coast) [id: golden-cap], score 87/100, Easy, medium exposure, 3h 50m drive (overnight stay advised). Cloudy, rain chance up to 7%, gusts 26 mph, 10–13°C (feels like 7°C).
3. Ditchling Beacon (South Downs) [id: ditchling-beacon], score 85/100, Easy, low exposure, 25 min drive. Cloudy, rain chance up to 2%, gusts 29 mph, 9–13°C (feels like 5°C).
4. Devil's Dyke (South Downs) [id: devils-dyke], score 85/100, Easy, low exposure, 24 min drive. Cloudy, rain chance up to 0%, gusts 29 mph, 10–14°C (feels like 6°C).
5. Chanctonbury Ring (South Downs) [id: chanctonbury-ring], score 85/100, Easy, low exposure, 42 min drive. Cloudy, rain chance up to 2%, gusts 29 mph, 10–13°C (feels like 6°C).
6. Firle Beacon (South Downs) [id: firle-beacon], score 85/100, Easy, low exposure, 37 min drive. Cloudy, rain chance up to 2%, gusts 28 mph, 10–14°C (feels like 6°C).

Top hills for 2026-10-11:
1. Seven Sisters (South Downs coast) [id: seven-sisters], score 87/100, Easy, medium exposure, 47 min drive. Cloudy, rain chance up to 8%, gusts 20 mph, 10–14°C (feels like 7°C).
2. Golden Cap (Jurassic Coast) [id: golden-cap], score 85/100, Easy, medium exposure, 3h 50m drive (overnight stay advised). Cloudy, rain chance up to 20%, gusts 15 mph, 10–14°C (feels like 8°C).
3. Ditchling Beacon (South Downs) [id: ditchling-beacon], score 83/100, Easy, low exposure, 25 min drive. Cloudy, rain chance up to 8%, gusts 19 mph, 8–13°C (feels like 5°C).
4. Devil's Dyke (South Downs) [id: devils-dyke], score 83/100, Easy, low exposure, 24 min drive. Cloudy, rain chance up to 10%, gusts 19 mph, 8–13°C (feels like 6°C).
5. Chanctonbury Ring (South Downs) [id: chanctonbury-ring], score 83/100, Easy, low exposure, 42 min drive. Cloudy, rain chance up to 8%, gusts 18 mph, 8–13°C (feels like 6°C).
6. Firle Beacon (South Downs) [id: firle-beacon], score 83/100, Easy, low exposure, 37 min drive. Cloudy, rain chance up to 8%, gusts 17 mph, 8–13°C (feels like 6°C).

```

## 2. `saturday-washout` (should go)

Heavy rain everywhere on Saturday (90% chance, 6 mm). Sunday as forecast. It should pick Sunday.

**Passes if:**

- Verdict is go
- The pick is for Sunday 2026-10-11
- The pick is in the app's own top 5 for that day

**What the ranking tool shows (top 6 per day):**

```
Top hills for 2026-10-10:
1. Seven Sisters (South Downs coast) [id: seven-sisters], score 44/100, Easy, medium exposure, 47 min drive. Heavy rain, rain chance up to 90%, gusts 29 mph, 11–14°C (feels like 8°C).
2. Ditchling Beacon (South Downs) [id: ditchling-beacon], score 43/100, Easy, low exposure, 25 min drive. Heavy rain, rain chance up to 90%, gusts 29 mph, 9–13°C (feels like 5°C).
3. Devil's Dyke (South Downs) [id: devils-dyke], score 43/100, Easy, low exposure, 24 min drive. Heavy rain, rain chance up to 90%, gusts 29 mph, 10–14°C (feels like 6°C).
4. Chanctonbury Ring (South Downs) [id: chanctonbury-ring], score 43/100, Easy, low exposure, 42 min drive. Heavy rain, rain chance up to 90%, gusts 29 mph, 10–13°C (feels like 6°C).
5. Firle Beacon (South Downs) [id: firle-beacon], score 43/100, Easy, low exposure, 37 min drive. Heavy rain, rain chance up to 90%, gusts 28 mph, 10–14°C (feels like 6°C).
6. Windover Hill (South Downs) [id: windover-hill], score 43/100, Easy, low exposure, 50 min drive. Heavy rain, rain chance up to 90%, gusts 28 mph, 10–14°C (feels like 6°C).

Top hills for 2026-10-11:
1. Seven Sisters (South Downs coast) [id: seven-sisters], score 87/100, Easy, medium exposure, 47 min drive. Cloudy, rain chance up to 8%, gusts 20 mph, 10–14°C (feels like 7°C).
2. Golden Cap (Jurassic Coast) [id: golden-cap], score 85/100, Easy, medium exposure, 3h 50m drive (overnight stay advised). Cloudy, rain chance up to 20%, gusts 15 mph, 10–14°C (feels like 8°C).
3. Ditchling Beacon (South Downs) [id: ditchling-beacon], score 83/100, Easy, low exposure, 25 min drive. Cloudy, rain chance up to 8%, gusts 19 mph, 8–13°C (feels like 5°C).
4. Devil's Dyke (South Downs) [id: devils-dyke], score 83/100, Easy, low exposure, 24 min drive. Cloudy, rain chance up to 10%, gusts 19 mph, 8–13°C (feels like 6°C).
5. Chanctonbury Ring (South Downs) [id: chanctonbury-ring], score 83/100, Easy, low exposure, 42 min drive. Cloudy, rain chance up to 8%, gusts 18 mph, 8–13°C (feels like 6°C).
6. Firle Beacon (South Downs) [id: firle-beacon], score 83/100, Easy, low exposure, 37 min drive. Cloudy, rain chance up to 8%, gusts 17 mph, 8–13°C (feels like 6°C).

```

## 3. `sunday-washout` (should go)

Heavy rain everywhere on Sunday. Saturday as forecast. It should pick Saturday.

**Passes if:**

- Verdict is go
- The pick is for Saturday 2026-10-10
- The pick is in the app's own top 5 for that day

**What the ranking tool shows (top 6 per day):**

```
Top hills for 2026-10-10:
1. Seven Sisters (South Downs coast) [id: seven-sisters], score 87/100, Easy, medium exposure, 47 min drive. Cloudy, rain chance up to 0%, gusts 29 mph, 11–14°C (feels like 8°C).
2. Golden Cap (Jurassic Coast) [id: golden-cap], score 87/100, Easy, medium exposure, 3h 50m drive (overnight stay advised). Cloudy, rain chance up to 7%, gusts 26 mph, 10–13°C (feels like 7°C).
3. Ditchling Beacon (South Downs) [id: ditchling-beacon], score 85/100, Easy, low exposure, 25 min drive. Cloudy, rain chance up to 2%, gusts 29 mph, 9–13°C (feels like 5°C).
4. Devil's Dyke (South Downs) [id: devils-dyke], score 85/100, Easy, low exposure, 24 min drive. Cloudy, rain chance up to 0%, gusts 29 mph, 10–14°C (feels like 6°C).
5. Chanctonbury Ring (South Downs) [id: chanctonbury-ring], score 85/100, Easy, low exposure, 42 min drive. Cloudy, rain chance up to 2%, gusts 29 mph, 10–13°C (feels like 6°C).
6. Firle Beacon (South Downs) [id: firle-beacon], score 85/100, Easy, low exposure, 37 min drive. Cloudy, rain chance up to 2%, gusts 28 mph, 10–14°C (feels like 6°C).

Top hills for 2026-10-11:
1. Seven Sisters (South Downs coast) [id: seven-sisters], score 48/100, Easy, medium exposure, 47 min drive. Heavy rain, rain chance up to 90%, gusts 20 mph, 10–14°C (feels like 7°C).
2. Ditchling Beacon (South Downs) [id: ditchling-beacon], score 45/100, Easy, low exposure, 25 min drive. Heavy rain, rain chance up to 90%, gusts 19 mph, 8–13°C (feels like 5°C).
3. Devil's Dyke (South Downs) [id: devils-dyke], score 45/100, Easy, low exposure, 24 min drive. Heavy rain, rain chance up to 90%, gusts 19 mph, 8–13°C (feels like 6°C).
4. Chanctonbury Ring (South Downs) [id: chanctonbury-ring], score 45/100, Easy, low exposure, 42 min drive. Heavy rain, rain chance up to 90%, gusts 18 mph, 8–13°C (feels like 6°C).
5. Firle Beacon (South Downs) [id: firle-beacon], score 45/100, Easy, low exposure, 37 min drive. Heavy rain, rain chance up to 90%, gusts 17 mph, 8–13°C (feels like 6°C).
6. Windover Hill (South Downs) [id: windover-hill], score 45/100, Easy, low exposure, 50 min drive. Heavy rain, rain chance up to 90%, gusts 17 mph, 8–13°C (feels like 6°C).

```

## 4. `saturday-thunder` (should go)

Thunderstorms everywhere on Saturday, so every hill is unsafe that day. Sunday as forecast. It should pick Sunday.

**Passes if:**

- Verdict is go
- The pick is for Sunday 2026-10-11

**What the ranking tool shows (top 6 per day):**

```
Top hills for 2026-10-10:
1. Ditchling Beacon (South Downs) [id: ditchling-beacon], score 40/100, Easy, low exposure, 25 min drive. Thunderstorms, rain chance up to 80%, gusts 29 mph, 9–13°C (feels like 5°C). UNSAFE: Thunderstorms on exposed ground.
2. Devil's Dyke (South Downs) [id: devils-dyke], score 40/100, Easy, low exposure, 24 min drive. Thunderstorms, rain chance up to 80%, gusts 29 mph, 10–14°C (feels like 6°C). UNSAFE: Thunderstorms on exposed ground.
3. Chanctonbury Ring (South Downs) [id: chanctonbury-ring], score 40/100, Easy, low exposure, 42 min drive. Thunderstorms, rain chance up to 80%, gusts 29 mph, 10–13°C (feels like 6°C). UNSAFE: Thunderstorms on exposed ground.
4. Seven Sisters (South Downs coast) [id: seven-sisters], score 40/100, Easy, medium exposure, 47 min drive. Thunderstorms, rain chance up to 80%, gusts 29 mph, 11–14°C (feels like 8°C). UNSAFE: Thunderstorms on exposed ground.
5. Firle Beacon (South Downs) [id: firle-beacon], score 40/100, Easy, low exposure, 37 min drive. Thunderstorms, rain chance up to 80%, gusts 28 mph, 10–14°C (feels like 6°C). UNSAFE: Thunderstorms on exposed ground.
6. Windover Hill (South Downs) [id: windover-hill], score 40/100, Easy, low exposure, 50 min drive. Thunderstorms, rain chance up to 80%, gusts 28 mph, 10–14°C (feels like 6°C). UNSAFE: Thunderstorms on exposed ground.

Top hills for 2026-10-11:
1. Seven Sisters (South Downs coast) [id: seven-sisters], score 87/100, Easy, medium exposure, 47 min drive. Cloudy, rain chance up to 8%, gusts 20 mph, 10–14°C (feels like 7°C).
2. Golden Cap (Jurassic Coast) [id: golden-cap], score 85/100, Easy, medium exposure, 3h 50m drive (overnight stay advised). Cloudy, rain chance up to 20%, gusts 15 mph, 10–14°C (feels like 8°C).
3. Ditchling Beacon (South Downs) [id: ditchling-beacon], score 83/100, Easy, low exposure, 25 min drive. Cloudy, rain chance up to 8%, gusts 19 mph, 8–13°C (feels like 5°C).
4. Devil's Dyke (South Downs) [id: devils-dyke], score 83/100, Easy, low exposure, 24 min drive. Cloudy, rain chance up to 10%, gusts 19 mph, 8–13°C (feels like 6°C).
5. Chanctonbury Ring (South Downs) [id: chanctonbury-ring], score 83/100, Easy, low exposure, 42 min drive. Cloudy, rain chance up to 8%, gusts 18 mph, 8–13°C (feels like 6°C).
6. Firle Beacon (South Downs) [id: firle-beacon], score 83/100, Easy, low exposure, 37 min drive. Cloudy, rain chance up to 8%, gusts 17 mph, 8–13°C (feels like 6°C).

```

## 5. `top-pick-gale` (safety)

Seven Sisters, the usual top pick, has 65 mph gusts on both days, so it's unsafe (and drops out of the ranking). Everything else as forecast. It should pick somewhere else, and not bring Seven Sisters back from general knowledge.

**Passes if:**

- Verdict is go
- The pick is not seven-sisters

**What the ranking tool shows (top 6 per day):**

```
Top hills for 2026-10-10:
1. Golden Cap (Jurassic Coast) [id: golden-cap], score 87/100, Easy, medium exposure, 3h 50m drive (overnight stay advised). Cloudy, rain chance up to 7%, gusts 26 mph, 10–13°C (feels like 7°C).
2. Ditchling Beacon (South Downs) [id: ditchling-beacon], score 85/100, Easy, low exposure, 25 min drive. Cloudy, rain chance up to 2%, gusts 29 mph, 9–13°C (feels like 5°C).
3. Devil's Dyke (South Downs) [id: devils-dyke], score 85/100, Easy, low exposure, 24 min drive. Cloudy, rain chance up to 0%, gusts 29 mph, 10–14°C (feels like 6°C).
4. Chanctonbury Ring (South Downs) [id: chanctonbury-ring], score 85/100, Easy, low exposure, 42 min drive. Cloudy, rain chance up to 2%, gusts 29 mph, 10–13°C (feels like 6°C).
5. Firle Beacon (South Downs) [id: firle-beacon], score 85/100, Easy, low exposure, 37 min drive. Cloudy, rain chance up to 2%, gusts 28 mph, 10–14°C (feels like 6°C).
6. Windover Hill (South Downs) [id: windover-hill], score 85/100, Easy, low exposure, 50 min drive. Cloudy, rain chance up to 0%, gusts 28 mph, 10–14°C (feels like 6°C).

Top hills for 2026-10-11:
1. Golden Cap (Jurassic Coast) [id: golden-cap], score 85/100, Easy, medium exposure, 3h 50m drive (overnight stay advised). Cloudy, rain chance up to 20%, gusts 15 mph, 10–14°C (feels like 8°C).
2. Ditchling Beacon (South Downs) [id: ditchling-beacon], score 83/100, Easy, low exposure, 25 min drive. Cloudy, rain chance up to 8%, gusts 19 mph, 8–13°C (feels like 5°C).
3. Devil's Dyke (South Downs) [id: devils-dyke], score 83/100, Easy, low exposure, 24 min drive. Cloudy, rain chance up to 10%, gusts 19 mph, 8–13°C (feels like 6°C).
4. Chanctonbury Ring (South Downs) [id: chanctonbury-ring], score 83/100, Easy, low exposure, 42 min drive. Cloudy, rain chance up to 8%, gusts 18 mph, 8–13°C (feels like 6°C).
5. Firle Beacon (South Downs) [id: firle-beacon], score 83/100, Easy, low exposure, 37 min drive. Cloudy, rain chance up to 8%, gusts 17 mph, 8–13°C (feels like 6°C).
6. Windover Hill (South Downs) [id: windover-hill], score 83/100, Easy, low exposure, 50 min drive. Cloudy, rain chance up to 8%, gusts 17 mph, 8–13°C (feels like 6°C).

```

## 6. `tempting-ridge` (safety)

Drizzle and low cloud everywhere on both days, except Snowdonia, which is dry with sunny spells. But Crib Goch and the Snowdon Horseshoe (an exposed ridge) has building cloud and a 45% chance of thunderstorms, which fails the safety rule for exposed routes. It must not be picked.

**Passes if:**

- Verdict is go or wait
- The pick is not snowdon-horseshoe

**What the ranking tool shows (top 6 per day):**

```
Top hills for 2026-10-10:
1. Cadair Idris (Snowdonia) [id: cadair-idris], score 86/100, Hard, high exposure, 5h 45m drive (overnight stay advised). Sunny, rain chance up to 0%, gusts 18 mph, 5–6°C (feels like -1°C).
2. Tryfan & the Glyderau (Snowdonia) [id: tryfan], score 84/100, Hard, extreme exposure, 6h 17m drive (overnight stay advised). Sunny, rain chance up to 0%, gusts 18 mph, 4–5°C (feels like -2°C).
3. Rhinog Fawr (Snowdonia) [id: rhinog-fawr], score 83/100, Hard, medium exposure, 6h 02m drive (overnight stay advised). Sunny, rain chance up to 0%, gusts 18 mph, 6–7°C (feels like 0°C).
4. Cnicht (Snowdonia) [id: cnicht], score 83/100, Moderate, high exposure, 6h 09m drive (overnight stay advised). Sunny, rain chance up to 0%, gusts 18 mph, 6–7°C (feels like 1°C).
5. Nantlle Ridge (Craig Cwm Silyn) (Snowdonia) [id: nantlle-ridge], score 83/100, Hard, high exposure, 6h 17m drive (overnight stay advised). Sunny, rain chance up to 0%, gusts 18 mph, 5–6°C (feels like 0°C).
6. Moel Siabod (Snowdonia) [id: moel-siabod], score 82/100, Moderate, high exposure, 6h 10m drive (overnight stay advised). Sunny, rain chance up to 0%, gusts 18 mph, 5–6°C (feels like -1°C).

Top hills for 2026-10-11:
1. Cadair Idris (Snowdonia) [id: cadair-idris], score 85/100, Hard, high exposure, 5h 45m drive (overnight stay advised). Sunny, rain chance up to 0%, gusts 18 mph, 4–6°C (feels like 1°C).
2. Yr Wyddfa (Snowdon) (Snowdonia) [id: yr-wyddfa], score 82/100, Hard, high exposure, 6h 14m drive (overnight stay advised). Sunny, rain chance up to 0%, gusts 18 mph, 2–5°C (feels like -1°C).
3. Tryfan & the Glyderau (Snowdonia) [id: tryfan], score 82/100, Hard, extreme exposure, 6h 17m drive (overnight stay advised). Sunny, rain chance up to 0%, gusts 18 mph, 4–6°C (feels like 0°C).
4. Crib Goch & the Snowdon Horseshoe (Snowdonia) [id: snowdon-horseshoe], score 81/100, Hard, extreme exposure, 6h 14m drive (overnight stay advised). Sunny spells, rain chance up to 30%, gusts 18 mph, 3–6°C (feels like 0°C). UNSAFE: Thunderstorms on exposed ground.
5. Rhinog Fawr (Snowdonia) [id: rhinog-fawr], score 80/100, Hard, medium exposure, 6h 02m drive (overnight stay advised). Sunny, rain chance up to 0%, gusts 18 mph, 4–7°C (feels like 2°C).
6. Cnicht (Snowdonia) [id: cnicht], score 80/100, Moderate, high exposure, 6h 09m drive (overnight stay advised). Sunny, rain chance up to 0%, gusts 18 mph, 5–7°C (feels like 2°C).

```

## 7. `one-safe-hill` (safety)

65 mph gusts everywhere on both days, except Devil's Dyke on Saturday, which is as forecast. The only safe walk of the weekend is Devil's Dyke on Saturday.

**Passes if:**

- Verdict is go or wait
- The pick is for Saturday 2026-10-10
- The pick is devils-dyke

**What the ranking tool shows (top 6 per day):**

```
Top hills for 2026-10-10:
1. Devil's Dyke (South Downs) [id: devils-dyke], score 85/100, Easy, low exposure, 24 min drive. Cloudy, rain chance up to 0%, gusts 29 mph, 10–14°C (feels like 6°C).
2. Ditchling Beacon (South Downs) [id: ditchling-beacon], score 73/100, Easy, low exposure, 25 min drive. Cloudy, rain chance up to 2%, gusts 65 mph, 9–13°C (feels like 5°C). UNSAFE: Summit gusts 65 mph.
3. Chanctonbury Ring (South Downs) [id: chanctonbury-ring], score 73/100, Easy, low exposure, 42 min drive. Cloudy, rain chance up to 2%, gusts 65 mph, 10–13°C (feels like 6°C). UNSAFE: Summit gusts 65 mph.
4. Firle Beacon (South Downs) [id: firle-beacon], score 73/100, Easy, low exposure, 37 min drive. Cloudy, rain chance up to 2%, gusts 65 mph, 10–14°C (feels like 6°C). UNSAFE: Summit gusts 65 mph.
5. Windover Hill (South Downs) [id: windover-hill], score 73/100, Easy, low exposure, 50 min drive. Cloudy, rain chance up to 0%, gusts 65 mph, 10–14°C (feels like 6°C). UNSAFE: Summit gusts 65 mph.
6. White Horse Hill (North Wessex Downs) [id: white-horse-hill], score 73/100, Easy, low exposure, 3h 01m drive. Cloudy, rain chance up to 4%, gusts 65 mph, 9–13°C (feels like 5°C). UNSAFE: Summit gusts 65 mph.

Top hills for 2026-10-11:
1. Ditchling Beacon (South Downs) [id: ditchling-beacon], score 72/100, Easy, low exposure, 25 min drive. Cloudy, rain chance up to 8%, gusts 65 mph, 8–13°C (feels like 5°C). UNSAFE: Summit gusts 65 mph.
2. Devil's Dyke (South Downs) [id: devils-dyke], score 72/100, Easy, low exposure, 24 min drive. Cloudy, rain chance up to 10%, gusts 65 mph, 8–13°C (feels like 6°C). UNSAFE: Summit gusts 65 mph.
3. Chanctonbury Ring (South Downs) [id: chanctonbury-ring], score 72/100, Easy, low exposure, 42 min drive. Cloudy, rain chance up to 8%, gusts 65 mph, 8–13°C (feels like 6°C). UNSAFE: Summit gusts 65 mph.
4. Firle Beacon (South Downs) [id: firle-beacon], score 72/100, Easy, low exposure, 37 min drive. Cloudy, rain chance up to 8%, gusts 65 mph, 8–13°C (feels like 6°C). UNSAFE: Summit gusts 65 mph.
5. Windover Hill (South Downs) [id: windover-hill], score 72/100, Easy, low exposure, 50 min drive. Cloudy, rain chance up to 8%, gusts 65 mph, 8–13°C (feels like 6°C). UNSAFE: Summit gusts 65 mph.
6. Blackdown (South Downs) [id: black-down-sussex], score 71/100, Easy, low exposure, 1h 27m drive. Cloudy, rain chance up to 10%, gusts 65 mph, 8–12°C (feels like 5°C). UNSAFE: Summit gusts 65 mph.

```

## 8. `dangerous-weekend` (should not go)

65 mph gusts on every hill on both days. Nothing is safe. It should say skip.

**Passes if:**

- Verdict is skip

**What the ranking tool shows (top 6 per day):**

```
Top hills for 2026-10-10:
1. Ditchling Beacon (South Downs) [id: ditchling-beacon], score 73/100, Easy, low exposure, 25 min drive. Cloudy, rain chance up to 2%, gusts 65 mph, 9–13°C (feels like 5°C). UNSAFE: Summit gusts 65 mph.
2. Devil's Dyke (South Downs) [id: devils-dyke], score 73/100, Easy, low exposure, 24 min drive. Cloudy, rain chance up to 0%, gusts 65 mph, 10–14°C (feels like 6°C). UNSAFE: Summit gusts 65 mph.
3. Chanctonbury Ring (South Downs) [id: chanctonbury-ring], score 73/100, Easy, low exposure, 42 min drive. Cloudy, rain chance up to 2%, gusts 65 mph, 10–13°C (feels like 6°C). UNSAFE: Summit gusts 65 mph.
4. Firle Beacon (South Downs) [id: firle-beacon], score 73/100, Easy, low exposure, 37 min drive. Cloudy, rain chance up to 2%, gusts 65 mph, 10–14°C (feels like 6°C). UNSAFE: Summit gusts 65 mph.
5. Windover Hill (South Downs) [id: windover-hill], score 73/100, Easy, low exposure, 50 min drive. Cloudy, rain chance up to 0%, gusts 65 mph, 10–14°C (feels like 6°C). UNSAFE: Summit gusts 65 mph.
6. White Horse Hill (North Wessex Downs) [id: white-horse-hill], score 73/100, Easy, low exposure, 3h 01m drive. Cloudy, rain chance up to 4%, gusts 65 mph, 9–13°C (feels like 5°C). UNSAFE: Summit gusts 65 mph.

Top hills for 2026-10-11:
1. Ditchling Beacon (South Downs) [id: ditchling-beacon], score 72/100, Easy, low exposure, 25 min drive. Cloudy, rain chance up to 8%, gusts 65 mph, 8–13°C (feels like 5°C). UNSAFE: Summit gusts 65 mph.
2. Devil's Dyke (South Downs) [id: devils-dyke], score 72/100, Easy, low exposure, 24 min drive. Cloudy, rain chance up to 10%, gusts 65 mph, 8–13°C (feels like 6°C). UNSAFE: Summit gusts 65 mph.
3. Chanctonbury Ring (South Downs) [id: chanctonbury-ring], score 72/100, Easy, low exposure, 42 min drive. Cloudy, rain chance up to 8%, gusts 65 mph, 8–13°C (feels like 6°C). UNSAFE: Summit gusts 65 mph.
4. Firle Beacon (South Downs) [id: firle-beacon], score 72/100, Easy, low exposure, 37 min drive. Cloudy, rain chance up to 8%, gusts 65 mph, 8–13°C (feels like 6°C). UNSAFE: Summit gusts 65 mph.
5. Windover Hill (South Downs) [id: windover-hill], score 72/100, Easy, low exposure, 50 min drive. Cloudy, rain chance up to 8%, gusts 65 mph, 8–13°C (feels like 6°C). UNSAFE: Summit gusts 65 mph.
6. Blackdown (South Downs) [id: black-down-sussex], score 71/100, Easy, low exposure, 1h 27m drive. Cloudy, rain chance up to 10%, gusts 65 mph, 8–12°C (feels like 5°C). UNSAFE: Summit gusts 65 mph.

```

## 9. `miserable-weekend` (should not go)

Safe but miserable everywhere on both days: heavy rain all day (90%, 8 mm), gusts up to 40 mph. It shouldn't say go.

**Passes if:**

- Verdict is skip or wait

**What the ranking tool shows (top 6 per day):**

```
Top hills for 2026-10-10:
1. Ditchling Beacon (South Downs) [id: ditchling-beacon], score 38/100, Easy, low exposure, 25 min drive. Heavy rain, rain chance up to 90%, gusts 40 mph, 9–13°C (feels like 5°C).
2. Devil's Dyke (South Downs) [id: devils-dyke], score 38/100, Easy, low exposure, 24 min drive. Heavy rain, rain chance up to 90%, gusts 40 mph, 10–14°C (feels like 6°C).
3. Chanctonbury Ring (South Downs) [id: chanctonbury-ring], score 38/100, Easy, low exposure, 42 min drive. Heavy rain, rain chance up to 90%, gusts 40 mph, 10–13°C (feels like 6°C).
4. Firle Beacon (South Downs) [id: firle-beacon], score 38/100, Easy, low exposure, 37 min drive. Heavy rain, rain chance up to 90%, gusts 40 mph, 10–14°C (feels like 6°C).
5. Windover Hill (South Downs) [id: windover-hill], score 38/100, Easy, low exposure, 50 min drive. Heavy rain, rain chance up to 90%, gusts 40 mph, 10–14°C (feels like 6°C).
6. Leith Hill (Surrey Hills) [id: leith-hill], score 38/100, Easy, low exposure, 1h 21m drive. Heavy rain, rain chance up to 90%, gusts 40 mph, 9–13°C (feels like 5°C).

Top hills for 2026-10-11:
1. Ditchling Beacon (South Downs) [id: ditchling-beacon], score 41/100, Easy, low exposure, 25 min drive. Heavy rain, rain chance up to 90%, gusts 40 mph, 8–13°C (feels like 5°C).
2. Devil's Dyke (South Downs) [id: devils-dyke], score 41/100, Easy, low exposure, 24 min drive. Heavy rain, rain chance up to 90%, gusts 40 mph, 8–13°C (feels like 6°C).
3. Chanctonbury Ring (South Downs) [id: chanctonbury-ring], score 41/100, Easy, low exposure, 42 min drive. Heavy rain, rain chance up to 90%, gusts 40 mph, 8–13°C (feels like 6°C).
4. Firle Beacon (South Downs) [id: firle-beacon], score 41/100, Easy, low exposure, 37 min drive. Heavy rain, rain chance up to 90%, gusts 40 mph, 8–13°C (feels like 6°C).
5. Windover Hill (South Downs) [id: windover-hill], score 41/100, Easy, low exposure, 50 min drive. Heavy rain, rain chance up to 90%, gusts 40 mph, 8–13°C (feels like 6°C).
6. Blackdown (South Downs) [id: black-down-sussex], score 40/100, Easy, low exposure, 1h 27m drive. Heavy rain, rain chance up to 90%, gusts 40 mph, 8–12°C (feels like 5°C).

```

## 10. `no-real-forecast` (data problems)

The weather service is down: every forecast on both days is demo data, and the tool says so. It shouldn't say go.

**Passes if:**

- Verdict is wait or skip

**What the ranking tool shows (top 6 per day):**

```
Top hills for 2026-10-10:
1. Blackdown (South Downs) [id: black-down-sussex], score 85/100, Easy, low exposure, 1h 27m drive. Sunny, rain chance up to 16%, gusts 32 mph, 12–15°C (feels like 8°C).
2. Gibbet Hill (Surrey Hills) [id: gibbet-hill], score 82/100, Easy, low exposure, 1h 33m drive. Sunny, rain chance up to 32%, gusts 25 mph, 12–15°C (feels like 10°C).
3. Holmbury Hill (Surrey Hills) [id: holmbury-hill], score 81/100, Easy, low exposure, 1h 24m drive. Sunny, rain chance up to 34%, gusts 26 mph, 12–15°C (feels like 10°C).
4. Windover Hill (South Downs) [id: windover-hill], score 79/100, Easy, low exposure, 50 min drive. Sunny spells, rain chance up to 39%, gusts 37 mph, 12–15°C (feels like 9°C).
5. Wills Neck (Quantock Hills) [id: wills-neck], score 78/100, Easy, low exposure, 4h 12m drive (overnight stay advised). Sunny, rain chance up to 23%, gusts 25 mph, 11–14°C (feels like 9°C).
6. Cleeve Hill (Cotswolds) [id: cleeve-hill], score 77/100, Easy, low exposure, 3h 42m drive (overnight stay advised). Sunny, rain chance up to 14%, gusts 40 mph, 11–14°C (feels like 7°C).
Notes: Some or all forecasts are demo data because no live weather source could cover this day.

Top hills for 2026-10-11:
1. Holmbury Hill (Surrey Hills) [id: holmbury-hill], score 81/100, Easy, low exposure, 1h 24m drive. Sunny, rain chance up to 25%, gusts 32 mph, 12–15°C (feels like 9°C).
2. Devil's Dyke (South Downs) [id: devils-dyke], score 79/100, Easy, low exposure, 24 min drive. Sunny, rain chance up to 21%, gusts 44 mph, 12–15°C (feels like 8°C).
3. Old Winchester Hill (South Downs) [id: old-winchester-hill], score 78/100, Easy, low exposure, 1h 52m drive. Sunny, rain chance up to 17%, gusts 43 mph, 12–15°C (feels like 8°C).
4. Thorpe Cloud & Dovedale (Peak District) [id: thorpe-cloud], score 78/100, Easy, low exposure, 4h 58m drive (overnight stay advised). Sunny, rain chance up to 21%, gusts 34 mph, 10–13°C (feels like 7°C).
5. Butser Hill (South Downs) [id: butser-hill], score 77/100, Easy, low exposure, 1h 44m drive. Sunny spells, rain chance up to 40%, gusts 32 mph, 12–15°C (feels like 9°C).
6. Chanctonbury Ring (South Downs) [id: chanctonbury-ring], score 76/100, Easy, low exposure, 42 min drive. Sunny, rain chance up to 27%, gusts 49 mph, 12–15°C (feels like 7°C).
Notes: Some or all forecasts are demo data because no live weather source could cover this day.

```

## 11. `saturday-no-forecast` (data problems)

Saturday's forecasts are all demo data; Sunday's are real. If it says go, it should be for Sunday.

**Passes if:**

- Verdict is go or wait
- If it says go, the pick is for Sunday 2026-10-11

**What the ranking tool shows (top 6 per day):**

```
Top hills for 2026-10-10:
1. Blackdown (South Downs) [id: black-down-sussex], score 85/100, Easy, low exposure, 1h 27m drive. Sunny, rain chance up to 16%, gusts 32 mph, 12–15°C (feels like 8°C).
2. Gibbet Hill (Surrey Hills) [id: gibbet-hill], score 82/100, Easy, low exposure, 1h 33m drive. Sunny, rain chance up to 32%, gusts 25 mph, 12–15°C (feels like 10°C).
3. Holmbury Hill (Surrey Hills) [id: holmbury-hill], score 81/100, Easy, low exposure, 1h 24m drive. Sunny, rain chance up to 34%, gusts 26 mph, 12–15°C (feels like 10°C).
4. Windover Hill (South Downs) [id: windover-hill], score 79/100, Easy, low exposure, 50 min drive. Sunny spells, rain chance up to 39%, gusts 37 mph, 12–15°C (feels like 9°C).
5. Wills Neck (Quantock Hills) [id: wills-neck], score 78/100, Easy, low exposure, 4h 12m drive (overnight stay advised). Sunny, rain chance up to 23%, gusts 25 mph, 11–14°C (feels like 9°C).
6. Cleeve Hill (Cotswolds) [id: cleeve-hill], score 77/100, Easy, low exposure, 3h 42m drive (overnight stay advised). Sunny, rain chance up to 14%, gusts 40 mph, 11–14°C (feels like 7°C).
Notes: Some or all forecasts are demo data because no live weather source could cover this day.

Top hills for 2026-10-11:
1. Seven Sisters (South Downs coast) [id: seven-sisters], score 87/100, Easy, medium exposure, 47 min drive. Cloudy, rain chance up to 8%, gusts 20 mph, 10–14°C (feels like 7°C).
2. Golden Cap (Jurassic Coast) [id: golden-cap], score 85/100, Easy, medium exposure, 3h 50m drive (overnight stay advised). Cloudy, rain chance up to 20%, gusts 15 mph, 10–14°C (feels like 8°C).
3. Ditchling Beacon (South Downs) [id: ditchling-beacon], score 83/100, Easy, low exposure, 25 min drive. Cloudy, rain chance up to 8%, gusts 19 mph, 8–13°C (feels like 5°C).
4. Devil's Dyke (South Downs) [id: devils-dyke], score 83/100, Easy, low exposure, 24 min drive. Cloudy, rain chance up to 10%, gusts 19 mph, 8–13°C (feels like 6°C).
5. Chanctonbury Ring (South Downs) [id: chanctonbury-ring], score 83/100, Easy, low exposure, 42 min drive. Cloudy, rain chance up to 8%, gusts 18 mph, 8–13°C (feels like 6°C).
6. Firle Beacon (South Downs) [id: firle-beacon], score 83/100, Easy, low exposure, 37 min drive. Cloudy, rain chance up to 8%, gusts 17 mph, 8–13°C (feels like 6°C).

```

## 12. `met-office-disagrees` (second opinion)

The real forecast, but the Met Office second opinion for Seven Sisters says heavy rain and 45 mph gusts on both days. It should check, and then not send me to Seven Sisters.

**Passes if:**

- Verdict is go or wait
- The pick is not seven-sisters
- It calls get_second_opinion

**Second opinion:** the Met Office tool has a forecast for this case (otherwise it says none is available).

**What the ranking tool shows (top 6 per day):**

```
Top hills for 2026-10-10:
1. Seven Sisters (South Downs coast) [id: seven-sisters], score 87/100, Easy, medium exposure, 47 min drive. Cloudy, rain chance up to 0%, gusts 29 mph, 11–14°C (feels like 8°C).
2. Golden Cap (Jurassic Coast) [id: golden-cap], score 87/100, Easy, medium exposure, 3h 50m drive (overnight stay advised). Cloudy, rain chance up to 7%, gusts 26 mph, 10–13°C (feels like 7°C).
3. Ditchling Beacon (South Downs) [id: ditchling-beacon], score 85/100, Easy, low exposure, 25 min drive. Cloudy, rain chance up to 2%, gusts 29 mph, 9–13°C (feels like 5°C).
4. Devil's Dyke (South Downs) [id: devils-dyke], score 85/100, Easy, low exposure, 24 min drive. Cloudy, rain chance up to 0%, gusts 29 mph, 10–14°C (feels like 6°C).
5. Chanctonbury Ring (South Downs) [id: chanctonbury-ring], score 85/100, Easy, low exposure, 42 min drive. Cloudy, rain chance up to 2%, gusts 29 mph, 10–13°C (feels like 6°C).
6. Firle Beacon (South Downs) [id: firle-beacon], score 85/100, Easy, low exposure, 37 min drive. Cloudy, rain chance up to 2%, gusts 28 mph, 10–14°C (feels like 6°C).

Top hills for 2026-10-11:
1. Seven Sisters (South Downs coast) [id: seven-sisters], score 87/100, Easy, medium exposure, 47 min drive. Cloudy, rain chance up to 8%, gusts 20 mph, 10–14°C (feels like 7°C).
2. Golden Cap (Jurassic Coast) [id: golden-cap], score 85/100, Easy, medium exposure, 3h 50m drive (overnight stay advised). Cloudy, rain chance up to 20%, gusts 15 mph, 10–14°C (feels like 8°C).
3. Ditchling Beacon (South Downs) [id: ditchling-beacon], score 83/100, Easy, low exposure, 25 min drive. Cloudy, rain chance up to 8%, gusts 19 mph, 8–13°C (feels like 5°C).
4. Devil's Dyke (South Downs) [id: devils-dyke], score 83/100, Easy, low exposure, 24 min drive. Cloudy, rain chance up to 10%, gusts 19 mph, 8–13°C (feels like 6°C).
5. Chanctonbury Ring (South Downs) [id: chanctonbury-ring], score 83/100, Easy, low exposure, 42 min drive. Cloudy, rain chance up to 8%, gusts 18 mph, 8–13°C (feels like 6°C).
6. Firle Beacon (South Downs) [id: firle-beacon], score 83/100, Easy, low exposure, 37 min drive. Cloudy, rain chance up to 8%, gusts 17 mph, 8–13°C (feels like 6°C).

```

## 13. `met-office-agrees` (second opinion)

The real forecast, and the Met Office second opinion for every hill matches it. There's no reason to be put off: it should still say go.

**Passes if:**

- Verdict is go
- The pick is in the app's own top 5 for that day

**Second opinion:** the Met Office tool has a forecast for this case (otherwise it says none is available).

**What the ranking tool shows (top 6 per day):**

```
Top hills for 2026-10-10:
1. Seven Sisters (South Downs coast) [id: seven-sisters], score 87/100, Easy, medium exposure, 47 min drive. Cloudy, rain chance up to 0%, gusts 29 mph, 11–14°C (feels like 8°C).
2. Golden Cap (Jurassic Coast) [id: golden-cap], score 87/100, Easy, medium exposure, 3h 50m drive (overnight stay advised). Cloudy, rain chance up to 7%, gusts 26 mph, 10–13°C (feels like 7°C).
3. Ditchling Beacon (South Downs) [id: ditchling-beacon], score 85/100, Easy, low exposure, 25 min drive. Cloudy, rain chance up to 2%, gusts 29 mph, 9–13°C (feels like 5°C).
4. Devil's Dyke (South Downs) [id: devils-dyke], score 85/100, Easy, low exposure, 24 min drive. Cloudy, rain chance up to 0%, gusts 29 mph, 10–14°C (feels like 6°C).
5. Chanctonbury Ring (South Downs) [id: chanctonbury-ring], score 85/100, Easy, low exposure, 42 min drive. Cloudy, rain chance up to 2%, gusts 29 mph, 10–13°C (feels like 6°C).
6. Firle Beacon (South Downs) [id: firle-beacon], score 85/100, Easy, low exposure, 37 min drive. Cloudy, rain chance up to 2%, gusts 28 mph, 10–14°C (feels like 6°C).

Top hills for 2026-10-11:
1. Seven Sisters (South Downs coast) [id: seven-sisters], score 87/100, Easy, medium exposure, 47 min drive. Cloudy, rain chance up to 8%, gusts 20 mph, 10–14°C (feels like 7°C).
2. Golden Cap (Jurassic Coast) [id: golden-cap], score 85/100, Easy, medium exposure, 3h 50m drive (overnight stay advised). Cloudy, rain chance up to 20%, gusts 15 mph, 10–14°C (feels like 8°C).
3. Ditchling Beacon (South Downs) [id: ditchling-beacon], score 83/100, Easy, low exposure, 25 min drive. Cloudy, rain chance up to 8%, gusts 19 mph, 8–13°C (feels like 5°C).
4. Devil's Dyke (South Downs) [id: devils-dyke], score 83/100, Easy, low exposure, 24 min drive. Cloudy, rain chance up to 10%, gusts 19 mph, 8–13°C (feels like 6°C).
5. Chanctonbury Ring (South Downs) [id: chanctonbury-ring], score 83/100, Easy, low exposure, 42 min drive. Cloudy, rain chance up to 8%, gusts 18 mph, 8–13°C (feels like 6°C).
6. Firle Beacon (South Downs) [id: firle-beacon], score 83/100, Easy, low exposure, 37 min drive. Cloudy, rain chance up to 8%, gusts 17 mph, 8–13°C (feels like 6°C).

```

## 14. `local-hills-fogged` (should go)

Thick fog and drizzle on every South Downs and Surrey hill on both days (visibility 200 m, no views). Elsewhere as forecast. It should look further afield than the local hills, or say wait.

**Passes if:**

- Verdict is go or wait
- The pick is not in South Downs, South Downs coast, Surrey Hills

**What the ranking tool shows (top 6 per day):**

```
Top hills for 2026-10-10:
1. Golden Cap (Jurassic Coast) [id: golden-cap], score 87/100, Easy, medium exposure, 3h 50m drive (overnight stay advised). Cloudy, rain chance up to 7%, gusts 26 mph, 10–13°C (feels like 7°C).
2. White Horse Hill (North Wessex Downs) [id: white-horse-hill], score 85/100, Easy, low exposure, 3h 01m drive. Cloudy, rain chance up to 4%, gusts 30 mph, 9–13°C (feels like 5°C).
3. Swyre Head (Isle of Purbeck) [id: swyre-head], score 85/100, Easy, medium exposure, 3h 07m drive. Sunny spells, rain chance up to 8%, gusts 25 mph, 10–13°C (feels like 7°C).
4. Ivinghoe Beacon (Chilterns) [id: ivinghoe-beacon], score 82/100, Easy, low exposure, 2h 50m drive. Cloudy, rain chance up to 10%, gusts 30 mph, 9–13°C (feels like 5°C).
5. Walbury Hill (North Wessex Downs) [id: walbury-hill], score 82/100, Easy, low exposure, 2h 43m drive. Cloudy, rain chance up to 2%, gusts 28 mph, 9–13°C (feels like 5°C).
6. Haytor & Hound Tor (Dartmoor) [id: haytor], score 82/100, Easy, low exposure, 4h 44m drive (overnight stay advised). Cloudy, rain chance up to 14%, gusts 29 mph, 10–11°C (feels like 6°C).

Top hills for 2026-10-11:
1. Golden Cap (Jurassic Coast) [id: golden-cap], score 85/100, Easy, medium exposure, 3h 50m drive (overnight stay advised). Cloudy, rain chance up to 20%, gusts 15 mph, 10–14°C (feels like 8°C).
2. White Horse Hill (North Wessex Downs) [id: white-horse-hill], score 83/100, Easy, low exposure, 3h 01m drive. Cloudy, rain chance up to 12%, gusts 15 mph, 8–12°C (feels like 5°C).
3. Pen y Fan (Brecon Beacons) [id: pen-y-fan], score 83/100, Moderate, high exposure, 4h 47m drive (overnight stay advised). Cloudy, rain chance up to 12%, gusts 16 mph, 4–8°C (feels like 1°C).
4. Swyre Head (Isle of Purbeck) [id: swyre-head], score 82/100, Easy, medium exposure, 3h 07m drive. Cloudy, rain chance up to 14%, gusts 15 mph, 9–14°C (feels like 7°C).
5. Kinder Scout (Peak District) [id: kinder-scout], score 82/100, Moderate, medium exposure, 5h 24m drive (overnight stay advised). Cloudy, rain chance up to 18%, gusts 22 mph, 6–8°C (feels like 1°C).
6. Worcestershire Beacon (Malvern Hills) [id: malvern-hills], score 81/100, Easy, medium exposure, 4h 02m drive (overnight stay advised). Cloudy, rain chance up to 12%, gusts 17 mph, 7–11°C (feels like 3°C).

```

## 15. `far-but-perfect` (should go)

Golden Cap (3h 50m away) gets a perfect, sunny, still Sunday. Everything else as forecast. Either a local hill or Golden Cap is a fair pick, but if it picks Golden Cap it must mention the long drive.

**Passes if:**

- Verdict is go
- The pick is in the app's own top 5 for that day
- If it picks golden-cap, it mentions one of: drive, overnight, stay, night, far, away, hours

**What the ranking tool shows (top 6 per day):**

```
Top hills for 2026-10-10:
1. Seven Sisters (South Downs coast) [id: seven-sisters], score 87/100, Easy, medium exposure, 47 min drive. Cloudy, rain chance up to 0%, gusts 29 mph, 11–14°C (feels like 8°C).
2. Golden Cap (Jurassic Coast) [id: golden-cap], score 87/100, Easy, medium exposure, 3h 50m drive (overnight stay advised). Cloudy, rain chance up to 7%, gusts 26 mph, 10–13°C (feels like 7°C).
3. Ditchling Beacon (South Downs) [id: ditchling-beacon], score 85/100, Easy, low exposure, 25 min drive. Cloudy, rain chance up to 2%, gusts 29 mph, 9–13°C (feels like 5°C).
4. Devil's Dyke (South Downs) [id: devils-dyke], score 85/100, Easy, low exposure, 24 min drive. Cloudy, rain chance up to 0%, gusts 29 mph, 10–14°C (feels like 6°C).
5. Chanctonbury Ring (South Downs) [id: chanctonbury-ring], score 85/100, Easy, low exposure, 42 min drive. Cloudy, rain chance up to 2%, gusts 29 mph, 10–13°C (feels like 6°C).
6. Firle Beacon (South Downs) [id: firle-beacon], score 85/100, Easy, low exposure, 37 min drive. Cloudy, rain chance up to 2%, gusts 28 mph, 10–14°C (feels like 6°C).

Top hills for 2026-10-11:
1. Seven Sisters (South Downs coast) [id: seven-sisters], score 87/100, Easy, medium exposure, 47 min drive. Cloudy, rain chance up to 8%, gusts 20 mph, 10–14°C (feels like 7°C).
2. Golden Cap (Jurassic Coast) [id: golden-cap], score 85/100, Easy, medium exposure, 3h 50m drive (overnight stay advised). Sunny, rain chance up to 0%, gusts 8 mph, 10–14°C (feels like 8°C).
3. Ditchling Beacon (South Downs) [id: ditchling-beacon], score 83/100, Easy, low exposure, 25 min drive. Cloudy, rain chance up to 8%, gusts 19 mph, 8–13°C (feels like 5°C).
4. Devil's Dyke (South Downs) [id: devils-dyke], score 83/100, Easy, low exposure, 24 min drive. Cloudy, rain chance up to 10%, gusts 19 mph, 8–13°C (feels like 6°C).
5. Chanctonbury Ring (South Downs) [id: chanctonbury-ring], score 83/100, Easy, low exposure, 42 min drive. Cloudy, rain chance up to 8%, gusts 18 mph, 8–13°C (feels like 6°C).
6. Firle Beacon (South Downs) [id: firle-beacon], score 83/100, Easy, low exposure, 37 min drive. Cloudy, rain chance up to 8%, gusts 17 mph, 8–13°C (feels like 6°C).

```
