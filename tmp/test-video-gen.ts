import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { getSupabaseAdmin } from '../src/lib/supabaseAdmin';
import { generateFinalVideo } from '../src/lib/videoGenerator';
import fs from 'fs';

async function testVideo() {
    const { client: supabase, error } = getSupabaseAdmin();
    if (!supabase) {
        console.error('Supabase client null:', error);
        return;
    }

    // 최근 완료된 Job ID 하나 가져오기
    const { data: job } = await supabase
        .from('jobs')
        .select('id')
        .eq('status', 'done')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

    if (!job) {
        console.error('No finished jobs found to test');
        return;
    }

    console.log(`Testing video generation for Job: ${job.id}`);

    try {
        const buffer = await generateFinalVideo(supabase, job.id);
        if (!fs.existsSync('tmp')) fs.mkdirSync('tmp');
        fs.writeFileSync('tmp/output_test.mp4', buffer);
        console.log(`Success! Video saved to tmp/output_test.mp4 (${buffer.length} bytes)`);
    } catch (e: any) {
        console.error('Video generation failed:', e.message);
    }
}

testVideo();
