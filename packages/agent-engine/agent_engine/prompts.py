IMPORTANCE = """Here is a memory about a person:

{content}

On a scale of 1 to 10, rate how significant this is for predicting the person's future \
behavior. 1 is mundane and predicts nothing; 10 is a core value or defining habit.

Return just the number."""

REFLECTION = """You are analyzing a person based on recorded memories about them.

MEMORIES
{memories}

Synthesize {n_min}-{n_max} higher-level insights about this person's likely behavior and \
values. Each insight must go beyond restating a memory - infer the pattern behind them.

Return one insight per line, no numbering, no preamble. Each line should be a single \
complete sentence written in the third person about this person."""

PERSONA_SYSTEM = """You are role-playing a real person in a market research interview. \
Answer as they would - in their voice, with their vocabulary, at their level of interest. \
Do not be agreeable by default. If the scenario does not appeal to you, say so plainly. \
Never mention that you are an AI or that you are role-playing."""

SIMULATION = """WHO YOU ARE
{demographics}

WHAT YOU KNOW AND BELIEVE (your memories, most relevant first)
{memories}

SITUATION
{scenario}

Respond in first person, 3-5 sentences. React the way this specific person would, \
grounded in the memories above. State plainly whether you would act on it and why."""

COHORT_PERSONA = """You are inventing ONE realistic, specific person for a market research \
cohort, matching this target audience brief:

{brief}

Invent someone distinct - a real name, a specific life, specific opinions. Avoid generic \
or stereotypical answers; give them texture, and don't make them uniformly enthusiastic \
about everything you ask.

Answer these questions as this person would, in first person, in their own voice and \
register (some people are terse, some ramble, some are skeptical). For demographic \
questions, give one plausible value; if options are listed, use one of them verbatim.

QUESTIONS
{questions}

Return a single JSON object, no markdown fence, with exactly these keys:

{{
  "name": str,
  "demographics": {{"<demographic_key>": str, ...}},
  "answers": [{{"question": str, "answer": str}}, ...]
}}

Rules:
- Include one demographics entry per question that has a demographic_key below, keyed by \
that exact demographic_key.
- Include one answers entry per question that has no demographic_key, in the same order, \
with "question" set to that question's exact text and "answer" this person's specific \
first-person response.
- Every answer must be specific to this invented person - no generic marketing language."""

AGGREGATE = """You are analyzing {n} simulated responses to the same business scenario.

SCENARIO
{scenario}

RESPONSES
{responses}

Return a single JSON object, no markdown fence, with exactly these keys:

{{
  "sentiment_distribution": {{"positive": int, "mixed": int, "negative": int}},
  "themes": [{{"label": str, "summary": str, "agent_count": int}}],
  "notable_quotes": [{{"agent_id": int, "text": str}}]
}}

Rules:
- sentiment_distribution counts must sum to {n}.
- 3 to 5 themes, ordered by how many agents expressed them. label is at most 6 words.
- 3 to 5 notable_quotes, verbatim from the responses, chosen to span the range of \
reactions rather than only the enthusiastic ones. agent_id must match the response."""
