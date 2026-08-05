import json
import os

log_path = r'C:\Users\RM\.gemini\antigravity-ide\brain\33e58412-520b-4255-8968-9b1725fd6e16\.system_generated\logs\transcript_full.jsonl'
if not os.path.exists(log_path):
    log_path = r'C:\Users\RM\.gemini\antigravity-ide\brain\33e58412-520b-4255-8968-9b1725fd6e16\.system_generated\logs\transcript.jsonl'
lines = open(log_path, 'r', encoding='utf-8').read().splitlines()

for l in lines:
    try:
        step = json.loads(l)
        if 'tool_calls' in step:
            for tc in step['tool_calls']:
                if tc['name'] == 'write_to_file':
                    args = tc.get('args', {})
                    if 'TargetFile' in args and 'CodeContent' in args:
                        path = args['TargetFile'].strip('\"\'')
                        content = args['CodeContent']
                        if not path.endswith('.md') and not path.endswith('recover.py'):
                            os.makedirs(os.path.dirname(path), exist_ok=True)
                            with open(path, 'w', encoding='utf-8') as f:
                                f.write(content)
                            print(f'Recovered {path}')
                elif tc['name'] == 'multi_replace_file_content':
                    # To apply multi_replace_file_content correctly we can't just replay easily
                    # But the write_to_file was mostly what I needed for full file overwrites.
                    pass
    except Exception as e:
        pass
