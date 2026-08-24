/**
 * dsh-commentator — host half（v2）。
 *
 * Agent 体育解说员：监听 Agent / ToolRuntime / Subagent 的结构化事件，把最小化的
 * 解说事件 { t, tool, n?, ok? } 通过 SSE 常驻连接（以及 /poll 兜底）推给浏览器。
 *
 * v2 新增：
 *   - 思考计时吐槽：主 Agent running 后超过 SLOW_MS 才有首个工具 → 推送 slow
 *   - 连击/连败：连续成功/失败达到里程碑 → 推送 streak-suc / streak-fail
 *   - 子代理登场/退场：监听 subagent/start / subagent/end → delegate-start/end
 *
 * 隐私：只读 agent.id、工具名、status、isError、stopReason；绝不读参数/文件/对话。
 */

const READ = new Set(['read', 'read_image', 'view_image']);
const WRITE = new Set(['write', 'edit', 'create']);
const SEARCH = new Set(['glob', 'grep', 'web_search', 'web_fetch', 'search', 'rg']);
const TERMINAL = new Set(['pwsh', 'bash', 'sh', 'powershell', 'shell', 'terminal', 'cmd']);
const DELEGATE = new Set(['subagent', 'subagent_fork', 'workflow', 'ralph', 'send_message', 'interrupt_agent']);
const ASK = new Set(['ask_user_question']);

function categorizeTool(name) {
  if (typeof name !== 'string') return 'other';
  if (READ.has(name)) return 'read';
  if (WRITE.has(name)) return 'write';
  if (SEARCH.has(name)) return 'search';
  if (TERMINAL.has(name)) return 'terminal';
  if (DELEGATE.has(name)) return 'delegate';
  if (ASK.has(name)) return 'ask';
  return 'other';
}

const MAX_QUEUE = 128;
const SLOW_MS = 12000;
const SUC_MILESTONES = new Set([3, 5, 8]);
const FAIL_MILESTONES = new Set([2, 4]);

export function apply(ctx) {
  const agents = ctx.get('agents');

  /** 某 agent 是否属于目标会话的 Agent 树（含子代理）。 */
  function belongs(agentId, targetSessionId) {
    if (typeof agentId !== 'string' || typeof targetSessionId !== 'string') return false;
    if (agentId === targetSessionId) return true;
    if (agents) {
      try {
        const owner = agents.get(targetSessionId);
        if (owner) return !!agents.isOwnedBy(agentId, owner);
      } catch { /* 版本差异时退回严格相等 */ }
    }
    return false;
  }

  // ── 主会话 id：由浏览器端每次请求（stream/poll 的 ?session=）告知 ───────
  let lastSession = null;
  function noteSession(requested) {
    if (typeof requested === 'string' && requested.length > 0) lastSession = requested;
  }

  // ── 事件缓冲 + SSE 订阅者 ──────────────────────────────────────────────
  const queue = [];         // { sid, t, tool, n?, ok? }
  const subscribers = new Set(); // { session, send(events) }
  const sseTimers = new Set();

  function push(sid, evt) {
    const tagged = { sid, t: evt.t, tool: evt.tool, n: evt.n, ok: evt.ok };
    queue.push(tagged);
    if (queue.length > MAX_QUEUE) queue.splice(0, queue.length - MAX_QUEUE);
    const minimal = { t: evt.t, tool: evt.tool, n: evt.n, ok: evt.ok };
    for (const sub of subscribers) {
      if (belongs(sid, sub.session)) {
        try { sub.send([minimal]); } catch { /* socket 已关闭，由 close 事件清理 */ }
      }
    }
  }
  /** 取出属于 requested 会话的缓冲事件（保留其它事件）。 */
  function drain(requested) {
    if (queue.length === 0) return [];
    const events = [];
    const kept = [];
    for (const entry of queue) {
      if (belongs(entry.sid, requested)) events.push({ t: entry.t, tool: entry.tool, n: entry.n, ok: entry.ok });
      else kept.push(entry);
    }
    queue.length = 0;
    for (const entry of kept) queue.push(entry);
    return events;
  }

  // ── 主 Agent 活动/思考计时/连击状态（只对主会话根 Agent 生效）──────────
  let running = false;
  let activity = false;
  let runningAt = 0;
  let firstToolHandled = false;
  let slowPushed = false;
  let consecutiveSuccess = 0;
  let consecutiveFailure = 0;
  function resetRunState() {
    running = false; activity = false; runningAt = 0; firstToolHandled = false; slowPushed = false;
    consecutiveSuccess = 0; consecutiveFailure = 0;
  }

  // ── 事件监听 ───────────────────────────────────────────────────────────
  ctx.on('agent/status', (payload) => {
    try {
      const agentId = payload && payload.agent && payload.agent.id;
      if (typeof agentId !== 'string') return;
      // 只播报「主会话根 Agent」的思考/完成；子代理不触发整局节点
      if (!lastSession || agentId !== lastSession) return;
      const status = payload && payload.status;
      if (status === 'running') {
        if (!running) {
          running = true; activity = false;
          runningAt = Date.now(); firstToolHandled = false; slowPushed = false;
          push(agentId, { t: 'thinking' });
        }
      } else if (status === 'idle') {
        running = false;
        if (activity) push(agentId, { t: 'done' });
        activity = false;
      }
    } catch { /* ignore */ }
  });

  // tools/execute 是 waterfall：必须调用并返回 next()。
  ctx.on('tools/execute', async (exec, next) => {
    try {
      const agentId = exec && exec.agent && exec.agent.id;
      if (typeof agentId === 'string' && belongs(agentId, lastSession)) {
        activity = true;
        if (!firstToolHandled) {
          firstToolHandled = true;
          if (!slowPushed && running && runningAt > 0 && (Date.now() - runningAt) > SLOW_MS) {
            slowPushed = true;
            push(agentId, { t: 'slow' });
          }
        }
        push(agentId, { t: 'tool-start', tool: categorizeTool(exec && exec.name) });
      }
    } catch { /* 观察者失败不影响执行 */ }
    return next();
  });

  ctx.on('tools/result', (exec, result) => {
    try {
      const agentId = exec && exec.agent && exec.agent.id;
      if (typeof agentId !== 'string' || !belongs(agentId, lastSession)) return;
      activity = true;
      const isError = !!(result && result.isError);
      if (isError) {
        consecutiveSuccess = 0;
        consecutiveFailure += 1;
        if (FAIL_MILESTONES.has(consecutiveFailure)) push(agentId, { t: 'streak-fail', n: consecutiveFailure });
        else push(agentId, { t: 'tool-error', tool: categorizeTool(exec && exec.name) });
      } else {
        consecutiveFailure = 0;
        consecutiveSuccess += 1;
        if (SUC_MILESTONES.has(consecutiveSuccess)) push(agentId, { t: 'streak-suc', n: consecutiveSuccess });
        else push(agentId, { t: 'tool-success', tool: categorizeTool(exec && exec.name) });
      }
    } catch { /* ignore */ }
  });

  ctx.on('approval/request', async (req, next) => {
    try {
      const agentId = req && req.agent && req.agent.id;
      if (typeof agentId === 'string' && belongs(agentId, lastSession)) {
        push(agentId, { t: 'approval', tool: categorizeTool(req && req.toolName) });
      }
    } catch { /* ignore */ }
    return next();
  });

  // 子代理登场/退场（info.id = 子代理会话 id）
  ctx.on('subagent/start', (info) => {
    try {
      const childId = info && info.id;
      if (typeof childId === 'string' && belongs(childId, lastSession)) {
        activity = true;
        push(childId, { t: 'delegate-start', tool: 'delegate' });
      }
    } catch { /* ignore */ }
  });
  ctx.on('subagent/end', (info) => {
    try {
      const childId = info && info.id;
      if (typeof childId === 'string' && belongs(childId, lastSession)) {
        push(childId, { t: 'delegate-end', tool: 'delegate', ok: info.stopReason === 'completed' ? 1 : 0 });
      }
    } catch { /* ignore */ }
  });

  // ── HTTP：SSE 流 + /poll 兜底（同源；仅当 profile 有 webServer 时注册）──
  const webServer = ctx.get('webServer');
  if (webServer && typeof webServer.register === 'function') {
    // SSE 常驻流（推荐）：零延迟
    const disposeStream = webServer.register({
      kind: 'exact',
      path: '/dsh-commentator/stream',
      handler: (req, res) => {
        try {
          const url = new URL(req.url || '/', 'http://dsh.local');
          const requested = url.searchParams.get('session');
          if (typeof requested !== 'string' || requested.length === 0) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'missing session' }));
            return;
          }
          noteSession(requested);
          res.writeHead(200, {
            'Content-Type': 'text/event-stream; charset=utf-8',
            'Cache-Control': 'no-store',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': '*',
          });
          res.write('retry: 3000\n\n');
          const sub = {
            session: requested,
            send: (events) => {
              if (events.length) res.write('data: ' + JSON.stringify({ events }) + '\n\n');
            },
          };
          const initial = drain(requested);
          if (initial.length) res.write('data: ' + JSON.stringify({ events: initial }) + '\n\n');
          subscribers.add(sub);
          const hb = setInterval(() => { try { res.write(': ping\n\n'); } catch { /* ignore */ } }, 25000);
          sseTimers.add(hb);
          const close = () => { clearInterval(hb); sseTimers.delete(hb); subscribers.delete(sub); };
          req.on('close', close);
          req.on('error', close);
        } catch {
          try {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'internal' }));
          } catch { /* ignore */ }
        }
      },
    });
    // /poll 兜底：SSE 断连 / 无 EventSource 环境使用
    const disposePoll = webServer.register({
      kind: 'exact',
      path: '/dsh-commentator/poll',
      handler: (req, res) => {
        try {
          const url = new URL(req.url || '/', 'http://dsh.local');
          const requested = url.searchParams.get('session');
          noteSession(requested);
          const events = typeof requested === 'string' && requested.length > 0 ? drain(requested) : [];
          res.writeHead(200, {
            'Content-Type': 'application/json; charset=utf-8',
            'Cache-Control': 'no-store',
            'Access-Control-Allow-Origin': '*',
          });
          res.end(JSON.stringify({ events }));
        } catch {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ events: [] }));
        }
      },
    });
    ctx.effect(() => {
      // 卸载：清理 SSE 定时器并关闭订阅者
      for (const hb of sseTimers) clearInterval(hb);
      sseTimers.clear();
      for (const sub of subscribers) {
        try { sub.send([]); } catch { /* ignore */ }
      }
      subscribers.clear();
      disposeStream();
      disposePoll();
    });
  }
}

export default { apply };
