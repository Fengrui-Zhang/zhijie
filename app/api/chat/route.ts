import { NextResponse } from "next/server";

const DEEPSEEK_API_URL = "https://api.deepseek.com/v1/chat/completions";

export async function POST(request: Request) {
  const apiKey = process.env.DEEPSEEK_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "服务器未配置 DEEPSEEK_API_KEY。" },
      { status: 500 }
    );
  }

  const body = await request.json();
  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";

  if (!prompt) {
    return NextResponse.json({ error: "请输入有效的提问内容。" }, { status: 400 });
  }

  const deepseekResponse = await fetch(DEEPSEEK_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: "deepseek-reasoner",
      messages: [
        {
          role: "system",
          content:
            "你是一个专业且可靠的助手，请用清晰简洁的中文回答问题。"
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.3
    })
  });

  if (!deepseekResponse.ok) {
    const errorText = await deepseekResponse.text();
    return NextResponse.json(
      { error: `DeepSeek API 调用失败：${errorText}` },
      { status: deepseekResponse.status }
    );
  }

  const data = (await deepseekResponse.json()) as {
    choices?: { message?: { content?: string } }[];
  };

  const answer = data.choices?.[0]?.message?.content?.trim() ?? "";

  return NextResponse.json({ answer });
}
