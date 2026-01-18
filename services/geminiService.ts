import { GoogleGenAI, Chat } from "@google/genai";

let chatSession: Chat | null = null;

export const startQimenChat = async (systemInstruction: string) => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
     throw new Error("API Key is missing. Ensure process.env.API_KEY is configured.");
  }

  const ai = new GoogleGenAI({ apiKey });
  
  // Initialize a new chat session with the specific system instruction for this reading
  const chat = ai.chats.create({
    model: 'gemini-3-pro-preview',
    config: {
      systemInstruction: systemInstruction,
      temperature: 0.7, // Balanced creativity and accuracy
    }
  });

  chatSession = chat;
  return chat;
};

export const sendMessageToGemini = async (message: string): Promise<string> => {
  if (!chatSession) {
    throw new Error("Chat session not initialized. Please start a reading first.");
  }

  try {
    const response = await chatSession.sendMessage({ message });
    return response.text || "无法获取回复";
  } catch (error) {
    console.error("Gemini Chat Error:", error);
    throw error;
  }
};

export const clearChatSession = () => {
  chatSession = null;
};