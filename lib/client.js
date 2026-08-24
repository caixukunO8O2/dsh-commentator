/**
 * dsh-commentator — browser half（v2，安装包格式 ModuleLoader bundle）。
 *
 * Agent 体育解说员：右下角解说字幕条 + 设置页（含自定义人物卡）。
 *
 * v2：
 *   - 自定义人物（名称/表情/基础风格/口头禅/完成台词）
 *   - 思考计时、连击连败、子代理登场退场解说（事件由 Host 下发）
 *   - SSE 常驻连接实时推送（EventSource 自动重连），/poll 每 8s 兜底
 *
 * 隐私：只消费 Host 下发的 { t, tool, n?, ok? }；不读任何对话/文件/命令内容。
 * 不加载远程资源；提示音由 Web Audio 本地合成，默认关闭。
 */

window.__ModuleLoader__.load({
	id: "dsh-commentator",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });

		const React = require("react");

		// ── 常量 ─────────────────────────────────────────────────────────────
		const STREAM_URL = "/dsh-commentator/stream";
		const POLL_URL = "/dsh-commentator/poll";
		const STORAGE_KEY = "dsh-commentator:settings";
		const CSS_TAG_ID = "dsh-commentator-styles";
		const FREQ_MS = { low: 4200, medium: 2200, high: 900 };
		const PRIORITY_KINDS = new Set(["approval", "done", "tool-error", "streak-fail"]);
		const DEFAULT_SETTINGS = Object.freeze({
			enabled: true, character: "blaze", durationMs: 2600, frequency: "medium",
			sound: false, announce: true,
			customName: "", customEmoji: "✨", customBase: "esports", customLines: [], customDone: [],
		});
		const CHARACTERS = Object.freeze({
			blaze: { name: "疾风", emoji: "🎤", style: "esports" },
			naturalist: { name: "自然探员", emoji: "🦉", style: "animal" },
			deadpan: { name: "冷淡", emoji: "🖥️", style: "deadpan" },
		});

		// ── 三种基础文案风格 ─────────────────────────────────────────────────
		const PHRASES = {
			esports: {
				thinking: ["选手开始分析局势了！", "比赛正式开始，Agent 正在快速思考！", "镜头给到我们的选手，它正在规划下一步操作。", "裁判就位，选手开始读图了！", "局势瞬息万变，Agent 正在飞速运算！"],
				"tool-read": ["漂亮的文件读取，关键信息正在浮出水面！", "这一手文件阅读非常果断，信息差就此拉开！", "Agent 快速翻阅档案，寻找制胜线索！", "读取成功，这波情报价值千金！"],
				"tool-write": ["Agent 落笔了！这一改可能是本局关键！", "漂亮的修改，代码正在向胜利靠拢！", "创建文件成功，新版图正在展开！", "这一手改动堪称神来之笔！"],
				"tool-search": ["搜索技能发动，Agent 正在扫描全场！", "漂亮的搜索，线索正在汇聚！", "Agent 在信息流中精准定位目标！", "搜索展开，答案呼之欲出！"],
				"tool-terminal": ["终端已经启动，这一步风险与机会并存！", "Agent 进入命令行战场，手速拉满！", "终端操作，快节奏对拼开始！", "这一波终端输出，直接决定走向！"],
				"tool-delegate": ["召唤队友！Agent 启动了多人战术！", "派出辅助选手，团队协作展开！", "Agent 呼叫了支援，这波是团队作战！"],
				"tool-ask": ["Agent 向观众提问了！现场互动环节！", "选手暂停比赛，向教练确认战术！"],
				"tool-other": ["Agent 使出了新招式！", "这波操作出人意料！", "注意看，Agent 又有新动作！"],
				success: ["测试通过！这是一波精彩操作！", "漂亮！执行成功，全场欢呼！", "这一波稳了！", "漂亮的操作，完美的执行力！", "成功！Agent 状态火热！"],
				error: ["出现失误，但比赛还没有结束！", "哎呀，这波操作失误了！", "局势出现变数，Agent 需要冷静！", "失误不可怕，调整节奏继续冲！", "这一波翻车了，但胜负未分！"],
				approval: ["比赛暂停！Agent 在等待教练（你）的指示！", "关键决策时刻，等待主教练拍板！", "暂停！选手看向观众席请求批准！"],
				done: ["任务完成，选手稳稳拿下这一局！", "漂亮！比赛结束，Agent 锁定胜局！", "GG！完美收官，恭喜选手！", "任务完成，全场响起胜利的欢呼！"],
				slow: ["这波思考有点久，裁判开始看表了！", "长时间的沉默，选手在憋大招吗？", "局势僵持，Agent 迟迟没有动作……"],
				"streak-suc": ["{n} 连杀！Agent 势不可挡！", "漂亮，已经 {n} 连胜了，对手心态崩了！", "{n} 连击达成，全场沸腾！"],
				"streak-fail": ["{n} 连败！教练要叫暂停了！", "糟糕，连续 {n} 次失误，士气受挫！", "{n} 连失，Agent 需要冷静下来！"],
				"delegate-start": ["召唤队友！辅助选手登场！", "替补上阵，战术执行开始！", "Agent 呼叫了支援！"],
				"delegate-end": ["辅助选手完成任务，回归大部队！", "队友归位，战局重新聚焦！", "支援完成，主攻手重新接管比赛！"],
			},
			animal: {
				thinking: ["Agent 静静地观察着四周，思考下一步行动。", "它竖起耳朵，仔细倾听环境的声音。", "这只 Agent 正在评估眼前的地形。", "它停下来，用敏锐的目光扫过整片区域。"],
				"tool-read": ["Agent 小心翼翼地接近了 package.json。", "它翻动文件，寻找隐藏在代码深处的线索。", "它用爪子翻开一页页文档，不放过任何细节。", "它低下头，仔细阅读着这片领地留下的标记。"],
				"tool-write": ["它开始搭建自己的巢穴，一砖一瓦都很认真。", "Agent 在土地上留下了新的爪印。", "它谨慎地修改着领地边界，确保万无一失。", "巢穴初具雏形，Agent 满意地退后两步看了看。"],
				"tool-search": ["它四处嗅探，搜索猎物的气息。", "Agent 展开搜索，像猎手一样耐心。", "它在草丛中仔细翻找，不放过任何痕迹。", "侦察开始，它竖起尾巴保持警觉。"],
				"tool-terminal": ["它钻进了神秘的洞穴，里面传来机器轰鸣声。", "Agent 进入了地下通道，脚步坚定。", "它熟练地操作着洞穴里的机关。", "洞穴深处传来回应，Agent 屏住呼吸。"],
				"tool-delegate": ["它发出呼唤，召唤同族前来支援。", "Agent 呼叫了同伴，群体协作开始了。", "一声长啸，援军正在赶来。"],
				"tool-ask": ["它停下来，歪着头看向管理员。", "Agent 发出了疑问的叫声。", "它停下来等待投喂者的指示。"],
				"tool-other": ["Agent 使出了独特的生存技巧。", "它做出一个让人意想不到的动作。", "它尝试了一种新的觅食方式。"],
				success: ["经过一番搏斗，这只 Bug 终于失去了抵抗。", "捕获成功！Agent 叼着战利品凯旋。", "它稳稳地落回地面，任务圆满完成。", "猎食成功，今天的收获很不错。", "它满意地打了个滚，计划顺利推进。"],
				error: ["面对报错，它没有退缩，而是再次观察环境。", "猎物挣脱了！Agent 舔了舔爪子，重新匍匐下来。", "陷阱失手了，但它很快调整了姿势。", "它摔了一跤，爬起来抖了抖毛，继续前进。"],
				approval: ["它停下脚步，回头望向管理员，等待允许。", "Agent 蹲坐在原地，乖巧地等待指令。", "它叼着战利品，用期待的眼神看着主人。"],
				done: ["任务完成，Agent 回到了熟悉的栖息地。", "它心满意足地回到巢穴，今天的任务结束了。", "Agent 优雅地收起爪子，完美收官。", "它打了个哈欠，准备享受劳动成果。"],
				slow: ["它蹲在原地一动不动，像在冥想。", "这只 Agent 陷入沉思，连尾巴都停住了。", "它在原地打转，似乎在寻找灵感。"],
				"streak-suc": ["它连续捕获了 {n} 只猎物，收获颇丰！", "{n} 次成功，它的眼神越来越自信。", "一连 {n} 次得手，它得意地摇起了尾巴。"],
				"streak-fail": ["它连续失手 {n} 次，有些沮丧地低下了头。", "{n} 次扑空，它开始重新评估猎场。", "两次落空，它放慢了脚步，变得更谨慎。"],
				"delegate-start": ["它发出呼唤，同族闻声赶来。", "一声长啸，援军已经到位。", "它召集了同伴，猎捕开始。"],
				"delegate-end": ["同伴带着成果归队，相互打了个照面。", "援军完成任务，它满意地舔了舔爪子。", "队伍重新集结，继续巡逻领地。"],
			},
			deadpan: {
				thinking: ["它开始思考了。但愿这次想得比较久。", "Agent 进入了沉思。这通常是暴风雨前的宁静。", "它正在权衡。好消息是，至少它在权衡。", "思考中。我不抱太大期望。"],
				"tool-read": ["它又打开了 package.json。事情开始变得熟悉。", "文件读取中。希望它这次看仔细点。", "它又开始翻文件了，比上次多了几分执着。", "阅读文件。人类的习惯它倒是学得挺快。"],
				"tool-write": ["修改成功。暂时没有制造新的问题。", "它往文件里加了点东西。希望不是乱码。", "文件写入了。风险自担。", "它自信地提交了改动。它总是很自信。"],
				"tool-search": ["开始搜索。它管这叫「研究」。", "它去翻资料了。希望别又搜到十年前的回答。", "搜索中，目标明确，结果待定。", "它说它在找线索。姑且信它。"],
				"tool-terminal": ["正在执行命令。希望它知道自己在做什么。", "终端启动了。紧张的人是我。", "又跑命令了。每次都像第一次一样刺激。", "命令执行中。系统日志表示很淡定。"],
				"tool-delegate": ["它呼叫了支援。一个人搞不定开始叫人了。", "派出子代理。这算不算把活外包给自己？", "它决定多找几个自己来帮忙。"],
				"tool-ask": ["它问用户问题了。行吧，总比瞎猜强。", "它停下来征求意见。进步，虽然只有一点点。", "Agent 在提问。看来默认值不够用了。"],
				"tool-other": ["它又使出了不知道什么招数。", "新动作。每次都有新惊喜，虽然不都是好消息。", "它在做某件事。具体是什么，别问我。"],
				success: ["测试通过。至少报错还算诚实。", "执行成功。奇迹也是会发生的。", "成功了。我假装不惊讶。", "一切正常。反常得让人不安。"],
				error: ["测试失败了。至少报错还算诚实。", "出错了。意料之中，但还是要装作惊讶。", "报错信息写得挺清楚。这是今天唯一的亮点。", "它搞砸了。没关系，反正也不是第一次。"],
				approval: ["它停下来等人批准。谨慎，或者说拖延。", "Agent 在等许可。好在这个流程能拦住它。", "它请求批准了。这是它今天最靠谱的一步。"],
				done: ["任务完成。居然一次也没要求重装系统。", "结束了。没有把环境搞坏，堪称奇迹。", "收工。剩下的就交给验收了，祝它好运。", "任务完成。我本来想更惊讶一点的。"],
				slow: ["思考超过 12 秒了。希望不是卡了。", "它很久没动静。好消息是，至少还活着。", "沉默中。我替它着急，它自己不急。"],
				"streak-suc": ["{n} 连成了。难得一见。", "居然连续 {n} 次成功，我该去买彩票。", "{n} 连胜，它开始膨胀了。"],
				"streak-fail": ["{n} 连败。它大概已经习惯了。", "连续失败 {n} 次，报错都懒得换了。", "{n} 次失误，它倒是很淡定。"],
				"delegate-start": ["它又叫人了。一个人真搞不定。", "开了个子代理。外包给自己系列。", "呼叫支援。虽然大概率是帮倒忙。"],
				"delegate-end": ["子代理回来了。活干没干完另说。", "援军归队。希望没添乱。", "支援结束。清点一下战果……好，就这样吧。"],
			},
		};
		const PREVIEW_TEXT = {
			esports: "测试通过！这是一波精彩操作！",
			animal: "它满意地打了个滚，计划顺利推进。",
			deadpan: "任务完成。居然一次也没要求重装系统。",
		};

		// ── 设置存取（浏览器本地 localStorage）────────────────────────────────
		let settings = loadSettings();
		const settingsListeners = new Set();
		function strList(v) {
			if (!Array.isArray(v)) return [];
			return v.filter((x) => typeof x === "string" && x.trim()).map((x) => x.trim()).slice(0, 20);
		}
		function sanitizeSettings(o) {
			const base = { ...DEFAULT_SETTINGS };
			if (!o || typeof o !== "object") return base;
			base.enabled = o.enabled !== false;
			if (o.character === "blaze" || o.character === "naturalist" || o.character === "deadpan" || o.character === "custom") base.character = o.character;
			const d = Number(o.durationMs);
			if (d >= 1000 && d <= 10000) base.durationMs = Math.round(d);
			if (o.frequency === "low" || o.frequency === "medium" || o.frequency === "high") base.frequency = o.frequency;
			base.sound = o.sound === true;
			base.announce = o.announce !== false;
			base.customName = typeof o.customName === "string" ? o.customName.slice(0, 12) : "";
			base.customEmoji = typeof o.customEmoji === "string" && o.customEmoji.trim() ? o.customEmoji.trim().slice(0, 4) : "✨";
			if (o.customBase === "esports" || o.customBase === "animal" || o.customBase === "deadpan") base.customBase = o.customBase;
			base.customLines = strList(o.customLines);
			base.customDone = strList(o.customDone);
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
			try { if (typeof localStorage !== "undefined") localStorage.setItem(STORAGE_KEY, JSON.stringify(settings)); } catch { /* ignore */ }
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
		function subscribeSettings(fn) { settingsListeners.add(fn); return () => settingsListeners.delete(fn); }

		// ── 人物解析 ─────────────────────────────────────────────────────────
		function activeCharacter() {
			if (settings.character === "custom") {
				return { name: settings.customName || "无名解说", emoji: settings.customEmoji, style: settings.customBase, custom: true, catchLines: settings.customLines, doneLines: settings.customDone };
			}
			return CHARACTERS[settings.character] || CHARACTERS.blaze;
		}

		// ── 文案选取 ─────────────────────────────────────────────────────────
		function pickOne(arr, last) {
			if (!arr || arr.length === 0) return "";
			if (arr.length === 1) return arr[0];
			let idx = Math.floor(Math.random() * arr.length);
			if (arr[idx] === last) idx = (idx + 1) % arr.length;
			return arr[idx];
		}
		function kindKey(evt) {
			switch (evt.t) {
				case "thinking": return "thinking";
				case "tool-start": return "tool-" + evt.tool;
				case "tool-success": return "success";
				case "tool-error": return "error";
				case "approval": return "approval";
				case "done": return "done";
				case "slow": return "slow";
				case "streak-suc": return "streak-suc";
				case "streak-fail": return "streak-fail";
				case "delegate-start": return "delegate-start";
				case "delegate-end": return "delegate-end";
				default: return null;
			}
		}
		function sentenceFor(evt, last) {
			const char = activeCharacter();
			const table = PHRASES[char.style] || PHRASES.esports;
			const key = kindKey(evt);
			if (key === null) return null;
			let bucket = null;
			if (evt.t === "done" && char.custom && char.doneLines && char.doneLines.length) bucket = char.doneLines;
			if (!bucket) bucket = table[key] || table["tool-other"] || [];
			let text = pickOne(bucket, last);
			if (char.custom && char.catchLines && char.catchLines.length && evt.t !== "done" && evt.t !== "preview" && Math.random() < 0.15) {
				text = pickOne(char.catchLines, last);
			}
			if (text) text = text.replace(/\{n\}/g, String(evt.n != null ? evt.n : ""));
			return text;
		}

		// ── 字幕控制器（节流 + 优先级 + 淡出；普通 setTimeout）────────────────
		const controller = {
			queue: [], current: null, phase: "hidden", lastShownAt: 0, lastSentence: "",
			showTimer: null, hideTimer: null, listeners: new Set(),
			subscribe(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); },
			notify() { for (const fn of this.listeners) fn(); },
			clearTimers() {
				if (this.showTimer) { clearTimeout(this.showTimer); this.showTimer = null; }
				if (this.hideTimer) { clearTimeout(this.hideTimer); this.hideTimer = null; }
			},
			enqueue(events) {
				for (const e of events) if (e && typeof e.t === "string") this.queue.push(e);
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
				const char = activeCharacter();
				this.lastSentence = text;
				this.lastShownAt = Date.now();
				this.current = { text, tag: char.emoji + " " + char.name, kind: evt.t };
				this.phase = "showing";
				this.notify();
				if (getSettings().sound) playBlip(evt);
				const duration = Math.max(1200, Math.min(10000, getSettings().durationMs));
				this.hideTimer = setTimeout(() => { this.hideTimer = null; this.beginHide(); }, duration);
			},
			tick() {
				if (this.phase !== "hidden") return;
				const s = getSettings();
				if (!s.enabled) return;
				if (this.queue.length === 0) return;
				let idx = -1;
				for (let i = 0; i < this.queue.length; i++) if (PRIORITY_KINDS.has(this.queue[i].t)) { idx = i; break; }
				if (idx < 0) idx = 0;
				const evt = this.queue.splice(idx, 1)[0];
				const priority = PRIORITY_KINDS.has(evt.t);
				const minGap = priority ? 350 : (FREQ_MS[s.frequency] || 2200);
				const wait = minGap - (Date.now() - this.lastShownAt);
				if (wait > 0) { this.showTimer = setTimeout(() => { this.showTimer = null; this.tick(); }, wait); return; }
				const text = sentenceFor(evt, this.lastSentence);
				if (!text) { this.tick(); return; }
				this.show(evt, text);
			},
			preview() {
				this.clearTimers();
				const s = getSettings();
				const char = activeCharacter();
				this.current = { text: PREVIEW_TEXT[char.style] || PREVIEW_TEXT.esports, tag: char.emoji + " " + char.name, kind: "preview" };
				this.phase = "showing";
				this.notify();
				const duration = Math.max(1200, Math.min(10000, s.durationMs));
				this.hideTimer = setTimeout(() => { this.hideTimer = null; this.beginHide(); }, duration);
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
				const ac = audioCtx;
				if (ac.state === "suspended") { void ac.resume(); return; }
				const t0 = ac.currentTime;
				const osc = ac.createOscillator();
				const gain = ac.createGain();
				osc.type = "sine";
				const kind = evt && evt.t;
				osc.frequency.setValueAtTime(kind === "tool-error" || kind === "streak-fail" ? 330 : kind === "done" ? 880 : 660, t0);
				gain.gain.setValueAtTime(0.02, t0);
				gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.09);
				osc.connect(gain);
				gain.connect(ac.destination);
				osc.start(t0);
				osc.stop(t0 + 0.1);
			} catch { /* ignore */ }
		}

		// ── 传输：SSE 实时 + /poll 兜底 ──────────────────────────────────────
		let activeSession = null;
		let es = null;
		let fallbackTimer = null;
		function handleEvents(events) {
			if (events && events.length) controller.enqueue(events);
		}
		function connectStream(sessionId) {
			if (es) { es.close(); es = null; }
			if (!sessionId) return;
			try {
				const url = STREAM_URL + "?session=" + encodeURIComponent(sessionId);
				es = new EventSource(url);
				es.onmessage = (e) => { try { handleEvents(JSON.parse(e.data).events); } catch { /* ignore */ } };
				es.onerror = () => { /* EventSource 自动重连 */ };
			} catch { es = null; }
		}
		async function pollOnce() {
			try {
				const url = activeSession ? POLL_URL + "?session=" + encodeURIComponent(activeSession) : POLL_URL;
				const res = await fetch(url, { cache: "no-store" });
				if (res.ok) handleEvents((await res.json()).events);
			} catch { /* ignore */ }
		}
		function startTransport() {
			connectStream(activeSession);
			fallbackTimer = setInterval(() => { void pollOnce(); }, 8000);
		}
		function stopTransport() {
			if (es) { es.close(); es = null; }
			if (fallbackTimer) { clearInterval(fallbackTimer); fallbackTimer = null; }
		}

		// ── 样式（跟随 DSH 主题变量；浅色/深色自适应；prefers-reduced-motion）──
		const CSS = `
.dsc-caption{position:fixed;right:18px;bottom:96px;z-index:5;max-width:min(380px,calc(100vw - 36px));display:flex;align-items:center;gap:8px;padding:8px 12px;border-radius:10px;background:var(--dsw-alias-bg-overlay,#222);border:1px solid var(--dsw-alias-border-l2,rgba(127,127,127,.35));color:var(--dsw-alias-label-primary,#eee);box-shadow:0 6px 18px rgba(0,0,0,.18);font-size:13px;line-height:1.5;pointer-events:none;transition:opacity .18s ease,transform .18s ease;will-change:opacity,transform}
.dsc-caption[data-phase="showing"]{opacity:1;transform:translateY(0)}
.dsc-caption[data-phase="hiding"]{opacity:0;transform:translateY(8px)}
.dsc-tag{flex:none;font-size:11px;line-height:1.6;padding:0 7px;border-radius:999px;background:rgba(127,127,127,.14);color:var(--dsw-alias-brand-primary,#4f8cff);border:1px solid rgba(127,127,127,.25);white-space:nowrap}
.dsc-text{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dsc-caption[data-kind="tool-error"],.dsc-caption[data-kind="streak-fail"]{border-left:3px solid var(--dsw-alias-state-error-primary,#e5484d)}
.dsc-caption[data-kind="tool-success"],.dsc-caption[data-kind="streak-suc"]{border-left:3px solid var(--dsw-alias-state-success-primary,#30a46c)}
.dsc-caption[data-kind="done"]{border-left:3px solid var(--dsw-alias-brand-primary,#4f8cff)}
.dsc-settings{display:flex;flex-direction:column;gap:12px;padding:4px 2px;font-size:13px;max-width:460px}
.dsc-row{display:flex;align-items:center;justify-content:space-between;gap:12px}
.dsc-row-label{color:var(--dsw-alias-label-primary,#eee)}
.dsc-row select,.dsc-row input[type="text"]{background:var(--dsw-alias-bg-layer-1,#1b1b1f);color:var(--dsw-alias-label-primary,#eee);border:1px solid var(--dsw-alias-border-l2,rgba(127,127,127,.35));border-radius:6px;padding:4px 8px;font-size:13px;max-width:200px}
.dsc-row input[type="checkbox"]{width:16px;height:16px;accent-color:var(--dsw-alias-brand-primary,#4f8cff)}
.dsc-block{display:flex;flex-direction:column;gap:6px}
.dsc-block textarea{background:var(--dsw-alias-bg-layer-1,#1b1b1f);color:var(--dsw-alias-label-primary,#eee);border:1px solid var(--dsw-alias-border-l2,rgba(127,127,127,.35));border-radius:6px;padding:6px 8px;font-size:13px;resize:vertical;min-height:60px;line-height:1.6}
.dsc-hint{font-size:12px;color:var(--dsw-alias-label-secondary,#999)}
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
				return () => { try { if (tag && tag.parentNode) tag.parentNode.removeChild(tag); } catch { /* ignore */ } };
			} catch { return null; }
		}

		// ── 字幕条组件 ───────────────────────────────────────────────────────
		function CaptionBar(props) {
			const useSessions = props && props.useSessions;
			const currentSession = useSessions ? useSessions((st) => (st && st.current) || null) : undefined;
			const [, setTick] = React.useState(0);

			React.useEffect(() => controller.subscribe(() => setTick((n) => n + 1)), []);

			React.useEffect(() => {
				if (typeof currentSession === "string" && currentSession && currentSession !== activeSession) {
					activeSession = currentSession;
					connectStream(currentSession);
				}
			}, [currentSession]);

			const s = getSettings();
			const item = controller.current;
			if (!s.enabled || !item || controller.phase === "hidden") return null;

			const attrs = { className: "dsc-caption", "data-phase": controller.phase, "data-kind": item.kind };
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

		// ── 设置页组件 ───────────────────────────────────────────────────────
		function textareaLines(value, onChange) {
			return React.createElement("textarea", {
				value: value.join("\n"),
				placeholder: "每行一条台词",
				onChange: (e) => onChange(e.target.value.split("\n").map((x) => x.trim()).filter(Boolean)),
			});
		}
		function SettingsSection() {
			const [, setTick] = React.useState(0);
			React.useEffect(() => subscribeSettings(() => setTick((n) => n + 1)), []);
			const s = getSettings();
			const char = activeCharacter();

			const row = (label, control, key) =>
				React.createElement("div", { className: "dsc-row", key },
					React.createElement("span", { className: "dsc-row-label" }, label), control);
			const check = (value, onChange) =>
				React.createElement("input", { type: "checkbox", checked: value, onChange: (e) => onChange(e.target.checked) });
			const select = (value, onChange, options) =>
				React.createElement("select", { value, onChange: (e) => onChange(e.target.value) },
					options.map((o) => React.createElement("option", { value: o.value, key: o.value }, o.label)));

			return React.createElement("div", { className: "dsc-settings" },
				React.createElement("div", { className: "dsc-hint", key: "char-now" }, "当前人物：" + char.emoji + " " + char.name),
				row("启用解说", check(s.enabled, (v) => updateSettings({ enabled: v })), "enabled"),
				row("解说人物", select(s.character, (v) => updateSettings({ character: v }), [
					{ value: "blaze", label: "疾风 🎤 · 电竞" },
					{ value: "naturalist", label: "自然探员 🦉 · 动物世界" },
					{ value: "deadpan", label: "冷淡 🖥️ · 吐槽" },
					{ value: "custom", label: "自定义 ✨" },
				]), "character"),
				(s.character === "custom" ? React.createElement(React.Fragment, { key: "custom" }, [
					row("人物名称", React.createElement("input", { type: "text", value: s.customName, placeholder: "给解说员起个名字", maxLength: 12, onChange: (e) => updateSettings({ customName: e.target.value }) }), "cname"),
					row("表情", React.createElement("input", { type: "text", value: s.customEmoji, maxLength: 4, onChange: (e) => updateSettings({ customEmoji: e.target.value }) }), "cemoji"),
					row("基础文案风格", select(s.customBase, (v) => updateSettings({ customBase: v }), [
						{ value: "esports", label: "电竞解说" },
						{ value: "animal", label: "动物世界" },
						{ value: "deadpan", label: "冷面吐槽" },
					]), "cbase"),
					React.createElement("div", { className: "dsc-block", key: "clines" },
						React.createElement("span", { className: "dsc-row-label" }, "个性口头禅（随机穿插）"),
						textareaLines(s.customLines, (v) => updateSettings({ customLines: v }))),
					React.createElement("div", { className: "dsc-block", key: "cdone" },
						React.createElement("span", { className: "dsc-row-label" }, "任务完成台词（可选）"),
						textareaLines(s.customDone, (v) => updateSettings({ customDone: v }))),
				]) : null),
				row("字幕显示时长", select(String(s.durationMs), (v) => updateSettings({ durationMs: Number(v) }), [
					{ value: "1500", label: "1.5 秒" }, { value: "2000", label: "2 秒" }, { value: "2600", label: "2.6 秒" },
					{ value: "3500", label: "3.5 秒" }, { value: "5000", label: "5 秒" },
				]), "duration"),
				row("出现频率", select(s.frequency, (v) => updateSettings({ frequency: v }), [
					{ value: "low", label: "低" }, { value: "medium", label: "中" }, { value: "high", label: "高" },
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
			if (ctx.effect) {
				ctx.effect(() => {
					const removeStyles = injectStyles();
					startTransport();
					return () => {
						stopTransport();
						controller.clearTimers();
						if (removeStyles) removeStyles();
					};
				});
			}
			if (slots) {
				slots.inject("shell.overlay", () =>
					slots.register(
						{ name: "shell.overlay", id: "dsh-commentator", order: 900 },
						(props) => React.createElement(CaptionBar, props),
					),
				);
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
