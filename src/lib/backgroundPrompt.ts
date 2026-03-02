/**
 * 사이버펑크 UI 스타일의 배경 이미지 생성 프롬프트 빌더
 */

interface BuildCyberpunkBgPromptParams {
    topic: string;
    sceneText: string; // scene.onScreenText — 분위기 키워드로만 반영
}

/**
 * 사이버펑크 스타일 배경 생성 프롬프트를 빌드합니다.
 *
 * 규칙:
 * - sceneText의 텍스트를 이미지에 직접 그리지 않고 분위기·색감 힌트로만 사용
 * - 저작권 보호 캐릭터, 로고, 워터마크 제외
 * - 반드시 9:16 세로 비율, 고해상도 배경 이미지
 */
export function buildCyberpunkBgPrompt({ topic, sceneText }: BuildCyberpunkBgPromptParams): string {
    // sceneText에서 키워드만 추출 (최대 30자)
    const moodKeyword = sceneText.slice(0, 30).replace(/[^\w\s가-힣]/g, ' ').trim();

    return [
        `A stunning vertical 9:16 background image for a TikTok video.`,
        `Style: cyberpunk, neon, futuristic HUD city environment.`,
        `Color palette: deep navy and black backdrop with vivid neon cyan, purple, and pink glows.`,
        `Theme: "${topic}" — conveying the mood of "${moodKeyword}".`,
        `Details: holographic grid lines, floating data particles, glowing circuit patterns, lens flares.`,
        `High contrast background, dramatic lighting, cinematic depth of field.`,
        `IMPORTANT: No readable text, no letters, no words, no logos, no watermarks, no copyrighted characters.`,
        `Background only — the foreground text will be overlaid separately.`,
        `Ultra-high resolution, photorealistic rendering.`,
    ].join(' ');
}
