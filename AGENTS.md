# Workspace Directives: Vocab Vault

## 1. Token Efficiency & Output Optimization
- **Be Concise and Direct**: Provide immediate, actionable responses without conversational filler, greetings, or repetitive pleasantries.
- **Diff & Targeted Snippets Only**: When showing code changes, do not output entire unmodified files. Only present the modified function, block, or unified diff.
- **Avoid Repetitive Summaries**: State what was accomplished and verification results concisely. Do not repeat long background histories or unchanged architecture details.
- **Command Efficiency**: Prefer concise command flags (e.g. `git status -s`, `pytest -q`) to minimize terminal output tokens.

## 2. Zero Emoji Policy
- Never use emojis anywhere (code, comments, documentation, commit messages, and chat responses).

## 3. Architecture & Quality Invariants
- **10 Languages Support**: Maintain complete parity for ja, en, fr, de, es, it, pt, nl, zh, ko.
- **Quality Gates**: Ensure `python3 scripts/run_all_tests.py` always passes completely before finalizing any changes.
- **Safety First**: Do not modify production database schema or payment logic without explicit, rigorous idempotency and edge-case guarantees.
