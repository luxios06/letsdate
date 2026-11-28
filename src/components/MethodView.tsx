import {
  BrainCircuit,
  Fingerprint,
  Gauge,
  HeartHandshake,
  LockKeyhole,
  ScanSearch,
  ShieldCheck,
  UsersRound,
} from "lucide-react";

export function MethodView() {
  return (
    <div className="page-view method-view">
      <div className="page-view__intro">
        <div>
          <span className="index-label">Method</span>
          <h2>我们如何形成判断</h2>
          <p>不用单一标签解释一个人，也不把礼貌、热情或短暂波动当成定论。</p>
        </div>
        <a
          className="secondary-button"
          href={`${import.meta.env.BASE_URL}skills/letsdate-relationship-analysis/SKILL.md`}
          target="_blank"
          rel="noreferrer"
        >
          查看 Agent Skill
        </a>
      </div>

      <section className="method-hero">
        <div className="method-hero__graphic" aria-hidden="true">
          <span className="signal-node signal-node--1">证据</span>
          <span className="signal-node signal-node--2">人格</span>
          <span className="signal-node signal-node--3">互动</span>
          <span className="signal-node signal-node--4">行动</span>
          <svg viewBox="0 0 420 240" role="presentation">
            <path d="M75 66 C140 80 150 113 205 122" />
            <path d="M330 66 C276 84 260 111 215 122" />
            <path d="M210 190 C208 161 211 148 210 123" />
            <circle cx="210" cy="122" r="7" />
          </svg>
        </div>
        <div>
          <span className="eyebrow">判断原则</span>
          <h3>事实、推断、建议必须分开。</h3>
          <p>
            每个结论都从具体表达出发，然后标记可能解释、置信度和反证。MBTI
            只是入口，大五人格、互动节奏、冲突方式、边界感与价值线索共同构成画像。
            模型模式会把“事实提取”和“人格综合”拆成两次判断，短回复和依恋线索单独分析。
          </p>
        </div>
      </section>

      <div className="method-grid">
        {[
          {
            icon: ScanSearch,
            index: "01",
            title: "提取证据",
            text: "区分主页自我呈现、双方聊天行为和上下文，不把单条消息当成人格证据。",
          },
          {
            icon: Fingerprint,
            index: "02",
            title: "形成假设",
            text: "先提取可核实事实，再使用 MBTI、大五人格和互动行为维度交叉验证，并保留替代解释。",
          },
          {
            icon: UsersRound,
            index: "03",
            title: "分析关系",
            text: "同时分析双方主动性、回应质量、边界尊重和推进节奏，避免单方面归因。",
          },
          {
            icon: Gauge,
            index: "04",
            title: "给出动作",
            text: "用一次低压力、可撤回的具体行动验证兴趣，不用猜测替代真实反馈。",
          },
        ].map(({ icon: Icon, index, title, text }) => (
          <article className="method-card" key={index}>
            <div>
              <Icon size={20} />
              <span>{index}</span>
            </div>
            <h3>{title}</h3>
            <p>{text}</p>
          </article>
        ))}
      </div>

      <section className="method-detail">
        <div className="method-detail__title">
          <BrainCircuit size={20} />
          <div>
            <h3>分析层</h3>
            <p>完整，不等于假装精确。</p>
          </div>
        </div>
        <div className="method-layers">
          <div>
            <span>01</span>
            <strong>MBTI 概率透镜</strong>
            <p>四个维度分别给出方向与置信度，并汇总为当前最像的类型。</p>
          </div>
          <div>
            <span>02</span>
            <strong>大五人格</strong>
            <p>用连续分数观察开放性、尽责性、外向性、宜人性和情绪敏感度。</p>
          </div>
          <div>
            <span>03</span>
            <strong>互动模式</strong>
            <p>观察主动、回应、短回复基线、后续恢复、冲突与边界，不把依恋类型当诊断。</p>
          </div>
          <div>
            <span>04</span>
            <strong>关系动作</strong>
            <p>给出可执行但可撤回的下一步，并明确什么情况下应停止加码。</p>
          </div>
        </div>
      </section>

      <section className="method-detail method-detail--safety">
        <div className="method-detail__title">
          <ShieldCheck size={20} />
          <div>
            <h3>边界</h3>
            <p>工具服务于更清醒的沟通，而不是控制别人。</p>
          </div>
        </div>
        <div className="safety-principles">
          <p>
            <HeartHandshake size={16} />
            可以推断沟通偏好，不能声称知道一个人的“真实想法”。
          </p>
          <p>
            <LockKeyhole size={16} />
            上传前应脱敏，并确认你有权使用这些材料。
          </p>
          <p>
            <ShieldCheck size={16} />
            不提供操控、跟踪、欺骗、PUA 或绕过对方边界的建议。
          </p>
        </div>
      </section>
    </div>
  );
}
