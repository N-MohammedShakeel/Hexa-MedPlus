# Global state for AI Preferences
# Valid LLM values: "aws_nova_pro" (Amazon Nova Pro - Default), "nvidia" (LLaMA), "aws_nova" (Amazon Nova Lite), "qwen", "gemini"
# Valid Vision values: "aws_nova_pro" (Amazon Nova Pro - Default), "nvidia" (Meta LLaMA 3.2 Vision), "aws_nova" (Amazon Nova Lite), "gemini"

GLOBAL_LLM_PREFERENCE = "aws_nova_pro"
GLOBAL_VISION_PREFERENCE = "aws_nova_pro"

# Backward compatibility getter/setter for legacy references
@property
def GLOBAL_AI_PREFERENCE():
    return GLOBAL_LLM_PREFERENCE
