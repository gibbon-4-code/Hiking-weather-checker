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
