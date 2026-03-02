import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const dir = searchParams.get('dir') || process.cwd();

    try {
        const files = fs.readdirSync(dir).map(f => {
            const fullPath = path.join(dir, f);
            const stats = fs.statSync(fullPath);
            return {
                name: f,
                isDir: stats.isDirectory(),
                size: stats.size
            };
        });
        return NextResponse.json({ cwd: process.cwd(), dir, files });
    } catch (e: any) {
        return NextResponse.json({ error: e.message, cwd: process.cwd() }, { status: 500 });
    }
}
