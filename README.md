# boss-daily-brief

> Boss直聘每日招聘初筛工作流 —— 一个 [Claude Code](https://claude.ai/code) Skill

说一句「帮我做今天的招聘简报」，自动完成：拉候选人 → 获取简历 → AI 初筛评级 → 写入飞书云文档 + 多维表格 → 推送简报到飞书机器人。

---

## 功能概览

```
boss list
    ↓ 逐个获取简历（boss chat）
    ↓ 按筛选标准过滤 + 整理 Markdown
    ↓ 创建飞书云文档
    ↓ AI 初筛评级（⭐–⭐⭐⭐⭐⭐ / ❌）
    ↓ 批量写入飞书多维表格
    ↓ 推送今日简报到飞书机器人
```

---

## 前置条件

| 依赖 | 说明 | 安装 |
|------|------|------|
| [Claude Code](https://claude.ai/code) | AI 助手 CLI | 参考官网 |
| [@joohw/boss-cli](https://www.npmjs.com/package/@joohw/boss-cli) | Boss直聘 CLI 工具 | `npm install -g @joohw/boss-cli` |
| [lark-cli](https://www.npmjs.com/package/@larksuite/cli) | 飞书 CLI 工具 | `npm install -g @larksuite/cli` |
| Node.js | 脚本运行环境 | [nodejs.org](https://nodejs.org) |
| Chrome 浏览器 | 已登录 Boss直聘招聘端 | — |

---

## 安装

```bash
# 克隆到 Claude Code skills 目录
git clone https://github.com/Viy1204/boss-daily-brief.git ~/.claude/skills/boss-daily-brief-v2

# Windows
git clone https://github.com/Viy1204/boss-daily-brief.git "%USERPROFILE%\.claude\skills\boss-daily-brief-v2"
```

---

## 首次使用：运行初始化

安装后，在 Claude Code 中说：

```
boss init
```

初始化向导会引导你完成四个阶段：

1. **工具检查** — 确认 boss CLI、lark-cli、Node.js 均已安装
2. **登录授权** — boss 登录状态检查 + lark-cli 一次性授权
3. **飞书资源配置** — 自动创建文档文件夹、多维表格（含字段），或连接已有表格；配置推送机器人
4. **筛选标准配置** — 设置年龄、学历等筛选条件（存储在本地，不上传）

配置写入 `config.json`（本地，已在 `.gitignore` 中排除）。参考 `config.example.json` 了解完整结构。

---

## 日常使用

初始化完成后，每天说：

```
帮我做今天的招聘简报
```

或：

```
帮我处理今天的 Boss直聘
```

---

## 初筛评级标准

| 等级 | 含义 |
|------|------|
| ⭐⭐⭐⭐⭐ 强推 | 高度匹配，学历经验俱佳 |
| ⭐⭐⭐⭐ 推荐 | 基本匹配，有明显亮点 |
| ⭐⭐⭐ 可约 | 部分匹配，需面试确认 |
| ⭐⭐ 观望 | 匹配度弱 |
| ⭐ 不推荐 | 明显不合适 |
| ❌ 排除 | 不符合硬性筛选条件 |

筛选权重（年龄上限、学历门槛等）在 `boss init` 时由你自己配置。

---

## 常见问题

**Q: boss CLI 报 `未检测到 .menu-list`**
A: 运行 `boss login`，在浏览器完成登录后重试。

**Q: lark-cli 授权报 `missing_scope`**
A: 重新运行 `boss init` Phase 2，一次性授权所有需要的 scope。

**Q: 多维表格写入报 `not_found`**
A: 应聘职位不在预设选项中，在飞书手动添加该选项后重试，或在 `config.json` 的 `positions` 中更新。

**Q: 飞书机器人消息只发出第一行**
A: Skill 使用 `scripts/send-feishu-msg.js` 通过 Node.js 直接调用 lark-cli，绕过 PowerShell 的 `\n` 转义问题。确保用脚本发送，不要手动拼命令行。

---

## License

[MIT](LICENSE)
