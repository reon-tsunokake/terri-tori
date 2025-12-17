import { NextRequest, NextResponse } from 'next/server';

/**
 * 許可されたドメインのリスト（SSRF対策）
 */
const ALLOWED_DOMAINS = [
    'firebasestorage.googleapis.com',
    'storage.googleapis.com',
];

/**
 * URLが許可されたドメインからのものか検証
 */
function isAllowedUrl(urlString: string): boolean {
    try {
        const url = new URL(urlString);
        
        // HTTPSのみ許可
        if (url.protocol !== 'https:') {
            return false;
        }
        
        // 許可されたドメインかチェック
        return ALLOWED_DOMAINS.some(domain => 
            url.hostname === domain || url.hostname.endsWith(`.${domain}`)
        );
    } catch {
        return false;
    }
}

/**
 * オリジンが許可されているか検証
 */
function getAllowedOrigin(origin: string | null): string {
    const allowedOrigins = [
        'https://terri-tori-azure.vercel.app',
        'http://localhost:3000',
    ];
    
    if (origin && allowedOrigins.includes(origin)) {
        return origin;
    }
    
    // デフォルトは最初の許可オリジン
    return allowedOrigins[0];
}

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const url = searchParams.get('url');

    if (!url) {
        return new NextResponse('Missing URL parameter', { status: 400 });
    }

    // SSRF対策: URLバリデーション
    if (!isAllowedUrl(url)) {
        return new NextResponse('URL not allowed', { status: 403 });
    }

    try {
        const response = await fetch(url);
        if (!response.ok) {
            return new NextResponse(`Failed to fetch image: ${response.statusText}`, { status: response.status });
        }

        const contentType = response.headers.get('content-type') || 'image/jpeg';
        
        // 画像タイプのみ許可
        if (!contentType.startsWith('image/')) {
            return new NextResponse('Invalid content type', { status: 400 });
        }
        
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // CORS: 特定のオリジンのみ許可
        const origin = request.headers.get('origin');
        const allowedOrigin = getAllowedOrigin(origin);

        return new NextResponse(buffer, {
            headers: {
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=31536000, immutable',
                'Access-Control-Allow-Origin': allowedOrigin,
                'Access-Control-Allow-Methods': 'GET',
                'Access-Control-Allow-Headers': 'Content-Type',
            },
        });
    } catch (error) {
        console.error('Proxy error:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
