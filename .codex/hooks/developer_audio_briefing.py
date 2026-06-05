#!/usr/bin/env python3
"""Codex Stop hook: generate a developer-oriented narrated audio briefing.

The hook reads Codex hook JSON from stdin, collects local git/task context,
rewrites the final assistant report into a spoken developer handoff, and then
optionally synthesizes MP3 audio with OpenAI TTS.

Stdout must remain valid JSON for Codex hooks. All operational details go to
the run.log file inside the generated report directory.
"""

from __future__ import annotations

import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Tuple


DEFAULT_REPORT_MODEL = "gpt-5.5"
DEFAULT_REPORT_REASONING_EFFORT = "xhigh"
DEFAULT_REPORT_VERBOSITY = "high"
DEFAULT_TTS_MODEL = "gpt-4o-mini-tts"
DEFAULT_TTS_VOICE = "cedar"
DEFAULT_TTS_FORMAT = "mp3"
DEFAULT_DURATION_MINUTES = 5
MAX_TRANSCRIPT_CHARS = 120_000
MAX_EXTRA_CONTEXT_FILE_CHARS = 90_000
MAX_EXTRA_CONTEXT_TOTAL_CHARS = 260_000
MAX_TTS_CHARS = 3_800

TTS_INSTRUCTIONS = (
    "Speak in a calm, focused senior-engineer briefing style. Keep a natural "
    "pace, clear phrasing, and subtle emphasis on filenames, test results, "
    "risks, and next actions. This is a technical status update for a software "
    "developer, not a sales narration."
)


def read_hook_payload() -> Dict[str, Any]:
    """Read Codex hook JSON from stdin."""
    raw = sys.stdin.read()
    if not raw.strip():
        return {
            "hook_event_name": "unknown",
            "last_assistant_message": "",
            "_read_error": "stdin was empty",
        }
    try:
        payload = json.loads(raw)
        if isinstance(payload, dict):
            return payload
        return {
            "hook_event_name": "unknown",
            "last_assistant_message": "",
            "_read_error": "stdin JSON was not an object",
            "_raw_type": type(payload).__name__,
        }
    except Exception as exc:  # noqa: BLE001 - hook must never crash here.
        return {
            "hook_event_name": "unknown",
            "last_assistant_message": "",
            "_read_error": f"failed to parse stdin JSON: {type(exc).__name__}: {exc}",
            "_raw_preview": raw[:2_000],
        }


def now_stamp() -> str:
    return datetime.now().strftime("%Y%m%d-%H%M%S")


def short_id(value: Any, fallback: str = "turn") -> str:
    text = str(value or "").strip()
    text = re.sub(r"[^A-Za-z0-9_-]+", "-", text)
    return (text[:12] or fallback).strip("-") or fallback


def redact_secrets(text: str) -> str:
    """Best-effort redaction for logs and context snapshots."""
    if not text:
        return ""
    patterns = [
        (r"sk-[A-Za-z0-9_\-]{16,}", "sk-[REDACTED]"),
        (r"sb_[A-Za-z0-9_\-]{16,}", "sb_[REDACTED]"),
        (r"(?i)(OPENAI_API_KEY\s*=\s*)[^\s]+", r"\1[REDACTED]"),
        (r"(?i)(api[_-]?key['\"]?\s*[:=]\s*['\"]?)[^'\"\s,]+", r"\1[REDACTED]"),
        (r"(?i)(authorization['\"]?\s*[:=]\s*['\"]?Bearer\s+)[^'\"\s,]+", r"\1[REDACTED]"),
    ]
    redacted = text
    for pattern, replacement in patterns:
        redacted = re.sub(pattern, replacement, redacted)
    return redacted


def safe_run(
    args: List[str],
    cwd: Path,
    timeout: int = 12,
) -> Tuple[int, str, str]:
    """Run a command safely and return code/stdout/stderr."""
    try:
        completed = subprocess.run(
            args,
            cwd=str(cwd),
            capture_output=True,
            text=True,
            timeout=timeout,
            check=False,
        )
        return (
            completed.returncode,
            redact_secrets(completed.stdout.rstrip()),
            redact_secrets(completed.stderr.rstrip()),
        )
    except Exception as exc:  # noqa: BLE001 - context collection is best effort.
        return 1, "", f"{type(exc).__name__}: {exc}"


def is_git_repo(cwd: Path) -> bool:
    code, out, _ = safe_run(["git", "rev-parse", "--is-inside-work-tree"], cwd, timeout=5)
    return code == 0 and out.strip() == "true"


def parse_changed_files(status_short: str, diff_name_only: str) -> List[str]:
    files = set()
    for line in status_short.splitlines():
        if not line.strip():
            continue
        # Porcelain short status keeps the path after the two status columns.
        path = line[3:] if len(line) > 3 else line.strip()
        if " -> " in path:
            path = path.split(" -> ", 1)[1]
        files.add(path.strip())
    for line in diff_name_only.splitlines():
        if line.strip():
            files.add(line.strip())
    return sorted(files)


def tail_text_file(path: Path, max_chars: int = MAX_TRANSCRIPT_CHARS) -> str:
    try:
        size = path.stat().st_size
        with path.open("rb") as handle:
            if size > max_chars:
                handle.seek(size - max_chars)
            data = handle.read(max_chars)
        return data.decode("utf-8", errors="replace")
    except Exception as exc:  # noqa: BLE001
        return f"[transcript read failed: {type(exc).__name__}: {exc}]"


def normalize_extra_context_paths(payload: Dict[str, Any], cwd: Path) -> List[Path]:
    """Read optional report/source context paths from payload or environment."""
    raw_values: List[str] = []
    payload_paths = payload.get("extra_context_paths")
    if isinstance(payload_paths, list):
        raw_values.extend(str(item) for item in payload_paths)
    elif isinstance(payload_paths, str):
        raw_values.extend(re.split(r"[\n,;]+", payload_paths))

    env_paths = os.environ.get("CODEX_AUDIO_EXTRA_CONTEXT_PATHS", "")
    if env_paths:
        raw_values.extend(re.split(r"[\n,;]+", env_paths))

    paths: List[Path] = []
    seen = set()
    for raw in raw_values:
        text = raw.strip()
        if not text:
            continue
        path = Path(text).expanduser()
        if not path.is_absolute():
            path = cwd / path
        resolved = path.resolve()
        if str(resolved) in seen:
            continue
        seen.add(str(resolved))
        paths.append(resolved)
    return paths


def strip_html_for_context(text: str) -> str:
    """A lightweight HTML-to-text pass for report context."""
    text = re.sub(r"(?is)<script.*?</script>", " ", text)
    text = re.sub(r"(?is)<style.*?</style>", " ", text)
    text = re.sub(r"(?s)<[^>]+>", " ", text)
    text = re.sub(r"&nbsp;", " ", text)
    text = re.sub(r"&amp;", "&", text)
    text = re.sub(r"&lt;", "<", text)
    text = re.sub(r"&gt;", ">", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def read_extra_context_files(paths: List[Path]) -> List[Dict[str, str]]:
    """Read additional report files for large planning/audio briefings."""
    items: List[Dict[str, str]] = []
    total_chars = 0
    for path in paths:
        if total_chars >= MAX_EXTRA_CONTEXT_TOTAL_CHARS:
            items.append({
                "path": str(path),
                "status": "skipped",
                "content": "extra context total character budget reached",
            })
            continue
        try:
            if not path.exists() or not path.is_file():
                items.append({"path": str(path), "status": "missing", "content": ""})
                continue
            suffix = path.suffix.lower()
            if suffix in {".png", ".jpg", ".jpeg", ".gif", ".webp", ".mp3", ".mp4", ".zip"}:
                items.append({"path": str(path), "status": "skipped-binary", "content": ""})
                continue
            raw = tail_text_file(path, max_chars=MAX_EXTRA_CONTEXT_FILE_CHARS)
            if suffix in {".html", ".htm"}:
                raw = strip_html_for_context(raw)
            remaining = MAX_EXTRA_CONTEXT_TOTAL_CHARS - total_chars
            content = redact_secrets(raw[:remaining])
            total_chars += len(content)
            items.append({"path": str(path), "status": "loaded", "content": content})
        except Exception as exc:  # noqa: BLE001
            items.append({
                "path": str(path),
                "status": "error",
                "content": f"{type(exc).__name__}: {exc}",
            })
    return items


def extract_transcript_excerpt(transcript_path: Any) -> str:
    if not transcript_path:
        return ""
    path = Path(str(transcript_path)).expanduser()
    if not path.exists() or not path.is_file():
        return f"[transcript unavailable: {path}]"
    text = tail_text_file(path)
    lines = text.splitlines()
    interesting: List[str] = []
    for line in lines:
        lowered = line.lower()
        if any(token in lowered for token in ["assistant", "tool", "exec", "test", "build", "error", "failed", "passed"]):
            interesting.append(line[:1_000])
    if not interesting:
        interesting = lines[-40:]
    return redact_secrets("\n".join(interesting[-80:]))


def extract_test_hints(*texts: str) -> List[str]:
    pattern = re.compile(
        r"(npm run|pnpm|yarn|pytest|vitest|jest|playwright|typecheck|lint|build|test|curl|"
        r"passed|failed|error|HTTP|驗證|測試|通過|失敗)",
        re.IGNORECASE,
    )
    hints: List[str] = []
    for text in texts:
        for line in (text or "").splitlines():
            clean = line.strip()
            if clean and pattern.search(clean):
                hints.append(clean[:700])
    return hints[-60:]


def collect_context(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Collect git/task context for the briefing."""
    cwd = Path(str(payload.get("cwd") or os.getcwd())).expanduser().resolve()
    last_assistant_message = str(payload.get("last_assistant_message") or "")
    transcript_excerpt = extract_transcript_excerpt(payload.get("transcript_path"))
    extra_context_paths = normalize_extra_context_paths(payload, cwd)
    extra_context_files = read_extra_context_files(extra_context_paths)

    git_status = ""
    git_diff_stat = ""
    git_diff_name_only = ""
    changed_files: List[str] = []
    git_errors: List[str] = []

    if cwd.exists() and is_git_repo(cwd):
        commands = {
            "git_status_short": ["git", "status", "--short"],
            "git_diff_stat": ["git", "diff", "--stat"],
            "git_diff_name_only": ["git", "diff", "--name-only"],
        }
        code, git_status, err = safe_run(commands["git_status_short"], cwd)
        if code != 0 and err:
            git_errors.append(f"git status failed: {err}")
        code, git_diff_stat, err = safe_run(commands["git_diff_stat"], cwd)
        if code != 0 and err:
            git_errors.append(f"git diff --stat failed: {err}")
        code, git_diff_name_only, err = safe_run(commands["git_diff_name_only"], cwd)
        if code != 0 and err:
            git_errors.append(f"git diff --name-only failed: {err}")
        changed_files = parse_changed_files(git_status, git_diff_name_only)
    else:
        git_errors.append("cwd is not a git repository or does not exist")

    test_hints = extract_test_hints(last_assistant_message, transcript_excerpt)

    return {
        "hook_event_name": payload.get("hook_event_name"),
        "session_id": payload.get("session_id"),
        "turn_id": payload.get("turn_id"),
        "cwd": str(cwd),
        "model": payload.get("model"),
        "last_assistant_message": redact_secrets(last_assistant_message),
        "transcript_path": payload.get("transcript_path"),
        "transcript_excerpt": transcript_excerpt,
        "git_status_short": git_status,
        "git_diff_stat": git_diff_stat,
        "git_diff_name_only": git_diff_name_only,
        "git_errors": git_errors,
        "changed_files": changed_files,
        "test_hints": test_hints,
        "extra_context_files": extra_context_files,
    }


def context_to_markdown(context: Dict[str, Any]) -> str:
    def block(value: Any) -> str:
        text = str(value or "").strip()
        return text if text else "目前回報裡沒有提供。"

    changed = "\n".join(f"- {path}" for path in context.get("changed_files", []))
    tests = "\n".join(f"- {line}" for line in context.get("test_hints", []))
    errors = "\n".join(f"- {line}" for line in context.get("git_errors", []))
    extra_blocks: List[str] = []
    for item in context.get("extra_context_files", []) or []:
        extra_blocks.extend([
            f"### {item.get('path')}",
            "",
            f"status: {item.get('status')}",
            "",
            "```text",
            block(item.get("content")),
            "```",
            "",
        ])

    return "\n".join(
        [
            "# Developer Audio Briefing Context Snapshot",
            "",
            f"- hook_event_name: {context.get('hook_event_name') or 'unknown'}",
            f"- session_id: {context.get('session_id') or 'unknown'}",
            f"- turn_id: {context.get('turn_id') or 'unknown'}",
            f"- cwd: {context.get('cwd') or 'unknown'}",
            f"- model: {context.get('model') or 'unknown'}",
            f"- transcript_path: {context.get('transcript_path') or 'not provided'}",
            "",
            "## Git Status Short",
            "",
            "```text",
            block(context.get("git_status_short")),
            "```",
            "",
            "## Git Diff Stat",
            "",
            "```text",
            block(context.get("git_diff_stat")),
            "```",
            "",
            "## Git Diff Name Only",
            "",
            "```text",
            block(context.get("git_diff_name_only")),
            "```",
            "",
            "## Changed Files",
            "",
            changed or "目前回報裡沒有提供。",
            "",
            "## Test And Verification Hints",
            "",
            tests or "目前回報裡沒有提供。",
            "",
            "## Git Collection Notes",
            "",
            errors or "No git collection errors.",
            "",
            "## Last Assistant Message",
            "",
            block(context.get("last_assistant_message")),
            "",
            "## Transcript Excerpt",
            "",
            block(context.get("transcript_excerpt")),
            "",
            "## Extra Context Files",
            "",
            "\n".join(extra_blocks) if extra_blocks else "目前回報裡沒有提供。",
            "",
        ]
    )


def briefing_schema() -> Dict[str, Any]:
    changed_file = {
        "type": "object",
        "additionalProperties": False,
        "properties": {
            "path": {"type": "string"},
            "summary": {"type": "string"},
        },
        "required": ["path", "summary"],
    }
    chapter = {
        "type": "object",
        "additionalProperties": False,
        "properties": {
            "title": {"type": "string"},
            "script": {"type": "string"},
        },
        "required": ["title", "script"],
    }
    return {
        "type": "object",
        "additionalProperties": False,
        "properties": {
            "title": {"type": "string"},
            "duration_target_minutes": {"type": "number"},
            "executive_summary": {"type": "string"},
            "narration_script": {"type": "string"},
            "chapters": {"type": "array", "items": chapter},
            "technical_details": {"type": "array", "items": {"type": "string"}},
            "changed_files": {"type": "array", "items": changed_file},
            "tests_and_verification": {"type": "string"},
            "risks_or_followups": {"type": "array", "items": {"type": "string"}},
            "one_sentence_status": {"type": "string"},
        },
        "required": [
            "title",
            "duration_target_minutes",
            "executive_summary",
            "narration_script",
            "chapters",
            "technical_details",
            "changed_files",
            "tests_and_verification",
            "risks_or_followups",
            "one_sentence_status",
        ],
    }


def build_rewriter_prompt(context: Dict[str, Any], context_snapshot: str) -> Tuple[str, str]:
    """Return instructions and input for the Responses API."""
    instructions = """
你是 Developer Audio Briefing Rewriter。你的工作不是摘要，而是把 Codex 任務結果改寫成一份適合開發者用耳朵聽的完整口頭交接。

請用繁體中文為主，保留必要英文技術名詞。語氣像資深工程師向另一位開發者交接：冷靜、完整、有上下文、有判斷。

旁白必須包含：
- 做了什麼。
- 為什麼這樣做。
- 改了哪些關鍵地方。
- 測了什麼，哪些通過，哪些沒跑。
- 目前狀態。
- 風險與後續。

不要像會議逐字稿、不要行銷、不要過度簡略。不要逐字朗讀 stack trace、diff、檔案列表；請整理成可聽的工程解釋。
如果資訊不足，明確說「目前回報裡沒有提供」。如果測試沒跑或任務失敗，要明確說出，不要粉飾。
一般任務至少做成約 5 分鐘可聽長度；大型任務可以 10 到 20 分鐘。narration_script 要自然可朗讀，段落之間要有轉場。
請輸出符合 schema 的 structured JSON，不要附加 schema 外文字。
""".strip()

    user_input = "\n".join(
        [
            "以下是 Codex hook 與 repo context。請產生 developer audio briefing JSON。",
            "",
            context_snapshot,
            "",
            "## Changed Files From Context",
            json.dumps(context.get("changed_files", []), ensure_ascii=False, indent=2),
        ]
    )
    return instructions, user_input


def parse_json_text(text: str) -> Dict[str, Any]:
    try:
        data = json.loads(text)
        if isinstance(data, dict):
            return data
    except Exception:
        pass

    match = re.search(r"\{.*\}", text, flags=re.DOTALL)
    if match:
        data = json.loads(match.group(0))
        if isinstance(data, dict):
            return data
    raise ValueError("model output was not valid JSON")


def get_response_text(response: Any) -> str:
    output_text = getattr(response, "output_text", None)
    if output_text:
        return str(output_text)

    chunks: List[str] = []
    for item in getattr(response, "output", []) or []:
        for content in getattr(item, "content", []) or []:
            text = getattr(content, "text", None)
            if text:
                chunks.append(str(text))
    return "\n".join(chunks)


def validate_report_shape(report: Dict[str, Any]) -> Dict[str, Any]:
    fallback = fallback_report(
        {
            "last_assistant_message": report.get("narration_script", ""),
            "changed_files": [],
            "test_hints": [],
        },
        reason="report shape normalization fallback",
    )
    normalized = {**fallback, **report}
    if not isinstance(normalized.get("chapters"), list):
        normalized["chapters"] = []
    if not isinstance(normalized.get("technical_details"), list):
        normalized["technical_details"] = []
    if not isinstance(normalized.get("changed_files"), list):
        normalized["changed_files"] = []
    if not isinstance(normalized.get("risks_or_followups"), list):
        normalized["risks_or_followups"] = []
    if not str(normalized.get("narration_script") or "").strip():
        normalized["narration_script"] = fallback["narration_script"]
    return normalized


def strategic_advisor_schema() -> Dict[str, Any]:
    question = {
        "type": "object",
        "additionalProperties": False,
        "properties": {
            "theme": {"type": "string"},
            "question": {"type": "string"},
            "why_it_matters": {"type": "string"},
            "answer_would_change": {"type": "string"},
        },
        "required": ["theme", "question", "why_it_matters", "answer_would_change"],
    }
    return {
        "type": "object",
        "additionalProperties": False,
        "properties": {
            "advisor_title": {"type": "string"},
            "strategic_brief": {"type": "string"},
            "key_unknowns": {"type": "array", "items": {"type": "string"}},
            "questions": {"type": "array", "items": question},
            "recommended_next_conversation_flow": {"type": "array", "items": {"type": "string"}},
            "one_sentence_prompt_to_user": {"type": "string"},
            "narration_addendum": {"type": "string"},
        },
        "required": [
            "advisor_title",
            "strategic_brief",
            "key_unknowns",
            "questions",
            "recommended_next_conversation_flow",
            "one_sentence_prompt_to_user",
            "narration_addendum",
        ],
    }


def build_strategic_advisor_prompt(
    report: Dict[str, Any],
    context_snapshot: str,
) -> Tuple[str, str]:
    instructions = """
你是使用者的專屬戰略顧問。現在角色互換：你不是聽使用者指揮的工具人，而是安排下一步的人。

你的任務不是再做摘要，而是在 Developer Audio Briefing 後面掛上一層高階戰略追問。

人格與方法：
- 你要通過瘋狂輸出高質量的提問來摸透使用者的真實狀況。
- 你的問題要像神仙問題一樣激活大腦，而不是一般問卷。
- 你要把亂七八糟的線索整理成可以決策的脈絡。
- 當你覺得脈絡還不清楚時，不要急著下結論；先提出能改變規劃的問題。
- 等脈絡清楚後，目標是聯手做出超詳細行動規劃。

請根據 briefing report 與 context，輸出 structured JSON。問題要能讓使用者回答後直接改變工程策略、產品路線、優先級、風險控制或資源配置。

請使用繁體中文，保留必要英文技術名詞。避免空泛，例如「你想怎麼做？」這種不夠。每個問題都要說明為什麼重要，以及答案會改變什麼。

narration_addendum 要可直接朗讀，像戰略顧問接在工程簡報後面對使用者說的一段話。
""".strip()
    user_input = "\n".join(
        [
            "以下是第一顆 LLM 產生的 Developer Audio Briefing JSON：",
            "",
            json.dumps(report, ensure_ascii=False, indent=2),
            "",
            "以下是任務與 repo context：",
            "",
            context_snapshot,
        ]
    )
    return instructions, user_input


def fallback_strategic_advisor(reason: str) -> Dict[str, Any]:
    questions = [
        {
            "theme": "目標邊界",
            "question": "這次 V23 你最想優先變成可用產品能力的是 workflow 設計、Workflow Brain 理解能力，還是可重複部署的工程基礎？",
            "why_it_matters": "三者都重要，但第一個工程切入點不同，會直接影響前 5 輪要先寫 UI、schema，還是後端保存。",
            "answer_would_change": "會改變第一階段任務排序與測試標準。",
        },
        {
            "theme": "決策節奏",
            "question": "你希望 Workflow Brain 一開始就能提出優化版 workflow，還是先只做讀懂、提問、標記風險，不讓它改設計？",
            "why_it_matters": "這決定 proposal schema 和 Apply 機制要不要提前做。",
            "answer_would_change": "會改變是否需要 proposal diff、rollback、approval gate。",
        },
        {
            "theme": "資料信任",
            "question": "哪些資料可以讓大腦直接讀，哪些資料必須先 redaction 或只給 summary？",
            "why_it_matters": "Workflow Brain 越懂上下文越強，但權限與隱私邊界要先定。",
            "answer_would_change": "會改變 context pack、artifact policy、RLS 與 secret redaction。",
        },
    ]
    addendum = (
        "接下來我會換成戰略顧問視角。這份報告已經足夠啟動工程，但真正會改變路線的是幾個核心答案："
        "你要先要可用產品能力，還是先要穩定架構；你要讓 Workflow Brain 立刻能提出改版，還是先只讓它理解和提問；"
        "以及哪些資料可以被大腦讀取，哪些必須被權限和摘要層隔開。"
    )
    return {
        "advisor_title": "Strategic Advisor Questions",
        "strategic_brief": f"使用 fallback 戰略問題，原因：{reason}",
        "key_unknowns": ["優先級", "大腦改版權限", "資料信任邊界"],
        "questions": questions,
        "recommended_next_conversation_flow": [
            "先回答目標邊界問題。",
            "再決定 Workflow Brain 第一版權限。",
            "最後鎖定前 5 輪工程切入點。",
        ],
        "one_sentence_prompt_to_user": "先告訴我：V23 第一個可用版本，你要它最像工程 cockpit、設計大腦，還是自動化 workflow builder？",
        "narration_addendum": addendum,
    }


def generate_strategic_questions_with_llm(
    report: Dict[str, Any],
    context_snapshot: str,
    log: List[str],
) -> Dict[str, Any]:
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        log.append("OPENAI_API_KEY is not set; using fallback strategic advisor.")
        return fallback_strategic_advisor("OPENAI_API_KEY is not set")

    try:
        from openai import OpenAI

        client_kwargs: Dict[str, Any] = {"api_key": api_key}
        if os.environ.get("OPENAI_BASE_URL"):
            client_kwargs["base_url"] = os.environ["OPENAI_BASE_URL"]
        client = OpenAI(**client_kwargs)

        instructions, user_input = build_strategic_advisor_prompt(report, context_snapshot)
        model = os.environ.get("STRATEGY_MODEL") or os.environ.get("REPORT_MODEL", DEFAULT_REPORT_MODEL)
        effort = os.environ.get("STRATEGY_REASONING_EFFORT") or os.environ.get(
            "REPORT_REASONING_EFFORT",
            DEFAULT_REPORT_REASONING_EFFORT,
        )
        verbosity = os.environ.get("STRATEGY_VERBOSITY") or os.environ.get(
            "REPORT_VERBOSITY",
            DEFAULT_REPORT_VERBOSITY,
        )
        response = client.responses.create(
            model=model,
            instructions=instructions,
            input=user_input,
            reasoning={"effort": effort},
            text={
                "verbosity": verbosity,
                "format": {
                    "type": "json_schema",
                    "name": "developer_strategic_questions",
                    "schema": strategic_advisor_schema(),
                    "strict": True,
                },
            },
            max_output_tokens=int(os.environ.get("STRATEGY_MAX_OUTPUT_TOKENS", "7000")),
            timeout=float(os.environ.get("STRATEGY_TIMEOUT_SECONDS", os.environ.get("REPORT_TIMEOUT_SECONDS", "120"))),
        )
        strategic = parse_json_text(get_response_text(response))
        log.append(f"Strategic advisor completed with model={model}, verbosity={verbosity}.")
        return strategic
    except Exception as exc:  # noqa: BLE001
        log.append(f"Strategic advisor failed; using fallback: {type(exc).__name__}: {exc}")
        return fallback_strategic_advisor(f"strategic advisor failed: {type(exc).__name__}")


def attach_strategic_advisor_to_report(
    report: Dict[str, Any],
    strategic: Dict[str, Any],
) -> Dict[str, Any]:
    report["strategic_advisor"] = strategic
    addendum = str(strategic.get("narration_addendum") or "").strip()
    questions = strategic.get("questions") if isinstance(strategic.get("questions"), list) else []
    question_lines = []
    for index, item in enumerate(questions, start=1):
        if not isinstance(item, dict):
            continue
        question_lines.append(
            f"第 {index} 題，{item.get('question')} "
            f"這題重要是因為：{item.get('why_it_matters')} "
            f"你的答案會改變：{item.get('answer_would_change')}"
        )
    flow = strategic.get("recommended_next_conversation_flow") or []
    flow_text = "接下來的對話順序是：" + "；".join(str(item) for item in flow) if flow else ""
    script = "\n\n".join(part for part in [addendum, "\n\n".join(question_lines), flow_text] if part)
    if script:
        report.setdefault("chapters", [])
        report["chapters"].append({
            "title": strategic.get("advisor_title") or "Strategic Advisor Questions",
            "script": script,
        })
        report["narration_script"] = f"{report.get('narration_script', '').strip()}\n\n{script}".strip()
    return report


def rewrite_report_with_llm(
    context: Dict[str, Any],
    context_snapshot: str,
    log: List[str],
) -> Dict[str, Any]:
    """Use OpenAI Responses API to rewrite the briefing."""
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        log.append("OPENAI_API_KEY is not set; using fallback report without LLM.")
        return fallback_report(context, reason="OPENAI_API_KEY is not set")

    try:
        from openai import OpenAI

        client_kwargs: Dict[str, Any] = {"api_key": api_key}
        if os.environ.get("OPENAI_BASE_URL"):
            client_kwargs["base_url"] = os.environ["OPENAI_BASE_URL"]
        client = OpenAI(**client_kwargs)

        instructions, user_input = build_rewriter_prompt(context, context_snapshot)
        model = os.environ.get("REPORT_MODEL", DEFAULT_REPORT_MODEL)
        effort = os.environ.get("REPORT_REASONING_EFFORT", DEFAULT_REPORT_REASONING_EFFORT)
        verbosity = os.environ.get("REPORT_VERBOSITY", DEFAULT_REPORT_VERBOSITY)

        response = client.responses.create(
            model=model,
            instructions=instructions,
            input=user_input,
            reasoning={"effort": effort},
            text={
                "verbosity": verbosity,
                "format": {
                    "type": "json_schema",
                    "name": "developer_audio_briefing",
                    "schema": briefing_schema(),
                    "strict": True,
                },
            },
            max_output_tokens=int(os.environ.get("REPORT_MAX_OUTPUT_TOKENS", "9000")),
            timeout=float(os.environ.get("REPORT_TIMEOUT_SECONDS", "120")),
        )
        raw_text = get_response_text(response)
        report = parse_json_text(raw_text)
        log.append(f"LLM rewrite completed with model={model}, verbosity={verbosity}.")
        return validate_report_shape(report)
    except Exception as exc:  # noqa: BLE001
        log.append(f"LLM rewrite failed; using fallback report: {type(exc).__name__}: {exc}")
        return fallback_report(context, reason=f"LLM rewrite failed: {type(exc).__name__}")


def fallback_report(context: Dict[str, Any], reason: str) -> Dict[str, Any]:
    changed = context.get("changed_files") or []
    tests = context.get("test_hints") or []
    last = str(context.get("last_assistant_message") or "").strip()
    if not last:
        last = "這次 Codex hook 沒有提供 last_assistant_message，因此只能產生簡短失敗記錄。"

    changed_sentence = (
        "目前偵測到的變更檔案包含：" + "、".join(changed[:12]) + "。"
        if changed
        else "目前回報裡沒有提供明確的 changed files。"
    )
    tests_sentence = (
        "目前可抽取到的測試或驗證線索是：" + "；".join(tests[:8]) + "。"
        if tests
        else "目前回報裡沒有提供測試或驗證結果。"
    )
    script = (
        "這是一份由 fallback 流程產生的開發者語音簡報。"
        f"原因是：{reason}。\n\n"
        "先說結論：目前工具已保留 Codex 最後回報與本地 git context，但沒有成功使用高階 LLM 重新撰寫完整旁白稿。"
        "接下來請以文字報告為主，並把這份音訊視為保底交接。\n\n"
        f"Codex 最後回報如下：{last}\n\n"
        f"{changed_sentence}\n\n"
        f"{tests_sentence}\n\n"
        "如果這是正式工程任務，下一步建議重新檢查 API key、模型名稱、Responses API 權限，並確認 Stop hook 執行環境有正確繼承環境變數。"
    )
    return {
        "title": "Codex Developer Audio Briefing",
        "duration_target_minutes": 1 if "last_assistant_message" not in context or not context.get("last_assistant_message") else DEFAULT_DURATION_MINUTES,
        "executive_summary": "使用 fallback 產生簡報；完整 LLM 改寫未執行或失敗。",
        "narration_script": script,
        "chapters": [{"title": "Fallback Briefing", "script": script}],
        "technical_details": [
            f"fallback_reason: {reason}",
            changed_sentence,
            tests_sentence,
        ],
        "changed_files": [{"path": path, "summary": "偵測到變更，詳細語意目前回報裡沒有提供。"} for path in changed],
        "tests_and_verification": tests_sentence,
        "risks_or_followups": [
            "需要確認 OPENAI_API_KEY 是否在 hook 執行環境中可用。",
            "需要確認 REPORT_MODEL、TTS_MODEL、TTS_VOICE 是否為帳號可用模型與聲線。",
        ],
        "one_sentence_status": "已產生 fallback 開發者簡報，但未完成高階 LLM 改寫。",
    }


def chunk_text(text: str, max_chars: int = MAX_TTS_CHARS) -> List[str]:
    paragraphs = [p.strip() for p in re.split(r"\n{2,}", text) if p.strip()]
    chunks: List[str] = []
    current = ""
    for paragraph in paragraphs:
        if len(paragraph) > max_chars:
            if current:
                chunks.append(current.strip())
                current = ""
            sentences = re.split(r"(?<=[。！？.!?])\s*", paragraph)
            temp = ""
            for sentence in sentences:
                if not sentence:
                    continue
                if len(temp) + len(sentence) + 1 > max_chars and temp:
                    chunks.append(temp.strip())
                    temp = sentence
                else:
                    temp = f"{temp}\n{sentence}".strip()
            if temp:
                chunks.append(temp.strip())
            continue
        if len(current) + len(paragraph) + 2 > max_chars and current:
            chunks.append(current.strip())
            current = paragraph
        else:
            current = f"{current}\n\n{paragraph}".strip()
    if current:
        chunks.append(current.strip())
    return chunks or [text[:max_chars]]


def split_script_into_chapters(report: Dict[str, Any]) -> List[Dict[str, str]]:
    """Return TTS-ready chapter chunks."""
    chapters = report.get("chapters") if isinstance(report.get("chapters"), list) else []
    prepared: List[Dict[str, str]] = []

    source_chapters = chapters or [
        {
            "title": report.get("title") or "Developer Briefing",
            "script": report.get("narration_script") or "",
        }
    ]

    for index, chapter in enumerate(source_chapters, start=1):
        title = str(chapter.get("title") or f"Chapter {index}")
        script = str(chapter.get("script") or "").strip()
        if not script:
            continue
        chunks = chunk_text(script, MAX_TTS_CHARS)
        if len(chunks) == 1:
            prepared.append({"title": title, "script": chunks[0]})
        else:
            for sub_index, chunk in enumerate(chunks, start=1):
                prepared.append({"title": f"{title} Part {sub_index}", "script": chunk})
    if not prepared:
        fallback = str(report.get("narration_script") or report.get("executive_summary") or "目前回報裡沒有提供。")
        prepared.append({"title": "Developer Briefing", "script": fallback[:MAX_TTS_CHARS]})
    return prepared


def synthesize_speech(
    report: Dict[str, Any],
    audio_dir: Path,
    log: List[str],
) -> List[Path]:
    """Generate chapter audio files through OpenAI Audio Speech API."""
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        log.append("OPENAI_API_KEY is not set; skipping TTS.")
        return []

    try:
        from openai import OpenAI

        client_kwargs: Dict[str, Any] = {"api_key": api_key}
        if os.environ.get("OPENAI_BASE_URL"):
            client_kwargs["base_url"] = os.environ["OPENAI_BASE_URL"]
        client = OpenAI(**client_kwargs)
    except Exception as exc:  # noqa: BLE001
        log.append(f"Failed to initialize OpenAI client for TTS: {type(exc).__name__}: {exc}")
        return []

    audio_dir.mkdir(parents=True, exist_ok=True)
    model = os.environ.get("TTS_MODEL", DEFAULT_TTS_MODEL)
    voice = os.environ.get("TTS_VOICE", DEFAULT_TTS_VOICE)
    audio_format = os.environ.get("TTS_FORMAT", DEFAULT_TTS_FORMAT).lstrip(".")
    chapters = split_script_into_chapters(report)
    audio_paths: List[Path] = []

    for index, chapter in enumerate(chapters, start=1):
        output_path = audio_dir / f"chapter-{index:02d}.{audio_format}"
        title = chapter.get("title") or f"Chapter {index}"
        text = f"{title}。\n\n{chapter.get('script', '')}".strip()
        try:
            response = client.audio.speech.create(
                model=model,
                voice=voice,
                input=text,
                instructions=TTS_INSTRUCTIONS,
                response_format=audio_format,
                timeout=float(os.environ.get("TTS_TIMEOUT_SECONDS", "120")),
            )
            if hasattr(response, "write_to_file"):
                response.write_to_file(str(output_path))
            else:
                content = getattr(response, "content", None)
                if content is None and hasattr(response, "read"):
                    content = response.read()
                if content is None:
                    raise RuntimeError("speech response did not expose audio bytes")
                output_path.write_bytes(content)
            audio_paths.append(output_path)
            log.append(f"TTS generated {output_path.name} with model={model}, voice={voice}.")
        except Exception as exc:  # noqa: BLE001
            log.append(f"TTS failed for chapter {index}: {type(exc).__name__}: {exc}")
    return audio_paths


def merge_audio_if_possible(audio_paths: List[Path], output_dir: Path, log: List[str]) -> Optional[Path]:
    """Merge chapter MP3s with ffmpeg when available; otherwise write playlist."""
    if not audio_paths:
        log.append("No audio chapters generated; merge skipped.")
        return None

    audio_format = audio_paths[0].suffix.lstrip(".") or DEFAULT_TTS_FORMAT
    merged = output_dir / "audio" / f"developer-briefing.{audio_format}"
    playlist = output_dir / "playlist.m3u"
    playlist.write_text(
        "#EXTM3U\n" + "\n".join(f"audio/{path.name}" for path in audio_paths) + "\n",
        encoding="utf-8",
    )

    if len(audio_paths) == 1:
        try:
            shutil.copyfile(audio_paths[0], merged)
            log.append(f"Single chapter copied to {merged.name}.")
            return merged
        except Exception as exc:  # noqa: BLE001
            log.append(f"Failed to copy single chapter to merged file: {type(exc).__name__}: {exc}")
            return None

    ffmpeg = shutil.which("ffmpeg")
    if not ffmpeg:
        log.append("ffmpeg not found; keeping chapter files and playlist.m3u.")
        return None

    try:
        with tempfile.NamedTemporaryFile("w", suffix=".txt", delete=False, encoding="utf-8") as handle:
            list_path = Path(handle.name)
            for path in audio_paths:
                handle.write(f"file '{path.resolve()}'\n")
        code, out, err = safe_run(
            [
                ffmpeg,
                "-y",
                "-hide_banner",
                "-loglevel",
                "error",
                "-f",
                "concat",
                "-safe",
                "0",
                "-i",
                str(list_path),
                "-c",
                "copy",
                str(merged),
            ],
            output_dir,
            timeout=120,
        )
        try:
            list_path.unlink(missing_ok=True)
        except Exception:
            pass
        if code == 0 and merged.exists():
            log.append(f"Merged audio saved to {merged.name}.")
            return merged
        log.append(f"ffmpeg merge failed: {out} {err}".strip())
        return None
    except Exception as exc:  # noqa: BLE001
        log.append(f"Audio merge failed: {type(exc).__name__}: {exc}")
        return None


def report_to_markdown(report: Dict[str, Any]) -> str:
    changed = report.get("changed_files") or []
    chapters = report.get("chapters") or []
    details = report.get("technical_details") or []
    risks = report.get("risks_or_followups") or []
    strategic = report.get("strategic_advisor") if isinstance(report.get("strategic_advisor"), dict) else {}

    lines = [
        f"# {report.get('title') or 'Developer Audio Briefing'}",
        "",
        f"**One sentence status:** {report.get('one_sentence_status') or '目前回報裡沒有提供。'}",
        "",
        f"**Duration target:** {report.get('duration_target_minutes') or DEFAULT_DURATION_MINUTES} minutes",
        "",
        "## Executive Summary",
        "",
        str(report.get("executive_summary") or "目前回報裡沒有提供。"),
        "",
        "## Narration Script",
        "",
        str(report.get("narration_script") or "目前回報裡沒有提供。"),
        "",
        "## Chapters",
        "",
    ]
    if chapters:
        for chapter in chapters:
            lines.extend([
                f"### {chapter.get('title') or 'Untitled'}",
                "",
                str(chapter.get("script") or "目前回報裡沒有提供。"),
                "",
            ])
    else:
        lines.append("目前回報裡沒有提供。")

    lines.extend(["## Technical Details", ""])
    lines.extend([f"- {item}" for item in details] or ["目前回報裡沒有提供。"])
    lines.extend(["", "## Changed Files", ""])
    if changed:
        for item in changed:
            if isinstance(item, dict):
                lines.append(f"- `{item.get('path')}`: {item.get('summary')}")
            else:
                lines.append(f"- {item}")
    else:
        lines.append("目前回報裡沒有提供。")
    lines.extend(["", "## Tests And Verification", ""])
    lines.append(str(report.get("tests_and_verification") or "目前回報裡沒有提供。"))
    lines.extend(["", "## Risks Or Followups", ""])
    lines.extend([f"- {item}" for item in risks] or ["目前回報裡沒有提供。"])
    if strategic:
        lines.extend([
            "",
            "## Strategic Advisor",
            "",
            f"### {strategic.get('advisor_title') or 'Strategic Advisor Questions'}",
            "",
            str(strategic.get("strategic_brief") or "目前回報裡沒有提供。"),
            "",
            "### Key Unknowns",
            "",
        ])
        lines.extend([f"- {item}" for item in strategic.get("key_unknowns", [])] or ["目前回報裡沒有提供。"])
        lines.extend(["", "### Questions", ""])
        questions = strategic.get("questions") if isinstance(strategic.get("questions"), list) else []
        if questions:
            for index, item in enumerate(questions, start=1):
                if not isinstance(item, dict):
                    continue
                lines.extend([
                    f"{index}. **{item.get('theme') or 'Question'}**",
                    f"   - 問題：{item.get('question')}",
                    f"   - 為什麼重要：{item.get('why_it_matters')}",
                    f"   - 會改變什麼：{item.get('answer_would_change')}",
                ])
        else:
            lines.append("目前回報裡沒有提供。")
        lines.extend(["", "### Recommended Next Conversation Flow", ""])
        lines.extend([
            f"- {item}" for item in strategic.get("recommended_next_conversation_flow", [])
        ] or ["目前回報裡沒有提供。"])
        lines.extend([
            "",
            "### One Sentence Prompt To User",
            "",
            str(strategic.get("one_sentence_prompt_to_user") or "目前回報裡沒有提供。"),
        ])
    lines.append("")
    return "\n".join(lines)


def write_outputs(
    output_dir: Path,
    payload: Dict[str, Any],
    context_snapshot: str,
    report: Dict[str, Any],
    log: List[str],
) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)
    (output_dir / "raw_hook_payload.json").write_text(
        json.dumps(payload, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    (output_dir / "context_snapshot.md").write_text(context_snapshot, encoding="utf-8")
    (output_dir / "narrated_report.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    (output_dir / "narrated_report.md").write_text(report_to_markdown(report), encoding="utf-8")
    (output_dir / "run.log").write_text("\n".join(log) + "\n", encoding="utf-8")


def default_report_mirror_root() -> Optional[Path]:
    if os.environ.get("CODEX_AUDIO_DISABLE_ICLOUD_MIRROR") == "1":
        return None
    configured = os.environ.get("CODEX_AUDIO_REPORT_MIRROR_DIR")
    if configured:
        return Path(configured).expanduser()
    return Path.home() / "Library" / "Mobile Documents" / "com~apple~CloudDocs" / "codex_report"


def mirror_output_dir(output_dir: Path, log: List[str]) -> Optional[Path]:
    root = default_report_mirror_root()
    if not root:
        log.append("iCloud/report mirror disabled.")
        return None
    try:
        root.mkdir(parents=True, exist_ok=True)
        destination = root / output_dir.name
        if destination.exists():
            shutil.rmtree(destination)
        shutil.copytree(output_dir, destination)
        log.append(f"Mirrored audio report to {destination}.")
        try:
            (destination / "run.log").write_text("\n".join(log) + "\n", encoding="utf-8")
        except Exception:
            pass
        return destination
    except Exception as exc:  # noqa: BLE001
        log.append(f"Failed to mirror audio report: {type(exc).__name__}: {exc}")
        return None


def final_stdout(
    output_dir: Path,
    merged_audio: Optional[Path],
    audio_paths: List[Path],
    mirror_dir: Optional[Path] = None,
) -> None:
    message = f"Developer audio briefing saved to {output_dir}"
    if merged_audio:
        message += f" ({merged_audio.name})"
    elif audio_paths:
        message += " (chapter audio files generated)"
    else:
        message += " (no audio generated; see run.log)"
    if mirror_dir:
        message += f"; mirrored to {mirror_dir}"
    print(
        json.dumps(
            {
                "continue": True,
                "systemMessage": message,
                "audioReportPath": str(output_dir),
                "audioFile": str(merged_audio) if merged_audio else None,
                "mirrorPath": str(mirror_dir) if mirror_dir else None,
            },
            ensure_ascii=False,
        )
    )


def main() -> None:
    payload = read_hook_payload()
    cwd = Path(str(payload.get("cwd") or os.getcwd())).expanduser().resolve()
    turn = short_id(payload.get("turn_id") or payload.get("session_id"))
    output_dir = cwd / ".codex" / "audio-reports" / f"{now_stamp()}-{turn}"
    log: List[str] = []
    merged_audio: Optional[Path] = None
    audio_paths: List[Path] = []
    mirror_dir: Optional[Path] = None

    try:
        output_dir.mkdir(parents=True, exist_ok=True)
        log.append(f"Started developer audio briefing in {output_dir}.")
        if payload.get("_read_error"):
            log.append(str(payload["_read_error"]))

        context = collect_context(payload)
        context_snapshot = context_to_markdown(context)
        last_message = str(payload.get("last_assistant_message") or "").strip()

        if not last_message:
            log.append("last_assistant_message is empty; skipping expensive LLM rewrite.")
            report = fallback_report(context, reason="last_assistant_message was empty")
            strategic = fallback_strategic_advisor("last_assistant_message was empty")
        else:
            report = rewrite_report_with_llm(context, context_snapshot, log)
            strategic = generate_strategic_questions_with_llm(report, context_snapshot, log)
        report = attach_strategic_advisor_to_report(report, strategic)

        write_outputs(output_dir, payload, context_snapshot, report, log)

        audio_dir = output_dir / "audio"
        audio_paths = synthesize_speech(report, audio_dir, log)
        merged_audio = merge_audio_if_possible(audio_paths, output_dir, log)

        # Re-write outputs after audio/merge log entries.
        write_outputs(output_dir, payload, context_snapshot, report, log)
        mirror_dir = mirror_output_dir(output_dir, log)
        write_outputs(output_dir, payload, context_snapshot, report, log)
        final_stdout(output_dir, merged_audio, audio_paths, mirror_dir)
    except Exception as exc:  # noqa: BLE001 - Stop hook must not block Codex.
        log.append(f"Fatal hook failure recovered: {type(exc).__name__}: {exc}")
        try:
            output_dir.mkdir(parents=True, exist_ok=True)
            (output_dir / "run.log").write_text("\n".join(log) + "\n", encoding="utf-8")
        except Exception:
            pass
        print(
            json.dumps(
                {
                    "continue": True,
                    "systemMessage": f"Developer audio briefing hook recovered from failure; see {output_dir}",
                    "audioReportPath": str(output_dir),
                    "audioFile": None,
                },
                ensure_ascii=False,
            )
        )


if __name__ == "__main__":
    main()
