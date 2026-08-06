# Global state for AI Preferences
# Valid LLM values: "nvidia" (LLaMA - Default), "aws_nova" (Amazon Nova Lite), "qwen", "gemini"
# Valid Vision values: "nvidia" (Meta LLaMA 3.2 Vision - Default), "aws_nova" (Amazon Nova Lite), "gemini"

GLOBAL_LLM_PREFERENCE = "nvidia"
GLOBAL_VISION_PREFERENCE = "nvidia"

# Backward compatibility getter/setter for legacy references
@property
def GLOBAL_AI_PREFERENCE():
    return GLOBAL_LLM_PREFERENCE
