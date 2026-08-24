/**
 * dsh-commentator — host half.
 *
 * Agent 体育解说员（dsh-commentator）：一个为 DeepSeek Harness Web GUI 开发的
 * 轻量娱乐插件。本文件是安装包格式（bundle row）的 Host 端。
 *
 * 职责（全部通过结构化事件，不读取任何对话/命令/文件内容）：
 *   1. 订阅 Agent / ToolRuntime 的结构化事件：
 *        - agent/status        → Agent 开始思考 / 任务完成
 *        - tools/execute       → 工具调用开始（waterfall，只观察，立即 next()）
 *        - tools/result        → 工具成功 / 失败（只读 isError）
 *        - approval/request    → 等待用户批准（waterfall，只观察，立即 next()）
 *   2. 只提取最少的叶子字段：agent.id、工具名、status、isError。绝不读取
 *      exec.arguments / 命令参数 / 文件内容 / 密钥 / 对话正文。
 *   3. 把最小化事件 { t, tool, sid } 写入环形缓冲；浏览器端通过
 *      GET /dsh-commentator/poll?session=<id> 轮询拉取，host 只回送属于该
 *      会话 Agent 树（含子代理）的事件。
 *
 * 插件不注册任何模型可见工具、不写 session 日志、不发起出站网络请求。
 * webServer 为可选（ctx.get 守卫），无 HTTP 环境的 headless/TUI profile 也能加载。
 */

/** 工具名 → 解说分类（只按工具名归类，不读参数）。 */
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

/** 事件载荷最大缓冲条数（防止异常刷屏时无限增长）。 */
const MAX_QUEUE = 128;

export function apply(ctx) {
  const agents = ctx.get('agents');

  /** 某 agent 是否属于「目标会话」的 Agent 树（含子代理）。 */
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

  // ── 事件环形缓冲；每条记录携带事件所属 agent 的会话 id ──────────────────
  const queue = [];
  function push(sid, evt) {
    queue.push({ sid, t: evt.t, tool: evt.tool });
    if (queue.length > MAX_QUEUE) queue.splice(0, queue.length - MAX_QUEUE);
  }
  /** 取出属于 requested 会话 Agent 树的事件（保留其余事件不被吞掉）。 */
  function drain(requested) {
    if (queue.length === 0) return { events: [], kept: 0 };
    const events = [];
    const kept = [];
    for (const entry of queue) {
      if (belongs(entry.sid, requested)) {
        events.push({ t: entry.t, tool: entry.tool }); // 不下发 sid，保持载荷最小
      } else {
        kept.push(entry);
      }
    }
    queue.length = 0;
    for (const entry of kept) queue.push(entry);
    return { events, kept: kept.length };
  }

  // ── Agent 活动状态机（用于「任务完成」庆祝的判定）────────────────────────
  const states = new Map(); // agentId -> { running, activity }
  function stateOf(agentId) {
    let s = states.get(agentId);
    if (!s) {
      s = { running: false, activity: false };
      states.set(agentId, s);
      if (states.size > 64) {
        // 防止长时间运行后 Map 无限增长（只清理已 idle 且无活动的条目）
        for (const [key, value] of states) {
          if (!value.running && !value.activity && states.size > 64) states.delete(key);
        }
      }
    }
    return s;
  }

  // ── 事件监听 ─────────────────────────────────────────────────────────────
  ctx.on('agent/status', (payload) => {
    try {
      const agentId = payload && payload.agent && payload.agent.id;
      if (typeof agentId !== 'string') return;
      const status = payload && payload.status;
      const st = stateOf(agentId);
      if (status === 'running') {
        if (!st.running) {
          st.running = true;
          st.activity = false;
          push(agentId, { t: 'thinking' });
        }
      } else if (status === 'idle') {
        st.running = false;
        if (st.activity) push(agentId, { t: 'done' });
        st.activity = false;
      }
    } catch { /* ignore */ }
  });

  // tools/execute 是 waterfall：必须调用并返回 next()，绝不阻塞/改动执行。
  ctx.on('tools/execute', async (exec, next) => {
    try {
      const agentId = exec && exec.agent && exec.agent.id;
      if (typeof agentId === 'string') {
        const st = stateOf(agentId);
        st.activity = true;
        push(agentId, { t: 'tool-start', tool: categorizeTool(exec && exec.name) });
      }
    } catch { /* 观察者失败不影响执行 */ }
    return next();
  });

  ctx.on('tools/result', (exec, result) => {
    try {
      const agentId = exec && exec.agent && exec.agent.id;
      if (typeof agentId !== 'string') return;
      const st = stateOf(agentId);
      st.activity = true;
      const isError = !!(result && result.isError);
      push(agentId, { t: isError ? 'tool-error' : 'tool-success', tool: categorizeTool(exec && exec.name) });
    } catch { /* ignore */ }
  });

  // approval/request 是 waterfall：只观察，立即 next()。
  ctx.on('approval/request', async (req, next) => {
    try {
      const agentId = req && req.agent && req.agent.id;
      if (typeof agentId === 'string') {
        push(agentId, { t: 'approval', tool: categorizeTool(req && req.toolName) });
      }
    } catch { /* ignore */ }
    return next();
  });

  // ── HTTP 轮询端点（同源；仅当 profile 有 webServer 时注册）──────────────
  const webServer = ctx.get('webServer');
  if (webServer && typeof webServer.register === 'function') {
    const disposeRoute = webServer.register({
      kind: 'exact',
      path: '/dsh-commentator/poll',
      handler: (req, res) => {
        try {
          const url = new URL(req.url || '/', 'http://dsh.local');
          const requested = url.searchParams.get('session');
          const out = typeof requested === 'string' && requested.length > 0
            ? drain(requested)
            : { events: [], kept: 0 };
          const body = JSON.stringify({ events: out.events });
          res.writeHead(200, {
            'Content-Type': 'application/json; charset=utf-8',
            'Cache-Control': 'no-store',
            'Access-Control-Allow-Origin': '*',
          });
          res.end(body);
        } catch {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ events: [] }));
        }
      },
    });
    ctx.effect(() => disposeRoute);
  }
}

export default { apply };
