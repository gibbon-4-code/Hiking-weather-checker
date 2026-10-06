# Building my first agent: a journal

I'm a product manager. I built Summit Planner by working with Claude Code, but I'd never built an agent of my own. This journal follows me adding one to the app: the **Weekend Scout**, which looks at the coming weekend and tells me whether it's worth going, where and when.

Each stage is its own pull request, so you can read the code next to the notes.

| Stage | What it adds | The idea it teaches |
|---|---|---|
| 1 | One call to Claude, no tools | What an API call is: prompts, tokens, cost |
| 2 | Tools and the agent loop | How the model asks for data, and the "harness" that runs it |
| 3 | A fixed answer format and a safety check in code | The model judges, code enforces the hard rules |
| 4 | Evals | Defining "good" and measuring it |
| 5 | Experiments | Trading quality against cost, like any product decision |
| 6 | The Scout in the app | Shipping it safely |

## Stage 1: Hello, model

**What I built.** A script, `npm run scout:hello`, that gets Saturday's ranking (the same scoring the results page uses), turns the top 10 hills into a few lines of text, and sends them to Claude with one question: where should I go?

The parts of an API call:

- **The model**, `claude-opus-5-5`.
- **A system prompt**, which sets the job: who I am, what the data means, and one hard rule (never recommend a hill marked unsafe).
- **A message**, holding the data and my question.
- **Effort**, which is how hard the model thinks before it answers.
- **The reply**, which comes back as blocks of text, with a count of tokens in and out. Tokens are what you pay for.

**Why this isn't an agent yet.** My code decided everything: which day, which data, how much of it. Claude could only answer what it was shown. If Sunday looked better, it had no way to check. In stage 2 it gets tools, so it can ask for things itself.

**What came back, and what it cost.** For Saturday 10 October, Claude picked Seven Sisters, the same hill as the app's own scoring. Its reasons were sensible: it's only 20 minutes further than the closest hills for a much better walk, and Golden Cap scores almost as well but is nearly four hours away. It also warned about wind on the cliff edge and told me to bring a windproof layer. The call used 962 tokens in and 390 out, and cost **$0.0116**.

One thing it got wrong: it suggested Devil's Dyke as "a sheltered alternative". The data says nothing about shelter, and Devil's Dyke had the same 26 mph gusts. It sounded confident and plausible, and it was made up. That one goes straight into the evals in stage 4.

**PM takeaway.** The model was the easy part. Almost all the work was in the code before the call: fetching live forecasts and drive times, scoring 140 hills, and boiling them down to ten clear lines. The answer was only as good as that data, and where the data was silent (shelter), the model filled the gap itself. However impressive LLMs are, building reliable tools and data sources for them to use is still the fundamental work.

## Stage 2: Tools and the loop

**What I built.** The Scout now has two tools, in `src/lib/agent/tools.ts`:

- `get_day_ranking(date)` wraps the ranking from stage 1.
- `get_second_opinion(mountainId, date)` asks the Met Office about one hill.

Each tool is a name, a description, an input schema and a `run` function. Only the first three are sent to Claude; the code stays on my side. Claude decides what to call from the description alone, so the descriptions are really product copy written for the model.

I wrote the loop by hand first, in `scripts/scout-loop.mts` (`npm run scout:loop`). It goes like this:

1. Send the conversation and the list of tools.
2. Keep Claude's reply in the conversation.
3. If it asked for tools, run them and send the results back.
4. Repeat until it answers, or until it hits six turns, the harness's safety limit.

Then I ran the same agent through the SDK's Tool Runner (`npm run scout`), which replaces about 40 lines of loop with one call.

**What happened.** I asked "Is this weekend worth a hike? If so, where and which day?" and didn't say how to work it out. Claude:

1. checked Saturday and Sunday at the same time (two tool calls in one turn);
2. saw Seven Sisters came top on both days, so asked the Met Office about it for both days;
3. got "not available" back (the Met Office isn't set up on my machine), and said so honestly in its answer rather than pretending;
4. picked **Seven Sisters on Sunday**, because gusts drop from 29 to 20 mph on a walk with medium wind exposure, with Ditchling Beacon and Devil's Dyke (low exposure, 25 minutes away) as backups.

Both versions of the loop made the same calls and gave the same answer.

**What it cost.** About **5 cents** per run (around 7,500 tokens in, 900 out), four times stage 1. That's because every turn resends the whole conversation so far, including every tool result. In an agent, cost grows with each step, not just with the final answer.

**This time it stuck to the data.** The system prompt now says to only state facts the tools gave, and there was no made-up "sheltered" claim. One good run doesn't prove that, though. That's what the evals in stage 4 are for.

**PM takeaway.** _To fill in._

## Stage 3: A fixed answer format and a safety check in code

**What I built.** Two changes to the Scout (`npm run scout`).

1. **The answer has a fixed shape.** Claude must now reply with exactly these fields: `verdict` (go, wait or skip), `mountainId`, `date`, `headline`, `reasons` and `confidence`. The API enforces the shape (it's called structured output), so the app gets fields it can check and display instead of a paragraph it would have to interpret.
2. **The code checks the pick.** After Claude answers, `checkAnswer` in `src/lib/agent/guardrail.ts` re-checks it against the app's own rules: a real hill, a day this weekend, inside the search, and passing every safety rule. If anything fails, the answer becomes "skip" and says why. This runs on exactly the forecast Claude saw.

The prompt still says "never recommend an unsafe hill". The guardrail exists because a prompt is a request, not a guarantee. **The model judges; the code enforces.**

The guardrail has eight tests. They need no API key and cost nothing, because they test my code, not the model. For example, a pick of Tryfan with 60 mph gusts gets overruled with the reason "Summit gusts 60 mph".

**What happened.** An accidental real-world test. I'd run the Scout a few times in quick succession, and the free weather service (Open-Meteo) started refusing requests. The app fell back to demo forecasts, as it's designed to, and the tool passed on its note: "Some or all forecasts are demo data". Claude read that note and answered:

- **verdict:** wait
- **confidence:** low
- **headline:** "Blackdown on Saturday looks best on paper, but the forecast is only placeholder data, so check again nearer the day."

That was exactly the right call, and it only happened because the tool reported its own problem honestly. The guardrail passed it, since Blackdown was a real, safe hill this weekend, *according to the data*. But the guardrail can only check against the data it has. If the data is fake, the check is too.

I also made each run fetch each day's forecast only once, which is kinder to the free weather service.

**Two product decisions after that run.**

1. **No "go" on demo data.** If the forecast behind a "go" is demo data, the code now turns it into a "wait" with low confidence. Last time Claude happened to notice the demo data; now the code guarantees it.
2. **One retry before overruling.** If a pick fails the guardrail (a made-up hill, an unsafe one, the wrong weekend), the code doesn't just give up. It carries on the same conversation, tells Claude exactly which check failed, and asks it to choose again. If the second pick fails too, the code's "skip" stands. That's safe either way, because the second answer goes through the same checks.

The retry is tested with a stand-in for Claude that gives canned answers, so the tests are free and give the same result every time. One test checks that when the first pick is a made-up hill, "sheltered-dyke", Claude is told `there's no hill with the id "sheltered-dyke"`, and the second pick is accepted.

**What it cost.** About 5.5 cents per run. A retry would add roughly one more turn.

**Still to watch.** On the last run Claude called Ditchling Beacon "more sheltered". Is that a fair reading of "low wind exposure", or another made-up detail? It's a grey area, so it's a job for the judge in stage 4.

**PM takeaway.** _To fill in._
