#!/usr/bin/env python3
"""Build an anonymized, clustered relationship knowledge base.

The script uses only the Python standard library so it can run in a clean
research environment. It does not create or train a foundation model.
"""

from __future__ import annotations

import csv
import hashlib
import json
import math
import re
from collections import Counter, OrderedDict, defaultdict
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CPED_PATH = ROOT / "work/cped/valid_split.csv"
SYNTHETIC_PATH = ROOT / "data-pipeline/synthetic_cases.json"
OUTPUT_PATH = ROOT / "public/knowledge/cases.json"

DIMENSIONS = 192
CLUSTER_COUNT = 8
PER_CLUSTER = 10
STOPWORDS = {
    "这个", "那个", "什么", "怎么", "可以", "就是", "然后", "没有", "不是",
    "我们", "你们", "他们", "自己", "真的", "还是", "一下", "知道", "觉得",
}

EMOTION_MAP = {
    "neutral": "neutral",
    "positive-other": "good",
    "negative-other": "sadness",
    "happy": "joy",
    "relaxed": "joy",
    "grateful": "joy",
    "sadness": "sadness",
    "depress": "sadness",
    "anger": "anger",
    "fear": "fear",
    "worried": "fear",
    "disgust": "disgust",
    "astonished": "surprise",
}

PATTERN_RULES = [
    ("control", re.compile(r"定位|查手机|不许|必须|删掉|报备|只能")),
    ("repair", re.compile(r"抱歉|对不起|理解|说清楚|以后会|不是故意")),
    ("reassurance", re.compile(r"你是不是不喜欢|你还喜欢|会不会离开|别不理我|怎么不回")),
    ("closeness", re.compile(r"想你|想见你|喜欢你|抱抱|陪你|照顾你")),
    ("withdrawal", re.compile(r"不想聊|想安静|算了|随便|低电量|晚点再说")),
    ("conflict", re.compile(r"生气|失望|不开心|烦|吵|委屈|讨厌")),
    ("support", re.compile(r"辛苦|难过|别怕|休息|慢慢来|理解你|陪你")),
]

PATTERN_TAKEAWAY = {
    "control": "控制不应被浪漫化。优先确认边界和拒绝后的反应。",
    "repair": "修复是否有意义要看后续行动和重复率，不只看道歉。",
    "reassurance": "反复确认关系容易放大焦虑，直接沟通投入程度更有效。",
    "closeness": "亲密表达可以作为靠近信号，但仍需行动和双向投入验证。",
    "withdrawal": "短回复可能来自低能量或话题结束，先看个人基线和后续恢复。",
    "conflict": "冲突本身不等于关系差，关键在于解释、尊重和修复。",
    "support": "能接住情绪是积极互动线索，但需要观察是否双向。",
    "neutral": "当前更像日常信息交换，先寻找更具体的关系信号。",
}

CLUSTER_LABELS = {
    0: "日常信息交换",
    1: "低落与压力陪伴",
    2: "冲突和负面情绪",
    3: "计划、请求与协商",
    4: "轻松分享",
    5: "安慰和支持",
    6: "疑问与关系确认",
    7: "混合情绪情境",
}


def redact(text: str) -> str:
    text = text.strip()
    text = re.sub(r"https?://\S+|www\.\S+", "[链接]", text, flags=re.I)
    text = re.sub(r"\b1[3-9]\d{9}\b", "[电话]", text)
    text = re.sub(r"[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}", "[邮箱]", text)
    text = re.sub(r"@[\w\u4e00-\u9fff-]{2,30}", "[账号]", text)
    text = re.sub(r"\b\d{8,}\b", "[编号]", text)
    return re.sub(r"\s+", " ", text).strip()[:240]


def tokens(text: str) -> list[str]:
    chars = re.findall(r"[\u4e00-\u9fff]|[A-Za-z]{2,}", text.lower())
    result = []
    for index, char in enumerate(chars):
        if len(char) >= 2:
            result.append(char)
        elif char not in STOPWORDS:
            result.append(char)
        if index + 1 < len(chars):
            bigram = char + chars[index + 1]
            if len(bigram) == 2 and bigram not in STOPWORDS:
                result.append(bigram)
    return result


def stable_hash(value: str) -> int:
    return int(hashlib.sha1(value.encode("utf-8")).hexdigest()[:12], 16)


def vectorize(text: str) -> list[float]:
    vector = [0.0] * DIMENSIONS
    for token, count in Counter(tokens(text)).items():
        vector[stable_hash(token) % DIMENSIONS] += 1 + math.log(count)
    norm = math.sqrt(sum(value * value for value in vector)) or 1
    return [value / norm for value in vector]


def distance(left: list[float], right: list[float]) -> float:
    return math.sqrt(sum((a - b) ** 2 for a, b in zip(left, right)))


def derive_pattern(text: str, emotions: list[str]) -> str:
    for name, regex in PATTERN_RULES:
        if regex.search(text):
            return name
    if "anger" in emotions or "sadness" in emotions:
        return "conflict"
    return "neutral"


def load_cped() -> list[dict]:
    dialogues: OrderedDict[str, list[dict]] = OrderedDict()
    with CPED_PATH.open(encoding="utf-8-sig", newline="") as handle:
        for row in csv.DictReader(handle):
            dialogue_id = row["Dialogue_ID"]
            dialogues.setdefault(dialogue_id, []).append(row)

    cases = []
    for dialogue_id, rows in dialogues.items():
        rows.sort(key=lambda row: row["Utterance_ID"])
        speaker_names = []
        turns = []
        raw_emotions = []
        sentiments = []
        for row in rows[:10]:
            text = redact(row["Utterance"])
            if not text:
                continue
            name = row["Speaker"]
            if name not in speaker_names:
                speaker_names.append(name)
            speaker = "A" if speaker_names.index(name) == 0 else "B"
            turns.append({"speaker": speaker, "text": text})
            raw_emotions.append(row["Emotion"])
            sentiments.append(row["Sentiment"])
        if len(turns) < 2:
            continue
        emotions = list(dict.fromkeys(EMOTION_MAP.get(value, "neutral") for value in raw_emotions))
        full_text = "\n".join(turn["text"] for turn in turns)
        pattern = derive_pattern(full_text, emotions)
        scene = rows[0].get("Scene", "other")
        cases.append(
            {
                "id": "cped-" + hashlib.sha1(dialogue_id.encode()).hexdigest()[:12],
                "source": "cped",
                "license": "Apache-2.0",
                "title": f"CPED · {scene} · {pattern}",
                "scene": scene,
                "pattern": pattern,
                "situation": f"一段发生在 {scene} 场景中的匿名情绪对话。",
                "takeaway": PATTERN_TAKEAWAY[pattern],
                "emotions": emotions[:4],
                "sentiment": Counter(sentiments).most_common(1)[0][0],
                "signals": [pattern] if pattern in {"withdrawal", "repair", "control", "closeness", "reassurance"} else [],
                "dialogue": turns,
                "text": full_text,
            }
        )
    return cases


def cluster(cases: list[dict]) -> None:
    if not cases:
        return
    vectors = [vectorize(case["text"]) for case in cases]
    k = min(CLUSTER_COUNT, len(cases))
    centers = [vectors[round(index * (len(vectors) - 1) / max(1, k - 1))][:] for index in range(k)]
    assignments = [0] * len(cases)
    for _ in range(24):
        next_assignments = [
            min(range(k), key=lambda index: distance(vector, centers[index]))
            for vector in vectors
        ]
        if next_assignments == assignments:
            break
        assignments = next_assignments
        for index in range(k):
            members = [vectors[pos] for pos, value in enumerate(assignments) if value == index]
            if members:
                centers[index] = [
                    sum(member[dim] for member in members) / len(members)
                    for dim in range(DIMENSIONS)
                ]
    for case, vector, cluster_id in zip(cases, vectors, assignments):
        case["_vector"] = vector
        case["clusterId"] = cluster_id
        case["clusterLabel"] = CLUSTER_LABELS.get(cluster_id, "情绪互动混合")

    selected = []
    for cluster_id in range(k):
        members = [
            (case, distance(case["_vector"], centers[cluster_id]))
            for case in cases
            if case["clusterId"] == cluster_id
        ]
        members.sort(key=lambda item: item[1])
        selected.extend(case for case, _ in members[:PER_CLUSTER])
    cases[:] = selected


def build() -> None:
    cped = load_cped()
    cluster(cped)
    synthetic = json.loads(SYNTHETIC_PATH.read_text(encoding="utf-8"))
    for item in synthetic:
        item.update(
            {
                "source": "letsdate-synthetic",
                "license": "CC0-1.0",
                "scene": "dating",
                "clusterId": -1,
                "clusterLabel": "dating-specific",
                "sentiment": "mixed",
                "signals": item.get("signals", []),
                "searchTerms": [
                    item.get("pattern", ""),
                    "dating",
                    *item.get("emotions", []),
                    *item.get("signals", []),
                ],
            }
        )
    clean_cped = []
    for case in cped:
        clean = {
            key: value
            for key, value in case.items()
            if key not in {"_vector", "text", "dialogue"}
        }
        clean["dialogue"] = []
        clean["searchTerms"] = [
            case["pattern"],
            case["scene"],
            *case["emotions"],
        ]
        clean_cped.append(clean)
    all_cases = clean_cped + synthetic
    cluster_counts = Counter(case["clusterLabel"] for case in all_cases)
    payload = {
        "version": "1.0.0",
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "caseCount": len(all_cases),
        "syntheticCount": len(synthetic),
        "sourceCounts": Counter(case["source"] for case in all_cases),
        "clusters": [
            {"label": label, "count": count}
            for label, count in sorted(cluster_counts.items(), key=lambda item: (-item[1], item[0]))
        ],
        "manifest": {
            "cpedVersion": "valid_split",
            "cpedLicense": "Apache-2.0",
            "cpedRows": 11137,
            "cpedDialogues": 934,
            "syntheticLicense": "CC0-1.0",
            "embedding": "unsupervised hashed TF-IDF",
            "clustering": "deterministic k-means",
        },
        "cases": all_cases,
    }
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(
        json.dumps(payload, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )
    print(
        json.dumps(
            {
                "output": str(OUTPUT_PATH),
                "bytes": OUTPUT_PATH.stat().st_size,
                "cases": len(all_cases),
                "clusters": payload["clusters"],
            },
            ensure_ascii=False,
            indent=2,
        )
    )


if __name__ == "__main__":
    build()
