import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { ProductsService } from '../products/products.service';

interface ProductMeta {
  id: string;
  title: string;
  gender: string;
  tags: string[];
  price: number;
}

@Injectable()
export class RelatedProductsService {
  private readonly openai: OpenAI;
  private readonly logger = new Logger('RelatedProductsService');

  constructor(
    private readonly configService: ConfigService,
    private readonly productsService: ProductsService,
  ) {
    this.openai = new OpenAI({
      apiKey: this.configService.get<string>('OPENAI_API_KEY'),
      // ✅ Fix para Node 17: node-fetch como polyfill de fetch
      fetch: this.getFetch(),
    });
  }

  // Node 18+ tiene fetch nativo. Node 17 no lo tiene, así que usamos
  // el fetch que ya viene incluido en el SDK de OpenAI como fallback.
  private getFetch() {
    if (typeof globalThis.fetch === 'function') {
      return globalThis.fetch; // Node 18+
    }
    // Para Node 17, usamos undici que viene con Node o el fetch del propio SDK
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { fetch } = require('undici');
      return fetch;
    } catch {
      // undici no disponible — dejamos que OpenAI maneje el error
      return undefined;
    }
  }

  async getRelatedProducts(productId: string, limit = 6) {
    const current = await this.productsService.findOne(productId);
    if (!current) throw new NotFoundException('Product not found');

    const { products: all } = await this.productsService.findAll({ limit: 200, offset: 0 });
    const candidates: ProductMeta[] = all
      .filter((p) => p.id !== productId)
      .map((p) => ({
        id: p.id,
        title: p.title,
        gender: p.gender,
        tags: p.tags,
        price: p.price,
      }));

    if (candidates.length === 0) return [];

    const currentMeta: ProductMeta = {
      id: current.id,
      title: current.title,
      gender: current.gender,
      tags: current.tags,
      price: current.price,
    };

    const prompt = buildPrompt(currentMeta, candidates, limit);

    this.logger.log(`Requesting related products for: "${current.title}"`);

    let relatedIds: string[] = [];

    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        temperature: 0,
        max_tokens: 200,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content:
              'You are a product recommendation engine for a clothing store. ' +
              'Your job is to find the most semantically related products. ' +
              'Always respond with valid JSON.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      const raw = completion.choices[0]?.message?.content ?? '{}';
      this.logger.log(`OpenAI raw response: ${raw}`);

      const parsed = JSON.parse(raw);
      relatedIds = Array.isArray(parsed.ids) ? parsed.ids : [];

    } catch (error) {
      this.logger.error('OpenAI call failed, falling back to tag-based filter', error);
      relatedIds = fallbackByTags(currentMeta, candidates, limit);
    }

    const productMap = new Map(all.map((p) => [p.id, p]));
    return relatedIds
      .filter((id) => productMap.has(id))
      .slice(0, limit)
      .map((id) => productMap.get(id)!);
  }
}

function buildPrompt(current: ProductMeta, candidates: ProductMeta[], limit: number): string {
  return `
Current product the user is viewing:
${JSON.stringify(current, null, 2)}

Available products (candidates):
${JSON.stringify(candidates, null, 2)}

Task: Select the ${limit} most related products to the current one based on:
1. Shared tags (most important)
2. Same gender or unisex
3. Similar price range (within 50% of the current price)
4. Similar clothing category inferred from the title

Return ONLY a JSON object with this exact shape:
{ "ids": ["id1", "id2", "id3", "id4", "id5", "id6"] }

Rules:
- Include exactly ${limit} IDs (or fewer if there are not enough candidates)
- Do NOT include the current product ID
- Do NOT include any explanation, only the JSON
`.trim();
}

function fallbackByTags(current: ProductMeta, candidates: ProductMeta[], limit: number): string[] {
  return candidates
    .map((p) => ({
      id: p.id,
      score: p.tags.filter((t) => current.tags.includes(t)).length,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((p) => p.id);
}