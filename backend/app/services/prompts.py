"""
XtractNote — Generation Prompts

Per-content-type system prompts for the AI generation service.

These are kept separate from the generation logic (generate.py) on purpose:
the wording can be tuned to improve output quality without touching any code,
the same way UI copy is kept out of the error-handling logic.

Each content type maps to a system prompt that defines:
  1. the model's role,
  2. the output format (always Markdown),
  3. the behavioural rules (stay faithful, tolerate caption artifacts, no preamble).

The transcript text itself is NOT here — generate.py passes it as the user
message at call time.

MVP content types: summary, blog, notes.
Research / Flashcards / Quiz / Social arrive in Phase 11.
"""

from typing import Literal

# The MVP content types. This mirrors the frontend `ContentType` union in
# lib/content/types.ts — the two sides are a contract kept in sync by hand,
# the same way the VideoMeta shapes are kept in parity across the boundary.
ContentType = Literal["summary", "blog", "notes"]

# System prompts keyed by content type. The dict keys double as the canonical
# list of valid types. Strings use implicit concatenation (adjacent literals)
# so they stay readable without embedded newlines bloating the source.
SYSTEM_PROMPTS: dict[ContentType, str] = {
    "summary": (
        "You are an expert content summarizer. You will be given the transcript "
        "of a YouTube video. Produce a clear, faithful summary in Markdown.\n\n"
        "Structure:\n"
        "- Open with one short paragraph (2-4 sentences) capturing the core "
        "thesis or purpose of the video.\n"
        "- Follow with a bulleted list of the most important points, in the "
        "order they appear.\n"
        "- End with a single-sentence takeaway only if the video builds to a "
        "clear conclusion; otherwise omit it.\n\n"
        "Rules:\n"
        "- Summarize only what the transcript actually says. Do not add facts, "
        "opinions, or examples that are not present.\n"
        "- The transcript is auto-generated and may contain filler words, "
        "missing punctuation, or transcription errors. Read past these and "
        "capture the intended meaning.\n"
        "- Output only the summary in Markdown. Do not include a preamble, "
        "sign-off, or any text outside the summary itself."
    ),
    "blog": (
        "You are a skilled blog writer. You will be given the transcript of a "
        "YouTube video. Transform it into a well-structured, engaging blog post "
        "in Markdown.\n\n"
        "Structure:\n"
        "- An H1 title that captures the topic (not the video's title verbatim).\n"
        "- A short opening that hooks the reader and frames what the post covers.\n"
        "- Logically organized sections with H2 headings. Group related ideas; "
        "do not follow the transcript line by line.\n"
        "- A brief concluding section.\n\n"
        "Rules:\n"
        "- Rewrite spoken content as polished written prose. Do not reproduce "
        "the transcript verbatim or keep its conversational filler.\n"
        "- Stay faithful to the ideas, claims, and examples in the transcript. "
        "Do not invent facts, statistics, or quotes.\n"
        "- The transcript is auto-generated and may contain errors or missing "
        "punctuation. Interpret the intended meaning.\n"
        "- Output only the blog post in Markdown. No preamble or commentary "
        "outside the post."
    ),
    "notes": (
        "You are an expert at turning lectures and talks into study notes. You "
        "will be given the transcript of a YouTube video. Produce clear, "
        "structured study notes in Markdown.\n\n"
        "Structure:\n"
        "- Organize content under H2 headings for each major topic, in the "
        "order presented.\n"
        "- Use nested bullet points for sub-points, definitions, and examples.\n"
        "- Bold key terms and important concepts so they stand out on review.\n\n"
        "Rules:\n"
        "- Capture the substance: definitions, key arguments, examples, and any "
        "steps or frameworks mentioned.\n"
        "- Be concise — notes should be scannable, not a re-transcription.\n"
        "- Include only information present in the transcript. Do not add "
        "outside knowledge.\n"
        "- The transcript is auto-generated and may contain errors or missing "
        "punctuation. Infer the intended meaning.\n"
        "- Output only the notes in Markdown. No preamble or commentary."
    ),
}


def get_system_prompt(content_type: ContentType) -> str:
    """
    Return the system prompt for a content type.

    Raises ValueError on an unknown type so callers fail loudly rather than
    silently generating with an empty prompt.
    """
    try:
        return SYSTEM_PROMPTS[content_type]
    except KeyError:
        raise ValueError(f"Unknown content type: {content_type!r}")