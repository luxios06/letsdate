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
          <h2>我们怎样读懂一段关系</h2>
          <p>不急着给一个人钉上标签，也不把一时的礼貌、热情或沉默当成答案。</p>
        </div>
        <a
          className="secondary-button"
          href={`${import.meta.env.BASE_URL}skills/letsdate-relationship-analysis/SKILL.md`}
          target="_blank"
          rel="noreferrer"
        >
          看看分析协议
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
          <span className="eyebrow">我们相信</span>
          <h3>事实、感受与判断，各自有各自的位置。</h3>
          <p>
            每一条判断都要回到原话，再为它留出另一种解释。MBTI
            只是看人的一个入口，真正让画像立起来的，是两个人如何回应、如何停顿、如何修复。
          </p>
        </div>
      </section>

      <div className="method-grid">
        {[
          {
            icon: ScanSearch,
            index: "01",
            title: "先收集回声",
            text: "主页是自我呈现，聊天是当下互动。先把它们分开，再听彼此留下了什么。",
          },
          {
            icon: Fingerprint,
            index: "02",
            title: "再拼出轮廓",
            text: "用 MBTI、大五人格与互动线索互为参照，让轮廓逐渐清晰，也给不同解释留出位置。",
          },
          {
            icon: UsersRound,
            index: "03",
            title: "看两个人如何相遇",
            text: "主动与回应、靠近与退后、边界与修复，从来不只属于一个人。",
          },
          {
            icon: Gauge,
            index: "04",
            title: "最后落到一步",
            text: "用一次轻一点、退得回来的行动验证关系，而不是继续在心里反复猜测。",
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

      <section className="competitive-section">
        <div className="competitive-section__intro">
          <span className="eyebrow">我们与别处的不同</span>
          <h3>不是替你读心，而是陪你看清这段关系。</h3>
          <p>
            本机微信读取工具更擅长拿到完整数据；letsdate
            选择另一条路：轻量导入材料，把重点放在两个人的互动、关系里的感受和下一步行动。
          </p>
        </div>
        <div className="competitive-grid">
          <article>
            <ScanSearch size={18} />
            <span>跨平台</span>
            <strong>不依赖某个聊天平台</strong>
            <p>文字、多图 OCR 和未来本机桥接共用同一套分析协议。</p>
          </article>
          <article>
            <UsersRound size={18} />
            <span>双人关系</span>
            <strong>不只分析一个人</strong>
            <p>同时看双方主动性、回应质量、推进节奏和边界尊重。</p>
          </article>
          <article>
            <Gauge size={18} />
            <span>行动层</span>
            <strong>从理解走到一小步</strong>
            <p>继续、适度、先观察或暂缓，都有一个可以撤回的下一步。</p>
          </article>
          <article>
            <ShieldCheck size={18} />
            <span>安全优先</span>
            <strong>边界永远排在心动之前</strong>
            <p>查手机、定位和切断社交不会被浪漫化，它们会让判断停下来。</p>
          </article>
          <article>
            <BrainCircuit size={18} />
            <span>人格倾向</span>
            <strong>给出方向，也保留别的可能</strong>
            <p>低置信度依然提供一个可以参考的沟通入口，而不是把所有话都停在雾里。</p>
          </article>
          <article>
            <Fingerprint size={18} />
            <span>纵向回看</span>
            <strong>把变化慢慢收好</strong>
            <p>同一段关系可以被重新看见，也可以看到自己上一次错过了什么。</p>
          </article>
        </div>
        <div className="competitive-boundary">
          <strong>我们不做的事</strong>
          <p>
            不自动登录或读取第三方数据库，不自动发送消息，不把人格推断当作临床诊断，也不提供操控和跟踪策略。
          </p>
        </div>
      </section>

      <section className="method-detail">
        <div className="method-detail__title">
          <BrainCircuit size={20} />
          <div>
            <h3>我们看的几层</h3>
            <p>完整，不等于假装精确。</p>
          </div>
        </div>
        <div className="method-layers">
          <div>
            <span>01</span>
            <strong>MBTI 的一面镜子</strong>
            <p>四个维度分别给出方向与置信度，并汇总为当前最像的类型。</p>
          </div>
          <div>
            <span>02</span>
            <strong>更稳定的性格底色</strong>
            <p>用连续分数观察开放性、尽责性、外向性、宜人性和情绪敏感度。</p>
          </div>
          <div>
            <span>03</span>
            <strong>两个人之间的节奏</strong>
            <p>观察主动、回应、短回复基线、后续恢复、冲突与边界，不把依恋类型当诊断。</p>
          </div>
          <div>
            <span>04</span>
            <strong>把理解落到一步</strong>
            <p>给出可执行但可撤回的下一步，并明确什么情况下应停止加码。</p>
          </div>
        </div>
      </section>

      <section className="method-detail method-detail--safety">
        <div className="method-detail__title">
          <ShieldCheck size={20} />
          <div>
            <h3>最后的边界</h3>
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
