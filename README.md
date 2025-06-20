# Claude-Flow Installation Guide

- Step 1. Install Claude Code: ``` npm install -g @anthropic-ai/claude-code ```
- Step 2. Install Claude-Flow ``` npx -y claude-flow@latest --version ```
- Step 3. Run Claude-Flow ``` npx -y claude-flow@latest init --sparc ```
- step 4. ``` claude --dangerously-skip-permissions ``` (accept the ui warning message)
- Step 5. Start the orchestrator ``` npx -y claude-flow@latest sparc "build and test my project" ```
