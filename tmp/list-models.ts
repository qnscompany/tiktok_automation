import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config({ path: '.env.local' });

async function listModelsAudit() {
    const apiKey = process.env.GEMINI_API_KEY;
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

    const response = await fetch(url);
    const data = await response.json() as any;
    fs.writeFileSync('tmp/models_audit.json', JSON.stringify(data, null, 2));
    console.log(`Saved ${data.models?.length} models to tmp/models_audit.json`);
}

listModelsAudit();
