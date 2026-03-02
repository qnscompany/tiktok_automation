import { z } from 'zod';

/**
 * 틱톡 15초 포맷 A용 스크립트 Zod 스키마
 */
export const SceneSchema = z.object({
  index: z.number().min(1).max(5),
  onScreenText: z.string(),
  narrationText: z.string(),
  imagePrompt: z.string(),
  seconds: z.literal(3)
});

export const TikTokScriptSchema = z.object({
  durationSec: z.literal(15),
  scenes: z.array(SceneSchema).length(5),
  caption: z.string(),
  hashtags: z.array(z.string()).min(5).max(10)
});

export type Scene = z.infer<typeof SceneSchema>;
export type TikTokScript = z.infer<typeof TikTokScriptSchema>;

export interface GenerateScriptRequest {
  topic: string;
  tone?: string;
  audience?: string;
  durationSec?: number;
}
