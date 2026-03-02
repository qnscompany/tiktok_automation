/**
 * 구조화된 로그 유틸리티 (강화됨)
 */
export function logInfo(message: string, meta?: Record<string, any>) {
    console.log(JSON.stringify({
        level: 'INFO',
        timestamp: new Date().toISOString(),
        message,
        ...meta
    }));
}

export function logError(message: string, error?: any, meta?: Record<string, any>) {
    console.error(JSON.stringify({
        level: 'ERROR',
        timestamp: new Date().toISOString(),
        message,
        error: error instanceof Error ? error.message : error,
        ...meta
    }));
}

export function logJob(jobId: string, status: 'START' | 'RUNNING' | 'DONE' | 'FAILED', message: string, meta?: Record<string, any>) {
    console.log(JSON.stringify({
        level: 'JOB',
        jobId,
        status,
        timestamp: new Date().toISOString(),
        message,
        ...meta
    }));
}

export function logApi(requestId: string, endpoint: string, status: 'SUCCESS' | 'FAILURE' | 'RETRY' | 'INFO', message: string, meta?: Record<string, any>) {
    console.log(JSON.stringify({
        level: 'API',
        requestId,
        endpoint,
        status,
        timestamp: new Date().toISOString(),
        message,
        ...meta
    }));
}
