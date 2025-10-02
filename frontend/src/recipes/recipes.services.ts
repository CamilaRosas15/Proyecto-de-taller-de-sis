// src/recipes/recipes.service.ts
import { Injectable } from '@nestjs/common';
import fetch from 'node-fetch';

@Injectable()
export class RecipesService {
  async getReceta(prompt: string) {
    const response = await fetch("http://localhost:11434/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama3.1:8b-instruct",
        prompt,
        format: "json"
      }),
    });

    const text = await response.text();
    const last = text.trim().split("\n").pop()!;
    return JSON.parse(last);
  }
}