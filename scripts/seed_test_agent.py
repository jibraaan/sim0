"""Hardcoded test agent - run before any UI work exists."""

import asyncio

from agent_engine.agents import create_agent_from_interview
from agent_engine.db import close_pool

DEMOGRAPHICS = {
    "age": 34,
    "location": "Sacramento, CA",
    "occupation": "dental hygienist",
    "household_income": "$70-85k",
    "hair": "naturally dark brown, colors at home every 6-8 weeks",
}

ANSWERS = [
    {
        "question": "How do you currently color your hair?",
        "answer": "I use box dye from Target, usually the same ash brown I've bought for years. I did salon color twice for weddings and it looked incredible but it was almost two hundred dollars each time and I couldn't justify repeating it.",
    },
    {
        "question": "What worries you most about at-home color?",
        "answer": "Getting a patchy result at the back where I can't see. And the smell gives me a headache for a full day, so I have to plan it for a Saturday when nobody's home.",
    },
    {
        "question": "How much do you pay attention to ingredients?",
        "answer": "More than I used to. I switched to an ammonia-free line after my sister had a reaction. I'll read the box but I don't research brands online.",
    },
    {
        "question": "What would make you switch brands?",
        "answer": "Honestly, if a friend at work showed me hers looked good. I don't trust ads for this category at all. Price matters but I'd pay maybe five dollars more for something that didn't wreck my bathroom for a day.",
    },
]


async def main():
    agent, memories = await create_agent_from_interview(
        "Dana Whitfield", DEMOGRAPHICS, ANSWERS, source_interview_id="seed-001"
    )
    print(f"agent {agent.id}: {agent.name}")
    for m in memories:
        print(f"  [{m.importance_score}] {m.content[:90]}")
    await close_pool()


asyncio.run(main())
