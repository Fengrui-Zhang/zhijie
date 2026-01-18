# DeepSeek R1 Next.js App

本项目是一个基于 Next.js 的前后端一体应用，后端通过服务器端 API 路由调用 DeepSeek R1 模型，API Key 仅保存在服务器环境变量中，不会暴露到浏览器端。

## 开发

1. 安装依赖：

```bash
npm install
```

2. 配置环境变量：

```bash
cp .env.example .env.local
```

将 `.env.local` 中的 `DEEPSEEK_API_KEY` 填入你的真实密钥。

3. 启动开发服务器：

```bash
npm run dev
```

访问 `http://localhost:3000`。
