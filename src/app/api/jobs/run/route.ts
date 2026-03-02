import { NextResponse } from 'next/server';
import { logJob } from '@/lib/log';
import { jobs } from '../create/route';

/**
 * POST /api/jobs/run
 * pending job 하나를 찾아 실행(running→done/failed 업데이트)
 */
export async function POST() {
    const pendingJob = jobs.find(j => j.status === 'pending');

    if (!pendingJob) {
        return NextResponse.json({ message: 'No pending jobs' }, { status: 404 });
    }

    // running 상태로 시뮬레이션
    pendingJob.status = 'running';
    logJob(pendingJob.id, 'START', 'Job is now running');

    // 성공 시뮬레이션 (간단하게 즉시 완료)
    pendingJob.status = 'done';
    pendingJob.completedAt = new Date().toISOString();
    logJob(pendingJob.id, 'END', 'Job completed successfully');

    return NextResponse.json(pendingJob);
}
