/**
 * dsh-commentator — browser half (v4).
 * Pet: user-inputted ANY emoji (not SVG). Commentary: 3-8 chars, punchy.
 * All CSS animations, no remote assets.
 */
window.__ModuleLoader__.load({
	id: "dsh-commentator",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		const React = require("react");

		const SK='dsh-commentator:settings';
		const FM={low:4200,medium:2200,high:900};
		const PR=new Set(['approval','done','tool-error','streak-fail']);
		const DF={enabled:true,character:'blaze',durationMs:2600,frequency:'medium',sound:false,announce:true,customName:'',customEmoji:'✨',customBase:'esports',customLines:[],customDone:[],petEnabled:true,petEmoji:'🦊',petName:'',petSize:'normal'};
		const CH={blaze:{n:'疾风',e:'🎤',s:'esports'},nat:{n:'自然探员',e:'🦉',s:'animal'},dp:{n:'冷淡',e:'🖥️',s:'deadpan'}};
		const EM=['🐱','🐶','🦊','🤖','👾','🐉','💀','🎭','🦄','🎪','🐻','🐧','🐸','👻','🎃','🐲'];const STATS={ops:0,ok:0,err:0};

		const P={esports:{thinking:['分析中…','选手进入状态','读图启动','规划中','开始运算'],'tool-read':['读取文件！','翻开资料','读到重点了','文件内容来了'],'tool-write':['写入！','修改落地','文件更新完成','果断下笔！'],'tool-search':['搜索展开！','线索锁定','雷达全开！','正在扫描'],'tool-terminal':['终端启动！','命令执行中','进入战场！','快节奏操作'],'tool-delegate':['队友登场！','双线作战','派兵支援！'],'tool-ask':['请求指示','暂停请示','等你拍板'],'tool-other':['新操作！','注意这个','出其不意'],success:['✅ 通过了！','漂亮！一次成功','搞定！稳了','执行成功！'],error:['❌ 出错了…','翻车了','失误，但还有机会','失败了'],approval:['⏸ 等你批准','需要你决定','暂停等待中'],done:['🎉 搞定！任务完成！','稳稳拿下！GG！','完美收官！','胜利！🏆'],slow:['🤔 思考有点久…','这步慢了','卡住了？'],'streak-suc':['🔥 {n}连杀！势不可挡！','{n}连胜！状态火热！','⚡ {n}连击达成！'],'streak-fail':['{n}连败…调整节奏','连续{n}次失误'],'delegate-start':['队友登场！','援军就位！'],'delegate-end':['队友归位','支援完成']},animal:{thinking:['停下来观察','竖起耳朵','嗅探中'],'tool-read':['翻开落叶，读到了…','低头嗅了嗅文件','仔细阅读标记'],'tool-write':['开始筑巢！','留下爪印','谨慎修改中'],'tool-search':['嗅探气息…','展开搜索！','锁定目标'],'tool-terminal':['钻进洞穴！','深入未知通道','操作洞穴机关'],'tool-delegate':['呼唤同伴！','一声长啸','猎手集结！'],'tool-ask':['歪头看向你','停下等待','乖巧等指令'],'tool-other':['新动作！','意外举动'],success:['捕获成功！🎯','猎物到手！','稳稳落地'],error:['挣脱了…','陷阱没中','抖抖毛继续前进'],approval:['蹲坐等待指令','乖巧等待中'],done:['回到巢穴，心满意足','完美收官！🌙','任务完成！'],slow:['一动不动，像在冥想','陷入沉思…'],'streak-suc':['{n}连击成功！🎉','连续{n}次得手！'],'streak-fail':['连续{n}次扑空…'],'delegate-start':['同族赶来！','援军到位！'],'delegate-end':['同伴归队','带着收获回来了']},deadpan:{thinking:['在想。不一定有用。','思考中。','它在想事。'],'tool-read':['读文件。老样子。','又在翻代码。','阅读中。'],'tool-write':['写入了。别出错就好','改动提交。','文件更新了。'],'tool-search':['搜索中。结果待定。','翻资料。','扫描索引。'],'tool-terminal':['跑命令了。紧张的是我','终端启动。','执行命令中。'],'tool-delegate':['又叫人了。','开子代理。','呼叫支援。'],'tool-ask':['停下来了，问你呢','等你批准。'],'tool-other':['新动作。','不太懂。'],success:['通过了。不意外','居然成功了。','嗯，还行。'],error:['出错了。','报错挺清楚。','失败了。下次来。'],approval:['等批准。谨慎。','它在等你。'],done:['搞定了。没重装系统。','任务完成。收工。','结束了。居然没出大乱子。'],slow:['超过12秒了。别卡住','还在想。'],'streak-suc':['{n}连成。难得。','连续{n}次成功。膨胀了。'],'streak-fail':['{n}连败。习惯了。'],'delegate-start':['又叫人了。','外包系列。'],'delegate-end':['子代理回来了。','希望没添乱。']}};
		const PT={esports:'✅ 通过了！漂亮！',animal:'捕获成功！🎯',deadpan:'搞定了。没重装系统。'};

		let S=ld(),SL=new Set();
		function sc(o){const b={...DF};if(!o||typeof o!=='object')return b;b.enabled=o.enabled!==false;if(['blaze','naturalist','deadpan','custom'].includes(o.character))b.character=o.character;const d=Number(o.durationMs);if(d>=1000&&d<=10000)b.durationMs=Math.round(d);if(['low','medium','high'].includes(o.frequency))b.frequency=o.frequency;b.sound=o.sound===true;b.announce=o.announce!==false;b.customName=typeof o.customName==='string'?o.customName.slice(0,12):'';b.customEmoji=typeof o.customEmoji==='string'&&o.customEmoji.trim()?o.customEmoji.trim().slice(0,4):'✨';if(['esports','animal','deadpan'].includes(o.customBase))b.customBase=o.customBase;b.customLines=Array.isArray(o.customLines)?o.customLines.filter(x=>typeof x==='string'&&x.trim()).map(x=>x.trim()).slice(0,20):[];b.customDone=Array.isArray(o.customDone)?o.customDone.filter(x=>typeof x==='string'&&x.trim()).map(x=>x.trim()).slice(0,20):[];b.petEnabled=o.petEnabled!==false;if(typeof o.petEmoji==='string'&&o.petEmoji.trim())b.petEmoji=o.petEmoji.trim().slice(0,4);b.petName=typeof o.petName==='string'?o.petName.slice(0,10):'';if(['small','normal','large'].includes(o.petSize))b.petSize=o.petSize;return b}
		function ld(){try{if(typeof localStorage==='undefined')return{...DF};const r=localStorage.getItem(SK);return sc(r?JSON.parse(r):null)}catch{return{...DF}}}
		function sv(){try{if(typeof localStorage!=='undefined')localStorage.setItem(SK,JSON.stringify(S))}catch{}}
		function gs(){return S}
		function us(p){S=sc({...S,...p});sv();for(const fn of SL)fn();cn.tick()}
		function rs(){S={...DF};sv();for(const fn of SL)fn();cn.tick()}
		function ss(fn){SL.add(fn);return()=>SL.delete(fn)}
		function ac(){if(S.character==='custom')return{name:S.customName||'无名',emoji:S.customEmoji,style:S.customBase,custom:true,catchLines:S.customLines,doneLines:S.customDone};return CH[S.character]||CH.blaze}
		function pk(a,l){if(!a||!a.length)return'';if(a.length===1)return a[0];let i=Math.floor(Math.random()*a.length);if(a[i]===l)i=(i+1)%a.length;return a[i]}
		function kk(e){switch(e.t){case'thinking':return'thinking';case'tool-start':return'tool-'+e.tool;case'tool-success':return'success';case'tool-error':return'error';case'approval':return'approval';case'done':return'done';case'slow':return'slow';case'streak-suc':return'streak-suc';case'streak-fail':return'streak-fail';case'delegate-start':return'delegate-start';case'delegate-end':return'delegate-end';default:return null}}
		function sf(e,l){const ch=ac(),t=P[ch.style]||P.esports,k=kk(e);if(!k)return null;let b=null;if(e.t==='done'&&ch.custom&&ch.doneLines&&ch.doneLines.length)b=ch.doneLines;if(!b)b=t[k]||t['tool-other']||[];let tx=pk(b,l);if(ch.custom&&ch.catchLines&&ch.catchLines.length&&e.t!=='done'&&e.t!=='preview'&&Math.random()<.15)tx=pk(ch.catchLines,l);if(tx)tx=tx.replace('{n}',String(e.n!=null?e.n:''));if(e.t==='done'&&STATS.ops>1){var rate=Math.round((STATS.ok/STATS.ops)*100);tx+=' · 本局'+STATS.ops+'次，'+rate+'%成功率';STATS.ops=0;STATS.ok=0;STATS.err=0}return tx}

		let tm=null;
		function mkT(ctx){const a=new Set();return{set(cb,ms){const d=ctx.timeout(()=>{a.delete(d);cb()},ms);a.add(d);return d},clear(d){if(d&&a.delete(d))d()},clearAll(){for(const d of[...a])d();a.clear()}}}
		function ts(cb,ms){return tm?tm.set(cb,ms):null}
		function tc(d){if(d&&tm)tm.clear(d)}

		const cn={queue:[],cur:null,phase:'hidden',lts:0,ls:'',sT:null,hT:null,listeners:new Set(),
		sub(fn){this.listeners.add(fn);return()=>this.listeners.delete(fn)},
		notify(){for(const fn of this.listeners)fn()},
		ct(){if(this.sT){tc(this.sT);this.sT=null}if(this.hT){tc(this.hT);this.hT=null}},
		enq(ev){for(const e of ev)if(e&&typeof e.t==='string'){this.queue.push(e);if(e.t==='tool-success'){STATS.ops++;STATS.ok++}if(e.t==='tool-error'){STATS.ops++;STATS.err++}}if(this.queue.length>32)this.queue.splice(0,this.queue.length-32);this.tick()},
		bh(){this.phase='hiding';this.notify();this.hT=ts(()=>{this.hT=null;this.cur=null;this.phase='hidden';this.notify();this.tick()},280)},
		show(e,tx){const ch=ac();this.ls=tx;this.lts=Date.now();this.cur={text:tx,tag:ch.e+' '+ch.n,kind:e.t};this.phase='showing';this.notify();if(gs().sound)playBlip(e);this.hT=ts(()=>{this.hT=null;this.bh()},Math.max(1200,Math.min(10000,gs().durationMs)))},
		tick(){if(this.phase!=='hidden')return;const s=gs();if(!s.enabled||!this.queue.length)return;let i=-1;for(let x=0;x<this.queue.length;x++)if(PR.has(this.queue[x].t)){i=x;break}if(i<0)i=0;const e=this.queue.splice(i,1)[0];const w=(PR.has(e.t)?350:(FM[s.frequency]||2200))-(Date.now()-this.lts);if(w>0){this.sT=ts(()=>{this.sT=null;this.tick()},w);return}const tx=sf(e,this.ls);if(!tx){this.tick();return}this.show(e,tx)},
		preview(){this.ct();const ch=ac();this.cur={text:PT[ch.style]||PT.esports,tag:ch.e+' '+ch.n,kind:'preview'};this.phase='showing';this.notify();this.hT=ts(()=>{this.hT=null;this.bh()},Math.max(1200,Math.min(10000,gs().durationMs)))}};

		let ax=null;
		function playBlip(e){try{const AC=typeof window!=='undefined'&&window.AudioContext;if(!AC)return;if(!ax)ax=new AC();const a=ax;if(a.state==='suspended'){void a.resume();return}const t=a.currentTime,o=a.createOscillator(),g=a.createGain();o.type='sine';o.frequency.setValueAtTime((e&&(e.t==='tool-error'||e.t==='streak-fail'))?330:((e&&e.t==='done')?880:660),t);g.gain.setValueAtTime(.02,t);g.gain.exponentialRampToValueAtTime(.0001,t+.09);o.connect(g);g.connect(a.destination);o.start(t);o.stop(t+.1)}catch{}}

		let activeSession=null,es=null,fallbackTimer=null;
		function handleEvents(ev){if(ev&&ev.length)cn.enq(ev)}
		function connectStream(sid){if(es){es.close();es=null}if(!sid)return;try{es=new EventSource('/dsh-commentator/stream?session='+encodeURIComponent(sid));es.onmessage=(e)=>{try{handleEvents(JSON.parse(e.data).events)}catch{}};es.onerror=()=>{}}catch{es=null}}
		async function pollOnce(){try{const url=activeSession?'/dsh-commentator/poll?session='+encodeURIComponent(activeSession):'/dsh-commentator/poll';const res=await fetch(url,{cache:'no-store'});if(res.ok)handleEvents((await res.json()).events)}catch{}}
		function startTransport(){connectStream(activeSession);fallbackTimer=setInterval(()=>{void pollOnce()},8000)}
		function stopTransport(){if(es){es.close();es=null}if(fallbackTimer){clearInterval(fallbackTimer);fallbackTimer=null}}

		const CSS='.dsc-stage{position:fixed;right:16px;bottom:84px;z-index:5;display:flex;flex-direction:column;align-items:flex-end;gap:6px;pointer-events:none}.dsc-pet{font-size:var(--dsc-pet-size,72px);line-height:1;filter:drop-shadow(0 3px 8px rgba(0,0,0,.18));transform-origin:50% 100%;transition:font-size .2s}.dsc-pet[data-size=small]{--dsc-pet-size:52px}.dsc-pet[data-size=large]{--dsc-pet-size:96px}.dsc-pet-name{font-size:11px;color:var(--dsw-alias-label-secondary,#999);max-width:110px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:right}.dsc-caption{display:inline-flex;align-items:center;gap:8px;max-width:min(340px,calc(100vw-130px));padding:6px 12px;border-radius:10px;background:var(--dsw-alias-bg-overlay,#222);border:1px solid var(--dsw-alias-border-l2,rgba(127,127,127,.35));color:var(--dsw-alias-label-primary,#eee);box-shadow:0 6px 18px rgba(0,0,0,.18);font-size:13px;line-height:1.4;transition:opacity .18s ease,transform .18s ease;will-change:opacity,transform}.dsc-caption[data-phase=showing]{opacity:1;transform:translateY(0)}.dsc-caption[data-phase=hiding]{opacity:0;transform:translateY(8px)}.dsc-tag{flex:none;font-size:11px;line-height:1.6;padding:0 7px;border-radius:999px;background:rgba(127,127,127,.14);color:var(--dsw-alias-brand-primary,#4f8cff);border:1px solid rgba(127,127,127,.25);white-space:nowrap}.dsc-text{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.dsc-caption[data-kind=tool-error],.dsc-caption[data-kind=streak-fail]{border-left:3px solid var(--dsw-alias-state-error-primary,#e5484d)}.dsc-caption[data-kind=tool-success],.dsc-caption[data-kind=streak-suc]{border-left:3px solid var(--dsw-alias-state-success-primary,#30a46c)}.dsc-caption[data-kind=done]{border-left:3px solid var(--dsw-alias-brand-primary,#4f8cff)}@keyframes dsc-i{0%,100%{transform:translateY(0)}50%{transform:translateY(-3px)}}@keyframes dsc-th{0%,100%{transform:translateY(0) rotate(-2deg)}50%{transform:translateY(-4px) rotate(2deg)}}@keyframes dsc-sw{0%,100%{transform:rotate(-2deg)}50%{transform:rotate(2deg)}}@keyframes dsc-j{0%,100%{transform:translateY(0)}30%{transform:translateY(-18px)}60%{transform:translateY(-4px)}80%{transform:translateY(-10px)}}@keyframes dsc-s{0%,100%{transform:translateX(0)}25%{transform:translateX(-6px)}75%{transform:translateX(6px)}}@keyframes dsc-d{0%,100%{transform:translateY(0) rotate(-5deg)}25%{transform:translateY(-10px) rotate(5deg)}50%{transform:translateY(0) rotate(-5deg)}75%{transform:translateY(-10px) rotate(5deg)}}@keyframes dsc-dr{0%,100%{transform:translateY(0)}50%{transform:translateY(6px) rotate(-5deg)}}@keyframes dsc-p{0%,100%{transform:scale(1)}40%{transform:scale(1.2)}70%{transform:scale(1.08)}}.dsc-pet[data-kind=idle]{animation:dsc-i 2.6s ease-in-out infinite}.dsc-pet[data-kind=thinking],.dsc-pet[data-kind=slow]{animation:dsc-th 1.1s ease-in-out infinite}.dsc-pet[data-kind=tool-read],.dsc-pet[data-kind=tool-search]{animation:dsc-sw 1s ease-in-out infinite}.dsc-pet[data-kind=tool-terminal]{animation:dsc-s .5s ease-in-out 2}.dsc-pet[data-kind=tool-success],.dsc-pet[data-kind=streak-suc]{animation:dsc-j .8s ease 2}.dsc-pet[data-kind=done]{animation:dsc-d .8s ease-in-out 2}.dsc-pet[data-kind=tool-error],.dsc-pet[data-kind=streak-fail]{animation:dsc-s .4s ease-in-out 2,dsc-dr 1.2s ease-in-out 2}.dsc-pet[data-kind=approval]{animation:dsc-i 1.6s ease-in-out infinite}.dsc-pet[data-kind=preview],.dsc-pet[data-kind=delegate-start]{animation:dsc-p .7s ease 2}.dsc-pet[data-kind=delegate-end]{animation:dsc-j .7s ease 1}.dsc-settings{display:flex;flex-direction:column;gap:12px;padding:4px 2px;font-size:13px;max-width:460px}.dsc-row{display:flex;align-items:center;justify-content:space-between;gap:12px}.dsc-row-label{color:var(--dsw-alias-label-primary,#eee)}.dsc-row select,.dsc-row input[type=text]{background:var(--dsw-alias-bg-layer-1,#1b1b1f);color:var(--dsw-alias-label-primary,#eee);border:1px solid var(--dsw-alias-border-l2,rgba(127,127,127,.35));border-radius:6px;padding:4px 8px;font-size:13px;max-width:200px}.dsc-row input[type=checkbox]{width:16px;height:16px;accent-color:var(--dsw-alias-brand-primary,#4f8cff)}.dsc-block{display:flex;flex-direction:column;gap:6px}.dsc-block textarea{background:var(--dsw-alias-bg-layer-1,#1b1b1f);color:var(--dsw-alias-label-primary,#eee);border:1px solid var(--dsw-alias-border-l2,rgba(127,127,127,.35));border-radius:6px;padding:6px 8px;font-size:13px;resize:vertical;min-height:50px;line-height:1.6}.dsc-hint{font-size:12px;color:var(--dsw-alias-label-secondary,#999)}.dsc-actions{display:flex;gap:8px;margin-top:2px;flex-wrap:wrap}.dsc-btn{background:var(--dsw-alias-bg-layer-2,#26262c);color:var(--dsw-alias-label-primary,#eee);border:1px solid var(--dsw-alias-border-l2,rgba(127,127,127,.35));border-radius:6px;padding:5px 12px;font-size:13px;cursor:pointer}.dsc-btn:hover{border-color:var(--dsw-alias-brand-primary,#4f8cff)}.dsc-emoji-row{display:flex;gap:6px;flex-wrap:wrap;margin-top:4px}.dsc-emoji-btn{font-size:20px;line-height:1;background:none;border:2px solid transparent;border-radius:6px;padding:4px 6px;cursor:pointer;transition:border-color .15s}.dsc-emoji-btn:hover,.dsc-emoji-btn.on{border-color:var(--dsw-alias-brand-primary,#4f8cff)}@media(prefers-reduced-motion:reduce){.dsc-caption,.dsc-pet{animation:none!important;transition:none}}';

		function CaptionBar(props){
			const useS=props&&props.useSessions;
			const cs=useS?useS(st=>(st&&st.current)||null):undefined;
			const[,sT]=React.useState(0);
			React.useEffect(()=>cn.sub(()=>sT(n=>n+1)),[]);
			React.useEffect(()=>{if(typeof cs==='string'&&cs){activeSession=cs;connectStream(cs)}},[cs]);
			const s=gs(),it=cn.cur,sp=s.petEnabled&&s.enabled;
			return React.createElement('div',{className:'dsc-stage'},
				sp?React.createElement('div',{className:'dsc-pet','data-kind':it?it.kind:'idle','data-size':s.petSize},s.petEmoji||'🐱'):null,
				(sp&&s.petName)?React.createElement('div',{className:'dsc-pet-name'},s.petName):null,
				(s.enabled&&it&&cn.phase!=='hidden')?(function(){
					const a={className:'dsc-caption','data-phase':cn.phase,'data-kind':it.kind,key:'c'};
					if(s.announce){a.role='status';a['aria-live']='polite';a['aria-atomic']='true'}
					else a['aria-hidden']='true';
					return React.createElement('div',a,
						React.createElement('span',{className:'dsc-tag'},it.tag),
						React.createElement('span',{className:'dsc-text'},it.text));
				})():null);
		}

		function SettingsSection(){
			const[,sT]=React.useState(0);
			React.useEffect(()=>ss(()=>sT(n=>n+1)),[]);
			const s=gs(),ch=ac();
			const rw=(l,c,k)=>React.createElement('div',{className:'dsc-row',key:k},React.createElement('span',{className:'dsc-row-label'},l),c);
			const ck=(v,fn)=>React.createElement('input',{type:'checkbox',checked:v,onChange:e=>fn(e.target.checked)});
			const sl=(v,fn,o)=>React.createElement('select',{value:v,onChange:e=>fn(e.target.value)},o.map(x=>React.createElement('option',{value:x.value,key:x.value},x.label)));
			return React.createElement('div',{className:'dsc-settings'},
				React.createElement('div',{className:'dsc-hint'},'当前：'+ch.e+' '+ch.n),
				rw('启用',ck(s.enabled,v=>us({enabled:v})),'e'),
				rw('人物',sl(s.character,v=>us({character:v}),[{value:'blaze',label:'疾风 🎤 电竞'},{value:'naturalist',label:'自然探员 🦉 动物'},{value:'deadpan',label:'冷淡 🖥️ 吐槽'},{value:'custom',label:'自定义 ✨'}]),'c'),
				(s.character==='custom'?React.createElement(React.Fragment,null,[
					rw('名称',React.createElement('input',{type:'text',value:s.customName,maxLength:12,onChange:e=>us({customName:e.target.value})}),'n'),
					rw('表情',React.createElement('input',{type:'text',value:s.customEmoji,maxLength:4,onChange:e=>us({customEmoji:e.target.value})}),'e'),
					rw('风格',sl(s.customBase,v=>us({customBase:v}),[{value:'esports',label:'电竞'},{value:'animal',label:'动物'},{value:'deadpan',label:'吐槽'}]),'b'),
					React.createElement('div',{className:'dsc-block',key:'cl'},React.createElement('span',{className:'dsc-row-label'},'口头禅'),React.createElement('textarea',{value:s.customLines.join('\n'),onChange:e=>us({customLines:e.target.value.split('\n').map(x=>x.trim()).filter(Boolean)})})),
					React.createElement('div',{className:'dsc-block',key:'cd'},React.createElement('span',{className:'dsc-row-label'},'完成台词'),React.createElement('textarea',{value:s.customDone.join('\n'),onChange:e=>us({customDone:e.target.value.split('\n').map(x=>x.trim()).filter(Boolean)})}))
				]):null),
				React.createElement('div',{className:'dsc-hint'},'宠物（任意 emoji）'),
				rw('形象',React.createElement('input',{type:'text',value:s.petEmoji,placeholder:'emoji',maxLength:4,style:{fontSize:'18px',width:'80px',textAlign:'center'},onChange:e=>us({petEmoji:e.target.value})}),'pe'),
				React.createElement('div',{className:'dsc-emoji-row'},EM.map(e=>React.createElement('button',{key:e,type:'button',className:'dsc-emoji-btn'+(s.petEmoji===e?' on':''),onClick:()=>us({petEmoji:e})},e))),
				rw('名字',React.createElement('input',{type:'text',value:s.petName,maxLength:10,onChange:e=>us({petName:e.target.value})}),'pn'),
				rw('大小',sl(s.petSize,v=>us({petSize:v}),[{value:'small',label:'小'},{value:'normal',label:'中'},{value:'large',label:'大'}]),'ps'),
				rw('时长',sl(String(s.durationMs),v=>us({durationMs:Number(v)}),[{value:'1500',label:'1.5秒'},{value:'2000',label:'2秒'},{value:'2600',label:'2.6秒'},{value:'3500',label:'3.5秒'},{value:'5000',label:'5秒'}]),'du'),
				rw('频率',sl(s.frequency,v=>us({frequency:v}),[{value:'low',label:'低'},{value:'medium',label:'中'},{value:'high',label:'高'}]),'fr'),
				rw('提示音',ck(s.sound,v=>us({sound:v})),'sn'),
				React.createElement('div',{className:'dsc-actions'},
					React.createElement('button',{className:'dsc-btn',onClick:()=>cn.preview()},'预览'),
					React.createElement('button',{className:'dsc-btn',onClick:()=>rs()},'恢复默认')
				));
		}

		const inject=['slots'];
		function apply(ctx){
			const slots=ctx.get('slots');
			if(ctx.effect){
				ctx.effect(()=>{
					const removeStyles=(function(){
						try{
							if(typeof document==='undefined')return null;
							let tag=document.getElementById('dsh-commentator-styles');
							if(!tag){tag=document.createElement('style');tag.id='dsh-commentator-styles';tag.dataset.plugin='dsh-commentator';tag.textContent=CSS;document.head.appendChild(tag)}
							return()=>{try{if(tag&&tag.parentNode)tag.parentNode.removeChild(tag)}catch{}}
						}catch{return null}
					})();
					startTransport();
					return()=>{stopTransport();cn.ct();if(removeStyles)removeStyles()};
				});
			}
			if(slots){
				slots.inject('shell.overlay',()=>slots.register({name:'shell.overlay',id:'dsh-commentator',order:900},props=>React.createElement(CaptionBar,props)));
				slots.inject('settings.section',()=>slots.register({name:'settings.section',id:'dsh-commentator',order:400,label:'Agent 解说员'},()=>React.createElement(SettingsSection,null)));
			}
		}
		exports.apply=apply;exports.inject=inject;
		return module.exports;
	},
});
