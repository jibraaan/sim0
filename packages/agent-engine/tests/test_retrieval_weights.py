import pytest

from agent_engine.providers import set_providers
from agent_engine.providers.fake_provider import FakeEmbeddings, FakeLLM
from agent_engine.memory import score_importance


@pytest.fixture(autouse=True)
def fakes():
    set_providers(embeddings=FakeEmbeddings(dim=64), llm=FakeLLM(["8"]))
    yield
    set_providers()


async def test_importance_parses_number():
    assert await score_importance("She dyes her hair every six weeks.") == 8


async def test_importance_clamps_and_defaults():
    set_providers(embeddings=FakeEmbeddings(dim=64), llm=FakeLLM(["99"]))
    assert await score_importance("x") == 10
    set_providers(embeddings=FakeEmbeddings(dim=64), llm=FakeLLM(["no idea"]))
    assert await score_importance("x") == 5


async def test_fake_embeddings_are_deterministic_and_normalised():
    e = FakeEmbeddings(dim=64)
    a, b = await e.embed(["hello", "hello"])
    assert a == b
    assert abs(sum(x * x for x in a) - 1.0) < 1e-6
