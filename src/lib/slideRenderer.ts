import satori from 'satori';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import type { Scene } from './schema';

// 슬라이드 크기 (틱톡 9:16)
const WIDTH = 1080;
const HEIGHT = 1920;

// 프리미엄 팔레트 및 그라데이션 정의
const THEMES = [
    {
        bg: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
        accent: '#38BDF8', // Sky Blue
        glass: 'rgba(255, 255, 255, 0.03)',
        border: 'rgba(255, 255, 255, 0.08)',
    },
    {
        bg: 'linear-gradient(135deg, #1E1B4B 0%, #312E81 100%)',
        accent: '#818CF8', // Indigo
        glass: 'rgba(255, 255, 255, 0.03)',
        border: 'rgba(255, 255, 255, 0.08)',
    },
    {
        bg: 'linear-gradient(135deg, #450A0A 0%, #7F1D1D 100%)',
        accent: '#F87171', // Red
        glass: 'rgba(255, 255, 255, 0.03)',
        border: 'rgba(255, 255, 255, 0.08)',
    },
];

/**
 * 폰트 로드 (영어 + 한글 완전 지원)
 * - Inter Bold (WOFF1): 라틴, ASCII, 공백, 특수문자 커버
 * - NotoSansKR Bold (TTF): 한글 커버
 * 두 폰트를 같은 name으로 등록하면 satori가 fallback 방식으로 자동 처리
 */
function loadFonts(): Parameters<typeof satori>[1]['fonts'] {
    const fonts: Parameters<typeof satori>[1]['fonts'] = [];

    // 1. Inter (라틴 / ASCII 담당) - node_modules의 WOFF1 파일
    const interPath = path.join(
        process.cwd(), 'node_modules', '@fontsource', 'inter', 'files', 'inter-latin-700-normal.woff'
    );
    if (fs.existsSync(interPath)) {
        const buf = fs.readFileSync(interPath);
        fonts.push({
            name: 'SlideFont',
            data: buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength),
            weight: 700,
            style: 'normal',
        });
    } else {
        console.warn('[FONT] Inter WOFF1 not found at:', interPath);
    }

    // 2. NotoSansKR (한글 담당) - TTF
    const notoPath = path.join(process.cwd(), 'public', 'fonts', 'NotoSansKR-Bold.ttf');
    if (fs.existsSync(notoPath)) {
        const buf = fs.readFileSync(notoPath);
        fonts.push({
            name: 'SlideFont',
            data: buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength),
            weight: 700,
            style: 'normal',
        });
    } else {
        console.warn('[FONT] NotoSansKR TTF not found at:', notoPath);
    }

    if (fonts.length === 0) {
        throw new Error('[FONT] No fonts loaded. Slide rendering cannot proceed.');
    }

    return fonts;
}

/**
 * 단일 슬라이드 이미지를 렌더링합니다.
 *
 * @param bgImageBuffer - (선택) Imagen으로 생성한 배경 이미지 PNG Buffer.
 *   제공된 경우: Sharp로 1080x1920 cover 크롭 → Satori SVG overlay 합성
 *   없는 경우: 기존 그라데이션 배경 템플릿 사용
 */
export async function renderSlide(
    scene: Scene,
    topic: string,
    index: number,
    bgImageBuffer?: Buffer
): Promise<Buffer> {
    const theme = THEMES[(index - 1) % THEMES.length];

    // 폰트 로드 (동기식으로 수행하거나 위에서 캐싱 권장)
    const fonts = loadFonts();

    if (bgImageBuffer) {
        // ── 배경 이미지 합성 모드 ──────────────────────────────────
        // 1. 배경 이미지를 1080x1920으로 cover 크롭
        const croppedBg = await sharp(bgImageBuffer)
            .resize(WIDTH, HEIGHT, { fit: 'cover', position: 'centre' })
            .png()
            .toBuffer();

        // 2. 글래스모피즘 오버레이 SVG를 Satori로 생성 (배경 투명)
        const overlayVnode = buildOverlayVnode(scene, topic, index, theme);
        const overlaySvg = await satori(overlayVnode as any, { width: WIDTH, height: HEIGHT, fonts });
        const overlayPng = await sharp(Buffer.from(overlaySvg)).png().toBuffer();

        // 3. 배경 + 오버레이 합성
        const compositedBuffer = await sharp(croppedBg)
            .composite([{ input: overlayPng, top: 0, left: 0 }])
            .png()
            .toBuffer();

        return compositedBuffer;
    }

    // ── 기존 그라데이션 배경 모드 ──────────────────────────────────
    const vnode = {
        type: 'div',
        props: {
            style: {
                width: WIDTH,
                height: HEIGHT,
                background: theme.bg,
                display: 'flex',
                flexDirection: 'column' as const,
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '120px 80px',
                fontFamily: 'SlideFont',
            },
            children: buildChildren(scene, topic, index, theme),
        },
    };

    const svg = await satori(vnode as any, { width: WIDTH, height: HEIGHT, fonts });
    const pngBuffer = await sharp(Buffer.from(svg)).png().toBuffer();
    return pngBuffer;
}

// ── 공통 자식 요소 빌더 ────────────────────────────────────────

function buildChildren(scene: Scene, topic: string, index: number, theme: typeof THEMES[0]) {
    return [
        // Header: Scene Indicator
        {
            type: 'div',
            props: {
                style: {
                    padding: '16px 40px',
                    borderRadius: '100px',
                    background: 'rgba(255,255,255,0.08)',
                    border: `1px solid ${theme.border}`,
                    color: theme.accent,
                    fontSize: '32px',
                    fontWeight: 700,
                    letterSpacing: '2px',
                },
                children: `SCENE 0${index}`,
            },
        },
        // Content: Main Glass Card
        {
            type: 'div',
            props: {
                style: {
                    display: 'flex',
                    flexDirection: 'column' as const,
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '920px',
                    minHeight: '800px',
                    padding: '80px',
                    borderRadius: '64px',
                    background: theme.glass,
                    border: `1px solid ${theme.border}`,
                    boxShadow: '0 40px 100px -20px rgba(0, 0, 0, 0.6)',
                },
                children: [
                    {
                        type: 'div',
                        props: {
                            style: {
                                color: theme.accent,
                                fontSize: '28px',
                                fontWeight: 500,
                                letterSpacing: '6px',
                                marginBottom: '60px',
                                opacity: 0.8,
                            },
                            children: topic.toUpperCase(),
                        },
                    },
                    {
                        type: 'div',
                        props: {
                            style: {
                                color: '#FFFFFF',
                                fontSize: '92px',
                                fontWeight: 700,
                                textAlign: 'center' as const,
                                lineHeight: 1.2,
                                wordBreak: 'keep-all' as const,
                                textShadow: '0 10px 30px rgba(0,0,0,0.4)',
                            },
                            children: scene.onScreenText,
                        },
                    },
                ],
            },
        },
        // Footer: Narration & Branding
        {
            type: 'div',
            props: {
                style: {
                    display: 'flex',
                    flexDirection: 'column' as const,
                    alignItems: 'center',
                    width: '100%',
                    gap: '80px',
                },
                children: [
                    {
                        type: 'div',
                        props: {
                            style: {
                                color: 'rgba(255,255,255,0.7)',
                                fontSize: '36px',
                                fontWeight: 400,
                                textAlign: 'center' as const,
                                lineHeight: 1.6,
                                maxWidth: '850px',
                                fontStyle: 'italic' as const,
                            },
                            children: `"${scene.narrationText}"`,
                        },
                    },
                    {
                        type: 'div',
                        props: {
                            style: {
                                display: 'flex',
                                alignItems: 'center',
                                gap: '24px',
                                opacity: 0.2,
                            },
                            children: [
                                { type: 'div', props: { style: { width: '80px', height: '1px', background: '#FFF' } } },
                                { type: 'div', props: { style: { fontSize: '24px', fontWeight: 700, letterSpacing: '8px' }, children: 'ALIVE VISION AI' } },
                                { type: 'div', props: { style: { width: '80px', height: '1px', background: '#FFF' } } },
                            ],
                        },
                    },
                ],
            },
        },
    ];
}

/**
 * 배경 이미지 위에 합성할 오버레이 VNode (배경은 완전 투명)
 * 배경 이미지 위이므로 유리 카드 불투명도를 더 높여 가독성 확보
 */
function buildOverlayVnode(scene: Scene, topic: string, index: number, theme: typeof THEMES[0]) {
    const glassBg = 'rgba(0, 0, 0, 0.55)';
    const glassBorder = 'rgba(255,255,255,0.15)';
    const overlayTheme = { ...theme, glass: glassBg, border: glassBorder };

    return {
        type: 'div',
        props: {
            style: {
                width: WIDTH,
                height: HEIGHT,
                background: 'transparent',
                display: 'flex',
                flexDirection: 'column' as const,
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '120px 80px',
                fontFamily: 'SlideFont',
            },
            children: buildChildren(scene, topic, index, overlayTheme),
        },
    };
}
