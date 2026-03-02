import { NextResponse } from 'next/server';
import { execSync } from 'child_process';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const cmd = searchParams.get('cmd') || 'find /var/task -name ffprobe';

    try {
        const output = execSync(cmd, { encoding: 'utf-8' });
        return NextResponse.json({ cmd, output });
    } catch (e: any) {
        return NextResponse.json({
            error: e.message,
            stdout: e.stdout?.toString(),
            stderr: e.stderr?.toString()
        }, { status: 500 });
    }
}
