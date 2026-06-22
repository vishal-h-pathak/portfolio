#!/usr/bin/env python3
"""Render a Claude Code stream-json (JSONL) log into readable text.

Used by `cockpit.sh peekv <name>` to turn the verbose `--output-format stream-json`
output of a delegated box session into a human-readable play-by-play. Tolerant by
design: any line that isn't valid JSON (or an unknown event shape) is passed through
raw, so a schema drift degrades to "still shows something" rather than crashing.

Event shapes seen live on the sentry box (claude 2.1.x, --print --verbose stream-json):
  - system   {subtype:"init", ...}            → [system:init]
  - assistant{message:{content:[...]}}         → text / thinking / tool_use blocks
  - user     {message:{content:[tool_result]}} → tool results (← ...)
  - rate_limit_event {rate_limit_info:{status}} → suppressed when "allowed"; ⚠ otherwise
  - result   {subtype:"success", result}       → ===== FINAL =====
Content-block types handled: text, thinking, tool_use, tool_result.
"""
import json
import sys


def _compact(x, n=300):
    s = x if isinstance(x, str) else json.dumps(x, ensure_ascii=False)
    s = " ".join(s.split())
    return s if len(s) <= n else s[:n] + " …"


def _texts(content):
    return "\n".join(
        b.get("text", "") for b in (content or [])
        if isinstance(b, dict) and b.get("type") == "text" and b.get("text", "").strip()
    )


def main():
    path = sys.argv[1] if len(sys.argv) > 1 else None
    fh = open(path, encoding="utf-8", errors="replace") if path else sys.stdin
    for line in fh:
        line = line.strip()
        if not line:
            continue
        try:
            o = json.loads(line)
        except Exception:
            print(line)
            continue
        typ = o.get("type")
        if typ == "system":
            print(f"[system:{o.get('subtype', '')}]")
        elif typ == "assistant":
            for b in o.get("message", {}).get("content", []):
                bt = b.get("type")
                if bt == "text" and b.get("text", "").strip():
                    print(b["text"].strip())
                elif bt == "thinking":
                    # Interleaved-thinking block: {type, thinking, signature}. The text lives in
                    # "thinking" (redacted/signature-only blocks carry an empty string — skip those).
                    th = (b.get("thinking") or "").strip()
                    if th:
                        print(f"  · (thinking) {_compact(th, 200)}")
                elif bt == "tool_use":
                    inp = b.get("input", {}) or {}
                    key = next((k for k in ("command", "file_path", "path", "pattern", "prompt", "url") if k in inp), None)
                    arg = _compact(inp.get(key, ""), 160) if key else _compact(inp, 120)
                    print(f"  → {b.get('name', '?')}: {arg}")
        elif typ == "user":
            for b in o.get("message", {}).get("content", []):
                if b.get("type") == "tool_result":
                    c = b.get("content")
                    if isinstance(c, list):
                        c = _texts(c)
                    print(f"  ← {_compact(c, 200)}")
        elif typ == "rate_limit_event":
            # {type, rate_limit_info:{status, rateLimitType, ...}}. status "allowed" is the routine
            # per-turn heartbeat — pure noise in a play-by-play, so suppress it; only surface a
            # throttled/rejected state (the only one worth a human's attention).
            info = o.get("rate_limit_info", {}) or {}
            st = info.get("status", "?")
            if st != "allowed":
                kind = info.get("rateLimitType", "")
                print(f"  ⚠ [rate-limit:{st}{(' ' + kind) if kind else ''}]")
        elif typ == "result":
            print("\n===== FINAL =====")
            print(o.get("result") or _compact(o, 500))
        else:
            print(_compact(o, 200))


if __name__ == "__main__":
    main()
