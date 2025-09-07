import { Test, TestingModule } from '@nestjs/testing';
import { NutrichefAiService } from './nutrichef-ai.service';

describe('NutrichefAiService', () => {
  let service: NutrichefAiService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [NutrichefAiService],
    }).compile();

    service = module.get<NutrichefAiService>(NutrichefAiService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
