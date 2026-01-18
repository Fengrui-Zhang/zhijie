"use client";

import { useState } from "react";

export default function HomePage() {
  const [prompt, setPrompt] = useState("");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setResponse("");

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ prompt })
      });

      if (!res.ok) {
        const { error: errorMessage } = await res.json();
        throw new Error(errorMessage || "请求失败，请稍后再试。");
      }

      const data = await res.json();
      setResponse(data.answer || "未收到回复。");
    } catch (err) {
      const message = err instanceof Error ? err.message : "未知错误";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main>
      <section className="card">
        <h1>DeepSeek R1 后端调用示例</h1>
        <p>
          这个应用在 Next.js 后端调用 DeepSeek R1 模型，并确保 API Key 仅保存在服务器端环境变量中。
        </p>
        <form onSubmit={handleSubmit}>
          <textarea
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder="请输入你想让模型回答的问题..."
            required
          />
          <button type="submit" disabled={loading}>
            {loading ? "生成中..." : "发送"}
          </button>
        </form>
        {error ? <div className="response">错误：{error}</div> : null}
        {response ? <div className="response">{response}</div> : null}
        <p className="footer-note">
          请在服务器环境变量中设置 DEEPSEEK_API_KEY，前端不会暴露任何密钥信息。
        </p>
      </section>
    </main>
  );
}
