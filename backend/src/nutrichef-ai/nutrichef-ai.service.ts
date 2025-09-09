import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Groq from "groq-sdk"; 

@Injectable()
export class NutrichefAiService {
    private groq: Groq;
    private readonly groqModel: string;

    constructor(private configService: ConfigService) {
        const groqApiKey = this.configService.get<string>('GROQ_API_KEY');
        
        // Modificar para no fallar si no hay API key (modo demo)
        if (groqApiKey) {
            this.groq = new Groq({ apiKey: groqApiKey });
        } else {
            console.warn('GROQ_API_KEY no configurada. Modo demo activado.');
        }
        
        this.groqModel = this.configService.get<string>('GROQ_MODEL') || 'llama-3.1-8b-instant';
    }

    async getHelloWorldFromAI(): Promise<string> {
        try {
            // Si no hay API key, responder con mensaje demo
            if (!this.groq) {
                return "¡Hola! Este es un mensaje de demostración de NutriChef IA. Para usar la IA real, configura tu API key de Groq.";
            }

            const chatCompletion = await this.groq.chat.completions.create({
                messages: [
                    {
                        role: "user",
                        content: 'Di "Hola a personas de NutriChef IA" en español de una manera muy corta y amigable.',
                    }
                ],
                model: this.groqModel,
                temperature: 0.7,
                max_tokens: 100,
            });
            
            return chatCompletion.choices[0]?.message?.content?.trim() || 'No se pudo obtener el saludo de la IA.';
        } catch (error) {
            console.error('Error al conectar con Groq:', error);
            return 'Error: No se pudo conectar con el servicio de IA. Verifica tu API key.';
        }
    }
}