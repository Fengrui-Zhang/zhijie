type EmbeddingResponse = {
  data?: Array<{ embedding?: number[] }>;
  output?: {
    embeddings?: Array<{ embedding?: number[] }>;
  };
};

const getEmbeddingConfig = () => {
  const apiKey = process.env.EMBEDDING_API_KEY || process.env.DEEPSEEK_API_KEY;
  const baseUrl = process.env.EMBEDDING_BASE_URL || 'https://api.deepseek.com';
  const model = process.env.EMBEDDING_MODEL;
  const provider = (process.env.EMBEDDING_PROVIDER || 'openai').toLowerCase();

  if (!apiKey) {
    throw new Error('Embedding API key is missing.');
  }
  if (!model) {
    throw new Error('Embedding model is missing.');
  }

  return { apiKey, baseUrl, model, provider };
};

export const embedTexts = async (inputs: string[]): Promise<number[][]> => {
  const { apiKey, baseUrl, model, provider } = getEmbeddingConfig();

  if (provider === 'dashscope') {
    const response = await fetch(
      `${baseUrl}/api/v1/services/embeddings/text-embedding/text-embedding`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          input: {
            texts: inputs,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || 'Embedding request failed.');
    }

    const data = (await response.json()) as EmbeddingResponse;
    const embeddings = data.output?.embeddings
      ?.map(item => item.embedding)
      .filter(Boolean) as number[][] | undefined;

    if (!embeddings || embeddings.length !== inputs.length) {
      throw new Error('Embedding response is invalid.');
    }

    return embeddings;
  }

  const response = await fetch(`${baseUrl}/v1/embeddings`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      input: inputs,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || 'Embedding request failed.');
  }

  const data = (await response.json()) as EmbeddingResponse;
  const embeddings = data.data?.map(item => item.embedding).filter(Boolean) as
    | number[][]
    | undefined;

  if (!embeddings || embeddings.length !== inputs.length) {
    throw new Error('Embedding response is invalid.');
  }

  return embeddings;
};

export const embedText = async (input: string): Promise<number[]> => {
  const [embedding] = await embedTexts([input]);
  return embedding;
};
