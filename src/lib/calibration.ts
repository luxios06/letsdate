import type {
  AnalysisInput,
  AnalysisReport,
  Confidence,
  Decision,
  MessageOption,
  ScoreCalibration,
} from "../types";
import { parseConversation } from "./conversation";

const clamp = (value: number, min = 0, max = 100) =>
  Math.min(max, Math.max(min, Math.round(value)));

const countMatches = (text: string, expression: RegExp) =>
  (text.match(expression) ?? []).length;

export interface ConversationStats {
  materialLength: number;
  totalTurns: number;
  selfTurns: number;
  otherTurns: number;
  reciprocalTurns: number;
  questionCount: number;
  warmSignals: number;
  coldSignals: number;
  repairSignals: number;
  boundarySignals: number;
  sourceCount: number;
  evidenceMessages: number;
}

export function conversationStats(input: AnalysisInput): ConversationStats {
  const text = `${input.selfProfile}\n${input.otherProfile}\n${input.chat}`;
  const parsed = parseConversation(input.chat);
  const selfTurns = parsed.messages.filter(
    (message) => message.sender === "self",
  ).length;
  const otherTurns = parsed.messages.filter(
    (message) => message.sender === "other",
  ).length;
  const questionCount = parsed.messages.filter(
    (message) => message.kind === "question",
  ).length;
  const warmSignals = countMatches(
    input.chat,
    /哈哈|😂|😊|一起|周末|有空|见面|约|期待|晚安|早安|怎么样|你呢|你也|成交|验收|想见你|谢谢|重要/g,
  );
  const coldSignals = countMatches(
    input.chat,
    /下次吧|不太方便|算了|随便|不想聊|没空|拒绝|别催|不想说/g,
  );
  const repairSignals = countMatches(
    input.chat,
    /抱歉|理解|直接说|提前告诉|提前讲|沟通|谢谢|重要|听你|可以接受/g,
  );
  const boundarySignals = countMatches(
    input.chat,
    /需要|空间|提前|安静|不催|不喜欢|可以接受|不方便/g,
  );
  const sourceCount =
    1 +
    (input.selfProfile.trim().length >= 20 ? 1 : 0) +
    (input.otherProfile.trim().length >= 20 ? 1 : 0);
  return {
    materialLength: text.replace(/\s/g, "").length,
    totalTurns: selfTurns + otherTurns,
    selfTurns,
    otherTurns,
    reciprocalTurns: Math.min(selfTurns, otherTurns),
    questionCount,
    warmSignals,
    coldSignals,
    repairSignals,
    boundarySignals,
    sourceCount,
    evidenceMessages: Math.min(otherTurns, 24),
  };
}

export function confidenceForStats(stats: ConversationStats): Confidence {
  if (
    stats.materialLength >= 700 &&
    stats.otherTurns >= 12 &&
    stats.questionCount >= 4 &&
    stats.sourceCount >= 2
  ) {
    return "较高";
  }
  if (
    stats.materialLength >= 180 &&
    stats.reciprocalTurns >= 3 &&
    stats.otherTurns >= 4
  ) {
    return "中";
  }
  return "低";
}

export function scoreCapForConfidence(confidence: Confidence): number {
  if (confidence === "较高") return 94;
  if (confidence === "中") return 86;
  return 70;
}

export function decisionFromScore(score: number): Decision {
  if (score >= 78) return "继续推进";
  if (score >= 62) return "适度推进";
  if (score >= 45) return "先观察";
  return "暂缓推进";
}

export function scoreCalibration(
  input: AnalysisInput,
  confidence: Confidence,
): ScoreCalibration {
  const stats = conversationStats(input);
  const sampleFactor = Math.min(1, Math.sqrt(stats.evidenceMessages / 10));
  const diversityFactor = Math.min(
    1,
    0.55 +
      (stats.sourceCount - 1) * 0.18 +
      (stats.questionCount >= 2 ? 0.12 : 0),
  );
  const reliability = Number(
    Math.min(0.96, Math.max(0.2, 0.2 + 0.8 * sampleFactor * diversityFactor)).toFixed(2),
  );
  const notes = [
    `对方有效消息 ${stats.otherTurns} 条，双向回合 ${stats.reciprocalTurns} 组。`,
    stats.otherTurns < 4
      ? "样本较短，分数向中性区间收缩。"
      : "分数按样本量和双向证据强度收缩，不代表关系成功概率。",
  ];
  if (stats.coldSignals > stats.warmSignals) {
    notes.push("收缩性表达多于积极表达，推进分数受到限制。");
  }
  if (stats.repairSignals >= 2) {
    notes.push("材料中存在澄清、道歉或修复线索，互动韧性较好。");
  }
  return {
    evidenceMessages: stats.evidenceMessages,
    reciprocalTurns: stats.reciprocalTurns,
    questionCount: stats.questionCount,
    sourceCount: stats.sourceCount,
    reliability,
    scoreCap: scoreCapForConfidence(confidence),
    method: "向 50 分收缩并按材料充分性设置上限",
    notes,
  };
}

export function calibrateScore(rawScore: number, calibration: ScoreCalibration): number {
  const shrunk = 50 + (clamp(rawScore) - 50) * calibration.reliability;
  return clamp(Math.min(calibration.scoreCap, shrunk));
}

export function extractContextTerms(input: AnalysisInput) {
  const text = `${input.selfProfile}\n${input.otherProfile}\n${input.chat}`;
  const candidates = [
    "咖喱",
    "小店",
    "看展",
    "摄影",
    "夜跑",
    "羽毛球",
    "做饭",
    "陶艺",
    "livehouse",
    "爬山",
    "电影",
    "散步",
    "咖啡",
  ];
  const topics = candidates.filter((term) => text.toLowerCase().includes(term.toLowerCase()));
  const parsed = parseConversation(input.chat);
  const day = parsed.planState.day;
  const time = parsed.planState.time;
  const venue = parsed.planState.venue;
  const confirmedPlan = parsed.planState.status === "confirmed";
  const explicitMeet = parsed.planState.status !== "none";
  return { topics, day, time, venue, confirmedPlan, explicitMeet };
}

export function buildMessageOptions(
  input: AnalysisInput,
  interestScore: number,
): MessageOption[] {
  const { topics, day, time, venue, confirmedPlan, explicitMeet } =
    extractContextTerms(input);
  const activity = topics.includes("咖喱")
    ? "找家小店吃饭，顺便验收一下你的咖喱"
    : topics.length >= 2
      ? `一起规划一次${topics[0]}和${topics[1]}`
      : topics.length === 1
        ? `一起${topics[0]}`
        : "找个轻松的地方见面";
  const confirmation = day ? `等${day}你确认后` : "等你确定时间后";

  if (interestScore < 50) {
    return [
      {
        tone: "先观察",
        text: "这次先聊到这儿，你按自己的节奏来，等方便的时候再继续就好。",
      },
      {
        tone: "直接确认",
        text: "我想确认一下，你最近是暂时比较忙，还是暂时不想继续聊？直接说就好。",
      },
      {
        tone: "轻松一点",
        text: "没关系，你先忙自己的事。等你哪天想起我了再出现。",
      },
    ];
  }

  if (confirmedPlan) {
    const when = `${day}${time}`.trim() || "到时候";
    const place = venue ? `在${venue}` : "";
    const curry =
      topics.includes("咖喱")
        ? "之后接受小店盲盒和咖喱验收"
        : "之后按你查好的安排走";
    const lightTail = topics.includes("咖喱")
      ? "，压力别给咖喱太大哈哈"
      : topics.includes("小店")
        ? "，顺便看看小店盲盒"
        : "";
    return [
      {
        tone: "留空间",
        text: `好，那${when}${place}见。路线我提前看一下，到了联系。`,
      },
      {
        tone: "直接确认",
        text: `确认一下，${when}${place}见，${curry}。`,
      },
      {
        tone: "轻松一点",
        text: `那就${when}见。看完展再去${topics.includes("小店") ? "小店" : "吃点东西"}${lightTail}。`,
      },
    ];
  }

  if (!explicitMeet) {
    return [
      {
        tone: "留空间",
        text:
          topics.length > 0
            ? `你前面提到的${topics[0]}还挺有意思。等你有空可以继续聊聊，我也想知道你最近有什么新发现。`
            : "这次聊天挺有意思。等你有空再继续，也想知道你最近有什么新发现。",
      },
      {
        tone: "直接一点",
        text:
          topics.length > 0
            ? `我对你提到的${topics[0]}挺感兴趣，后面有空可以多聊聊。`
            : "和你聊天挺舒服，后面有空可以继续聊。",
      },
      {
        tone: "轻松接话",
        text: "先记下这个共同话题，等下次聊天继续展开。",
      },
    ];
  }

  const curryTail = topics.includes("咖喱") ? "，你负责别再弄乱厨房哈哈" : "";
  return [
    {
      tone: "留空间",
      text: `你先按自己的安排来，${confirmation}告诉我。如果时间合适，我们可以${activity}；不方便也没关系，下次再找机会。`,
    },
    {
      tone: "直接确认",
      text: `我想确认一下，${day || "这周"}时间定了的话，要不要把“${activity}”安排上？`,
    },
    {
      tone: "轻松一点",
      text: `${day ? `${day}见分晓。` : ""}时间定了就${activity}${curryTail}。`,
    },
  ];
}

export function buildSafetyMessageOptions(): MessageOption[] {
  return [
    {
      tone: "明确边界",
      text: "我需要保留自己的隐私和正常社交。查手机、持续定位这类要求我不能接受。",
    },
    {
      tone: "留出协商",
      text: "可以商量双方都能接受的沟通方式，但不能用“爱我”来要求我交出隐私或切断朋友联系。",
    },
    {
      tone: "暂停推进",
      text: "这件事让我不舒服，我们先停一下。等你愿意尊重我的边界，再继续沟通。",
    },
  ];
}

export function calibrateModelReport(
  report: AnalysisReport,
  input: AnalysisInput,
): AnalysisReport {
  const stats = conversationStats(input);
  const confidence = confidenceForStats(stats);
  const calibration = scoreCalibration(input, confidence);
  const cap = calibration.scoreCap;
  const bounded = (value: number) => clamp(Math.min(value, cap));
  const validEvidenceIds = new Set(report.evidence.map((item) => item.id));
  const checkedIds = (ids: string[]) =>
    [...new Set(ids)].filter((id) => validEvidenceIds.has(id));

  const normalizePerson = (person: AnalysisReport["person"]) => {
    const dimensions = person.mbti.dimensions.map((dimension) => {
      const evidenceIds = checkedIds(dimension.evidenceIds);
      let status = dimension.status;
      if (status === "supported" && evidenceIds.length < 2) status = "tentative";
      if (status === "tentative" && evidenceIds.length === 0) status = "insufficient";
      return {
        ...dimension,
        score: status === "insufficient" ? 50 : bounded(dimension.score),
        leaning: status === "insufficient" ? "证据不足" : dimension.leaning,
        status,
        evidenceIds,
      };
    });
    const insufficient = dimensions.filter(
      (dimension) => dimension.status === "insufficient",
    ).length;
    const candidate =
      insufficient > 1 ? "待观察" : person.mbti.candidate;
    return {
      ...person,
      mbti: {
        ...person.mbti,
        candidate,
        alternatives: candidate === "待观察" ? [] : person.mbti.alternatives,
        confidence:
          insufficient > 1
            ? "低"
            : person.mbti.confidence,
        dimensions,
      },
      bigFive: person.bigFive.map((trait) => {
        const evidenceIds = checkedIds(trait.evidenceIds);
        const status =
          evidenceIds.length === 0
            ? "insufficient"
            : evidenceIds.length === 1 && trait.status === "supported"
              ? "tentative"
              : trait.status;
        return {
          ...trait,
          score: status === "insufficient" ? 50 : bounded(trait.score),
          status,
          evidenceIds,
        };
      }),
      attachmentAssessment: {
        ...person.attachmentAssessment,
        cues: person.attachmentAssessment.cues.map((cue) => {
          const evidenceIds = checkedIds(cue.evidenceIds);
          let status = cue.status;
          if (status === "supported" && evidenceIds.length < 2) {
            status = "tentative";
          }
          if (status !== "insufficient" && evidenceIds.length === 0) {
            status = "insufficient";
          }
          return {
            ...cue,
            status,
            score: status === "insufficient" ? 50 : bounded(cue.score),
            evidenceIds,
            counterEvidenceIds: checkedIds(cue.counterEvidenceIds),
          };
        }),
      },
    };
  };

  const parsed = parseConversation(input.chat);
  const person = normalizePerson(report.person);
  const self = normalizePerson(report.self);
  const hasControlRisk = report.emotion.intimacySignals.some(
    (signal) => signal.key === "control",
  );
  const rawCompatibilityScore = bounded(
    report.compatibility.score * 0.58 + report.interest.score * 0.42,
  );
  const compatibilityScore = hasControlRisk
    ? Math.min(rawCompatibilityScore, 32)
    : rawCompatibilityScore;
  const interestScore = hasControlRisk
    ? Math.min(bounded(report.interest.score), 28)
    : bounded(report.interest.score);
  const decision = hasControlRisk
    ? "暂缓推进"
    : decisionFromScore(compatibilityScore);
  const messageOptions = hasControlRisk
    ? buildSafetyMessageOptions()
    : report.action.messageOptions.length > 0
      ? report.action.messageOptions.slice(0, 3)
      : buildMessageOptions(input, report.interest.score);

  return {
    ...report,
    confidence,
    calibration,
    decision,
    compatibilityScore,
    person,
    self,
    compatibility: {
      ...report.compatibility,
      score: compatibilityScore,
      label: hasControlRisk ? "安全边界优先" : report.compatibility.label,
      summary: hasControlRisk
        ? "当前最关键的匹配维度不是兴趣，而是对方能否尊重隐私、社交自由和明确拒绝。"
        : report.compatibility.summary,
      dimensions: report.compatibility.dimensions.map((dimension) => ({
        ...dimension,
        score:
          hasControlRisk && dimension.key === "boundaries"
            ? 18
            : bounded(dimension.score),
        summary:
          hasControlRisk && dimension.key === "boundaries"
            ? "出现了控制性要求，边界尊重不足。"
            : dimension.summary,
      })),
    },
    interest: {
      ...report.interest,
      score: interestScore,
      confidence,
      verdict: hasControlRisk
        ? "目前不应把兴趣信号放在安全边界之前。"
        : report.interest.verdict,
    },
    action: {
      ...report.action,
      decision,
      messageOptions,
      nextMessage: messageOptions[0]!.text,
      rationale: hasControlRisk
        ? "控制性要求不能被解释成关心或爱的证明。先确认边界，再观察对方能否尊重拒绝。"
        : report.action.rationale,
      ifWarm: hasControlRisk
        ? "如果对方能收回要求、道歉并停止施压，可以继续观察，但仍需看到稳定行动。"
        : report.action.ifWarm,
      ifCold: hasControlRisk
        ? "如果对方用冷暴力、羞辱或威胁回应拒绝，停止自证并优先拉开距离。"
        : report.action.ifCold,
      conversationMoves: hasControlRisk
        ? [
            "先暂停推进，不用继续证明信任或服从。",
            "直接说明不能接受的隐私和社交限制。",
            "观察拒绝后，对方是尊重边界还是升级施压。",
          ]
        : report.action.conversationMoves,
      stopSigns: hasControlRisk
        ? [
            "用爱、吃醋或安全感要求交出隐私。",
            "拒绝后继续施压、羞辱或惩罚。",
            "限制与朋友家人的正常联系。",
          ]
        : report.action.stopSigns,
    },
    evidence: report.evidence.map((item) => ({
      ...item,
      evidenceIds: checkedIds(item.evidenceIds),
    })),
    shortReplies: parsed.shortReplies,
    safetyNotes: hasControlRisk
      ? [
          ...new Set([
            ...report.safetyNotes,
            "查手机、持续定位、强制报备和切断社交属于高风险控制信号，不应被浪漫化。",
          ]),
        ]
      : report.safetyNotes,
    pipeline: {
      ...report.pipeline,
      messageCount: parsed.messages.length,
      sessionCount: parsed.sessions.length,
      timestampCoverage: Number(parsed.timestampCoverage.toFixed(2)),
      localRuleMode: false,
      exactQuoteVerification: true,
    },
  };
}
