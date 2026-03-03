import { NextResponse } from 'next/server';
import { after } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { generateTikTokScript, getGeminiClient } from '@/lib/gemini';
import { generateSlides } from '@/lib/slideGenerator';
import { generateAudioAssets } from '@/lib/audioGenerator';
import { generateBackgrounds } from '@/lib/backgroundGenerator';
import { generateFinalVideo } from '@/lib/videoGenerator';
import { renderSlide } from '@/lib/slideRenderer';
import { uploadSlide, uploadVideo } from '@/lib/storage';
import { logJob, logError } from '@/lib/log';
import { getValidTikTokToken, publishVideoToTikTok } from '@/lib/tiktok';
import type { TikTokScript } from '@/lib/schema';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const maxDuration = 300;

/**
 * GET /api/jobs/run
 * Vercel Cron이 호출하는 엔드포인트
 *
 * Phase 5 전략:
 * 1. 슬라이드 5장을 그라데이션 배경으로 즉시 생성 → 응답
 * 2. after()로 배경 이미지 생성 후 슬라이드 1/4 재렌더 + 재업로드
 */
export async function GET(request: Request) {
    const requestId = `run_${Date.now()}`;

    const { client: supabase, error: dbError } = getSupabaseAdmin();
    const { error: geminiError } = getGeminiClient();
    const cronSecret = process.env.CRON_SECRET;

    if (dbError || !supabase || geminiError || !cronSecret) {
        const details = [dbError, geminiError, !cronSecret ? 'Missing CRON_SECRET' : null].filter(Boolean).join(', ');
        return NextResponse.json({ error: 'Configuration Error', details, requestId }, { status: 500 });
    }

    const authHeader = request.headers.get('Authorization');
    if (authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized', requestId }, { status: 401 });
    }

    try {
        const { data: job, error: fetchError } = await supabase
            .from('jobs')
            .select('*')
            .eq('status', 'pending')
            .order('created_at', { ascending: true })
            .limit(1)
            .maybeSingle();

        if (fetchError) {
            return NextResponse.json({ error: 'Failed to fetch job', details: fetchError.message, requestId }, { status: 500 });
        }

        if (!job) {
            return NextResponse.json({ message: 'No pending jobs', requestId });
        }

        const jobId = job.id;
        logJob(jobId, 'RUNNING', 'Job started', { topic: job.topic });

        await supabase.from('jobs').update({ status: 'running' }).eq('id', jobId);

        try {
            // ── Step 1: 스크립트 생성 ──────────────────────────────
            const script = await generateTikTokScript(job.topic, job.tone, job.audience);

            await supabase.from('assets').insert([{
                job_id: jobId,
                type: 'script_json',
                content_json: script,
            }]);

            logJob(jobId, 'RUNNING', 'Script generated, starting slide generation (gradient fallback)');

            // ── Step 2: 슬라이드 5장 생성 (그라데이션 배경) ──────────
            await generateSlides(supabase, jobId, script, job.topic);

            // ── Step 2.1: TTS 오디오 생성 (나레이션) ──────────────────
            await generateAudioAssets(supabase, jobId, script.scenes);

            // ── Step 3: 작업 완료 처리 ────────────────────────────
            await supabase.from('jobs').update({ status: 'done' }).eq('id', jobId);
            logJob(jobId, 'DONE', 'Job completed (5 slides + 5 audio narration)');

            // ── Step 4: after() — 응답 후 배경 생성 + 슬라이드 재렌더 
            after(async () => {
                try {
                    logJob(jobId, 'RUNNING', 'Starting post-response background generation...');
                    const { client: bgSupabase } = getSupabaseAdmin();
                    if (!bgSupabase) {
                        logError('after(): bgSupabase null', null);
                        return;
                    }

                    const bgMap = await generateBackgrounds(bgSupabase, jobId, script.scenes, job.topic);
                    logJob(jobId, 'RUNNING', `Backgrounds generated: ${bgMap.size}/2`);

                    // 배경이 생성된 씬의 슬라이드를 재렌더링하여 덮어쓰기
                    for (const [sceneIndex, bgResult] of bgMap.entries()) {
                        const scene = script.scenes.find(s => s.index === sceneIndex);
                        if (!scene) continue;

                        const { data: bgBytes, error: dlError } = await bgSupabase.storage
                            .from('tiktok-assets')
                            .download(bgResult.storagePath);

                        if (dlError || !bgBytes) {
                            logError(`after(): bg download failed for scene ${sceneIndex}`, dlError);
                            continue;
                        }

                        const bgBuffer = Buffer.from(await bgBytes.arrayBuffer());
                        const pngBuffer = await renderSlide(scene, job.topic, sceneIndex, bgBuffer);
                        const { storagePath } = await uploadSlide(bgSupabase, jobId, sceneIndex, pngBuffer);

                        // 기존 slide_image asset 업데이트 (hasCustomBg: true로)
                        const { data: existingAssets } = await bgSupabase
                            .from('assets')
                            .select('id, content_json')
                            .eq('job_id', jobId)
                            .eq('type', 'slide_image')
                            .eq('content_json->>index', String(sceneIndex));

                        if (existingAssets?.[0]) {
                            await bgSupabase
                                .from('assets')
                                .update({
                                    content_json: {
                                        ...existingAssets[0].content_json,
                                        hasCustomBg: true,
                                        bgStoragePath: bgResult.storagePath,
                                    },
                                })
                                .eq('id', existingAssets[0].id);
                        }

                        logJob(jobId, 'RUNNING', `Scene ${sceneIndex} slide re-rendered with Imagen background`);
                    }

                    logJob(jobId, 'RUNNING', 'Background generation complete.');

                    // ── Step 5: 최종 비디오 합성 ────────────────────
                    logJob(jobId, 'RUNNING', 'Synthesizing final video with FFmpeg...');
                    const videoBuffer = await generateFinalVideo(bgSupabase, jobId);
                    const { storagePath, publicUrl } = await uploadVideo(bgSupabase, jobId, videoBuffer);

                    // Assets 테이블에 비디오 정보 기록
                    await bgSupabase.from('assets').insert([{
                        job_id: jobId,
                        type: 'final_video',
                        content_json: {
                            storagePath,
                            publicUrl,
                            format: 'mp4',
                            resolution: '1080x1920'
                        }
                    }]);

                    logJob(jobId, 'DONE', 'Final video synthesized and uploaded.');

                    // ── Step 6: 틱톡 자동 업로드 ────────────────────
                    try {
                        logJob(jobId, 'RUNNING', 'Attempting to publish to TikTok...');
                        const accessToken = await getValidTikTokToken(bgSupabase);
                        const publishId = await publishVideoToTikTok(
                            accessToken,
                            publicUrl,
                            script.title || job.topic,
                            `${script.caption || ''} #automation #tiktok`
                        );
                        logJob(jobId, 'DONE', `Video published to TikTok. Publish ID: ${publishId}`);
                    } catch (publishErr: any) {
                        logError(`TikTok publication failed for job ${jobId}`, publishErr);
                        logJob(jobId, 'DONE', `Video synthetic done, but TikTok publish failed: ${publishErr.message}`);
                    }
                } catch (bgErr: any) {
                    logError(`after(): background generation failed for job ${jobId}`, bgErr);
                }
            });

            return NextResponse.json({ ok: true, jobId, requestId });

        } catch (error: any) {
            logError(`Job ${jobId} failed`, error);
            await supabase.from('jobs').update({ status: 'failed', error: error.message }).eq('id', jobId);
            return NextResponse.json({ error: 'Job execution failed', details: error.message, requestId }, { status: 500 });
        }

    } catch (error: any) {
        logError('Unexpected error in /api/jobs/run', error);
        return NextResponse.json({ error: 'Internal server error', details: error.message, requestId }, { status: 500 });
    }
}
