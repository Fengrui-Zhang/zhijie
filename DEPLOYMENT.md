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
| `DATABASE_URL` | 必填，Vercel Postgres 创建后从 `POSTGRES_URL` 复制 | postgresql://... |
| `DIRECT_URL` | 必填，从 `POSTGRES_URL_NON_POOLING` 复制 | postgresql://... |
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

**自动迁移**：构建时会自动执行 `prisma migrate deploy`，只要 Vercel 中配置了 `DATABASE_URL` 和 `DIRECT_URL`，部署时就会创建表。

**手动迁移**（若自动迁移失败）：在本地执行 `vercel env pull .env.local` 拉取环境变量后，运行 `npx prisma migrate deploy`。

## 四、重新部署

完成上述配置后，在 Vercel Dashboard 点击 **Redeploy**，或推送新提交到 GitHub 触发自动部署。

## 五、验证

1. 访问部署后的 URL
2. 测试注册 / 登录
3. 测试排盘与 AI 对话
4. 测试会话保存与加载
