# dsh-commentator · Agent 体育解说员

一个为 **DeepSeek Harness Web GUI** 开发的轻量娱乐插件：监听 Harness 中**真实发生**的
Agent 状态与工具调用事件，用规则生成简短、有趣的**实时解说字幕**，显示在页面右下角。

- ✅ **不调用任何大语言模型** —— 纯规则 + 本地文案表，零额外 Token 费用
- ✅ **不影响任务执行** —— 只做只读观察，瀑布事件（waterfall）一律立即 `next()`
- ✅ **隐私优先** —— 只使用事件类型、工具名和成功/失败状态；**不读取**对话正文、
  文件内容、命令参数、密钥或任何用户隐私
- ✅ **轻量克制** —— 无大型浮窗、无远程字体/图片/脚本/音频；提示音由 Web Audio
  本地合成且默认关闭

## 兼容性

> **DeepSeek Harness 仍处于 Developer Preview，公开 API 可能随版本变化。**

| 项 | 值 |
| --- | --- |
| 兼容版本 | `dsh` ≥ `0.1.1-rc.2`（Developer Preview） |
| 开发/验证版本 | `0.1.1-rc.2` |
| 运行时 | `dsh web`（Web GUI profile） |
| 语言 | 中文（解说文案）/ 英文（代码注释） |

API 依赖面（均已在本版本源码中核对）：
- Host 事件：`agent/status`（emit）、`tools/execute`（waterfall）、`tools/result`（emit）、
  `approval/request`（waterfall）
- Client 槽位：`shell.overlay`（字幕条）、`settings.section`（设置页）
- Host 服务：`agents`（会话过滤，可选）、`webServer`（轮询端点，可选）
- 主题变量：`--dsw-alias-bg-overlay`、`--dsw-alias-label-primary`、
  `--dsw-alias-border-l2`、`--dsw-alias-brand-primary` 等（浅色/深色自适应）

## 功能

- Agent 开始思考时显示解说
- 调用读取文件工具（`read`/`read_image`）时显示解说
- 调用搜索工具（`glob`/`grep`/`web_search`）时显示解说
- 调用终端工具（`pwsh`/`bash` 等）时显示解说
- 修改或创建文件（`write`/`edit`）时显示解说
- 等待用户批准时显示解说
- 工具执行成功 / 失败时显示解说
- **连击 / 连败播报**：连续 3/5/8 次成功、连续 2/4 次失败时播报里程碑
- **思考计时吐槽**：Agent 思考超过 12 秒才动手时追加一句"思考过久"解说
- **子代理登场 / 退场**：监听 `subagent/start` / `subagent/end`，区分完成/出错
- 整个任务完成时显示庆祝解说
- **自定义人物卡**：预设「疾风 🎤 / 自然探员 🦉 / 冷淡 🖥️」，或自建人物
  （起名、选表情、选基础文案风格、填个性口头禅与任务完成台词），字幕标签显示
  `{表情} {名字}`，口头禅随机穿插
- 字幕显示在页面**右下角**（悬浮层，`pointer-events: none`），不遮挡输入框、
  审批按钮或主要内容；每条字幕显示约 2~4 秒后平滑消失
- 高频事件自动节流（低/中/高三档频率），不会刷屏；成功/失败/完成字幕带左侧状态色条
- 同类型事件从多条候选文案中随机选取，降低重复感
- 实时推送：安装包版使用 **SSE 常驻连接**（零延迟，自动重连），`/poll` 每 8s 兜底
- 设置页：启用开关、人物选择、字幕时长、出现频率、极轻提示音（默认关闭）、
  无障碍播报开关、预览字幕、恢复默认设置；设置保存在浏览器本地（localStorage）
- 支持 `prefers-reduced-motion`；字幕使用 `aria-live="polite"`（可关闭）

## 安装

在 `~/.dsh/profiles/web/`（你的 Web profile）下安装本插件：

**方式 A：从 GitHub 安装**

```bash
pnpm add github:caixukunO8O2/dsh-commentator
```

**方式 B：本地目录安装（先克隆/下载本仓库）**

```bash
pnpm add <dsh-commentator 仓库路径>
```

然后确认 profile 的 `cordis.patch.yml` 里有 bundle 行（从 GitHub/本地安装时，若
`dsh.bundle.patch` 未被 profile 自动拾取，手动追加）：

```yaml
# ~/.dsh/profiles/web/cordis.patch.yml
- insert:
    - id: dsh-commentator
      name: 'dsh-commentator'
```

重启 `dsh web`（或触发 profile 重载）。插件会：
1. Host 端挂载事件监听与 `/dsh-commentator/poll` 轮询端点；
2. 浏览器端在设置页新增 **「Agent 解说员」** 页面，并在页面右下角渲染字幕条。

> 若你的 profile 没有 `webServer`（headless/TUI），Host 端仍可加载（webServer 为
> 可选依赖），只是没有字幕输出。

## 使用

1. 打开 **设置 → Agent 解说员**；
2. 确认「启用解说」已勾选（默认开启），选择喜欢的风格；
3. 点「预览字幕」立即看效果；
4. 正常使用 Harness，字幕会自动跟随当前会话的 Agent（含其子代理）出现。

## 隐私与安全设计

| 原则 | 实现 |
| --- | --- |
| 只读结构化事件 | 仅订阅 `agent/status`、`tools/*`、`approval/request`，绝不解析 DOM 文本 |
| 最小字段提取 | 只读取 `agent.id`、工具名、`status`、`isError` 四个叶子字段 |
| 不读参数 | 不访问 `exec.arguments`、命令内容、文件路径、密钥、对话正文 |
| 不阻塞执行 | waterfall 监听器同步 `return next()`，绝不 veto、绝不改动执行对象 |
| 完全清理 | 所有监听器/定时器/样式/槽位注册均挂在插件 fiber 上，停用即自动卸载 |
| 无外网依赖 | 不加载远程字体、图片、脚本、音频；轮询仅走同源本地端点 |
| 默认静音 | 提示音默认关闭；开启后由 Web Audio 合成极轻短音 |

## 事件 → 解说映射

| Host 事件 | 载荷（仅使用字段） | 解说 |
| --- | --- | --- |
| `agent/status` | `{ agent.id, status }` | `running` → 开始思考；`idle` 且有活动 → 任务完成 |
| `tools/execute`（waterfall） | `{ name, agent.id }` | 工具调用开始（按工具名分类）；首个工具延迟 >12s 时先播报"思考过久" |
| `tools/result` | `{ name, isError }` | 成功 / 失败；连击 3/5/8、连败 2/4 时改为播报里程碑 |
| `approval/request`（waterfall） | `{ agent.id, toolName }` | 等待用户批准 |
| `subagent/start` | `{ id }` | 子代理登场 |
| `subagent/end` | `{ id, stopReason }` | 子代理退场（完成 / 出错） |

## 架构

```
┌─ Host（Node 进程）──────────────────────────────┐
│  ctx.on(agent/status | tools/* | approval/*      │
│        | subagent/start | subagent/end)          │
│    → 过滤：仅当前会话 Agent 树（含子代理）         │
│    → 最小事件 { t, tool, n?, ok? } → 环形缓冲      │
│  SSE: /dsh-commentator/stream?session=<id>       │
│  兜底: /dsh-commentator/poll?session=<id>        │
└────────────────────┬─────────────────────────────┘
                     │ 同源 SSE（实时）/ 短轮询（兜底）
┌────────────────────▼─────────────────────────────┐
│ 浏览器端（ModuleLoader bundle）                    │
│  CaptionBar（shell.overlay，右下角，点击穿透）      │
│  SettingsSection（settings.section，人物卡设置）   │
│  节流 + 优先级 + 随机文案 + 人物口头禅 + 淡出 + 提示音│
└──────────────────────────────────────────────────┘
```

## 开发

```bash
# 语法检查
node --check lib/index.js
node --check lib/client.js

# 本地安装验证（在你的 profile 中）
pnpm add <本目录>
```

## 已知限制

- 只有 Web GUI 有字幕输出；headless/TUI 无浏览器端。
- 解说跟随「当前会话的 Agent 及其子代理」；其它会话的事件不会被显示（不会串台）。
- 安装包版字幕通过 SSE 实时推送（零延迟），`/poll` 每 8s 兜底一次防止漏事件。
- 审批解说只在审批策略为 `ask`（需要人工批准）时出现；策略为 `never`/`allow` 时
  该事件不会产生。
- 连击/连败里程碑只在同一会话连续成功/失败时触发；中途插入其它工具结果会重置计数。

## License

MIT
