import { NextResponse } from 'next/server';

const BASE_API = 'https://api.yuanfenju.com/index.php/v1';

export async function POST(request: Request) {
  const body = await request.json();
  const overrideKey = typeof body.apiKey === 'string' ? body.apiKey.trim() : '';
  const apiKey = overrideKey || process.env.YUANFENJU_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Yuanfenju API key is missing.' },
      { status: 500 }
    );
  }

  const endpoint = body.endpoint as string | undefined;
  const params = body.params as Record<string, string> | undefined;

  if (!endpoint || !params) {
    return NextResponse.json(
      { error: 'endpoint and params are required.' },
      { status: 400 }
    );
  }

  const urlParams = new URLSearchParams();
  urlParams.append('api_key', apiKey);

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      urlParams.append(key, value);
    }
  });

  const targetUrl = `${BASE_API}${endpoint}?${urlParams.toString()}`;

  const response = await fetch(targetUrl, { method: 'GET' });
  if (!response.ok) {
    const errorText = await response.text();
    return NextResponse.json(
      { error: `Network Error: ${response.status} - ${errorText}` },
      { status: response.status }
    );
  }

  const json = await response.json();
  if (json.errcode !== 0) {
    return NextResponse.json(
      { error: `API Error (${json.errcode}): ${json.errmsg}` },
      { status: 500 }
    );
  }

  if (!json.data) {
    return NextResponse.json({ error: 'No data returned from API' }, { status: 500 });
  }

  return NextResponse.json({ data: json.data });
}
