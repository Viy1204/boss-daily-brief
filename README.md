# boss-daily-brief

> Boss直聘每日简历 Brief 工作流 —— 一个 [Claude Code](https://claude.ai/code) Skill

一条指令，完成今天 Boss直聘 的全部招聘动作：拉候选人 → 批量获取简历 → AI 汇总 → 创建飞书云文档 → AI 初筛评级 → 自动发索要简历消息 → 操作记录归档。

---

## 功能概览

```
opencli boss chatlist
    ↓ 顺序获取简历（--verbose 模式，逐个执行）
    ↓ AI 整理 Markdown（按职位分组）
    ↓ 创建飞书云文档
    ↓ AI 初筛打分（⭐–⭐⭐⭐⭐⭐ / ❌）
    ↓ 操作记录追加到飞书文档（优先约谈名单 + 不合适列表）
```

触发方式：在 Claude Code 中说「帮我处理今天的 Boss直聘」「做今天的简历 brief」「拉一下直聘候选人」等即可自动触发。

---

## 前置条件

| 依赖 | 说明 | 安装 |
|------|------|------|
| [Claude Code](https://claude.ai/code) | AI 助手 CLI | 参考官网 |
| [opencli](https://github.com/jackwener/opencli) | Boss直聘 CLI 工具 | `npm install -g @jackwener/opencli` |
| opencli Browser Bridge | Chrome 扩展，opencli 依赖 | 见 opencli GitHub 主页 |
| [lark-cli](https://github.com/larksuite/lark-cli) | 飞书 CLI 工具 | 参考 lark-cli 文档 |
| Chrome 浏览器 | 已登录 Boss直聘招聘端 | — |

---

## 安装

### 方式一：直接复制 SKILL.md

```bash
# 1. 克隆本仓库
git clone https://github.com/Viy1204/boss-daily-brief.git

# 2. 将 skill 目录复制到 Claude Code skills 目录
cp -r boss-daily-brief/boss-daily-brief ~/.claude/skills/boss-daily-brief
# Windows 路径：C:\Users\<用户名>\.claude\skills\boss-daily-brief
```

### 方式二：下载 .skill 文件安装（如有）

在 [Releases](https://github.com/Viy1204/boss-daily-brief/releases) 页面下载 `boss-daily-brief.skill`，然后在 Claude Code 中运行：

```
C:\Users\你的用户名\Downloads\boss-daily-brief.skill 安装一下
```

---

## 首次使用配置

### 1. 飞书一次性授权

```bash
lark-cli auth login --scope "drive:drive:readonly docx:document:create docx:document:write_only docx:document:readonly" 2>&1
```

打开命令输出中的链接完成飞书授权（只需做一次）。

### 2. 触发 Skill

在 Claude Code 中直接说：

```
帮我处理今天的 Boss直聘
```

首次使用会询问：
1. **飞书目标文件夹名称**（如 `boss直聘每日简历brief`）
2. **本地保存路径**（可选，不需要可跳过）

---

## 初筛评级标准

| 等级 | 含义 | 自动动作 |
|------|------|----------|
| ⭐⭐⭐⭐⭐ 强推 | 经验高度匹配，薪资合理 | 优先约谈 |
| ⭐⭐⭐⭐ 推荐 | 基本匹配，有明显亮点 | 优先约谈 |
| ⭐⭐⭐ 可约 | 部分匹配，需面试确认 | 可选择约谈 |
| ⭐⭐ 观望 | 匹配度弱 | 不操作 |
| ⭐ 不推荐 | 明显不合适 | 操作记录中列出 |
| ❌ 排除 | 完全不相关 | 操作记录中列出 |

---

## 常见问题

**Q: `opencli: command not found`**
A: 运行 `npm install -g @jackwener/opencli` 安装。

**Q: `Browser Extension is not connected`**
A: 在 Chrome 中安装 opencli Browser Bridge 扩展并确认已连接。

**Q: `Cookie 已过期`**
A: 在 Chrome 中重新登录 Boss直聘招聘端（https://www.zhipin.com），然后继续。

**Q: 飞书报 `missing_scope` 权限错误**
A: 重新运行首次使用配置中的一次性授权命令。

**Q: `resume` 命令触发页面跳转或报 `Cookie 已过期`**
A: 必须使用 `--verbose` 标志。不加时 opencli 会走触发页面跳转的路径导致 Cookie 失效。Skill 已默认加上此标志。

---

## License

[MIT](LICENSE)
