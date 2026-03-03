import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkLogs() {
    const jobId = 'f7103284-d697-4e3a-9c89-592fe59c6dcd';
    console.log(`Checking logs for job: ${jobId}`);

    const { data: logs, error } = await supabase
        .from('logs')
        .select('*')
        .eq('job_id', jobId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching logs:', error);
        return;
    }

    console.log('Logs found:', logs.length);
    logs.forEach(log => {
        console.log(`[${log.created_at}] ${log.status}: ${log.message}`);
    });
}

async function checkTableSchema() {
    const { data, error } = await supabase.rpc('get_table_schema', { table_name: 'logs' });
    if (error) {
        console.log('Error checking schema (might be expected if RPC missing):', error.message);
    } else {
        console.log('Schema:', data);
    }
}

async function run() {
    await checkLogs();
}

run();
