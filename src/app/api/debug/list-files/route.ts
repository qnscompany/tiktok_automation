import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const dir = searchParams.get('dir') || '/var/task';

    try {
        console.log(`Listing directory: ${dir}`);
        if (!fs.existsSync(dir)) {
            return NextResponse.json({ error: 'Directory does not exist', dir }, { status: 404 });
        }

        const files = fs.readdirSync(dir).map(f => {
            try {
                const fullPath = path.join(dir, f);
                const stats = fs.statSync(fullPath);
                return {
                    name: f,
                    isDir: stats.isDirectory(),
                    size: stats.size
                };
            } catch (e) {
                return { name: f, error: 'stat failed' };
            }
        });
        return NextResponse.json({ cwd: process.cwd(), dir, files }, {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (e: any) {
        return NextResponse.json({ error: e.message, cwd: process.cwd(), stack: e.stack }, {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
