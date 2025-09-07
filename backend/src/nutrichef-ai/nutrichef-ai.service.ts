import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Groq from "groq-sdk"; 


@Injectable()
export class NutrichefAiService {
    private groq: Groq;
  private readonly groqModel: string;

  constructor(private configService: ConfigService) {
    const groqApiKey = this.configService.get<string>('GROQ_API_KEY');
    if (!groqApiKey) {
      throw new Error('GROQ_API_KEY no está configurada en las variables de entorno.');
    }
    this.groq = new Groq({ apiKey: groqApiKey });
    this.groqModel = this.configService.get<string>('GROQ_MODEL') || 'llama-3.1-8b-instant';
  }

  async getHelloWorldFromAI(): Promise<string> {
    try {
      const chatCompletion = await this.groq.chat.completions.create({
        messages: [
          {
            role: "user",
            content: 'Di "Hola a personas de 30 " en español de una manera muy corta y amigable.',
          }
        ],
        model: this.groqModel,
        temperature: 0.7, // Puedes ajustar la temperatura, 0.7 es un buen valor por defecto
        max_tokens: 300, // Limita la longitud para una respuesta rápida y concisa
      });
      return chatCompletion.choices[0]?.message?.content?.trim() || 'No se pudo obtener el saludo de la IA.';
    } catch (error) {
      console.error('Error al obtener "Hola Mundo" de la IA con Groq:', error);
      return 'Error: No se pudo obtener el saludo de la IA.';
    }
  }

  async getAIResponse(prompt: string): Promise<string> {
    try {
      const chatCompletion = await this.groq.chat.completions.create({
        messages: [
          {
            role: "user",
            content: prompt,
          }
        ],
        model: this.groqModel,
        temperature: 0.7,
        max_tokens: 200, // Ajusta según la longitud esperada de la respuesta
      });
      return chatCompletion.choices[0]?.message?.content?.trim() || 'No se pudo obtener la respuesta de la IA.';
    } catch (error) {
      console.error('Error al comunicarse con la IA con Groq:', error);
      throw new Error('No se pudo obtener la respuesta de la IA.');
    }
  }
}
