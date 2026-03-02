import { NextResponse } from 'next/server';
import { logJob } from '@/lib/log';

// 임시 In-memory 저장소 (나중에 Supabase로 교체 가능)
export let jobs: any[] = [];

/**
 * POST /api/jobs/create
 * job 레코드 생성
 */
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const jobId = `job_${Date.now()}`;

        const newJob = {
            id: jobId,
            status: 'pending',
            data: body,
            createdAt: new Date().toISOString()
        };

        jobs.push(newJob);
        logJob(jobId, 'START', 'Job created', { data: body });

        return NextResponse.json(newJob);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to create job' }, { status: 400 });
    }
}
