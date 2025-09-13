import OpenAI from "openai";
import type { Chapter } from "@shared/schema";

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const DEFAULT_MODEL = "gpt-5";

interface LLMResult {
  tldr: string;
  chapters: Chapter[];
}

export class LLMService {
  private openai: OpenAI;
  private groqApiKey: string;

  constructor() {
    this.openai = new OpenAI({ 
      apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "default_key"
    });
    this.groqApiKey = process.env.GROQ_API_KEY || "";
  }

  async generateTLDRAndChapters(
    transcriptText: string, 
    language: string = 'ru', 
    model: string = DEFAULT_MODEL
  ): Promise<LLMResult> {
    // Truncate very long transcripts to fit in context window
    const maxLength = 8000; // Conservative limit for context
    const truncatedText = transcriptText.length > maxLength 
      ? transcriptText.substring(0, maxLength) + "..." 
      : transcriptText;

    // Try OpenAI first, then fallback to Groq
    try {
      return await this.callOpenAI(truncatedText, language, model);
    } catch (error) {
      console.warn('OpenAI call failed, trying Groq:', error);
      
      if (this.groqApiKey) {
        try {
          return await this.callGroq(truncatedText, language);
        } catch (groqError) {
          console.error('Groq call also failed:', groqError);
        }
      }
      
      throw new Error('All LLM providers failed');
    }
  }

  private async callOpenAI(transcriptText: string, language: string, model: string): Promise<LLMResult> {
    const prompt = this.buildPrompt(transcriptText, language);

    const response = await this.openai.chat.completions.create({
      model: model === 'gpt-5' ? 'gpt-5' : model, // Ensure we use the latest model
      messages: [
        {
          role: "system",
          content: this.getSystemPrompt(language)
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
      max_tokens: 1000
    });

    const result = response.choices[0].message.content;
    if (!result) {
      throw new Error('Empty response from OpenAI');
    }

    return this.parseStructuredResponse(result);
  }

  private async callGroq(transcriptText: string, language: string): Promise<LLMResult> {
    const prompt = this.buildPrompt(transcriptText, language);

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.groqApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama3-8b-8192',
        messages: [
          {
            role: "system",
            content: this.getSystemPrompt(language)
          },
          {
            role: "user", 
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1000
      }),
      signal: AbortSignal.timeout(30000)
    });

    if (!response.ok) {
      throw new Error(`Groq API error: ${response.status}`);
    }

    const data = await response.json();
    const result = data.choices?.[0]?.message?.content;

    if (!result) {
      throw new Error('Empty response from Groq');
    }

    return this.parseStructuredResponse(result);
  }

  private getSystemPrompt(language: string): string {
    const prompts = {
      'ru': `Ты эксперт по анализу видео контента. Твоя задача - создать краткое содержание (TLDR) и список глав с временными метками. 

Требования:
1. TLDR должен быть 2-3 предложения, кратко описывающих основную суть видео
2. Главы должны иметь точные временные метки в формате MM:SS или HH:MM:SS
3. Названия глав должны быть информативными и отражать содержание этого раздела
4. Ответ должен быть в формате JSON

Отвечай ТОЛЬКО на русском языке.`,

      'en': `You are an expert at analyzing video content. Your task is to create a brief summary (TLDR) and a list of chapters with timestamps.

Requirements:
1. TLDR should be 2-3 sentences briefly describing the main essence of the video
2. Chapters should have precise timestamps in MM:SS or HH:MM:SS format  
3. Chapter titles should be informative and reflect the content of that section
4. Response should be in JSON format

Respond ONLY in English.`,

      'es': `Eres un experto en análisis de contenido de video. Tu tarea es crear un resumen breve (TLDR) y una lista de capítulos con marcas de tiempo.

Requisitos:
1. TLDR debe ser de 2-3 oraciones describiendo brevemente la esencia principal del video
2. Los capítulos deben tener marcas de tiempo precisas en formato MM:SS o HH:MM:SS
3. Los títulos de capítulos deben ser informativos y reflejar el contenido de esa sección
4. La respuesta debe estar en formato JSON

Responde SOLO en español.`
    };

    return prompts[language as keyof typeof prompts] || prompts['en'];
  }

  private buildPrompt(transcriptText: string, language: string): string {
    return `Analiza el siguiente transcript de video y genera:

1. Un TLDR (resumen muy breve)
2. Lista de capítulos con timestamps

Transcript:
${transcriptText}

Responde en formato JSON exactamente así:
{
  "tldr": "Resumen breve del video en 2-3 oraciones",
  "chapters": [
    {
      "time": "00:00",
      "title": "Introducción"
    },
    {
      "time": "02:30", 
      "title": "Tema principal"
    }
  ]
}

IMPORTANTE: 
- Los timestamps deben estar en formato MM:SS o HH:MM:SS
- Deben ser realistas basados en el contenido del transcript
- Los títulos de capítulos deben ser descriptivos y específicos
- Responde SOLO en JSON, sin texto adicional`;
  }

  private parseStructuredResponse(responseText: string): LLMResult {
    try {
      const parsed = JSON.parse(responseText);
      
      // Validate the response structure
      if (!parsed.tldr || !Array.isArray(parsed.chapters)) {
        throw new Error('Invalid response structure');
      }

      // Validate and normalize chapters
      const chapters: Chapter[] = parsed.chapters
        .filter((ch: any) => ch.time && ch.title)
        .map((ch: any) => ({
          time: this.normalizeTimestamp(ch.time),
          title: ch.title.trim()
        }));

      return {
        tldr: parsed.tldr.trim(),
        chapters
      };

    } catch (error) {
      console.error('Failed to parse structured LLM response:', error);
      
      // Fallback: try to extract TLDR and chapters from unstructured text
      return this.parseUnstructuredResponse(responseText);
    }
  }

  private parseUnstructuredResponse(responseText: string): LLMResult {
    const lines = responseText.split('\n').map(line => line.trim()).filter(line => line);
    
    let tldr = '';
    const chapters: Chapter[] = [];
    
    let foundTldr = false;
    let foundChapters = false;

    for (const line of lines) {
      // Look for TLDR
      if (line.toLowerCase().includes('tldr') || line.toLowerCase().includes('resumen')) {
        foundTldr = true;
        const colonIndex = line.indexOf(':');
        if (colonIndex > -1) {
          tldr = line.substring(colonIndex + 1).trim();
        }
        continue;
      }

      // Look for chapters
      if (line.toLowerCase().includes('chapters') || line.toLowerCase().includes('capítulos')) {
        foundChapters = true;
        continue;
      }

      // Parse chapter lines (look for timestamp patterns)
      const timeMatch = line.match(/(\d{1,2}:\d{2}(?::\d{2})?)/);
      if (timeMatch && foundChapters) {
        const time = timeMatch[1];
        const title = line.replace(timeMatch[0], '').replace(/^[\s\-:]+/, '').trim();
        
        if (title) {
          chapters.push({
            time: this.normalizeTimestamp(time),
            title
          });
        }
      }

      // If we haven't found TLDR yet and this looks like a summary
      if (!foundTldr && !foundChapters && line.length > 50) {
        tldr = line;
        foundTldr = true;
      }
    }

    return {
      tldr: tldr || 'No summary available',
      chapters
    };
  }

  private normalizeTimestamp(timestamp: string): string {
    // Ensure timestamp is in MM:SS or HH:MM:SS format
    const parts = timestamp.split(':');
    
    if (parts.length === 2) {
      // MM:SS format
      const minutes = parseInt(parts[0]).toString().padStart(2, '0');
      const seconds = parseInt(parts[1]).toString().padStart(2, '0');
      return `${minutes}:${seconds}`;
    } else if (parts.length === 3) {
      // HH:MM:SS format
      const hours = parseInt(parts[0]).toString().padStart(2, '0');
      const minutes = parseInt(parts[1]).toString().padStart(2, '0');
      const seconds = parseInt(parts[2]).toString().padStart(2, '0');
      return `${hours}:${minutes}:${seconds}`;
    }
    
    // Default fallback
    return timestamp;
  }
}
