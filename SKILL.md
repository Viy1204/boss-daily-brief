---
name: boss-daily-brief
description: >
  Boss直聘每日招聘工作流。当用户说"帮我处理今天的Boss直聘"、"拉一下直聘的候选人"、
  "做今天的简历brief"、"Boss直聘日报"、"初筛候选人"、"直聘每日brief" 等类似说法时，
  立即触发本技能。完整流程包括：拉取聊天列表 → 批量获取简历 → AI生成汇总文档 →
  创建飞书云文档 → AI初筛并给出推荐等级 → 操作记录归档到文档。
  只要用户提到Boss直聘 + 任何处理/筛选/汇总动作，就应该触发本技能。
metadata:
  requires:
    bins: ["opencli", "lark-cli"]
---

# Boss直聘每日简历Brief工作流

## 用户配置（首次使用必填）

在正式开始前，先询问用户以下信息（若用户未主动提供）：

1. **飞书目标文件夹名称**：用于存放每日 brief 的飞书云盘文件夹名，例如 `boss直聘每日简历brief`
2. **本地保存路径（可选）**：是否需要同时保存一份本地 Markdown 文件？如需要，请提供目录路径；如不需要，跳过 Step 4

> 配置确认后方可继续。

---

## 前置条件

### 1. 安装 opencli（首次使用）

如果 `opencli` 命令不存在，先安装：

```bash
npm install -g @jackwener/opencli
```

安装后验证：`opencli --version`

### 2. 安装 Chrome 扩展（首次使用）

opencli 通过 Chrome 扩展与浏览器通信。首次使用必须：

1. 在 Chrome 中安装 **opencli Browser Bridge** 扩展（在 [opencli GitHub 主页](https://github.com/jackwener/opencli) 找到安装链接）
2. 安装后在 Chrome 工具栏点击扩展图标，确认已连接
3. Chrome 必须保持打开状态

> ⚠️ 若报错 `Browser Extension is not connected`，说明扩展未安装或未启用。

### 3. 登录 Boss直聘

在 Chrome 中登录 Boss直聘**招聘端**（https://www.zhipin.com）。

### 4. 飞书授权（首次使用一次性完成）

lark-cli 需要以下所有权限，**在开始前一次性全部授权**，避免流程中途中断：

```bash
# 一次性授权所有需要的权限（在后台运行，读取输出中的授权链接）
lark-cli auth login --scope "drive:drive:readonly docx:document:create docx:document:write_only docx:document:readonly" 2>&1
```

打开命令输出中的 `verification_url` 链接，完成飞书授权。授权成功后即可继续。

> **说明**：这4个权限分别用于：列出云盘文件夹、创建文档、写入文档内容、追加文档内容。如果分开授权需要操作4次，一次性授权更省时。

> 若命令输出的 URL 中 `flow_id` 被脱敏（显示为 `OOOOOOOO`），使用后台模式重新运行：
> ```bash
> lark-cli auth login --scope "drive:drive:readonly docx:document:create docx:document:write_only docx:document:readonly" 2>&1 &
> sleep 3 && jobs  # 从后台输出中查看完整授权 URL
> ```

---

## 完整流程

### Step 1：验证 Cookie 并拉取聊天列表

先验证 Cookie 状态再继续，避免后续流程中途失败：

```bash
opencli boss chatlist 2>&1
```

- ✅ 成功：记录候选人列表，进入 Step 2
- ❌ `Cookie 已过期`：提示用户在 Chrome 中重新登录 Boss直聘，登录后重试
- ❌ `Browser Extension is not connected`：参考「前置条件 2」安装扩展

记录每位候选人的：`name`、`job`（应聘职位）、`uid`、`last_time`

默认拉取最新 20 条，如需更多可加 `--limit 50`。

---

### Step 2：顺序获取简历

> ⚠️ **重要**：必须使用 `--verbose` 标志，否则 opencli 会触发页面跳转导致 Cookie 失效。不要使用后台进程（`&`），顺序执行更稳定。

将候选人 uid 逐个顺序获取：

```bash
# 示例：逐个顺序执行
echo "=== 姓名1 ===" && opencli boss resume "<uid1>" -f json --verbose 2>&1
echo "=== 姓名2 ===" && opencli boss resume "<uid2>" -f json --verbose 2>&1
echo "=== 姓名3 ===" && opencli boss resume "<uid3>" -f json --verbose 2>&1
echo "=== 姓名4 ===" && opencli boss resume "<uid4>" -f json --verbose 2>&1
echo "=== 姓名5 ===" && opencli boss resume "<uid5>" -f json --verbose 2>&1
```

如果运行中出现 `Cookie 已过期` 错误：
1. 立即停止
2. 提示用户重新登录 Boss直聘
3. 用户确认后，**重新获取失败的那几条**（不需要重新获取已成功的）

每条简历包含：`name`、`gender`、`age`、`experience`、`degree`、`active_time`、`work_history`、`education`、`expect`

---

### Step 3：AI 整理汇总为 Markdown

将所有候选人信息**按应聘职位分组**，每人生成固定格式：

```markdown
### 姓名
- **性别/年龄**：X · XX岁
- **学历/经验**：XX · XX年
- **活跃状态**：刚刚活跃 / 昨天 / 具体日期
- **期望**：城市 · 职位方向 · 薪资范围
- **工作经历**：
  - 时间　公司 · 职位
  - 时间　公司 · 职位
- **教育**：学校 · 专业 · 学历（年份）
```

文档开头注明：生成时间（今日日期）、候选人总数。

---

### Step 4：保存本地文件（可选）

若用户配置了本地保存路径，将 Markdown 保存到该路径下，文件名格式：

```
<用户指定目录>/boss-brief-YYYYMMDD.md
```

若用户未提供路径或明确表示不需要，**跳过此步骤**，直接进入 Step 5。

---

### Step 5：创建飞书云文档

**第一步：动态查找目标文件夹 token**

用户提供的文件夹名称可能存在于云盘根目录或子目录中。通过列出云盘根目录文件找到对应 token：

```bash
# Windows Git Bash 必须加 MSYS_NO_PATHCONV=1
MSYS_NO_PATHCONV=1 lark-cli api GET /open-apis/drive/v1/files --as user
```

在返回的 `files` 数组中，找到 `type` 为 `folder` 且 `name` 与用户提供的文件夹名完全匹配的条目，取其 `token` 字段。

> 若未找到匹配文件夹，询问用户：文件夹是否在二级子目录中？或是否需要新建？
>
> 若命令无输出或报错权限问题，参考「前置条件 4」重新授权。

**第二步：创建文档**

找到文件夹 token 后创建文档，标题格式：`Boss直聘候选人简历Brief YYYYMMDD`

```bash
lark-cli docs +create \
  --title "Boss直聘候选人简历Brief YYYYMMDD" \
  --folder-token "<动态获取到的folder_token>" \
  --markdown "<完整Markdown内容>" \
  --as user
```

记录返回的 `doc_id`，后续所有更新都用它。

> **权限报错处理**：
> - 报 `missing_scope: docx:document:create` → 运行 `lark-cli auth login --scope "docx:document:create"` 授权后重试
> - 报 `docx:document:write_only` → 运行 `lark-cli auth login --scope "docx:document:write_only"` 授权后重试
> - 理想情况下，「前置条件 4」已一次性授权好所有权限，不会走到这里

---

### Step 6：AI 初筛并生成推荐等级

对每位候选人，综合评估以下三个维度：

| 维度 | 评估要点 |
|------|----------|
| 经验匹配度 | 工作经历是否与应聘职位直接相关，有无管理/专业技能经验 |
| 学历 | 本科/硕士/大专，学校背景是否支撑薪资预期 |
| 薪资合理性 | 期望薪资是否与经验/学历相符，是否超出市场范围 |

**推荐等级标准**：

| 等级 | 含义 | 行动 |
|------|------|------|
| ⭐⭐⭐⭐⭐ 强推 | 经验高度匹配，薪资合理 | 优先约谈 |
| ⭐⭐⭐⭐ 推荐 | 基本匹配，有明显亮点 | 优先约谈 |
| ⭐⭐⭐ 可约 | 部分匹配，需面试确认 | 可选择约谈 |
| ⭐⭐ 观望 | 匹配度弱，背景存疑 | 暂不操作 |
| ⭐ 不推荐 | 明显不合适（错位/经验不足/虚高） | 报告中列出 |
| ❌ 排除 | 完全不相关（投错职位等） | 报告中列出 |

生成初筛报告，格式：
- 各职位分组的候选人评级表（含核心判断一句话）
- 结尾附「优先约谈名单」汇总表（按优先级排序）

---

### Step 7：将初筛报告追加到飞书文档

```bash
lark-cli docs +update \
  --doc "<doc_id>" \
  --mode append \
  --as user \
  --markdown "<初筛报告Markdown>"
```

> 若报 `missing_scope: docx:document:readonly`，运行 `lark-cli auth login --scope "docx:document:readonly"` 授权后重试。

---

### Step 8：将操作记录追加到飞书文档

将本次结果追加到文档末尾，包含：
- 📋 不合适候选人列表（⭐ 不推荐 和 ❌ 排除，含判断原因）

```bash
lark-cli docs +update \
  --doc "<doc_id>" \
  --mode append \
  --as user \
  --markdown "<操作记录Markdown>"
```

---

## 完成后输出

告知用户：
1. 飞书文档链接（`https://www.feishu.cn/docx/<doc_id>`）
2. 优先约谈名单（⭐⭐⭐⭐ 及以上）
3. 不合适候选人列表（供参考）

---

## 常见问题

| 问题 | 原因 | 解决方案 |
|------|------|----------|
| `opencli: command not found` | opencli 未安装 | `npm install -g @jackwener/opencli` |
| `Browser Extension is not connected` | Chrome 扩展未安装/未启用 | 在 Chrome 安装 opencli Browser Bridge 扩展，确认已连接 |
| `Cookie 已过期` | Boss直聘 Cookie 失效 | 在 Chrome 中重新登录 Boss直聘，告知用户后重试 |
| resume 报 `Cookie 已过期` 或触发页面跳转 | 未加 `--verbose` 标志 | 所有 resume 命令必须加 `--verbose`，且顺序执行勿用 `&` |
| `lark-cli api` 返回 404 | Git Bash 路径转换问题 | 加 `MSYS_NO_PATHCONV=1` 前缀 |
| 飞书缺少某个 scope | 授权不完整 | 运行「前置条件 4」的一次性授权命令 |
| 飞书授权 URL 中 flow_id 被脱敏 | `--no-wait` 模式脱敏 | 不加 `--no-wait`，直接后台运行获取完整 URL |
