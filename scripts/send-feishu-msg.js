/**
 * 飞书消息发送脚本（绕过 PowerShell 参数解析问题）
 *
 * 问题根因：PowerShell -> npx -> Node.js 链条会把 \n 转义成真正换行符，
 * 导致 lark-cli 只读取到第一行。
 *
 * 解决：直接用 Node.js execFileSync 调用 lark-cli 二进制，绕过 shell 解析。
 *
 * 配置从同级目录的 config.json 读取，无需修改本文件。
 */
const { execFileSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const CONFIG_PATH = path.join(__dirname, '..', 'config.json');

function loadConfig() {
  if (!fs.existsSync(CONFIG_PATH)) {
    throw new Error(`config.json 未找到，请先运行 boss init 完成初始化。路径：${CONFIG_PATH}`);
  }
  return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
}

function getLarkCliBin() {
  const candidates = [
    path.join(process.env.APPDATA || '', 'npm', 'node_modules', '@larksuite', 'cli', 'bin', 'lark-cli.exe'),
    path.join(process.env.USERPROFILE || '', 'AppData', 'Roaming', 'npm', 'node_modules', '@larksuite', 'cli', 'bin', 'lark-cli.exe'),
    'lark-cli',
  ];
  for (const p of candidates) {
    if (p === 'lark-cli' || fs.existsSync(p)) return p;
  }
  return 'lark-cli';
}

/**
 * 发送纯文本消息
 */
function sendText(text, options = {}) {
  const config = loadConfig();
  const {
    userId = config.feishu.user_open_id,
    chatId,
    identity = 'bot',
  } = options;

  const bin = getLarkCliBin();
  const args = ['im', '+messages-send', '--as', identity];

  if (chatId) {
    args.push('--chat-id', chatId);
  } else {
    args.push('--user-id', userId);
  }
  args.push('--text', text);

  const result = execFileSync(bin, args, { encoding: 'utf8' });
  return JSON.parse(result);
}

/**
 * 发送招聘简报
 */
function sendBrief(data, options = {}) {
  const config = loadConfig();
  const {
    date, total, rejected, excluded, priority,
    priorityList, docUrl, baseUrl, note = '',
  } = data;

  let text = `Boss直聘每日简历Brief已生成\n\n`;
  text += `📅 日期：${date}\n`;
  text += `👥 有效候选人：${total}人（已点不合适${rejected}人，排除${excluded}人）\n`;
  text += `🏆 优先约谈：${priority}人\n\n`;
  text += `── 优先约谈名单 ──\n`;

  (priorityList || []).forEach((item, idx) => {
    text += `${idx + 1}. ${item.name} | ${item.position} | ${item.highlight}\n`;
  });

  text += `\n── 文档链接 ──\n`;
  text += `📄 简历文档：${docUrl}\n`;
  text += `📊 管理表格：${baseUrl || `https://www.feishu.cn/base/${config.feishu.base_token}`}\n`;

  if (note) text += `\n注：${note}\n`;

  return sendText(text, { ...options, userId: options.userId || config.feishu.user_open_id });
}

if (require.main === module) {
  const args = process.argv.slice(2);
  if (args[0] === '--brief' && args[1]) {
    const data = JSON.parse(fs.readFileSync(args[1], 'utf8'));
    const result = sendBrief(data);
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.error('Usage: node send-feishu-msg.js --brief <data.json>');
    process.exit(1);
  }
}

module.exports = { sendText, sendBrief };
