import { Test, TestingModule } from '@nestjs/testing';
import { NutrichefAiController } from './nutrichef-ai.controller';

describe('NutrichefAiController', () => {
  let controller: NutrichefAiController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NutrichefAiController],
    }).compile();

    controller = module.get<NutrichefAiController>(NutrichefAiController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
