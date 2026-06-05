# Codex Developer Audio Briefing Pipeline

This repo includes a Codex Stop hook that turns the final Codex task result into
a developer-friendly narrated briefing and optional MP3 audio.

It is not a raw "last message to TTS" bridge. The hook collects local context,
asks a report model to rewrite the task result into a natural spoken handoff,
then synthesizes speech chapter by chapter.

## What It Does

On each Codex `Stop` event, the hook:

1. Reads the hook JSON payload from stdin.
2. Collects local repo context such as `git status --short`, `git diff --stat`,
   `git diff --name-only`, changed files, final assistant text, test hints, and
   optional transcript excerpts.
3. Uses the OpenAI Responses API to produce structured briefing JSON.
4. Runs a second strategic-advisor LLM that produces high-quality questions and
   next-conversation prompts.
5. Writes Markdown and JSON reports.
6. Uses OpenAI Audio Speech API to create chapter MP3 files.
7. Merges chapters into one audio file when `ffmpeg` is installed.
8. Mirrors the output folder into iCloud Drive `codex_report` by default.
9. Falls back gracefully if the LLM, TTS, transcript read, mirror, or merge step
   fails.

## Files

- `.codex/hooks/developer_audio_briefing.py` - Stop hook implementation.
- `.codex/hooks.json.example` - JSON hook config example.
- `.codex/config.toml.example` - TOML hook config example.
- `.codex/audio-reports/` - generated reports and audio. This path is ignored by git.
- `requirements.txt` - Python dependency list for this hook.

## Install Dependencies

```bash
python3 -m pip install -r requirements.txt
```

The only required Python package is `openai`.

`ffmpeg` is optional. If it is unavailable, the hook keeps individual chapter
MP3 files and writes `playlist.m3u`.

## Environment Variables

Required for LLM and TTS:

```bash
export OPENAI_API_KEY="..."
```

Do not put API keys into generated reports, README files, hook config, or git.
The hook only reads keys from environment variables.

Optional model controls:

```bash
export REPORT_MODEL="gpt-5.5"
export REPORT_REASONING_EFFORT="xhigh"
export REPORT_VERBOSITY="high"
export REPORT_MAX_OUTPUT_TOKENS="9000"
export REPORT_TIMEOUT_SECONDS="120"

export STRATEGY_MODEL="gpt-5.5"
export STRATEGY_REASONING_EFFORT="xhigh"
export STRATEGY_VERBOSITY="high"
export STRATEGY_MAX_OUTPUT_TOKENS="7000"
export STRATEGY_TIMEOUT_SECONDS="120"

export TTS_MODEL="gpt-4o-mini-tts"
export TTS_VOICE="cedar"
export TTS_FORMAT="mp3"
export TTS_TIMEOUT_SECONDS="120"
```

Optional compatible endpoint:

```bash
export OPENAI_BASE_URL="https://api.openai.com/v1"
```

Optional large-report context:

```bash
export CODEX_AUDIO_EXTRA_CONTEXT_PATHS="reports/v22-workflow-node-upgrade-20260603/v23-planning/v23-planning-report.html;reports/v22-workflow-node-upgrade-20260603/v23-planning/v23-strategy-report.md"
```

The hook payload can also include:

```json
{
  "extra_context_paths": [
    "reports/v22-workflow-node-upgrade-20260603/v23-planning/v23-planning-report.html",
    "reports/v22-workflow-node-upgrade-20260603/v23-planning/v23-planning-manifest.json"
  ]
}
```

Optional iCloud/report mirror controls:

```bash
export CODEX_AUDIO_REPORT_MIRROR_DIR="$HOME/Library/Mobile Documents/com~apple~CloudDocs/codex_report"
export CODEX_AUDIO_DISABLE_ICLOUD_MIRROR="0"
```

## Enable The Hook In This Repo

Copy or merge the example config into your Codex hook configuration:

```bash
cp .codex/hooks.json.example .codex/hooks.json
```

Example Stop hook:

```json
{
  "hooks": {
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "python3 .codex/hooks/developer_audio_briefing.py",
            "timeout": 300,
            "statusMessage": "Generating developer audio briefing"
          }
        ]
      }
    ]
  }
}
```

If your Codex setup prefers TOML, use `.codex/config.toml.example` as the shape
and merge it into your existing config.

## Local Test

Run a fake hook payload:

```bash
printf '%s\n' '{
  "hook_event_name": "Stop",
  "session_id": "local-test-session",
  "turn_id": "local-test-turn",
  "cwd": "'$PWD'",
  "model": "gpt-5.5",
  "last_assistant_message": "完成 Workflow Pro 前置藍圖，新增報告入口，驗證 JSON parse 與 localhost 200。測試：JSON parse passed，browser smoke passed。"
}' | python3 .codex/hooks/developer_audio_briefing.py
```

The hook stdout should be valid JSON, similar to:

```json
{"continue": true, "systemMessage": "Developer audio briefing saved to ..."}
```

Generated files appear in:

```text
.codex/audio-reports/YYYYMMDD-HHMMSS-{short_turn_id}/
```

By default, the same output folder is mirrored to:

```text
~/Library/Mobile Documents/com~apple~CloudDocs/codex_report/
```

Each run may contain:

- `raw_hook_payload.json`
- `context_snapshot.md`
- `narrated_report.json`
- `narrated_report.md`
- strategic advisor questions inside `narrated_report.json` and
  `narrated_report.md`
- `audio/developer-briefing.mp3`
- `audio/chapter-01.mp3`
- `audio/chapter-02.mp3`
- `playlist.m3u`
- `run.log`

## Global Codex Hook Setup

To use the same hook globally, copy the script into your global Codex config area
or call this repo script with an absolute path.

Example global command:

```json
{
  "type": "command",
  "command": "python3 /Users/sean/Documents/FreeChat/.codex/hooks/developer_audio_briefing.py",
  "timeout": 300,
  "statusMessage": "Generating developer audio briefing"
}
```

Make sure the hook receives a `cwd` field from Codex. The script writes reports
under that repo's `.codex/audio-reports/`.

## Privacy And Safety

- `.codex/audio-reports/` is ignored by git because it may include
  `raw_hook_payload.json`, transcript excerpts, file paths, and task details.
- The iCloud mirror can contain the same private information. Treat
  `codex_report` as a private folder.
- Do not commit generated audio reports.
- Do not hardcode `OPENAI_API_KEY` in config files.
- The hook redacts common API key patterns in context snapshots and logs, but
  `raw_hook_payload.json` is intentionally raw for debugging. Treat it as private.
- If `last_assistant_message` is empty, the hook skips the expensive LLM rewrite
  and creates a short fallback record.
- If LLM rewrite fails, the hook writes a fallback narrated report.
- If TTS fails, the hook still keeps `narrated_report.md` and `run.log`.
- If `ffmpeg` is missing, chapter MP3 files remain usable through `playlist.m3u`.

## Output Contract

The hook always tries to print only valid JSON to stdout:

```json
{
  "continue": true,
  "systemMessage": "Developer audio briefing saved to ...",
  "audioReportPath": "...",
  "audioFile": "..."
}
```

Operational logs are written to `run.log`, not stdout.
