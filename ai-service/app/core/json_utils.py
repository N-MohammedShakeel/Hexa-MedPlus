def extract_first_json_object(s: str) -> str:
    """
    Returns the first balanced top-level {...} block in s, tracking brace depth
    and string literals so nested objects/arrays are captured whole. A plain
    greedy regex (\\{.*\\}) instead extends all the way to the LAST '}' in the
    string, silently merging in any trailing prose or a second JSON block the
    model appended after its "single JSON object" instruction was ignored; a
    non-greedy regex (\\{.*?\\}) instead stops at the FIRST '}', truncating any
    nested object. This walks the string instead of guessing, so it always
    stops at the matching close brace regardless of what follows or what's
    nested inside. Falls back to s if no '{' is found, or to everything from
    the first '{' onward if the braces never balance — either way the caller's
    json.loads/json_repair fallback still gets a reasonable shot at it.
    """
    start = s.find('{')
    if start == -1:
        return s
    depth = 0
    in_string = False
    escaped = False
    for i in range(start, len(s)):
        c = s[i]
        if escaped:
            escaped = False
        elif c == '\\':
            escaped = True
        elif c == '"':
            in_string = not in_string
        elif not in_string:
            if c == '{':
                depth += 1
            elif c == '}':
                depth -= 1
                if depth == 0:
                    return s[start:i + 1]
    return s[start:]
