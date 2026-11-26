import type { AnalysisInput, AnalysisReport, HistoryRecord } from "../types";

export const DEMO_SAMPLE: AnalysisInput = {
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
  provider: "demo",
  stage: "刚匹配，聊了 2 天",
  decision: "适度推进",
  overallTitle: "有真实兴趣信号，也保留了健康边界",
  overallSummary:
    "对方主动追问、接住话题并提出可执行的见面方向，兴趣信号偏积极。Ta 同时明确保留日程确认空间，这更像边界感，而不是冷淡。适合用一次低压力、可撤回的具体邀约验证关系温度。",
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
      "双方主页和聊天均提供了可核实证据。",
      "样本仍不足以判断稳定人格，关系分数不代表成功概率。",
    ],
  },
  person: {
    summary:
      "偏体验驱动，愿意分享生活细节，也重视有质量的交流。社交上并非持续高能量，更像是在熟悉后逐步打开。",
    mbti: {
      candidate: "ENFP",
      alternatives: ["INFP", "ESFP"],
      confidence: "低",
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
        summary: "对新体验、艺术和户外探索的接受度高。",
        status: "supported",
        evidenceIds: ["demo-2", "demo-1"],
      },
      {
        key: "conscientiousness",
        label: "尽责性",
        score: 61,
        summary: "有计划意识，但不追求事事确定。",
        status: "tentative",
        evidenceIds: ["demo-3"],
      },
      {
        key: "extraversion",
        label: "外向性",
        score: 66,
        summary: "愿意主动，但能量更偏向小范围互动。",
        status: "tentative",
        evidenceIds: ["demo-1", "demo-2"],
      },
      {
        key: "agreeableness",
        label: "宜人性",
        score: 73,
        summary: "会接住话题，并给对方留下舒服的参与空间。",
        status: "supported",
        evidenceIds: ["demo-1", "demo-4"],
      },
      {
        key: "neuroticism",
        label: "情绪敏感度",
        score: 42,
        summary: "当前材料看不到明显的情绪波动或过度索取。",
        status: "insufficient",
        evidenceIds: [],
      },
    ],
    interaction: {
      attachment: "暂未看到明显的不安全互动模式，短期样本不足以判断依恋类型。",
      conflict: "更可能采用先缓和、再沟通的方式，冲突场景尚无直接证据。",
      pace: "愿意靠近，但需要保留自己的节奏和安排。",
      energy: "偏体验型社交，喜欢有内容的共同活动。",
      humor: "轻盈、自嘲式幽默，能降低互动压力。",
    },
    values: ["探索感", "有质量的交流", "自主空间", "共同体验"],
    needs: ["被认真回应", "可共同参与的活动", "不被催促的节奏"],
    boundaries: ["个人日程需要自己确认", "不喜欢纯应酬式热闹"],
    greenFlags: ["主动追问", "提出具体见面方向", "会接梗也会收束话题"],
    watchouts: ["目前样本仍短", "尚未看到冲突或低能量状态"],
  },
  self: {
    summary:
      "表达相对克制但稳定，偏重真实兴趣与可执行安排。你会主动给对方具体回应，也注重关系中的安全感。",
    mbti: {
      candidate: "INFJ",
      alternatives: ["ISFJ", "INTJ"],
      confidence: "低",
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
      attachment: "重视稳定回应，短期样本下看不出明显回避或焦虑倾向。",
      conflict: "倾向先自己消化，再寻找合适时机沟通。",
      pace: "希望明确一点，但也愿意给对方确认时间。",
      energy: "偏安静陪伴与深度交流。",
      humor: "回应式幽默，更多是接住对方而不是主导玩梗。",
    },
    values: ["稳定回应", "真实兴趣", "共同成长", "边界感"],
    needs: ["明确信号", "不被忽冷忽热消耗", "可持续的互动节奏"],
    boundaries: ["不希望长期单向推进", "需要一定的个人空间"],
    greenFlags: ["会给出具体替代方案", "尊重对方的确认时间"],
    watchouts: ["可能因为在意而过度解读短期波动"],
  },
  compatibility: {
    score: 74,
    label: "互补且有推进空间",
    summary:
      "你们都看重共同体验与真实交流，节奏上也能互相留空间。主要差异在于对方更偏临场探索，你更偏稳定规划，适合通过一次低压力约会验证。",
    dimensions: [
      {
        key: "pace",
        label: "节奏匹配",
        score: 78,
        summary: "都愿意靠近，也能接受短期确认。",
      },
      {
        key: "energy",
        label: "能量互补",
        score: 71,
        summary: "对外社交能量不同，但都喜欢小范围深聊。",
      },
      {
        key: "communication",
        label: "沟通方式",
        score: 82,
        summary: "会接话题、追问并给出具体回应。",
      },
      {
        key: "stability",
        label: "稳定预期",
        score: 68,
        summary: "你更需要确定性，Ta 更偏灵活安排。",
      },
      {
        key: "values",
        label: "价值共鸣",
        score: 76,
        summary: "探索、体验和边界感是目前可见的共同点。",
      },
    ],
  },
  interest: {
    score: 72,
    confidence: "中",
    verdict: "兴趣信号偏积极，但仍处于需要验证的早期阶段。",
    signals: [
      "对方主动反问你的兴趣。",
      "对方把话题从展览延伸到共同活动。",
      "对方给出明确回复时间，而不是模糊拖延。",
    ],
    ambiguities: [
      "尚未确认具体日期，兴趣仍需行动验证。",
      "当前对话氛围轻松，不能排除友善型表达。",
    ],
  },
  action: {
    decision: "适度推进",
    rationale:
      "当前出现连续追问、共同活动设想和时间确认，值得推进一次低压力邀约；但推进幅度应控制在单次具体安排，不用提前定义关系。",
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
      "对方给出具体时间时，直接确认地点和大致时长，并保留一个双方都可调整的备选方案。",
    ifCold:
      "如果对方继续模糊或超过约定时间没有回复，先停止追加邀约，把注意力放回自己的生活。",
    conversationMoves: [
      "把共同兴趣落到一次 2 至 3 小时的具体活动。",
      "用可撤回的措辞表达邀约，降低对方压力。",
      "观察对方是否愿意共同确定时间，而不只是口头说好。",
    ],
    stopSigns: [
      "连续多次只在你推动时回复。",
      "长期回避任何具体安排。",
      "让你持续处在猜测和自我怀疑中。",
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
    "聊天样本只有两天，无法可靠判断稳定人格。",
    "MBTI 只作为观察透镜，不应当作结论。",
    "对方对具体邀约的响应质量，比当前语气更值得观察。",
  ],
  safetyNotes: [
    "不要用画像结果替对方做决定，也不要据此制造控制感。",
    "任何涉及私人信息的材料，都应先征得必要授权并充分脱敏。",
    "若关系让你持续焦虑、被贬低或失去边界，应优先保护自己。",
  ],
};

export const SAMPLE_HISTORY: HistoryRecord[] = [
  {
    id: "sample-history",
    createdAt: "2026-11-25T12:20:00.000Z",
    title: "爬山与摄影展",
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
