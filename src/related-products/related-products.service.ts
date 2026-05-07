import { Injectable, NotFoundException, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { ProductsService } from '../products/products.service';

// Metadatos mínimos que enviamos a OpenAI para no gastar tokens innecesarios
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
    });
  }

  async getRelatedProducts(productId: string, limit = 6) {
    // 1. Obtener el producto actual
    const current = await this.productsService.findOne(productId);
    if (!current) throw new NotFoundException('Product not found');

    // 2. Obtener todos los productos (excluir el actual)
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

    // 3. Construir el prompt
    const currentMeta: ProductMeta = {
      id: current.id,
      title: current.title,
      gender: current.gender,
      tags: current.tags,
      price: current.price,
    };

    const prompt = buildPrompt(currentMeta, candidates, limit);

    // 4. Llamar a OpenAI
    this.logger.log(`Requesting related products for: "${current.title}"`);

    let relatedIds: string[] = [];

    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',       // Modelo económico, suficiente para esta tarea
        temperature: 0,              // Sin aleatoriedad — queremos resultados consistentes
        max_tokens: 200,             // Solo necesitamos un array de IDs
        response_format: { type: 'json_object' }, // Forzamos JSON para parsear fácil
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

      // 5. Parsear la respuesta
      const parsed = JSON.parse(raw);
      relatedIds = Array.isArray(parsed.ids) ? parsed.ids : [];

    } catch (error) {
      // Si OpenAI falla, hacemos fallback a filtro por tags (no rompemos la UI)
      this.logger.error('OpenAI call failed, falling back to tag-based filter', error);
      relatedIds = fallbackByTags(currentMeta, candidates, limit);
    }

    // 6. Devolver los productos completos en el orden que dijo la IA
    const productMap = new Map(all.map((p) => [p.id, p]));
    return relatedIds
      .filter((id) => productMap.has(id))
      .slice(0, limit)
      .map((id) => productMap.get(id)!);
  }
}

// Helpers 

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

// Fallback: productos con más tags en común, sin llamar a OpenAI
function fallbackByTags(
  current: ProductMeta,
  candidates: ProductMeta[],
  limit: number,
): string[] {
  return candidates
    .map((p) => ({
      id: p.id,
      score: p.tags.filter((t) => current.tags.includes(t)).length,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((p) => p.id);
}