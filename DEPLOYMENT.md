# Vercel 部署指南

代码已准备好部署。请按以下步骤完成 Vercel 和数据库配置。

## 一、Vercel 项目与 Postgres

1. 访问 [vercel.com](https://vercel.com)，用 GitHub 登录
2. 点击 **Add New** → **Project**，选择 `Fengrui-Zhang/zhijie` 仓库
3. Framework 自动识别为 Next.js，直接点击 **Deploy** 完成首次部署（可能失败，需先配置数据库）
4. 进入项目 → **Storage** → **Create Database** → 选择 **Postgres**
5. 选择 **Hobby** 免费计划，区域选 **Singapore (sin1)**
6. 创建后，Vercel 会自动注入 `POSTGRES_URL` 和 `POSTGRES_URL_NON_POOLING`。在 **Environment Variables** 中新增 `DATABASE_URL`（复制 `POSTGRES_URL` 的值）和 `DIRECT_URL`（复制 `POSTGRES_URL_NON_POOLING` 的值）

## 二、环境变量

在项目 **Settings** → **Environment Variables** 中配置：

| 变量名 | 说明 | 示例 |
|--------|------|------|
| `NEXTAUTH_SECRET` | 必填，运行 `openssl rand -base64 32` 生成 | 随机字符串 |
| `NEXTAUTH_URL` | 部署后域名 | `https://zhijie-xxx.vercel.app` |
| `DEEPSEEK_API_KEY` | DeepSeek LLM | 你的 API Key |
| `YUANFENJU_API_KEY` | 元奋局排盘 | 你的 API Key |
| `EMBEDDING_PROVIDER` | 向量嵌入服务 | dashscope / openai |
| `EMBEDDING_BASE_URL` | 嵌入 API 地址 | 可选 |
| `EMBEDDING_MODEL` | 嵌入模型 | text-embedding-v3 |
| `EMBEDDING_API_KEY` | 嵌入 API Key | 你的 Key |
| `USE_HIER_KNOWLEDGE` | 知识库模式 | true / false |

## 三、数据库迁移

**本地开发**：在 `.env` 中确保有 `DATABASE_URL` 和 `DIRECT_URL`（本地 PostgreSQL 两者可填相同连接串），然后执行：

```bash
npx prisma migrate dev --name init
```

**Vercel 部署**：在本地执行（需先安装 Vercel CLI 并登录）：

```bash
npm i -g vercel
vercel login
vercel link
vercel env pull .env.local
npx prisma migrate deploy
```

若无法使用 Vercel CLI，可到 Vercel Dashboard → 项目 → **Storage** → Postgres 下载 `.env.local`，将 `POSTGRES_URL` 和 `POSTGRES_URL_NON_POOLING` 分别填入 `DATABASE_URL` 和 `DIRECT_URL` 到本地 `.env`，再执行 `npx prisma migrate deploy`。

## 四、重新部署

完成上述配置后，在 Vercel Dashboard 点击 **Redeploy**，或推送新提交到 GitHub 触发自动部署。

## 五、验证

1. 访问部署后的 URL
2. 测试注册 / 登录
3. 测试排盘与 AI 对话
4. 测试会话保存与加载
