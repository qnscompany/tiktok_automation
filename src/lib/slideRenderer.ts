import satori from 'satori';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import type { Scene } from './schema';

// 슬라이드 크기 (틱톡 9:16)
const WIDTH = 1080;
const HEIGHT = 1920;

// 배경 색상 세트 (index별 순환)
const BACKGROUNDS = [
    { bg: '#1a1a2e', accent: '#e94560' },  // 딥 블루
    { bg: '#0f3460', accent: '#f5a623' },  // 미드나잇 블루
    { bg: '#1b4332', accent: '#52b788' },  // 다크 그린
];

/**
 * 나레이션 텍스트를 1줄로 자릅니다.
 */
function truncate(text: string, max = 38): string {
    return text.length <= max ? text : text.slice(0, max - 3) + '...';
}

/**
 * 번들된 한국어 폰트 파일들을 읽어옵니다 (@fontsource/noto-sans-kr 패키지에서).
 * satori는 여러 subset을 배열로 등록하는 방식으로 한글을 지원합니다.
 */
function loadFonts(): Parameters<typeof satori>[1]['fonts'] {
    const basePath = path.join(
        process.cwd(),
        'node_modules',
        '@fontsource',
        'noto-sans-kr',
        'files'
    );

    // 한글 커버리지를 위해 주요 subset 파일들을 로드 (0~10번 = 기본 한글 범위)
    const subsets = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const fonts: Parameters<typeof satori>[1]['fonts'] = [];

    for (const i of subsets) {
        const fontPath = path.join(basePath, `noto-sans-kr-${i}-400-normal.woff`);
        try {
            const data = fs.readFileSync(fontPath);
            fonts.push({ name: 'NotoSansKR', data: data.buffer, weight: 400, style: 'normal' });
        } catch {
            // 파일이 없으면 스킵
        }
    }

    if (fonts.length === 0) {
        throw new Error('No Korean font files found. Check @fontsource/noto-sans-kr installation.');
    }

    return fonts;
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

    // 폰트 로드 (한국어 지원 subset들 동기식 로드)
    const fonts = loadFonts();

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

    // SVG 생성 (loadFont()로 로드한 폰트 사용)
    const svg = await satori(vnode as any, {
        width: WIDTH,
        height: HEIGHT,
        fonts,
    });

    // SVG → PNG (sharp 사용, Vercel 공식 지원)
    const pngBuffer = await sharp(Buffer.from(svg)).png().toBuffer();
    return pngBuffer;
}
