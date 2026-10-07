"""
Generation's pure layer: parsing and validating the model's structured output.

Five helpers, in two groups.

`_parse_json_object`, `_build_flashcards_body` and `_build_quiz_body` take the
model's response as a string and return a storage body, or raise
`GenerationError`. `_clean_str` and `_clean_option` take a value of any type and
return a string — "" when it cannot become a useful one.

No provider, no network, no database, no mocking, which is why they are worth
testing and the orchestration around them is not. They are also the part that
survives the pipeline rewrite: whatever produces the text, something still has
to parse and validate it.

Deliberately not covered: a mocked chat model returning a canned message. That
mostly asserts the provider library behaves like itself, and it is the layer the
pipeline replaces.
"""

import json
from typing import Any

import pytest

from app.services.generate import (
    GenerationError,
    _build_flashcards_body,
    _build_quiz_body,
    _clean_option,
    _clean_str,
    _parse_json_object,
)


def quiz_payload(**question: Any) -> str:
    """One-question quiz JSON, so a test only states the field it is about."""
    base = {
        "question": "What is the capital of France?",
        "options": ["Paris", "London", "Rome", "Madrid"],
        "answerIndex": 0,
        "explanation": "It is Paris.",
    }
    base.update(question)
    return json.dumps({"questions": [base]})


def only_question(payload: str) -> dict[str, Any]:
    """The single question from a built quiz body."""
    return _build_quiz_body(payload)["questions"][0]


# --- _parse_json_object -------------------------------------------------------


@pytest.mark.parametrize(
    "raw",
    [
        '{"a": 1}',
        '```json\n{"a": 1}\n```',
        '```\n{"a": 1}\n```',
        '   ```json   {"a": 1}   ```   ',
    ],
    ids=["bare", "json-fence", "plain-fence", "surrounding-whitespace"],
)
def test_parse_json_object_strips_fences(raw: str) -> None:
    """
    The prompts forbid code fences and models add them anyway, which is why
    stripping exists: recovering is cheaper than discarding a paid generation.
    """
    assert _parse_json_object(raw) == {"a": 1}


@pytest.mark.parametrize(
    "raw",
    [
        "not json at all",
        '{"unterminated": ',
        "",
        "```json\n```",
        "[1, 2, 3]",
        '"a bare string"',
        "42",
        "null",
    ],
    ids=[
        "prose",
        "truncated",
        "empty",
        "fence-with-nothing-inside",
        "top-level-array",
        "top-level-string",
        "top-level-number",
        "top-level-null",
    ],
)
def test_parse_json_object_rejects_non_objects(raw: str) -> None:
    """
    Anything that is not a JSON object raises the typed error. The array case
    matters most: `json.loads` accepts it happily, so without the isinstance
    check it would flow on and fail later as an attribute error.
    """
    with pytest.raises(GenerationError) as excinfo:
        _parse_json_object(raw)
    assert excinfo.value.code == "invalid-structured-output"


# --- _clean_str ---------------------------------------------------------------


@pytest.mark.parametrize(
    ("value", "expected"),
    [
        ("  hello  ", "hello"),
        ("hello", "hello"),
        ("", ""),
        ("   ", ""),
        ("\n\t", ""),
        (None, ""),
        (42, ""),
        (1.5, ""),
        (True, ""),
        ([], ""),
        ({}, ""),
    ],
)
def test_clean_str(value: Any, expected: str) -> None:
    """Strings are stripped; everything else becomes empty rather than raising."""
    assert _clean_str(value) == expected


# --- _clean_option ------------------------------------------------------------


@pytest.mark.parametrize(
    ("value", "expected"),
    [
        ("  Paris  ", "Paris"),
        ("", ""),
        ("   ", ""),
        (5, "5"),
        (0, "0"),
        (-3, "-3"),
        (1.5, "1.5"),
        (True, ""),
        (False, ""),
        (None, ""),
        ([], ""),
        ({}, ""),
    ],
)
def test_clean_option(value: Any, expected: str) -> None:
    """
    Unlike `_clean_str`, numbers are coerced rather than dropped: a quiz about
    quantities or years gets JSON numbers for its options, and dropping those
    costs the question. `bool` stays excluded — `true` as an option is a
    malformed response, not the number 1.
    """
    assert _clean_option(value) == expected


def test_clean_option_zero_survives() -> None:
    """
    `0` must coerce to "0" and not be treated as absent. Stated separately
    because the caller keeps an option only `if option`, so a falsy-but-valid
    value is exactly the kind of thing that disappears quietly.
    """
    assert _clean_option(0) == "0"
    assert bool(_clean_option(0)) is True


# --- _build_flashcards_body ---------------------------------------------------


def test_flashcards_happy_path() -> None:
    body = _build_flashcards_body(
        json.dumps({"cards": [{"front": " Q ", "back": " A "}]})
    )
    assert body == {"kind": "flashcards", "cards": [{"front": "Q", "back": "A"}]}


def test_flashcards_kind_comes_from_us_not_the_model() -> None:
    """
    `kind` is attached here so the renderer can trust it. A model echoing a
    different one must not be able to change it.
    """
    body = _build_flashcards_body(
        json.dumps({"kind": "something-else", "cards": [{"front": "Q", "back": "A"}]})
    )
    assert body["kind"] == "flashcards"


@pytest.mark.parametrize(
    "payload",
    [
        {"cards": "not a list"},
        {"cards": {}},
        {},
        {"cards": []},
        {"cards": [{"front": "Q"}]},
        {"cards": [{"back": "A"}]},
        {"cards": [{"front": "  ", "back": "A"}]},
        {"cards": [{"front": "Q", "back": 42}]},
        {"cards": ["not a dict", 42, None]},
    ],
    ids=[
        "cards-not-a-list",
        "cards-is-a-dict",
        "cards-missing",
        "cards-empty",
        "no-back",
        "no-front",
        "blank-front",
        "non-string-back",
        "no-dict-items",
    ],
)
def test_flashcards_rejects_unusable(payload: dict[str, Any]) -> None:
    """Partial cards are dropped; the error comes only when none survive."""
    with pytest.raises(GenerationError) as excinfo:
        _build_flashcards_body(json.dumps(payload))
    assert excinfo.value.code == "invalid-structured-output"


def test_flashcards_drops_bad_cards_but_keeps_good_ones() -> None:
    """One malformed card must not cost the whole generation."""
    body = _build_flashcards_body(
        json.dumps(
            {
                "cards": [
                    {"front": "Q1", "back": "A1"},
                    {"front": "", "back": "A2"},
                    "not a dict",
                    {"front": "Q3", "back": "A3"},
                ]
            }
        )
    )
    assert body["cards"] == [
        {"front": "Q1", "back": "A1"},
        {"front": "Q3", "back": "A3"},
    ]


# --- _build_quiz_body ---------------------------------------------------------


def test_quiz_happy_path() -> None:
    body = _build_quiz_body(quiz_payload())
    assert body["kind"] == "quiz"
    assert body["questions"] == [
        {
            "question": "What is the capital of France?",
            "options": ["Paris", "London", "Rome", "Madrid"],
            "answerIndex": 0,
            "explanation": "It is Paris.",
        }
    ]


def test_quiz_missing_explanation_becomes_none() -> None:
    """An empty explanation is stored as None, not "", so the renderer can test it."""
    assert only_question(quiz_payload(explanation="   "))["explanation"] is None


def test_quiz_answer_index_accepts_digit_string() -> None:
    """
    The prompt asks for an integer and models send "2" anyway — the same
    deviation the options coercion exists for.
    """
    assert only_question(quiz_payload(answerIndex="2"))["answerIndex"] == 2


@pytest.mark.parametrize(
    "bad_index",
    [True, False, 1.0, "two", "", "-1", None, [], 9, -1],
    ids=[
        "bool-true",
        "bool-false",
        "float",
        "word",
        "empty-string",
        "negative-string",
        "none",
        "list",
        "out-of-range",
        "negative",
    ],
)
def test_quiz_rejects_unusable_answer_index(bad_index: Any) -> None:
    """
    An index that cannot be resolved to a surviving option drops the question.
    `True` is called out because `bool` is an `int` subclass and would otherwise
    read as 1.
    """
    with pytest.raises(GenerationError) as excinfo:
        _build_quiz_body(quiz_payload(answerIndex=bad_index))
    assert excinfo.value.code == "invalid-structured-output"


@pytest.mark.parametrize(
    "payload",
    [
        {"questions": "not a list"},
        {},
        {"questions": []},
        {"questions": ["not a dict"]},
        {"questions": [{"question": "  ", "options": ["a", "b"], "answerIndex": 0}]},
        {"questions": [{"question": "Q", "options": "not a list", "answerIndex": 0}]},
        {"questions": [{"question": "Q", "options": ["only one"], "answerIndex": 0}]},
        {"questions": [{"question": "Q", "options": [], "answerIndex": 0}]},
    ],
    ids=[
        "questions-not-a-list",
        "questions-missing",
        "questions-empty",
        "item-not-a-dict",
        "blank-question",
        "options-not-a-list",
        "single-option",
        "no-options",
    ],
)
def test_quiz_rejects_unusable(payload: dict[str, Any]) -> None:
    with pytest.raises(GenerationError) as excinfo:
        _build_quiz_body(json.dumps(payload))
    assert excinfo.value.code == "invalid-structured-output"


# --- the answerIndex / options alignment --------------------------------------
#
# `answerIndex` counts against the options the model sent. Anything dropped from
# that array shifts every later option, so the index has to be translated rather
# than used as-is. Before this was fixed, an option removed ahead of the answer
# made a different option the correct one — a quiz that rendered perfectly and
# marked the wrong answer, with nothing anywhere to signal it.


@pytest.mark.parametrize(
    ("options", "answer_index", "expected_correct"),
    [
        ([3, 5, 7, 9], 1, "5"),
        (["three", 5, "seven", "nine"], 2, "seven"),
        (["", "Paris", "London"], 1, "Paris"),
        (["   ", "Paris", "London"], 1, "Paris"),
        (["", "", "Paris", "London"], 2, "Paris"),
        ([None, "Paris", "London"], 1, "Paris"),
        ([True, "Paris", "London"], 1, "Paris"),
        (["Paris", "London", ""], 0, "Paris"),
        (["Paris", "", "London"], 2, "London"),
    ],
    ids=[
        "all-numeric",
        "number-before-answer",
        "empty-before-answer",
        "whitespace-before-answer",
        "two-empties-before-answer",
        "null-before-answer",
        "bool-before-answer",
        "empty-after-answer",
        "empty-between",
    ],
)
def test_quiz_answer_survives_dropped_options(
    options: list[Any], answer_index: int, expected_correct: str
) -> None:
    """The option the model marked correct is still the one marked correct."""
    question = only_question(
        quiz_payload(options=options, answerIndex=answer_index)
    )
    assert question["options"][question["answerIndex"]] == expected_correct


@pytest.mark.parametrize(
    ("options", "why"),
    [
        (["3", 3, "5"], "coercion turns the integer into the same string"),
        (["Paris", "Paris", "London"], "the model simply repeated itself"),
        (["  Paris  ", "Paris", "London"], "they differ only by whitespace"),
    ],
    ids=["coerced-duplicate", "repeated-literal", "whitespace-only-difference"],
)
def test_quiz_drops_questions_with_indistinguishable_options(
    options: list[Any], why: str
) -> None:
    """
    Two options that read identically make the question unanswerable: one is
    marked correct and the other wrong, while the reader sees the same text
    twice and is told their choice was wrong for picking it.

    Dropped rather than de-duplicated — removing one would shift the positions
    `answerIndex` is counted against, which is the fault the surrounding code
    exists to prevent.
    """
    with pytest.raises(GenerationError) as excinfo:
        _build_quiz_body(quiz_payload(options=options, answerIndex=0))
    assert excinfo.value.code == "invalid-structured-output", why


def test_quiz_keeps_options_that_only_look_similar() -> None:
    """
    The check is on exact equality after cleaning, not on resemblance. `3` and
    `3.0` are different strings and both stay — a reader can tell them apart.
    """
    question = only_question(quiz_payload(options=[3, 3.0, "5"], answerIndex=0))
    assert question["options"] == ["3", "3.0", "5"]


def test_quiz_drops_question_when_the_answer_option_is_dropped() -> None:
    """
    If the correct option itself does not survive, there is no answer left to
    mark. The question goes, rather than pointing at a surviving one.
    """
    with pytest.raises(GenerationError) as excinfo:
        _build_quiz_body(
            quiz_payload(options=["Paris", None, "London"], answerIndex=1)
        )
    assert excinfo.value.code == "invalid-structured-output"


def test_quiz_numeric_options_keep_the_question() -> None:
    """
    A quiz about quantities sends JSON numbers. Dropping them took the whole
    question with them, since fewer than two options survived.
    """
    body = _build_quiz_body(quiz_payload(options=[3, 5, 7, 9], answerIndex=2))
    assert body["questions"][0]["options"] == ["3", "5", "7", "9"]


def test_quiz_keeps_good_questions_and_drops_bad_ones() -> None:
    """One malformed question must not cost the whole generation."""
    body = _build_quiz_body(
        json.dumps(
            {
                "questions": [
                    {"question": "Q1", "options": ["a", "b"], "answerIndex": 0},
                    {"question": "Q2", "options": ["a"], "answerIndex": 0},
                    {"question": "", "options": ["a", "b"], "answerIndex": 0},
                    {"question": "Q4", "options": ["a", "b"], "answerIndex": 1},
                ]
            }
        )
    )
    assert [q["question"] for q in body["questions"]] == ["Q1", "Q4"]
