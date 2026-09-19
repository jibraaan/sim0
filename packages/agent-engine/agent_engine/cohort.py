from __future__ import annotations

import asyncio
import json
import logging
import random
import re

from .agents import create_agent_from_interview
from .config import settings
from .prompts import COHORT_PERSONA
from .providers import get_llm_provider
from .reflection import reflect
from .schemas import Agent

log = logging.getLogger(__name__)

MAX_COHORT_SIZE = 25

# Concurrent independent LLM calls with the same brief reliably mode-collapse onto the
# same name/city (observed: every persona in three separate runs came back "Maya" in
# "Austin, Texas" or "Denver, Colorado", even with an explicit "pick something less
# obvious" instruction). A soft nudge doesn't survive that collapse, so first name and
# city are pre-assigned by us, sampled without replacement, and handed to the model as
# a constraint rather than a suggestion - it invents everything else around them.
_SEED_CITIES = [
    "Sacramento, CA", "Tulsa, OK", "Columbus, OH", "Richmond, VA", "Boise, ID",
    "Tucson, AZ", "Spokane, WA", "Louisville, KY", "Omaha, NE", "Raleigh, NC",
    "Grand Rapids, MI", "Chattanooga, TN", "Reno, NV", "Madison, WI", "Baton Rouge, LA",
    "Fresno, CA", "Albuquerque, NM", "Providence, RI", "Akron, OH", "Wichita, KS",
    "Rochester, NY", "Charleston, SC", "Des Moines, IA", "Colorado Springs, CO", "Knoxville, TN",
]

# Split by (perceived) gender so a name constraint never fights a brief's own stated
# gender (e.g. forcing "Kwame" onto a "women 25-45" brief produced a persona the model
# then narrated as male, contradicting the brief). A brief with no gender signal draws
# from both pools combined.
_FEMALE_NAMES = [
    "Priya", "Dana", "Fatima", "Renee", "Ingrid", "Yuki", "Camille", "Aaliyah", "Nadia", "Brooke",
    "Sofia", "Imani", "Teresa", "Vivian", "Naomi", "Keiko", "Amara", "Rosa", "Simone", "Farah",
]
_MALE_NAMES = [
    "Wei", "Colton", "Marcus", "Devon", "Tobias", "Hector", "Kwame", "Declan", "Lars", "Omar",
    "Jackson", "Andres", "Felix", "Grant", "Ravi", "Mateo", "Elias", "Niko", "Bashir", "Callum",
]
_FEMALE_SIGNAL = re.compile(r"\b(women|woman|female|mothers?|girls?)\b", re.IGNORECASE)
_MALE_SIGNAL = re.compile(r"\b(men|man|male|fathers?|boys?)\b", re.IGNORECASE)


def _name_pool(brief: str) -> list[str]:
    has_female = bool(_FEMALE_SIGNAL.search(brief))
    has_male = bool(_MALE_SIGNAL.search(brief))
    if has_female and not has_male:
        return _FEMALE_NAMES
    if has_male and not has_female:
        return _MALE_NAMES
    return _FEMALE_NAMES + _MALE_NAMES


def _format_questions(questions: list[dict]) -> str:
    lines = []
    for q in questions:
        line = f"- {q['question']}"
        if q.get("demographic_key"):
            line += f" [demographic_key: {q['demographic_key']}]"
        if q.get("options"):
            line += f" [options: {', '.join(q['options'])}]"
        lines.append(line)
    return "\n".join(lines)


def _strip_fence(raw: str) -> str:
    return raw.strip().removeprefix("```json").removeprefix("```").removesuffix("```").strip()


async def generate_persona(
    brief: str, questions: list[dict], *, seed_city: str | None = None, seed_first_name: str | None = None
) -> dict:
    """One LLM call inventing one persona's demographics and interview answers.

    seed_city/seed_first_name are constraints, not suggestions - see the module-level
    comment on why a soft nudge doesn't survive concurrent-call mode collapse."""
    llm = get_llm_provider()
    persona_brief = brief.strip()
    if seed_city or seed_first_name:
        persona_brief += "\n\nThis specific person:"
        if seed_first_name:
            persona_brief += f'\n- Has the first name "{seed_first_name}" (invent a fitting last name).'
        if seed_city:
            persona_brief += f"\n- Lives in or near {seed_city}."
    prompt = COHORT_PERSONA.format(brief=persona_brief, questions=_format_questions(questions))

    raw = await llm.complete(prompt, max_tokens=2200, temperature=1.05)
    try:
        data = json.loads(_strip_fence(raw))
    except json.JSONDecodeError:
        # Occasionally the model wraps the JSON in stray prose, or truncates near the
        # token cap - one retry, blunter and with more room.
        raw = await llm.complete(
            prompt + "\n\nReturn ONLY the JSON object, nothing else. Keep answers concise.",
            max_tokens=2600,
            temperature=1.05,
        )
        data = json.loads(_strip_fence(raw))

    if not data.get("name") or not isinstance(data.get("answers"), list):
        raise ValueError("persona response missing name/answers")
    return data


async def generate_cohort(
    brief: str,
    count: int,
    questions: list[dict],
    *,
    concurrency: int | None = None,
    on_progress=None,
) -> list[Agent]:
    """Invent `count` personas and run each through the real interview pipeline
    (create_agent_from_interview + reflect) - generated agents are structurally
    identical to a human-submitted one, just LLM-authored.

    on_progress(done, total, name, error) fires after each persona, mirroring
    run_batch_simulation's progress callback shape."""
    count = max(1, min(count, MAX_COHORT_SIZE))
    # Each persona fans out into several LLM calls of its own (importance scoring per
    # memory, then reflection), so cohort concurrency stays well under sim_concurrency
    # to avoid bursting a free-tier tokens-per-minute cap.
    semaphore = asyncio.Semaphore(concurrency or min(3, settings.sim_concurrency))
    seed_cities = random.sample(_SEED_CITIES, min(count, len(_SEED_CITIES)))
    name_pool = _name_pool(brief)
    seed_names = random.sample(name_pool, min(count, len(name_pool)))
    total = count
    done = 0

    async def one(i: int) -> Agent | None:
        nonlocal done
        name: str | None = None
        error: str | None = None
        agent: Agent | None = None
        seed_city = seed_cities[i] if i < len(seed_cities) else None
        seed_name = seed_names[i] if i < len(seed_names) else None
        async with semaphore:
            try:
                persona = await generate_persona(brief, questions, seed_city=seed_city, seed_first_name=seed_name)
                name = persona.get("name")
                agent, _ = await create_agent_from_interview(
                    persona["name"],
                    persona.get("demographics") or {},
                    persona["answers"],
                    source_interview_id=f"cohort-{i}",
                )
                await reflect(agent.id)
            except Exception as exc:  # noqa: BLE001
                log.warning("cohort persona %s failed: %s", i, exc)
                error = str(exc)
            finally:
                done += 1
                if on_progress:
                    on_progress(done, total, name, error)
        return agent

    results = await asyncio.gather(*(one(i) for i in range(count)))
    return [a for a in results if a is not None]
