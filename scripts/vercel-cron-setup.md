# Vercel Cron 配置说明

会话清理任务需要配置 `CRON_SECRET` 环境变量，请按以下步骤操作：

## 1. 生成 CRON_SECRET

在终端执行：

```bash
openssl rand -hex 32
```

复制输出的字符串（例如 `c3374b93c2a0e69e3da09202ba7d8d00a033d94c5411cb33f1cd04f78e123adf`）。

## 2. 在 Vercel 中添加环境变量

1. 打开 [Vercel Dashboard](https://vercel.com/dashboard)
2. 选择项目 **zhijie**
3. 进入 **Settings** → **Environment Variables**
4. 点击 **Add New**
5. 填写：
   - **Name**: `CRON_SECRET`
   - **Value**: 粘贴步骤 1 生成的字符串
   - **Environment**: 勾选 **Production**（Preview 可选）
6. 点击 **Save**

## 3. 重新部署

添加环境变量后，在 **Deployments** 中点击最新部署右侧的 **⋯** → **Redeploy**，使新变量生效。

## 4. 验证

Cron 任务每日 UTC 4:00（北京时间 12:00）自动执行。可在 Vercel 的 **Logs** 或 **Cron Jobs** 中查看执行记录。

---

## 使用 Vercel CLI（可选）

若已安装并登录 Vercel CLI，可执行：

```bash
# 生成并添加（需手动复制生成的 secret 到下一步）
CRON_SECRET=$(openssl rand -hex 32) && echo "请将以下值添加到 Vercel: $CRON_SECRET" && npx vercel env add CRON_SECRET production
# 按提示粘贴上面输出的 secret
```
