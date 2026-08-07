# Global state for AI Preferences
# Valid LLM values: "aws_nova_pro" (Amazon Nova Pro - Default), "nvidia" (LLaMA), "aws_nova" (Amazon Nova Lite), "qwen", "gemini"
# Valid Vision values: "aws_nova_pro" (Amazon Nova Pro - Default), "nvidia" (Meta LLaMA 3.2 Vision), "aws_nova" (Amazon Nova Lite), "gemini"
#
# These module-level globals are an in-process fast-path cache so the many
# synchronous call sites (vision.py, agents.py, chat.py, workflow.py,
# guardrails.py) don't need an async DB read on every LLM call. The
# source of truth is the single-row `ai_preferences` table (see
# app/models/ai_preference.py) — main.py's startup hook loads the saved
# row into these globals before serving traffic, and preferences.py's PUT
# handler writes through to the DB whenever it updates these.

GLOBAL_LLM_PREFERENCE = "aws_nova_pro"
GLOBAL_VISION_PREFERENCE = "aws_nova_pro"

# Backward-compatible accessor for legacy references. This used to be a bare
# `@property` at module level, which is meaningless outside a class body — every
# `state.GLOBAL_AI_PREFERENCE == "..."` comparison silently evaluated to False
# always (comparing a `property` object to a string), permanently disabling any
# logic gated on it. It's now a plain callable: `state.GLOBAL_AI_PREFERENCE()`.
def GLOBAL_AI_PREFERENCE():
    return GLOBAL_LLM_PREFERENCE
