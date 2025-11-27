import { Feature, Polygon, MultiPolygon } from 'geojson';

export interface ClippedImageResult {
    url: string;
    coordinates: [[number, number], [number, number], [number, number], [number, number]]; // TopLeft, TopRight, BottomRight, BottomLeft
}

/**
 * GeoJSON Feature (Polygon/MultiPolygon) の形状に合わせて画像を切り抜き、
 * 地図上に配置するための座標と共に返します。
 */
export const generateClippedRegionImage = async (
    feature: Feature<Polygon | MultiPolygon>,
    imageUrl: string
): Promise<ClippedImageResult | null> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        // Proxy経由で画像を取得してCORSを回避
        img.src = `/api/proxy-image?url=${encodeURIComponent(imageUrl)}`;

        img.onload = () => {
            try {
                // 1. バウンディングボックス (BBox) を計算
                let minLng = 180, maxLng = -180, minLat = 90, maxLat = -90;

                const processRing = (ring: number[][]) => {
                    for (const [lng, lat] of ring) {
                        if (lng < minLng) minLng = lng;
                        if (lng > maxLng) maxLng = lng;
                        if (lat < minLat) minLat = lat;
                        if (lat > maxLat) maxLat = lat;
                    }
                };

                const geometry = feature.geometry;
                if (geometry.type === 'Polygon') {
                    geometry.coordinates.forEach(processRing);
                } else if (geometry.type === 'MultiPolygon') {
                    geometry.coordinates.forEach(poly => poly.forEach(processRing));
                }

                // BBoxの幅と高さ (度単位)
                const lngWidth = maxLng - minLng;
                const latHeight = maxLat - minLat;

                if (lngWidth <= 0 || latHeight <= 0) {
                    resolve(null);
                    return;
                }

                // 2. Canvasサイズを決定 (最大サイズを制限しつつアスペクト比を維持)
                const MAX_CANVAS_SIZE = 1024;

                let canvasWidth = MAX_CANVAS_SIZE;
                let canvasHeight = MAX_CANVAS_SIZE * (latHeight / lngWidth);

                if (canvasHeight > MAX_CANVAS_SIZE) {
                    canvasHeight = MAX_CANVAS_SIZE;
                    canvasWidth = MAX_CANVAS_SIZE * (lngWidth / latHeight);
                }

                const canvas = document.createElement('canvas');
                canvas.width = canvasWidth;
                canvas.height = canvasHeight;
                const ctx = canvas.getContext('2d');

                if (!ctx) {
                    resolve(null);
                    return;
                }

                // 3. 座標変換関数 (LngLat -> Canvas x,y)
                // Y軸はCanvasでは下向き、緯度は上向きなので反転が必要
                const project = (lng: number, lat: number) => {
                    const x = ((lng - minLng) / lngWidth) * canvasWidth;
                    const y = ((maxLat - lat) / latHeight) * canvasHeight; // maxLatが0, minLatがheight
                    return [x, y];
                };

                // 4. パスを描画
                ctx.beginPath();
                const drawRing = (ring: number[][]) => {
                    if (ring.length === 0) return;
                    const [startX, startY] = project(ring[0][0], ring[0][1]);
                    ctx.moveTo(startX, startY);
                    for (let i = 1; i < ring.length; i++) {
                        const [x, y] = project(ring[i][0], ring[i][1]);
                        ctx.lineTo(x, y);
                    }
                    ctx.closePath();
                };

                if (geometry.type === 'Polygon') {
                    geometry.coordinates.forEach(drawRing);
                } else if (geometry.type === 'MultiPolygon') {
                    geometry.coordinates.forEach(poly => poly.forEach(drawRing));
                }

                // 5. クリッピング
                ctx.clip();

                // 6. 画像を描画 (Center Crop / Cover)
                // Canvasのアスペクト比
                const canvasAspect = canvasWidth / canvasHeight;
                // 画像のアスペクト比
                const imgAspect = img.width / img.height;

                let drawW, drawH, offsetX, offsetY;

                if (canvasAspect > imgAspect) {
                    // Canvasの方が横長 -> 画像の横幅をCanvasに合わせる
                    drawW = canvasWidth;
                    drawH = canvasWidth / imgAspect;
                    if (drawH < canvasHeight) {
                        drawH = canvasHeight;
                        drawW = canvasHeight * imgAspect;
                    }
                } else {
                    drawH = canvasHeight;
                    drawW = canvasHeight * imgAspect;
                    if (drawW < canvasWidth) {
                        drawW = canvasWidth;
                        drawH = canvasWidth / imgAspect;
                    }
                }

                // 中央寄せ
                offsetX = (canvasWidth - drawW) / 2;
                offsetY = (canvasHeight - drawH) / 2;

                ctx.drawImage(img, offsetX, offsetY, drawW, drawH);

                // 7. 結果を返す
                // Mapboxのimage sourceのcoordinatesは [TopLeft, TopRight, BottomRight, BottomLeft]
                const coordinates: [[number, number], [number, number], [number, number], [number, number]] = [
                    [minLng, maxLat], // TopLeft
                    [maxLng, maxLat], // TopRight
                    [maxLng, minLat], // BottomRight
                    [minLng, minLat]  // BottomLeft
                ];

                resolve({
                    url: canvas.toDataURL('image/png'),
                    coordinates
                });

            } catch (e) {
                console.error('Error generating clipped image:', e);
                resolve(null);
            }
        };

        img.onerror = (e) => {
            console.error('Failed to load image for clipping:', imageUrl, e);
            resolve(null);
        };
    });
};
