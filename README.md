# 元分 · 智解

一个面向中文命理与术数分析的 Web 应用。系统使用本地确定性算法完成排盘，再将结构化盘面、用户问题、个性化偏好和可选知识库资料组合为上下文，交给大语言模型进行解读。

- 在线体验：[https://zhijie123.online/](https://zhijie123.online/)
- 生产环境：Vercel
- 数据库：PostgreSQL

> 排盘结果和 AI 解读仅供研究与参考，不构成医疗、法律、投资或其他专业建议。

## 功能

### 命理运势

- **四柱八字**：公历、农历、四柱输入，精确时间与快捷时辰，真太阳时校准，命例管理，专业排盘，大运/流年/流月/流日，十神与神煞，AI 五行分析、AI 人格分析、断事笔记和人生 K 线。
- **紫微斗数**：命例管理、十二宫盘面、宫位选择、三方四正、大限与流年切换，以及结合完整盘面的 AI 解读。
- **每日运势**：日历信息、七日趋势、分类评分、运势指引和命局喜忌校准。
- **每月运势**：月内日历、全年趋势、分类评分、月度指引，并可跳转到对应日期的每日运势。

### 占卜预测

- 奇门遁甲
- 六爻纳甲
- 梅花易数
- 大六壬
- 太乙神数
- 小六壬

### 择日工具

- 黄历与日期详情
- 按事项和日期范围筛选吉日
- 结合已保存八字命例进行个性化择日
- 推荐日期高亮、简短建议和十二时辰吉凶

### 进阶功能

- 八字 + 紫微联合分析
- 八字合盘

### 会话与个人设置

- 命例库、排盘记录和 AI 会话历史
- 新聊天可引用命例和已有会话
- 可选命理知识库检索与来源记录
- 可复制当前分析实际发送给模型的完整提示词
- 个性化表达风格、关注维度、命盘注入级别、图表风格和自定义指令
- 可配置手机端常驻入口、默认命盘和历史记录开关
- 用户注册、邮箱验证、密码重置、额度管理和管理员后台

## 核心规则

- 排盘完全在服务端通过本地算法完成，不依赖第三方排盘 API。
- 排盘本身不消耗用户额度；只有实际请求大语言模型时才扣除额度。
- 单纯打开排盘、每日运势或每月运势不会创建 AI 会话历史。
- 四柱八字和紫微斗数保存为命例；其他术数结果主要随 AI 会话保存。
- 每日/月运支持默认算法、命局喜忌算法及按命例保存的 AI 五行校准。
- 普通分析固定使用 `deepseek-v4-pro`，结构化智能择日使用 `deepseek-v4-flash`。
- “问智解”默认运行服务端 Agent：由 `deepseek-v4-pro` 自动选择并调用本地命理、占卜、运势、黄历与知识库工具，再综合工具结果作答。Agent 仅限登录用户，单轮最多调用 AI 6 次，每次按 0.5 点计算、最终向上取整（单轮最多 3 点），本地排盘不扣点。
- 同一用户在同一地支时辰内切换不同占问事项时，Agent 会停止再次时间起卦并要求报数；同一事项追问复用原盘。可通过 `AGENT_CHAT_ENABLED=false` 临时回退原直接聊天链路。

## 技术栈

- [Next.js 15](https://nextjs.org/) / App Router
- React 19 + TypeScript
- Tailwind CSS
- Prisma 6 + PostgreSQL
- NextAuth Credentials
- Recharts
- `taibu-core` 本地术数算法
- DeepSeek OpenAI-compatible API

## 数据结构

主要 Prisma 模型位于 `prisma/schema.prisma`：

- `User`：账户、角色和 AI 使用额度
- `DivinationCase`：八字、紫微命例及命例级分析结果
- `CaseRelation`：命例之间的关系
- `DivinationSession`：AI 会话和会话级排盘上下文
- `ChatMessage`：会话消息与知识库来源
- `SiteSettings`：注册、访客模式、公告和运势算法等全站设置

## 本地开发

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

复制 `.env.example` 为 `.env.local`，至少配置以下变量：

```bash
DATABASE_URL="postgresql://..."
DATABASE_URL_UNPOOLED="postgresql://..."
NEXTAUTH_SECRET="..."
NEXTAUTH_URL="http://localhost:3000"
DEEPSEEK_API_KEY="..."
DEEPSEEK_BASE_URL="https://api.deepseek.com"
```

如果需要注册验证码、密码重置、知识库或生产 Cron，再配置 `.env.example` 中对应的可选变量。

### 3. 初始化数据库

```bash
npx prisma generate
npx prisma migrate deploy
npm run seed
```

`npm run seed` 会创建管理员账号。生产环境请通过 `ADMIN_EMAIL`、`ADMIN_PASSWORD` 和 `ADMIN_NAME` 显式配置管理员信息，不要使用示例默认密码。

### 4. 启动开发服务器

```bash
npm run dev
```

访问 [http://localhost:3000](http://localhost:3000)。

## 常用命令

```bash
npm run dev                         # 启动开发服务器
npm run build                       # 执行数据库迁移并构建生产版本
npm run start                       # 启动生产服务器
npx tsc --noEmit                    # TypeScript 类型检查
npm run ingest:knowledge            # 构建知识库索引
npm run rechart:cases               # 使用当前本地算法重建旧命例盘面
npm run backfill:wuxing-calibration # 补齐已有 AI 五行分析的校准字段
```

## 目录说明

```text
app/                  Next.js 页面与 API Route Handlers
components/           排盘、运势、择日、会话和账户组件
lib/                  本地排盘适配、提示词、认证和业务规则
prisma/               数据模型、迁移和种子脚本
public/data/           中国行政区划与地点经纬度数据
scripts/               知识库、旧命例重排和数据补齐脚本
services/              前端 API 与流式模型请求封装
utils/                 知识库检索和 Embedding 工具
taibu/                 术数算法与交互实现的开发参考源码
App.tsx                当前主要产品状态和工作区编排入口
types.ts               排盘参数及返回数据类型
```

## 生产部署

项目当前由 Vercel 部署。推送 `main` 分支后会触发自动构建和发布。

Vercel 环境中需要配置数据库、NextAuth、DeepSeek、邮件服务和 Cron 所需变量。`vercel.json` 已配置每日会话清理和额度补充任务；生产环境必须设置 `CRON_SECRET`。

部署前建议运行：

```bash
npx tsc --noEmit
npm run build
```

## 开发注意事项

- 不要重新接入旧的外部排盘 API。
- 不要在用户界面暴露模型名称、内部算法来源或开发备注。
- 新增 AI 功能时必须明确额度扣除时机，失败请求不能扣点。
- 新增会话记录时要保证只有真实发生 AI 对话后才写入历史。
- 修改弹窗时应锁定背景滚动，并让弹窗内容区在手机端独立滚动。
- 调整命盘结构或算法时，需要兼容数据库中已有命例和历史会话。
- `.next/`、本地环境变量和 `tsconfig.tsbuildinfo` 不应提交到仓库。
