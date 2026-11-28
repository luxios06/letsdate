import type { AnalysisInput, AnalysisReport, HistoryRecord } from "../types";

export const DEMO_SAMPLE: AnalysisInput = {
  relationshipLabel: "示例关系",
  selfProfile:
    "产品设计师，平时看展、跑步，也会在家做饭。慢热，但遇到感兴趣的话题会认真聊下去。比较看重稳定回应和彼此空间。",
  otherProfile:
    "周末不是在爬山，就是在去 livehouse 的路上。最近在学陶艺。比起热闹，更喜欢两三个人的深聊。希望遇到能一起探索、也尊重彼此空间的人。",
  chat: `我：你主页那张山里日出的照片很好看，是在哪儿拍的？
对方：四姑娘山！上周临时起意去的，凌晨四点爬起来真的差点放弃 😂
对方：你也喜欢户外吗？
我：喜欢，不过我更偏城市散步。最近在看一个摄影展。
对方：听起来不错，你最喜欢哪一组？我最近刚好想找点室内活动。
我：有一组拍夜班公交的，很安静。你平时会一个人去看展吗？
对方：会，但更喜欢有人边看边聊。陶艺也可以一起，不过得先接受我做得丑哈哈
我：那我可以负责拍照。
对方：成交。你周末一般哪天有空？
我：周日下午比较稳。
对方：我先看一下安排，周六晚上给你答复。`,
  relationshipStage: "刚匹配，聊了 2 天",
  goal: "判断是否值得继续投入",
  consent: true,
};

export const DEMO_REPORT: AnalysisReport = {
  id: "demo-report",
  createdAt: "2026-11-26T10:30:00.000Z",
  relationshipLabel: "示例关系",
  provider: "demo",
  stage: "刚匹配，聊了 2 天",
  decision: "适度推进",
  overallTitle: "有靠近，也有分寸",
  overallSummary:
    "Ta 会主动把话题递回来，也愿意一起想到见面。与此同时，Ta 明确给自己留了确认日程的空间。前者是靠近，后者不是冷淡，而是分寸。先让一次轻一点的邀约替你们回答下一步。",
  confidence: "中",
  compatibilityScore: 74,
  calibration: {
    evidenceMessages: 7,
    reciprocalTurns: 7,
    questionCount: 3,
    sourceCount: 3,
    reliability: 0.84,
    scoreCap: 86,
    method: "向 50 分收缩并按材料充分性设置上限",
    notes: [
      "主页与聊天都给这段判断留下了可以回看的痕迹。",
      "故事还短，分数只描述当下的互动，不预告结局。",
    ],
  },
  emotion: {
    valence: 0.58,
    intensity: 0.52,
    categories: [
      { key: "good", label: "好", count: 3, score: 45 },
      { key: "joy", label: "乐", count: 2, score: 25 },
      { key: "sadness", label: "哀", count: 0, score: 0 },
      { key: "anger", label: "怒", count: 0, score: 0 },
      { key: "fear", label: "惧", count: 0, score: 0 },
      { key: "disgust", label: "恶", count: 0, score: 0 },
      { key: "surprise", label: "惊", count: 0, score: 0 },
    ],
    intimacySignals: [
      {
        key: "closeness",
        label: "亲密靠近",
        score: 44,
        hits: ["想见你"],
        sender: "other",
      },
      {
        key: "future",
        label: "未来承诺",
        score: 28,
        hits: ["以后"],
        sender: "both",
      },
    ],
    quickRead: {
      headline: "这段话里，有清楚的靠近",
      observation: "Ta 主动追问，也接住了共同活动的设想。只是投入有多深，还要看现实里那一步。",
      suggestion: "先发出一次轻一点、退得回来的邀约，不必太早替关系定义。",
      confidence: "中",
      missingInformation: ["对方平时的回复节奏"],
    },
    source: "local-fallback",
  },
  messageInsights: [
    {
      messageId: "demo-msg-2",
      quote: "四姑娘山！上周临时起意去的，凌晨四点爬起来真的差点放弃 😂",
      sender: "other",
      timestamp: null,
      emotion: "开心",
      intent: "分享",
      cue: "靠近",
      confidence: "中",
      explanation: "愿意分享具体经历和情绪细节，是在把话题轻轻往你这边推。",
      source: "local-rules",
    },
    {
      messageId: "demo-msg-13",
      quote: "成交。你周末一般哪天有空？",
      sender: "other",
      timestamp: null,
      emotion: "期待",
      intent: "确认计划",
      cue: "稳定",
      confidence: "中",
      explanation: "从一句玩笑走到具体时间，兴趣开始有了可以落地的形状。",
      source: "local-rules",
    },
  ],
  knowledge: {
    relatedCases: [
      {
        id: "syn-plan-confirmed",
        title: "计划从提议走到确认",
        source: "letsdate-synthetic",
        license: "CC0-1.0",
        pattern: "计划确认",
        situation: "时间、地点和活动都被明确确认。",
        takeaway: "不需要继续反复试探，下一步观察是否按约兑现。",
        similarity: 86,
        synthetic: true,
      },
      {
        id: "syn-short-low-energy",
        title: "短回复后说明低能量",
        source: "letsdate-synthetic",
        license: "CC0-1.0",
        pattern: "状态性短回复",
        situation: "对方回复很短，但前后文说明疲惫，随后恢复交流。",
        takeaway: "把短回复理解为当前状态，不要直接判断冷淡或依恋类型。",
        similarity: 71,
        synthetic: true,
      },
    ],
    clusterHints: ["dating-specific", "计划、请求与协商"],
    caseCount: 95,
  },
  humanRead: {
    canConfirm:
      "Ta 主动追问，给出了确认时间，也把话题慢慢推到了看展和吃饭。",
    likely:
      "更像是两个人都愿意再往前走一点。现在的热度是真的，只是还需要一次现实里的安排来把它接住。",
    alternatives:
      "这份热情也可能来自 Ta 本来的沟通习惯。一次具体安排，会比猜测更接近答案。",
    observeNext:
      "看看周六那句话会不会如约回来，也看看计划有变化时，Ta 会不会提前把话说清楚。",
    supportNote:
      "这份解读不替你决定值不值得，只把心里悬着的猜测，放回可以观察的地方。",
  },
  contextGaps: [
    {
      question: "对方平时的回复间隔和表达长度大概是什么样？",
      why: "回复的节奏，常常比一句语气更能看清一个人的投入与分寸。",
      priority: 1,
    },
  ],
  shortReplies: [],
  pipeline: {
    version: "letsdate-pipeline-v2",
    stages: [
      "解析消息与会话",
      "建立事实证据账本",
      "识别计划状态",
      "分析短回复与后续恢复",
      "评估依恋相关互动线索",
      "检索匿名情境参考",
      "生成关系判断与行动建议",
    ],
    messageCount: 16,
    sessionCount: 1,
    timestampCoverage: 0,
    localRuleMode: true,
    exactQuoteVerification: true,
  },
  person: {
    summary:
      "有一点探索者的轻盈，也有一点慢热者的分寸。愿意分享生活，却更珍惜有质量的交流，像是在熟悉之后才慢慢把门打开。",
    mbti: {
      candidate: "ENFP",
      alternatives: ["INFP", "ESFP"],
      confidence: "低",
      summary:
        "把这些细节放在一起，Ta 更接近 ENFP 的沟通倾向：愿意把话题推向共同体验，也珍惜两个人的深聊。靠近时给一点具体安排，同时留一点呼吸。",
      dimensions: [
        {
          key: "EI",
          left: "I",
          right: "E",
          score: 62,
          leaning: "偏 E",
          note: "主动追问、愿意发起活动，但也提到喜欢小范围深聊。",
          status: "tentative",
          evidenceIds: ["demo-1", "demo-4"],
        },
        {
          key: "SN",
          left: "S",
          right: "N",
          score: 68,
          leaning: "偏 N",
          note: "关注探索感、氛围与共同体验，而非只描述具体日程。",
          status: "tentative",
          evidenceIds: ["demo-2"],
        },
        {
          key: "TF",
          left: "T",
          right: "F",
          score: 71,
          leaning: "偏 F",
          note: "用感受与关系体验组织表达，但证据仍不足以定论。",
          status: "tentative",
          evidenceIds: ["demo-2", "demo-4"],
        },
        {
          key: "JP",
          left: "J",
          right: "P",
          score: 58,
          leaning: "略偏 P",
          note: "接受临时起意，也愿意提前确认计划。",
          status: "tentative",
          evidenceIds: ["demo-3"],
        },
      ],
    },
    bigFive: [
      {
        key: "openness",
        label: "开放性",
        score: 84,
        summary: "会被新体验、艺术和户外吸引，也愿意把生活过成探索。",
        status: "supported",
        evidenceIds: ["demo-2", "demo-1"],
      },
      {
        key: "conscientiousness",
        label: "尽责性",
        score: 61,
        summary: "并非事事计划，但会给重要的事留一个清楚的着落点。",
        status: "tentative",
        evidenceIds: ["demo-3"],
      },
      {
        key: "extraversion",
        label: "外向性",
        score: 66,
        summary: "愿意主动，却更享受小范围、能真正聊进去的热度。",
        status: "tentative",
        evidenceIds: ["demo-1", "demo-2"],
      },
      {
        key: "agreeableness",
        label: "宜人性",
        score: 73,
        summary: "会接住话题，也懂得给别人留一个舒服的入口。",
        status: "supported",
        evidenceIds: ["demo-1", "demo-4"],
      },
      {
        key: "neuroticism",
        label: "情绪敏感度",
        score: 42,
        summary: "眼下还听不到太多情绪起伏，这段材料也还不足以下结论。",
        status: "insufficient",
        evidenceIds: [],
      },
    ],
    interaction: {
      attachment: "暂时没看见明显的不安全互动，但一段短对话还不足以判断依恋类型。",
      conflict: "更像会先把气氛放缓，再找机会说清楚；真正的冲突场景还没有出现。",
      pace: "愿意靠近，也需要自己的节奏和一小块不被打扰的空间。",
      energy: "更容易在共同体验和有内容的交流里获得能量。",
      humor: "会用轻盈的自嘲把气氛放软，让靠近不那么有压力。",
    },
    values: ["探索感", "有质量的交流", "自主空间", "共同体验"],
    needs: ["被认真回应", "可共同参与的活动", "不被催促的节奏"],
    boundaries: ["个人日程需要自己确认", "不喜欢纯应酬式热闹"],
    greenFlags: ["主动追问", "提出具体见面方向", "会接梗也会收束话题"],
    watchouts: ["现在看到的故事还不长", "真正低落或起冲突时会怎样，还不知道"],
    attachmentAssessment: {
      summary:
        "出现了日程边界和可修复线索，但没有冲突或拉开距离后的再联系，无法判断依恋模式。",
      scope:
        "依恋线索只描述这段材料中的互动行为，不是临床诊断。",
      cues: [
        {
          key: "safe",
          label: "安全互动线索",
          status: "tentative",
          score: 61,
          confidence: "低",
          summary: "能说明日程并给确认时间，边界表达较清晰。",
          evidenceIds: ["demo-3"],
          counterEvidenceIds: [],
          missingInformation: ["冲突后的修复和再联系"],
        },
        {
          key: "anxious",
          label: "焦虑互动线索",
          status: "insufficient",
          score: 50,
          confidence: "低",
          summary: "没有持续寻求确认或害怕被抛下的明确证据。",
          evidenceIds: [],
          counterEvidenceIds: ["demo-3"],
          missingInformation: ["回复间隔", "被冷落后的反应"],
        },
        {
          key: "avoidant",
          label: "回避互动线索",
          status: "insufficient",
          score: 50,
          confidence: "低",
          summary: "没有连续短回复或距离后的持续撤退。",
          evidenceIds: [],
          counterEvidenceIds: ["demo-1"],
          missingInformation: ["压力下是否持续拉开距离"],
        },
      ],
    },
  },
  self: {
    summary:
      "你表达得克制，却不是冷淡。你在意真实兴趣，也愿意把喜欢落到具体安排里；只是在靠近之前，希望心里有一点确定。",
    mbti: {
      candidate: "INFJ",
      alternatives: ["ISFJ", "INTJ"],
      confidence: "低",
      summary:
        "把自己的表达和回应放在一起，你更接近 INFJ：慢热，重视稳定回应，也愿意把心意落到行动。靠近时记得给自己留一点思考的余地。",
      dimensions: [
        {
          key: "EI",
          left: "I",
          right: "E",
          score: 38,
          leaning: "偏 I",
          note: "你描述了慢热和偏好小范围交流。",
          status: "tentative",
          evidenceIds: ["self-profile"],
        },
        {
          key: "SN",
          left: "S",
          right: "N",
          score: 58,
          leaning: "略偏 N",
          note: "会从活动延展到氛围和感受。",
          status: "insufficient",
          evidenceIds: [],
        },
        {
          key: "TF",
          left: "T",
          right: "F",
          score: 63,
          leaning: "偏 F",
          note: "关系中更关注回应质量和舒适度。",
          status: "tentative",
          evidenceIds: ["self-profile"],
        },
        {
          key: "JP",
          left: "J",
          right: "P",
          score: 64,
          leaning: "偏 J",
          note: "偏好较稳的日程和明确下一步。",
          status: "tentative",
          evidenceIds: ["self-profile"],
        },
      ],
    },
    bigFive: [
      {
        key: "openness",
        label: "开放性",
        score: 76,
        summary: "对艺术、城市与新的共同体验保持兴趣。",
        status: "tentative",
        evidenceIds: ["self-profile"],
      },
      {
        key: "conscientiousness",
        label: "尽责性",
        score: 79,
        summary: "表达具体，倾向给出稳定安排。",
        status: "tentative",
        evidenceIds: ["self-profile"],
      },
      {
        key: "extraversion",
        label: "外向性",
        score: 43,
        summary: "慢热，但不会回避主动回应。",
        status: "tentative",
        evidenceIds: ["self-profile"],
      },
      {
        key: "agreeableness",
        label: "宜人性",
        score: 74,
        summary: "善于顺着对方兴趣推进，不强行主导。",
        status: "tentative",
        evidenceIds: ["self-profile"],
      },
      {
        key: "neuroticism",
        label: "情绪敏感度",
        score: 55,
        summary: "对关系信号较敏感，但表达仍克制。",
        status: "insufficient",
        evidenceIds: [],
      },
    ],
    interaction: {
      attachment: "你在意稳定回应，也会给对方确认的时间；更深的依恋模式，还需要更长的相处。",
      conflict: "遇到不舒服时，你可能会先自己消化，再找一个合适的时机说出来。",
      pace: "你希望关系清楚一点，也愿意把确认的时间留给对方。",
      energy: "在安静的陪伴和更深的交流里，你更容易感到连接。",
      humor: "你的幽默更像轻轻接住对方，而不是抢着主导玩笑。",
    },
    values: ["稳定回应", "真实兴趣", "共同成长", "边界感"],
    needs: ["明确信号", "不被忽冷忽热消耗", "可持续的互动节奏"],
    boundaries: ["不希望长期单向推进", "需要一定的个人空间"],
    greenFlags: ["会给出具体替代方案", "尊重对方的确认时间"],
    watchouts: ["可能因为在意而过度解读短期波动"],
    attachmentAssessment: {
      summary:
        "你重视稳定回应，也会给对方确认时间；短期材料不足以判断依恋模式。",
      scope:
        "依恋线索只描述这段材料中的互动行为，不是临床诊断。",
      cues: [
        {
          key: "safe",
          label: "安全互动线索",
          status: "tentative",
          score: 60,
          confidence: "低",
          summary: "能尊重对方的确认时间，没有继续施压。",
          evidenceIds: ["demo-3"],
          counterEvidenceIds: [],
          missingInformation: ["更长周期的稳定回应"],
        },
        {
          key: "anxious",
          label: "焦虑互动线索",
          status: "insufficient",
          score: 50,
          confidence: "低",
          summary: "暂时没有持续追问或反复确认安全的证据。",
          evidenceIds: [],
          counterEvidenceIds: ["demo-3"],
          missingInformation: ["延迟回复时的反应"],
        },
        {
          key: "avoidant",
          label: "回避互动线索",
          status: "insufficient",
          score: 50,
          confidence: "低",
          summary: "没有出现拉开距离或拒绝沟通的明确线索。",
          evidenceIds: [],
          counterEvidenceIds: ["demo-1"],
          missingInformation: ["冲突中的表达方式"],
        },
      ],
    },
  },
  compatibility: {
    score: 74,
    label: "节奏不同，却能互相看见",
    summary:
      "你们都愿意把时间给共同体验，也愿意给彼此留一点空间。差异在于，Ta 更随性，你更需要确定。一次轻一点的见面，会比反复猜想更接近答案。",
    dimensions: [
      {
        key: "pace",
        label: "节奏匹配",
        score: 78,
        summary: "都愿意靠近，也愿意给确认留一点时间。",
      },
      {
        key: "energy",
        label: "能量互补",
        score: 71,
        summary: "在人前的能量不同，却都在小范围的深聊里更自在。",
      },
      {
        key: "communication",
        label: "沟通方式",
        score: 82,
        summary: "会接住彼此的话，也愿意继续问下去。",
      },
      {
        key: "stability",
        label: "稳定预期",
        score: 68,
        summary: "你更需要确定，Ta 更习惯给安排留一点弹性。",
      },
      {
        key: "values",
        label: "价值共鸣",
        score: 76,
        summary: "对探索、体验与边界的珍惜，是现在最清楚的共同点。",
      },
    ],
  },
  interest: {
    score: 72,
    confidence: "中",
    verdict: "有真实的靠近，也还在等一次现实里的回应。",
    signals: [
      "Ta 会把问题轻轻递回来，想听你的答案。",
      "话题从展览慢慢延伸到了共同活动。",
      "Ta 给了明确回复时间，而不是把话悬在半空。",
    ],
    ambiguities: [
      "具体日期还没有落下，兴趣仍要等行动来回答。",
      "气氛轻松是真的，但也要给友善型表达留出解释。",
    ],
  },
  action: {
    decision: "适度推进",
    rationale:
      "已经有连续追问、共同活动的设想，也有了时间的着落点。值得向前半步，但只走一小步——先安排一次见面，不急着替关系命名。",
    nextMessage:
      "周六如果你那边时间定了告诉我，我们可以挑一个下午去看展，之后找个安静的地方吃饭。时间不方便也完全没关系，我们再换个周末。",
    messageOptions: [
      {
        tone: "留空间",
        text: "周六如果你那边时间定了告诉我，我们可以挑一个下午去看展，之后找个安静的地方吃饭。时间不方便也完全没关系，我们再换个周末。",
      },
      {
        tone: "直接确认",
        text: "我想确认一下，周六时间定了的话，要不要把看展和吃饭安排上？",
      },
      {
        tone: "轻松一点",
        text: "周六见分晓。时间定了就去看展，我负责拍照，你负责挑一家好吃的小店。",
      },
    ],
    ifWarm:
      "如果 Ta 给出具体时间，就顺着这份诚意确认地点和大致时长，也给变化留一点余地。",
    ifCold:
      "如果约定时间过去，回应仍然模糊，就把伸出去的手收回来，回到自己的生活里。",
    conversationMoves: [
      "把共同兴趣落成一次两三个小时的小活动。",
      "邀约轻一点，让两个人都能舒服地进退。",
      "看看 Ta 愿不愿意一起把时间真正定下来。",
    ],
    stopSigns: [
      "总是只有你在推动话题。",
      "一次次回避具体安排。",
      "让你长期停在猜测和自我怀疑里。",
    ],
  },
  evidence: [
    {
      id: "demo-1",
      source: "聊天",
      quote: "你也喜欢户外吗？",
      observation: "对方在分享后主动把话题转回你。",
      inference: "存在继续了解你的意愿，互动不是单向输出。",
      confidence: "较高",
      caution: "主动提问也可能来自友好沟通习惯。",
      status: "confirmed",
      evidenceIds: ["demo-1"],
    },
    {
      id: "demo-2",
      source: "主页",
      quote: "更喜欢两三个人的深聊",
      observation: "对方明确描述了自己的社交能量和偏好。",
      inference: "可能偏体验驱动，重视有质量的交流。",
      confidence: "中",
      caution: "简介是自我呈现，不等同于完整人格。",
      status: "tentative",
      evidenceIds: ["demo-2"],
    },
    {
      id: "demo-3",
      source: "双方互动",
      quote: "我先看一下安排，周六晚上给你答复。",
      observation: "对方没有迎合式答应，而是给出明确确认节点。",
      inference: "有一定兴趣，同时保留自己的计划边界。",
      confidence: "中",
      caution: "真正的投入程度要看后续是否按时回复。",
      status: "confirmed",
      evidenceIds: ["demo-3"],
    },
    {
      id: "demo-4",
      source: "双方互动",
      quote: "那我可以负责拍照。 / 成交。",
      observation: "双方能把设想推进一步，并形成轻松的角色分工。",
      inference: "当前互动有共同创造感，关系推进阻力较低。",
      confidence: "中",
      caution: "轻松配合不自动等于浪漫兴趣。",
      status: "tentative",
      evidenceIds: ["demo-4"],
    },
  ],
  uncertainties: [
    "只聊了两天，还看不清一个人稳定的人格轮廓。",
    "MBTI 只是一面镜子，不是结论。",
    "Ta 之后如何回应具体邀约，比此刻的语气更接近答案。",
  ],
  safetyNotes: [
    "别让这份解读替别人做决定，也别把它变成控制或试探。",
    "把材料放进来前，请替彼此隐去姓名、电话、住址和账号。",
    "如果这段关系让你长期焦虑、被贬低或失去边界，请先回到自己。",
  ],
};

export const SAMPLE_HISTORY: HistoryRecord[] = [
  {
    id: "sample-history",
    createdAt: "2026-11-25T12:20:00.000Z",
    relationshipLabel: "示例关系",
    title: "示例关系 · 刚匹配，聊了 2 天 · ENFP",
    decision: "适度推进",
    score: 74,
    report: DEMO_REPORT,
  },
];

export const STAGES = [
  "刚匹配",
  "刚匹配，聊了 1 至 3 天",
  "稳定聊天中",
  "见过一次",
  "暧昧或拉扯期",
  "发生冲突后",
  "不确定",
] as const;

export const GOALS = [
  "判断对方人格倾向",
  "判断是否值得继续投入",
  "理解好感度与兴趣信号",
  "准备下一次邀约",
  "处理忽冷忽热",
] as const;
