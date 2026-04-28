---
name: boss-daily-brief-v2
description: >
  Boss直聘每日招聘初筛工作流（boss CLI版）。通过 @joohw/boss-cli 拉取候选人列表和简历，
  AI初筛并生成推荐等级，写入飞书云文档 + 多维表格，最后推送文档链接到飞书机器人。
  首次使用说"boss init"运行初始化；日常说"帮我做今天的招聘简报"触发工作流。
metadata:
  requires:
    bins: ["boss", "lark-cli", "node"]
---

# Boss直聘每日简历Brief工作流

配置文件路径：与本 skill.md 同目录的 `config.json`（参考 `config.example.json`）。

---

## 初始化（`boss init` — 首次使用）

当用户说"boss init"、"初始化"、"第一次配置"时，运行以下四个阶段。每个阶段完成后明确告知用户，再进入下一阶段。

---

### Phase 1：工具检查

依次检查：

```bash
boss --version 2>&1
```
```bash
lark-cli --version 2>&1
```
```bash
node --version 2>&1
```

- ✅ 三个工具均存在 → 进入 Phase 2
- ❌ `boss` 未找到 → 提示：`npm install -g @joohw/boss-cli`
- ❌ `lark-cli` 未找到 → 提示：`npm install -g @larksuite/cli`
- ❌ `node` 未找到 → 提示安装 Node.js（https://nodejs.org）

工具全部就绪后继续。

---

### Phase 2：登录授权

#### 2.1 boss CLI

```bash
boss list 2>&1 | head -3
```

- ✅ 返回候选人列表 → 已登录
- ❌ `未检测到 .menu-list` → 提示用户运行 `boss login`，在浏览器完成登录后告知我继续

#### 2.2 lark-cli

```bash
lark-cli auth status 2>&1
```

- `valid` → 已授权
- 其他状态 → 运行授权命令：

```bash
lark-cli auth login --scope "drive:drive:readonly drive:file:create docx:document:create docx:document:write_only docx:document:readonly bitable:app:create bitable:app:update bitable:table:create bitable:table:update bitable:field:create bitable:record:create bitable:record:read im:message im:message.send_as_user contact:user.base:readonly" --as user 2>&1
```

提示用户打开返回的授权链接，完成后确认继续。

---

### Phase 3：飞书资源配置

#### 3.1 文档文件夹

列出云盘根目录，找或创建存放每日 brief 的文件夹：

```bash
lark-cli api GET /open-apis/drive/v1/files --as user 2>&1
```

询问用户：**文件夹名称是什么？**（默认：`boss直聘每日简历brief`）

- 在返回列表中找到对应 `folder` 类型的条目 → 记录 `folder_token`
- 未找到 → 创建：

```bash
lark-cli api POST /open-apis/drive/v1/files/create_folder \
  --body '{"name":"boss直聘每日简历brief","folder_token":""}' \
  --as user 2>&1
```

记录 `folder_token`。

#### 3.2 多维表格

询问用户：**是否已有候选人管理表格？**

**选项 A：已有表格** → 请输入 `base_token` 和 `table_id`，验证后记录。

**选项 B：自动创建**

**Step 1** 创建多维表格：

```bash
lark-cli api POST /open-apis/bitable/v1/apps \
  --body '{"name":"Boss直聘候选人招聘管理","folder_token":"<folder_token>"}' \
  --as user 2>&1
```

从返回值取 `app_token`（即 `base_token`）。

**Step 2** 获取默认 table_id：

```bash
lark-cli api GET /open-apis/bitable/v1/apps/<base_token>/tables --as user 2>&1
```

取第一个 `table_id`，重命名默认表：

```bash
lark-cli api PATCH /open-apis/bitable/v1/apps/<base_token>/tables/<table_id> \
  --body '{"name":"候选人信息"}' \
  --as user 2>&1
```

**Step 3** 询问用户：**你们目前在招哪些职位？**（多选，输入序号，可追加自定义）

给出参考选项让用户勾选：
```
1. 安卓开发工程师      7. 产品营销
2. iOS开发工程师       8. 技术美术（TA）
3. 前端开发工程师      9. UI/UX设计师
4. 后端开发工程师     10. 供应链/采购
5. APP软件产品经理    11. 运营
6. 智能硬件产品经理   12. 自定义输入...
```

收集用户选择的职位列表，后续作为"应聘职位"字段的预设选项。

**Step 4** 创建字段（逐个执行，失败不中断，记录错误在最后统一提示）：

```bash
# 应聘职位（单选，动态选项）
lark-cli api POST /open-apis/bitable/v1/apps/<base_token>/tables/<table_id>/fields \
  --body '{
    "field_name": "应聘职位",
    "type": 3,
    "property": {
      "options": [<用户选择的职位列表，格式: {"name":"职位名"}，逗号分隔>]
    }
  }' --as user 2>&1

# 性别（单选）
lark-cli api POST /open-apis/bitable/v1/apps/<base_token>/tables/<table_id>/fields \
  --body '{"field_name":"性别","type":3,"property":{"options":[{"name":"男"},{"name":"女"}]}}' \
  --as user 2>&1

# 年龄（数字）
lark-cli api POST /open-apis/bitable/v1/apps/<base_token>/tables/<table_id>/fields \
  --body '{"field_name":"年龄","type":2}' --as user 2>&1

# 学历（单选）
lark-cli api POST /open-apis/bitable/v1/apps/<base_token>/tables/<table_id>/fields \
  --body '{"field_name":"学历","type":3,"property":{"options":[{"name":"博士"},{"name":"硕士"},{"name":"本科"},{"name":"大专"}]}}' \
  --as user 2>&1

# 毕业院校（文本）
lark-cli api POST /open-apis/bitable/v1/apps/<base_token>/tables/<table_id>/fields \
  --body '{"field_name":"毕业院校","type":1}' --as user 2>&1

# 专业（文本）
lark-cli api POST /open-apis/bitable/v1/apps/<base_token>/tables/<table_id>/fields \
  --body '{"field_name":"专业","type":1}' --as user 2>&1

# 工作年限（数字）
lark-cli api POST /open-apis/bitable/v1/apps/<base_token>/tables/<table_id>/fields \
  --body '{"field_name":"工作年限","type":2}' --as user 2>&1

# 期望城市（文本）
lark-cli api POST /open-apis/bitable/v1/apps/<base_token>/tables/<table_id>/fields \
  --body '{"field_name":"期望城市","type":1}' --as user 2>&1

# 期望薪资（文本）
lark-cli api POST /open-apis/bitable/v1/apps/<base_token>/tables/<table_id>/fields \
  --body '{"field_name":"期望薪资","type":1}' --as user 2>&1

# 活跃状态（单选）
lark-cli api POST /open-apis/bitable/v1/apps/<base_token>/tables/<table_id>/fields \
  --body '{"field_name":"活跃状态","type":3,"property":{"options":[{"name":"刚刚活跃"},{"name":"今日活跃"},{"name":"昨天"},{"name":"3天内"},{"name":"本周内"}]}}' \
  --as user 2>&1

# 近期工作经历（文本）
lark-cli api POST /open-apis/bitable/v1/apps/<base_token>/tables/<table_id>/fields \
  --body '{"field_name":"近期工作经历","type":1}' --as user 2>&1

# 初筛评级（单选）
lark-cli api POST /open-apis/bitable/v1/apps/<base_token>/tables/<table_id>/fields \
  --body '{"field_name":"初筛评级","type":3,"property":{"options":[{"name":"⭐⭐⭐⭐⭐ 强推"},{"name":"⭐⭐⭐⭐ 推荐"},{"name":"⭐⭐⭐ 可约"},{"name":"⭐⭐ 观望"},{"name":"⭐ 不推荐"},{"name":"❌ 排除"}]}}' \
  --as user 2>&1

# 初筛理由（文本）
lark-cli api POST /open-apis/bitable/v1/apps/<base_token>/tables/<table_id>/fields \
  --body '{"field_name":"初筛理由","type":1}' --as user 2>&1

# 跟进状态（单选）
lark-cli api POST /open-apis/bitable/v1/apps/<base_token>/tables/<table_id>/fields \
  --body '{"field_name":"跟进状态","type":3,"property":{"options":[{"name":"待联系"},{"name":"已发邀约"},{"name":"面试中"},{"name":"已通过"},{"name":"已Offer"},{"name":"已录用"},{"name":"已淘汰"}]}}' \
  --as user 2>&1

# 排除原因（文本）
lark-cli api POST /open-apis/bitable/v1/apps/<base_token>/tables/<table_id>/fields \
  --body '{"field_name":"排除原因","type":1}' --as user 2>&1

# 录入日期（日期）
lark-cli api POST /open-apis/bitable/v1/apps/<base_token>/tables/<table_id>/fields \
  --body '{"field_name":"录入日期","type":5,"property":{"date_formatter":"yyyy/MM/dd"}}' \
  --as user 2>&1

# Boss直聘消息摘要（文本）
lark-cli api POST /open-apis/bitable/v1/apps/<base_token>/tables/<table_id>/fields \
  --body '{"field_name":"Boss直聘消息摘要","type":1}' --as user 2>&1
```

> 多维表格自带一个默认文本字段"文本"，建完后在飞书手动删除即可（不影响写入）。

记录 `base_token` 和 `table_id`。

#### 3.3 机器人配置

询问用户：**飞书机器人的 App ID 是多少？**（格式：`cli_xxxxxxxxxxxxxxxx`）

提示用户在飞书里搜索该机器人并发送一条消息（如"hi"），建立会话后继续。

记录 `bot_app_id`。

#### 3.4 获取用户 open_id

自动获取：

```bash
lark-cli api GET /open-apis/contact/v3/users/me --as user 2>&1
```

从返回值取 `user_id` 字段（`ou_` 开头）。

记录 `user_open_id`。

---

### Phase 4：筛选标准配置

逐项询问用户，提供默认值，用户直接回车则使用默认值：

| 配置项 | 说明 | 默认值 |
|--------|------|--------|
| 年龄上限 | 超过此年龄直接排除 | `40` |
| 年龄降权阈值 | 超过此年龄但未达上限，评级降权 | `35` |
| 技术岗角色关键词 | 命中这些关键词的职位适用学历门槛（逗号分隔） | `工程师,软件产品经理,硬件产品经理` |
| 技术岗最低学历 | 技术岗低于此学历直接降权（可填：211/985、本科、硕士） | `211/985` |
| 直接排除的学历 | 命中则不获取简历、直接点不合适（逗号分隔） | `大专,学院` |

---

### 写入 config.json

将以上收集到的信息写入 skill 目录下的 `config.json`：

```json
{
  "feishu": {
    "folder_token": "<从 3.1 获取>",
    "base_token": "<从 3.2 获取>",
    "table_id": "<从 3.2 获取>",
    "bot_app_id": "<从 3.3 获取>",
    "user_open_id": "<从 3.4 获取>"
  },
  "screening": {
    "age_limit": 40,
    "age_downgrade_threshold": 35,
    "tech_role_keywords": ["工程师", "软件产品经理", "硬件产品经理"],
    "tech_min_degree": "211/985",
    "excluded_degrees": ["大专", "学院"]
  },
  "positions": ["<用户在 3.2 选择的职位列表>"]
}
```

写入完成后告知用户：
- 配置文件路径
- 多维表格链接：`https://www.feishu.cn/base/<base_token>`
- 初始化完成，可以运行"帮我做今天的招聘简报"

---

## 日常运行流程

### Step 0：读取配置

读取 skill 目录下的 `config.json`，提取所有字段。

若文件不存在，提示用户先运行"boss init"完成初始化。

---

### Step 1：拉取候选人列表

```bash
boss list 2>&1
```

输出格式：`序号. 姓名｜应聘职位｜未读:N｜时间:XX｜消息:XX`

记录所有候选人的序号、姓名、应聘职位、未读数、最新消息时间。优先处理未读候选人。

---

### Step 2：逐个获取简历

对每位候选人，先按 `screening.excluded_degrees` 判断学历：

| 判断条件 | 处理方式 |
|----------|----------|
| 学历命中 `excluded_degrees` | **直接点不合适**（`boss action not-fit`），跳过，不纳入统计 |
| 技术岗 + 学历低于 `tech_min_degree` | 获取简历，评级时降权 |
| 其他 | 正常获取简历 |

**获取简历**：

```bash
boss chat "<姓名>" 2>&1
```

`boss chat` 直接返回人才摘要，不需要再执行 `boss action resume`。

**点不合适**：

```bash
# 先打开候选人会话，再执行
boss action not-fit 2>&1
```

> 每批处理 3~5 人，避免浏览器超时。若 `boss chat` 报"未找到联系人"，加 `--strict` 参数；仍失败则标记"未获取"，继续下一位。

---

### Step 3：应用筛选 & 整理为 Markdown

按 `screening` 配置应用筛选规则：

| 条件 | 处理方式 |
|------|----------|
| 学历命中 `excluded_degrees` | 已在 Step 2 处理，不展示 |
| 年龄 ≥ `age_limit` | ❌ 排除，不展示详细简历 |
| 年龄 ≥ `age_downgrade_threshold` | 保留，评级降权，备注"年龄降权" |
| 技术岗 + 学历低于 `tech_min_degree` | 降级，最高不超过 ⭐⭐ 观望 |

**整理格式**（按应聘职位分组）：

```markdown
## [职位名称]

### 姓名
- **性别/年龄**：男/女 · XX岁
- **学历/经验**：本科/硕士 · XX年
- **活跃状态**：刚刚活跃 / 今日活跃 / 昨天 / 3天内
- **期望**：城市 · 职位方向 · 薪资范围
- **工作经历**：
  - 时间　公司 · 职位
- **教育**：学校 · 专业 · 学历（年份）
```

文档开头注明：生成时间、有效候选人总数（不含已点不合适的）、筛选标准摘要。

---

### Step 4：创建飞书云文档

```bash
cd <工作目录>

lark-cli docs +create \
  --title "Boss直聘候选人简历Brief $(Get-Date -Format 'yyyyMMdd')" \
  --folder-token "<config.feishu.folder_token>" \
  --markdown "@tmp_boss_brief.md" \
  --as user 2>&1
```

> 先用 Write 工具将 Markdown 内容写入 `tmp_boss_brief.md`，再执行上述命令。
> `--markdown` 必须用相对路径 `@filename.md`，先 `cd` 到文件所在目录再执行。

记录返回的 `doc_id`。

---

### Step 5：AI 初筛并生成推荐等级

评估三个维度：经验匹配度、学历背景、薪资合理性。学历权重按 `screening` 配置执行。

**推荐等级**：

| 等级 | 含义 | 行动 |
|------|------|------|
| ⭐⭐⭐⭐⭐ 强推 | 高度匹配，学历经验俱佳 | 优先约谈 |
| ⭐⭐⭐⭐ 推荐 | 基本匹配，有明显亮点 | 优先约谈 |
| ⭐⭐⭐ 可约 | 部分匹配，需面试确认 | 可选约谈 |
| ⭐⭐ 观望 | 匹配度弱 | 暂不操作 |
| ⭐ 不推荐 | 明显不合适 | 报告中列出 |
| ❌ 排除 | 不符合硬性筛选条件 | 报告中列出 |

生成初筛报告：各职位分组评级表 + 结尾「优先约谈名单」（⭐⭐⭐⭐及以上）。

---

### Step 6：追加初筛报告到飞书文档

```bash
cd <工作目录>

lark-cli docs +update \
  --doc "<doc_id>" \
  --mode append \
  --as user \
  --markdown "@tmp_boss_screening.md" 2>&1
```

> 表格超过 50 行时拆分多次追加。

---

### Step 7：追加全量顺序汇总表

```bash
cd <工作目录>

lark-cli docs +update \
  --doc "<doc_id>" \
  --mode append \
  --as user \
  --markdown "@tmp_boss_summary.md" 2>&1
```

---

### Step 8：写入多维表格

将有效候选人批量写入多维表格（`config.feishu.base_token` + `config.feishu.table_id`）。

字段映射注意点：
- "应聘职位"必须匹配 `config.positions` 中的选项值，不存在的选项跳过并记录
- "活跃状态"：`3日内活跃` → `3天内`
- 工作年限必须是数字（`10年以上` → `10`，应届生 → `0`）
- 录入日期格式：`yyyy-MM-dd`

```bash
cd <工作目录>

lark-cli base +record-batch-create \
  --base-token "<config.feishu.base_token>" \
  --table-id "<config.feishu.table_id>" \
  --as user \
  --json @boss_records_YYYYMMDD.json 2>&1
```

> JSON 格式：lark-cli 简化格式 `{"fields": [...], "rows": [...]}`，非标准飞书 API 格式。
> `--json` 用相对路径，先 `cd` 到文件目录再执行。

---

### Step 9：推送简报到飞书机器人

使用 `scripts/send-feishu-msg.js`（从 `config.json` 读取 `bot_app_id` 和 `user_open_id`）：

```bash
node <skill目录>/scripts/send-feishu-msg.js --brief brief_data.json
```

其中 `brief_data.json`：

```json
{
  "date": "2026-04-28",
  "total": 20,
  "rejected": 5,
  "excluded": 3,
  "priority": 5,
  "priorityList": [
    { "name": "张三", "position": "APP软件产品经理", "highlight": "985院校，8年经验" }
  ],
  "docUrl": "https://www.feishu.cn/docx/<doc_id>",
  "baseUrl": "https://www.feishu.cn/base/<base_token>",
  "note": ""
}
```

> 严禁直接用 PowerShell 命令行发多行文本——`\n` 会被转义导致只发出第一行，必须通过 Node.js 脚本发送。

---

## 完成后输出

告知用户：
1. 飞书文档链接
2. 多维表格链接
3. 优先约谈名单（⭐⭐⭐⭐及以上）
4. 已点不合适人数
5. 被排除人数及原因分布
6. 未获取简历人数（建议手动查看）
7. 未写入表格的候选人及原因（如职位选项不匹配）

---

## 常见问题

| 问题 | 解决方案 |
|------|----------|
| 找不到 config.json | 先运行"boss init"完成初始化 |
| `未检测到 .menu-list` | 运行 `boss login` 完成浏览器登录 |
| `boss chat` 找不到联系人 | 加 `--strict` 参数；仍失败则标记"未获取" |
| 机器人消息只有第一行 | 必须用 `scripts/send-feishu-msg.js`，不能用 PowerShell 直接发 |
| 多维表格写入报 `not_found` | 职位不在 `config.positions` 选项中，需在飞书手动添加该选项 |
| 多维表格写入报 `Provide a number value` | 年龄/工作年限传了字符串，改为纯数字 |
| 多维表格报 `Provide a value of type array` | JSON 格式错误，改用 lark-cli 简化格式 |
| `--as bot` 不生效 | `--as bot` 必须紧跟子命令 |
| 机器人发送失败 | 确认用户已先给机器人发过消息（建立会话） |
