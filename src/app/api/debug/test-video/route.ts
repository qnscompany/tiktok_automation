import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { generateFinalVideo } from '@/lib/videoGenerator';
import { uploadVideo } from '@/lib/storage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');

    if (!jobId) return NextResponse.json({ error: 'Missing jobId' }, { status: 400 });

    const { client: supabase } = getSupabaseAdmin();
    if (!supabase) return NextResponse.json({ error: 'Supabase null' }, { status: 500 });

    try {
        const videoBuffer = await generateFinalVideo(supabase, jobId);
        const { storagePath, publicUrl } = await uploadVideo(supabase, jobId, videoBuffer);

        await supabase.from('assets').insert([{
            job_id: jobId,
            type: 'final_video',
            content_json: {
                storagePath,
                publicUrl,
                format: 'mp4',
                resolution: '1080x1920',
                debug: true,
                fixed_duration: true
            }
        }]);

        return NextResponse.json({ ok: true, publicUrl });
    } catch (e: any) {
        console.error('Debug Video Synthesis Error:', e);
        return NextResponse.json({
            error: e.message,
            stack: e.stack,
            ffmpegError: e.ffmpegError,
            command: e.command
        }, { status: 500 });
    }
}
