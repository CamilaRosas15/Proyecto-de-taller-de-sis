import { Controller, Get} from '@nestjs/common';
//import { AiServiceService } from 'src/ai-service/ai-service.service';
import { NutrichefAiService } from './nutrichef-ai.service';

@Controller('nutrichef-ai')
export class NutrichefAiController {
    constructor(private readonly aiService: NutrichefAiService){};

    @Get()
    findAll(): Promise<string> {
        return this.aiService.getHelloWorldFromAI();
    }
}
