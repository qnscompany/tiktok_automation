import satori from 'satori';
import sharp from 'sharp';
import type { Scene } from './schema';

// 슬라이드 크기 (틱톡 9:16)
const WIDTH = 1080;
const HEIGHT = 1920;

// 배경 색상 세트 (index별 순환)
const BACKGROUNDS = [
    { bg: '#1a1a2e', accent: '#e94560', text: '#ffffff' },  // 딥 블루
    { bg: '#0f3460', accent: '#f5a623', text: '#ffffff' },  // 미드나잇 블루
    { bg: '#1b4332', accent: '#52b788', text: '#ffffff' },  // 다크 그린
];

/**
 * 나레이션 텍스트를 1줄로 자릅니다.
 */
function truncate(text: string, max = 38): string {
    return text.length <= max ? text : text.slice(0, max - 3) + '...';
}

/**
 * 단일 슬라이드 이미지를 렌더링합니다.
 * satori → SVG → sharp → PNG Buffer
 */
export async function renderSlide(
    scene: Scene,
    topic: string,
    index: number
): Promise<Buffer> {
    const palette = BACKGROUNDS[(index - 1) % BACKGROUNDS.length];
    const narration = truncate(scene.narrationText);

    // satori VNode 정의 (React-style 객체)
    const vnode = {
        type: 'div',
        props: {
            style: {
                width: WIDTH,
                height: HEIGHT,
                backgroundColor: palette.bg,
                display: 'flex',
                flexDirection: 'column' as const,
                alignItems: 'center',
                justifyContent: 'center',
                padding: '80px',
                gap: '40px',
            },
            children: [
                // 슬라이드 번호
                {
                    type: 'div',
                    props: {
                        style: {
                            width: 80,
                            height: 80,
                            borderRadius: 40,
                            backgroundColor: 'rgba(255,255,255,0.15)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: palette.accent,
                            fontSize: 38,
                            fontWeight: 700,
                        },
                        children: String(index),
                    },
                },
                // 토픽 라벨
                {
                    type: 'div',
                    props: {
                        style: {
                            color: 'rgba(255,255,255,0.55)',
                            fontSize: 28,
                            textAlign: 'center' as const,
                        },
                        children: topic.substring(0, 28),
                    },
                },
                // 구분선
                {
                    type: 'div',
                    props: {
                        style: {
                            width: 200,
                            height: 3,
                            backgroundColor: palette.accent,
                            borderRadius: 2,
                        },
                    },
                },
                // 메인 텍스트
                {
                    type: 'div',
                    props: {
                        style: {
                            color: '#ffffff',
                            fontSize: 70,
                            fontWeight: 700,
                            textAlign: 'center' as const,
                            lineHeight: 1.35,
                            maxWidth: 900,
                        },
                        children: scene.onScreenText,
                    },
                },
                // 나레이션
                {
                    type: 'div',
                    props: {
                        style: {
                            color: 'rgba(255,255,255,0.45)',
                            fontSize: 28,
                            textAlign: 'center' as const,
                            maxWidth: 880,
                            marginTop: 20,
                        },
                        children: narration,
                    },
                },
                // 브랜드
                {
                    type: 'div',
                    props: {
                        style: {
                            color: 'rgba(255,255,255,0.2)',
                            fontSize: 22,
                            letterSpacing: 3,
                            marginTop: 40,
                        },
                        children: 'TikTok Automation',
                    },
                },
            ],
        },
    };

    // SVG 생성 (폰트 없이 기본 sans-serif 사용)
    const svg = await satori(vnode as any, {
        width: WIDTH,
        height: HEIGHT,
        fonts: [], // 기본 sans-serif 폰트 사용 (폰트 파일 불필요)
    });

    // SVG → PNG (sharp 사용, Vercel 공식 지원)
    const pngBuffer = await sharp(Buffer.from(svg)).png().toBuffer();
    return pngBuffer;
}
