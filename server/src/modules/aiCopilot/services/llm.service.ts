import { GoogleGenerativeAI } from '@google/generative-ai';
import { COPILOT_CONFIG } from '../config/aiCopilot-env.config.js';

let genAIInstance: GoogleGenerativeAI | null = null;

export interface ILlmContentResponse {
  text: string;
  functionCalls: any[];
}

export class LlmService {

  static getGenAI(): GoogleGenerativeAI | null {
    if (genAIInstance) return genAIInstance;

    const apiKey = COPILOT_CONFIG.gemini.apiKey;
    console.log(apiKey);
    if (!apiKey) {
      console.warn('[LlmService] GEMINI_API_KEY is missing. Operating in MOCK mode.');
      return null;
    }

    genAIInstance = new GoogleGenerativeAI(apiKey);
    console.log('[LlmService] Google Generative AI (Gemini) client initialized successfully.');
    return genAIInstance;
  }

  static async getEmbedding(text: string): Promise<number[]> {
    const ai = this.getGenAI();
    if (!ai) {
      return this.generateMockVector();
    }

    try {
      const model = ai.getGenerativeModel({ model: 'gemini-embedding-001' });
      const result = await model.embedContent(text);
      if (result.embedding && result.embedding.values) {
        return result.embedding.values;
      }
      throw new Error('Invalid embedding response format');
    } catch (error: any) {
      console.error('[LlmService] Embedding failed, falling back to mock:', error.message);
      return this.generateMockVector();
    }
  }

  private static generateMockVector(): number[] {
    const vec: number[] = [];
    for (let i = 0; i < 768; i++) {
      vec.push((Math.random() - 0.5) * 0.1);
    }
    return vec;
  }

  static async generateContent(
    systemInstruction: string,
    prompt: string,
    tools: any[] = []
  ): Promise<ILlmContentResponse> {
    const ai = this.getGenAI();
    const modelName = COPILOT_CONFIG.gemini.modelName;

    if (!ai) {
      console.warn('[LlmService] Gemini in MOCK mode. Returning static response.');
      return {
        text: 'This is a mock response from Gemini LLM. GEMINI_API_KEY is not configured.',
        functionCalls: [],
      };
    }

    try {
      const modelOptions: any = {
        model: modelName,
        systemInstruction: systemInstruction,
      };

      if (tools && tools.length > 0) {
        modelOptions.tools = [{ functionDeclarations: tools }];
      }

      const model = ai.getGenerativeModel(modelOptions);
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text ? response.text() : '';
      const functionCalls = response.functionCalls ? (response.functionCalls() || []) : [];

      return {
        text,
        functionCalls,
      };
    } catch (error: any) {
      console.error('[LlmService] Generation error:', error.message);
      throw error;
    }
  }
}
