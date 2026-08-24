/**
 * dsh-commentator — browser half（安装包格式，window.__ModuleLoader__ bundle）。
 *
 * Agent 体育解说员：页面底部/右下角的轻量解说字幕条 + 设置页。
 *
 * 隐私约定：只消费 Host 端下发的最小事件 { t, tool }（事件类型 + 成功/失败），
 * 不读取任何对话正文、文件内容、命令参数或密钥。不加载远程字体/图片/脚本/音频；
 * 提示音由 Web Audio 本地合成，默认关闭。
 */

window.__ModuleLoader__.load({
	id: "dsh-commentator",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });

		const React = require("react");

		// ── 常量 ─────────────────────────────────────────────────────────────
		const POLL_URL = "/dsh-commentator/poll";
		const STORAGE_KEY = "dsh-commentator:settings";
		const CSS_TAG_ID = "dsh-commentator-styles";

		/** 出现频率（两次字幕开始之间的最小间隔，毫秒）。 */
		const FREQ_MS = { low: 4200, medium: 2200, high: 900 };
		/** 优先级事件（不参与频率节流，但保留 350ms 最小间隔防闪烁）。 */
		const PRIORITY_KINDS = new Set(["approval", "done", "tool-error"]);

		const DEFAULT_SETTINGS = Object.freeze({
			enabled: true,
			style: "esports",
			durationMs: 2600,
			frequency: "medium",
			sound: false,
			announce: true,
		});

		const STYLE_TAG = { esports: "电竞", animal: "动物世界", deadpan: "冷面吐槽" };
		const PREVIEW_TEXT = {
			esports: "测试通过！这是一波精彩操作！",
			animal: "它满意地打了个滚，计划顺利推进。",
			deadpan: "任务完成。居然一次也没要求重装系统。",
		};

		// ── 三种解说风格的文案表（每个事件 4~6 条，随机选取）──────────────────
		const PHRASES = {
			esports: {
				thinking: [
					"选手开始分析局势了！",
					"比赛正式开始，Agent 正在快速思考！",
					"镜头给到我们的选手，它正在规划下一步操作。",
					"裁判就位，选手开始读图了！",
					"局势瞬息万变，Agent 正在飞速运算！",
				],
				"tool-read": [
					"漂亮的文件读取，关键信息正在浮出水面！",
					"这一手文件阅读非常果断，信息差就此拉开！",
					"Agent 快速翻阅档案，寻找制胜线索！",
					"读取成功，这波情报价值千金！",
				],
				"tool-write": [
					"Agent 落笔了！这一改可能是本局关键！",
					"漂亮的修改，代码正在向胜利靠拢！",
					"创建文件成功，新版图正在展开！",
					"这一手改动堪称神来之笔！",
				],
				"tool-search": [
					"搜索技能发动，Agent 正在扫描全场！",
					"漂亮的搜索，线索正在汇聚！",
					"Agent 在信息流中精准定位目标！",
					"搜索展开，答案呼之欲出！",
				],
				"tool-terminal": [
					"终端已经启动，这一步风险与机会并存！",
					"Agent 进入命令行战场，手速拉满！",
					"终端操作，快节奏对拼开始！",
					"这一波终端输出，直接决定走向！",
				],
				"tool-delegate": [
					"召唤队友！Agent 启动了多人战术！",
					"派出辅助选手，团队协作展开！",
					"Agent 呼叫了支援，这波是团队作战！",
				],
				"tool-ask": [
					"Agent 向观众提问了！现场互动环节！",
					"选手暂停比赛，向教练确认战术！",
				],
				"tool-other": [
					"Agent 使出了新招式！",
					"这波操作出人意料！",
					"注意看，Agent 又有新动作！",
				],
				success: [
					"测试通过！这是一波精彩操作！",
					"漂亮！执行成功，全场欢呼！",
					"这一波稳了！",
					"漂亮的操作，完美的执行力！",
					"成功！Agent 状态火热！",
				],
				error: [
					"出现失误，但比赛还没有结束！",
					"哎呀，这波操作失误了！",
					"局势出现变数，Agent 需要冷静！",
					"失误不可怕，调整节奏继续冲！",
					"这一波翻车了，但胜负未分！",
				],
				approval: [
					"比赛暂停！Agent 在等待教练（你）的指示！",
					"关键决策时刻，等待主教练拍板！",
					"暂停！选手看向观众席请求批准！",
				],
				done: [
					"任务完成，选手稳稳拿下这一局！",
					"漂亮！比赛结束，Agent 锁定胜局！",
					"GG！完美收官，恭喜选手！",
					"任务完成，全场响起胜利的欢呼！",
				],
			},
			animal: {
				thinking: [
					"Agent 静静地观察着四周，思考下一步行动。",
					"它竖起耳朵，仔细倾听环境的声音。",
					"这只 Agent 正在评估眼前的地形。",
					"它停下来，用敏锐的目光扫过整片区域。",
				],
				"tool-read": [
					"Agent 小心翼翼地接近了 package.json。",
					"它翻动文件，寻找隐藏在代码深处的线索。",
					"它用爪子翻开一页页文档，不放过任何细节。",
					"它低下头，仔细阅读着这片领地留下的标记。",
				],
				"tool-write": [
					"它开始搭建自己的巢穴，一砖一瓦都很认真。",
					"Agent 在土地上留下了新的爪印。",
					"它谨慎地修改着领地边界，确保万无一失。",
					"巢穴初具雏形，Agent 满意地退后两步看了看。",
				],
				"tool-search": [
					"它四处嗅探，搜索猎物的气息。",
					"Agent 展开搜索，像猎手一样耐心。",
					"它在草丛中仔细翻找，不放过任何痕迹。",
					"侦察开始，它竖起尾巴保持警觉。",
				],
				"tool-terminal": [
					"它钻进了神秘的洞穴，里面传来机器轰鸣声。",
					"Agent 进入了地下通道，脚步坚定。",
					"它熟练地操作着洞穴里的机关。",
					"洞穴深处传来回应，Agent 屏住呼吸。",
				],
				"tool-delegate": [
					"它发出呼唤，召唤同族前来支援。",
					"Agent 呼叫了同伴，群体协作开始了。",
					"一声长啸，援军正在赶来。",
				],
				"tool-ask": [
					"它停下来，歪着头看向管理员。",
					"Agent 发出了疑问的叫声。",
					"它停下来等待投喂者的指示。",
				],
				"tool-other": [
					"Agent 使出了独特的生存技巧。",
					"它做出一个让人意想不到的动作。",
					"它尝试了一种新的觅食方式。",
				],
				success: [
					"经过一番搏斗，这只 Bug 终于失去了抵抗。",
					"捕获成功！Agent 叼着战利品凯旋。",
					"它稳稳地落回地面，任务圆满完成。",
					"猎食成功，今天的收获很不错。",
					"它满意地打了个滚，计划顺利推进。",
				],
				error: [
					"面对报错，它没有退缩，而是再次观察环境。",
					"猎物挣脱了！Agent 舔了舔爪子，重新匍匐下来。",
					"陷阱失手了，但它很快调整了姿势。",
					"它摔了一跤，爬起来抖了抖毛，继续前进。",
				],
				approval: [
					"它停下脚步，回头望向管理员，等待允许。",
					"Agent 蹲坐在原地，乖巧地等待指令。",
					"它叼着战利品，用期待的眼神看着主人。",
				],
				done: [
					"任务完成，Agent 回到了熟悉的栖息地。",
					"它心满意足地回到巢穴，今天的任务结束了。",
					"Agent 优雅地收起爪子，完美收官。",
					"它打了个哈欠，准备享受劳动成果。",
				],
			},
			deadpan: {
				thinking: [
					"它开始思考了。但愿这次想得比较久。",
					"Agent 进入了沉思。这通常是暴风雨前的宁静。",
					"它正在权衡。好消息是，至少它在权衡。",
					"思考中。我不抱太大期望。",
				],
				"tool-read": [
					"它又打开了 package.json。事情开始变得熟悉。",
					"文件读取中。希望它这次看仔细点。",
					"它又开始翻文件了，比上次多了几分执着。",
					"阅读文件。人类的习惯它倒是学得挺快。",
				],
				"tool-write": [
					"修改成功。暂时没有制造新的问题。",
					"它往文件里加了点东西。希望不是乱码。",
					"文件写入了。风险自担。",
					"它自信地提交了改动。它总是很自信。",
				],
				"tool-search": [
					"开始搜索。它管这叫「研究」。",
					"它去翻资料了。希望别又搜到十年前的回答。",
					"搜索中，目标明确，结果待定。",
					"它说它在找线索。姑且信它。",
				],
				"tool-terminal": [
					"正在执行命令。希望它知道自己在做什么。",
					"终端启动了。紧张的人是我。",
					"又跑命令了。每次都像第一次一样刺激。",
					"命令执行中。系统日志表示很淡定。",
				],
				"tool-delegate": [
					"它呼叫了支援。一个人搞不定开始叫人了。",
					"派出子代理。这算不算把活外包给自己？",
					"它决定多找几个自己来帮忙。",
				],
				"tool-ask": [
					"它问用户问题了。行吧，总比瞎猜强。",
					"它停下来征求意见。进步，虽然只有一点点。",
					"Agent 在提问。看来默认值不够用了。",
				],
				"tool-other": [
					"它又使出了不知道什么招数。",
					"新动作。每次都有新惊喜，虽然不都是好消息。",
					"它在做某件事。具体是什么，别问我。",
				],
				success: [
					"测试通过。至少报错还算诚实。",
					"执行成功。奇迹也是会发生的。",
					"成功了。我假装不惊讶。",
					"一切正常。反常得让人不安。",
				],
				error: [
					"测试失败了。至少报错还算诚实。",
					"出错了。意料之中，但还是要装作惊讶。",
					"报错信息写得挺清楚。这是今天唯一的亮点。",
					"它搞砸了。没关系，反正也不是第一次。",
				],
				approval: [
					"它停下来等人批准。谨慎，或者说拖延。",
					"Agent 在等许可。好在这个流程能拦住它。",
					"它请求批准了。这是它今天最靠谱的一步。",
				],
				done: [
					"任务完成。居然一次也没要求重装系统。",
					"结束了。没有把环境搞坏，堪称奇迹。",
					"收工。剩下的就交给验收了，祝它好运。",
					"任务完成。我本来想更惊讶一点的。",
				],
			},
		};

		// ── 设置存取（浏览器本地 localStorage）────────────────────────────────
		let settings = loadSettings();
		const settingsListeners = new Set();

		function sanitizeSettings(o) {
			const base = { ...DEFAULT_SETTINGS };
			if (!o || typeof o !== "object") return base;
			base.enabled = o.enabled !== false;
			if (o.style === "esports" || o.style === "animal" || o.style === "deadpan") base.style = o.style;
			const d = Number(o.durationMs);
			if (d >= 1000 && d <= 10000) base.durationMs = Math.round(d);
			if (o.frequency === "low" || o.frequency === "medium" || o.frequency === "high") base.frequency = o.frequency;
			base.sound = o.sound === true;
			base.announce = o.announce !== false;
			return base;
		}
		function loadSettings() {
			try {
				if (typeof localStorage === "undefined") return { ...DEFAULT_SETTINGS };
				const raw = localStorage.getItem(STORAGE_KEY);
				return sanitizeSettings(raw ? JSON.parse(raw) : null);
			} catch { return { ...DEFAULT_SETTINGS }; }
		}
		function persistSettings() {
			try {
				if (typeof localStorage !== "undefined") localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
			} catch { /* ignore */ }
		}
		function getSettings() { return settings; }
		function updateSettings(patch) {
			settings = sanitizeSettings({ ...settings, ...patch });
			persistSettings();
			for (const fn of settingsListeners) fn();
			controller.tick();
		}
		function resetSettings() {
			settings = { ...DEFAULT_SETTINGS };
			persistSettings();
			for (const fn of settingsListeners) fn();
			controller.tick();
		}
		function subscribeSettings(fn) {
			settingsListeners.add(fn);
			return () => settingsListeners.delete(fn);
		}

		// ── 文案选取 ─────────────────────────────────────────────────────────
		function pickOne(arr, last) {
			if (!arr || arr.length === 0) return "";
			if (arr.length === 1) return arr[0];
			let idx = Math.floor(Math.random() * arr.length);
			if (arr[idx] === last) idx = (idx + 1) % arr.length;
			return arr[idx];
		}
		function sentenceFor(evt, style, last) {
			const table = PHRASES[style] || PHRASES.esports;
			let key = null;
			switch (evt.t) {
				case "thinking": key = "thinking"; break;
				case "tool-start": key = "tool-" + evt.tool; break;
				case "tool-success": key = "success"; break;
				case "tool-error": key = "error"; break;
				case "approval": key = "approval"; break;
				case "done": key = "done"; break;
				default: return null;
			}
			const bucket = table[key] || table["tool-other"] || [];
			return pickOne(bucket, last);
		}

		// ── 字幕控制器（节流 + 优先级 + 时长 + 淡出）──────────────────────────
		const controller = {
			queue: [],
			current: null,
			phase: "hidden",
			lastShownAt: 0,
			lastSentence: "",
			showTimer: null,
			hideTimer: null,
			listeners: new Set(),
			subscribe(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); },
			notify() { for (const fn of this.listeners) fn(); },
			clearTimers() {
				if (this.showTimer) { clearTimeout(this.showTimer); this.showTimer = null; }
				if (this.hideTimer) { clearTimeout(this.hideTimer); this.hideTimer = null; }
			},
			enqueue(events) {
				for (const e of events) {
					if (e && typeof e.t === "string") this.queue.push(e);
				}
				if (this.queue.length > 32) this.queue.splice(0, this.queue.length - 32);
				this.tick();
			},
			beginHide() {
				this.phase = "hiding";
				this.notify();
				this.hideTimer = setTimeout(() => {
					this.hideTimer = null;
					this.current = null;
					this.phase = "hidden";
					this.notify();
					this.tick();
				}, 280);
			},
			show(evt, text) {
				const s = getSettings();
				this.lastSentence = text;
				this.lastShownAt = Date.now();
				this.current = { text, tag: STYLE_TAG[s.style] || "", kind: evt.t };
				this.phase = "showing";
				this.notify();
				if (s.sound) playBlip(evt);
				const duration = Math.max(1200, Math.min(10000, s.durationMs));
				this.hideTimer = setTimeout(() => {
					this.hideTimer = null;
					this.beginHide();
				}, duration);
			},
			tick() {
				if (this.phase !== "hidden") return;
				const s = getSettings();
				if (!s.enabled) return;
				if (this.queue.length === 0) return;
				// 优先级事件优先
				let idx = -1;
				for (let i = 0; i < this.queue.length; i++) {
					if (PRIORITY_KINDS.has(this.queue[i].t)) { idx = i; break; }
				}
				if (idx < 0) idx = 0;
				const evt = this.queue.splice(idx, 1)[0];
				const priority = PRIORITY_KINDS.has(evt.t);
				const minGap = priority ? 350 : (FREQ_MS[s.frequency] || 2200);
				const wait = minGap - (Date.now() - this.lastShownAt);
				if (wait > 0) {
					this.showTimer = setTimeout(() => { this.showTimer = null; this.tick(); }, wait);
					return;
				}
				const text = sentenceFor(evt, s.style, this.lastSentence);
				if (!text) { this.tick(); return; } // 未知事件类型：丢弃
				this.show(evt, text);
			},
			preview() {
				this.clearTimers();
				const s = getSettings();
				const evt = { t: "preview" };
				this.current = { text: PREVIEW_TEXT[s.style] || PREVIEW_TEXT.esports, tag: STYLE_TAG[s.style] || "", kind: "preview" };
				this.phase = "showing";
				this.notify();
				const duration = Math.max(1200, Math.min(10000, s.durationMs));
				this.hideTimer = setTimeout(() => {
					this.hideTimer = null;
					this.beginHide();
				}, duration);
			},
		};

		// ── 极轻提示音（Web Audio 本地合成，默认关闭）────────────────────────
		let audioCtx = null;
		function playBlip(evt) {
			try {
				const W = typeof window !== "undefined" ? window : null;
				const AC = W && (W.AudioContext || W.webkitAudioContext);
				if (!AC) return;
				if (!audioCtx) audioCtx = new AC();
				const ctx = audioCtx;
				if (ctx.state === "suspended") { void ctx.resume(); return; }
				const t0 = ctx.currentTime;
				const osc = ctx.createOscillator();
				const gain = ctx.createGain();
				osc.type = "sine";
				osc.frequency.setValueAtTime(evt && evt.t === "tool-error" ? 330 : evt && evt.t === "done" ? 880 : 660, t0);
				gain.gain.setValueAtTime(0.02, t0);
				gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.09);
				osc.connect(gain);
				gain.connect(ctx.destination);
				osc.start(t0);
				osc.stop(t0 + 0.1);
			} catch { /* ignore */ }
		}

		// ── 轮询 Host 事件（同源短轮询）───────────────────────────────────────
		let activeSession = null;
		let pollDisposed = false;
		let pollingStarted = false;
		function setActiveSession(id) { activeSession = id; }
		function startPolling() {
			if (pollingStarted) return; // 已启动（防止重复 apply）
			pollingStarted = true;
			pollDisposed = false;
			const loop = async () => {
				while (!pollDisposed) {
					let events = [];
					try {
						const url = activeSession
							? POLL_URL + "?session=" + encodeURIComponent(activeSession)
							: POLL_URL;
						const res = await fetch(url, { cache: "no-store" });
						if (res.ok) {
							const data = await res.json();
							if (data && Array.isArray(data.events)) events = data.events;
						}
					} catch { /* 本地连接瞬断：下一轮重试 */ }
					if (pollDisposed) break;
					if (events.length) controller.enqueue(events);
					await new Promise((r) => setTimeout(r, 700));
				}
			};
			void loop();
		}
		function stopPolling() { pollDisposed = true; pollingStarted = false; }

		// ── 样式（跟随 DSH 主题变量，浅色/深色自适应；无远程资源）──────────────
		const CSS = `
.dsc-caption{position:fixed;right:18px;bottom:96px;z-index:5;max-width:min(360px,calc(100vw - 36px));display:flex;align-items:center;gap:8px;padding:8px 12px;border-radius:10px;background:var(--dsw-alias-bg-overlay,#222);border:1px solid var(--dsw-alias-border-l2,rgba(127,127,127,.35));color:var(--dsw-alias-label-primary,#eee);box-shadow:0 6px 18px rgba(0,0,0,.18);font-size:13px;line-height:1.5;pointer-events:none;transition:opacity .18s ease,transform .18s ease;will-change:opacity,transform}
.dsc-caption[data-phase="showing"]{opacity:1;transform:translateY(0)}
.dsc-caption[data-phase="hiding"]{opacity:0;transform:translateY(8px)}
.dsc-tag{flex:none;font-size:11px;line-height:1.6;padding:0 7px;border-radius:999px;background:rgba(127,127,127,.14);background:color-mix(in srgb,var(--dsw-alias-brand-primary,#4f8cff) 16%,transparent);color:var(--dsw-alias-brand-primary,#4f8cff);border:1px solid rgba(127,127,127,.25)}
.dsc-text{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dsc-settings{display:flex;flex-direction:column;gap:12px;padding:4px 2px;font-size:13px;max-width:420px}
.dsc-row{display:flex;align-items:center;justify-content:space-between;gap:12px}
.dsc-row-label{color:var(--dsw-alias-label-primary,#eee)}
.dsc-row select{background:var(--dsw-alias-bg-layer-1,#1b1b1f);color:var(--dsw-alias-label-primary,#eee);border:1px solid var(--dsw-alias-border-l2,rgba(127,127,127,.35));border-radius:6px;padding:4px 8px;font-size:13px}
.dsc-row input[type="checkbox"]{width:16px;height:16px;accent-color:var(--dsw-alias-brand-primary,#4f8cff)}
.dsc-actions{display:flex;gap:8px;margin-top:2px}
.dsc-btn{background:var(--dsw-alias-bg-layer-2,#26262c);color:var(--dsw-alias-label-primary,#eee);border:1px solid var(--dsw-alias-border-l2,rgba(127,127,127,.35));border-radius:6px;padding:5px 12px;font-size:13px;cursor:pointer}
.dsc-btn:hover{border-color:var(--dsw-alias-brand-primary,#4f8cff)}
@media (prefers-reduced-motion:reduce){.dsc-caption{transition:none}}
`;

		function injectStyles() {
			try {
				if (typeof document === "undefined") return null;
				let tag = document.getElementById(CSS_TAG_ID);
				if (!tag) {
					tag = document.createElement("style");
					tag.id = CSS_TAG_ID;
					tag.dataset.plugin = "dsh-commentator";
					tag.textContent = CSS;
					document.head.appendChild(tag);
				}
				return () => {
					try { if (tag && tag.parentNode) tag.parentNode.removeChild(tag); } catch { /* ignore */ }
				};
			} catch { return null; }
		}

		// ── 字幕条组件（shell.overlay 入口，右下角，点击穿透）─────────────────
		function CaptionBar(props) {
			const useSessions = props && props.useSessions;
			const currentSession = useSessions
				? useSessions((st) => (st && st.current) || null)
				: undefined;
			const [, setTick] = React.useState(0);

			React.useEffect(() => controller.subscribe(() => setTick((n) => n + 1)), []);

			React.useEffect(() => {
				if (typeof currentSession === "string" && currentSession) setActiveSession(currentSession);
			}, [currentSession]);

			const s = getSettings();
			const item = controller.current;
			if (!s.enabled || !item || controller.phase === "hidden") return null;

			const attrs = {
				className: "dsc-caption",
				"data-phase": controller.phase,
				key: "caption",
			};
			if (s.announce) {
				attrs.role = "status";
				attrs["aria-live"] = "polite";
				attrs["aria-atomic"] = "true";
			} else {
				attrs["aria-hidden"] = "true";
			}
			return React.createElement(
				"div", attrs,
				React.createElement("span", { className: "dsc-tag", key: "tag" }, item.tag),
				React.createElement("span", { className: "dsc-text", key: "text" }, item.text),
			);
		}

		// ── 设置页组件（settings.section 入口）────────────────────────────────
		function SettingsSection() {
			const [, setTick] = React.useState(0);
			React.useEffect(() => subscribeSettings(() => setTick((n) => n + 1)), []);
			const s = getSettings();

			const row = (label, control, key) =>
				React.createElement("div", { className: "dsc-row", key },
					React.createElement("span", { className: "dsc-row-label" }, label),
					control,
				);
			const check = (value, onChange) =>
				React.createElement("input", { type: "checkbox", checked: value, onChange: (e) => onChange(e.target.checked) });
			const select = (value, onChange, options) =>
				React.createElement("select", { value, onChange: (e) => onChange(e.target.value) },
					options.map((o) => React.createElement("option", { value: o.value, key: o.value }, o.label)),
				);

			return React.createElement("div", { className: "dsc-settings" },
				row("启用解说", check(s.enabled, (v) => updateSettings({ enabled: v })), "enabled"),
				row("解说风格", select(s.style, (v) => updateSettings({ style: v }), [
					{ value: "esports", label: "电竞解说" },
					{ value: "animal", label: "动物世界" },
					{ value: "deadpan", label: "冷面吐槽" },
				]), "style"),
				row("字幕显示时长", select(String(s.durationMs), (v) => updateSettings({ durationMs: Number(v) }), [
					{ value: "1500", label: "1.5 秒" },
					{ value: "2000", label: "2 秒" },
					{ value: "2600", label: "2.6 秒" },
					{ value: "3500", label: "3.5 秒" },
					{ value: "5000", label: "5 秒" },
				]), "duration"),
				row("出现频率", select(s.frequency, (v) => updateSettings({ frequency: v }), [
					{ value: "low", label: "低" },
					{ value: "medium", label: "中" },
					{ value: "high", label: "高" },
				]), "frequency"),
				row("极轻提示音（默认关闭）", check(s.sound, (v) => updateSettings({ sound: v })), "sound"),
				row("无障碍播报（aria-live）", check(s.announce, (v) => updateSettings({ announce: v })), "announce"),
				React.createElement("div", { className: "dsc-actions", key: "actions" },
					React.createElement("button", { className: "dsc-btn", type: "button", onClick: () => controller.preview() }, "预览字幕"),
					React.createElement("button", { className: "dsc-btn", type: "button", onClick: () => resetSettings() }, "恢复默认设置"),
				),
			);
		}

		// ── 插件入口 ─────────────────────────────────────────────────────────
		const inject = ["slots"];

		function apply(ctx) {
			const slots = ctx.get("slots");

			// 样式注入 + 卸载清理
			if (ctx.effect) {
				ctx.effect(() => {
					const removeStyles = injectStyles();
					startPolling();
					return () => {
						stopPolling();
						controller.clearTimers();
						if (removeStyles) removeStyles();
					};
				});
			}

			// 字幕条：shell.overlay（frame-wide 悬浮层，点击穿透，不遮挡输入框）
			if (slots) {
				slots.inject("shell.overlay", () =>
					slots.register(
						{ name: "shell.overlay", id: "dsh-commentator", order: 900 },
						(props) => React.createElement(CaptionBar, props),
					),
				);
				// 设置页：settings.section（独立设置页）
				slots.inject("settings.section", () =>
					slots.register(
						{ name: "settings.section", id: "dsh-commentator", order: 400, label: "Agent 解说员" },
						() => React.createElement(SettingsSection, null),
					),
				);
			}
		}

		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	},
});
