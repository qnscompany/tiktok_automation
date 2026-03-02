import { NextResponse } from 'next/server';
import { generateTtsAudio } from '@/lib/tts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const text = "Testing the Gemini 2.0 Flash text to speech capability.";
        const buffer = await generateTtsAudio({ text });

        return new Response(new Uint8Array(buffer), {
            headers: {
                'Content-Type': 'audio/mpeg',
                'Content-Length': buffer.length.toString(),
            },
        });
    } catch (error: any) {
        console.error('Debug TTS Error:', error);
        return NextResponse.json({
            error: error.message,
            stack: error.stack,
        }, { status: 500 });
    }
}
