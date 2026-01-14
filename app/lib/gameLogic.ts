import { StrokePoint } from "@/app/types/game";

export function getCanvasPoint(e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement): StrokePoint {
    const rect = canvas.getBoundingClientRect();
    let clientX = 0;
    let clientY = 0;

    if ('touches' in e) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
    } else {
        clientX = (e as React.MouseEvent).clientX;
        clientY = (e as React.MouseEvent).clientY;
    }

    return {
        x: (clientX - rect.left) / rect.width, // Normalize 0-1
        y: (clientY - rect.top) / rect.height
    };
}

export function drawStroke(
    ctx: CanvasRenderingContext2D,
    points: StrokePoint[],
    color: string,
    thickness: number,
    width: number,
    height: number
) {
    if (points.length < 2) return;

    ctx.strokeStyle = color;
    ctx.lineWidth = thickness;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();

    const startX = points[0].x * width;
    const startY = points[0].y * height;
    ctx.moveTo(startX, startY);

    for (let i = 1; i < points.length; i++) {
        const x = points[i].x * width;
        const y = points[i].y * height;
        ctx.lineTo(x, y);
    }
    ctx.stroke();
}

// Optimization: Using stack-based flood fill
export function floodFill(
    ctx: CanvasRenderingContext2D,
    startX: number, // Normalized
    startY: number, // Normalized
    fillColor: string
) {
    const canvas = ctx.canvas;
    const width = canvas.width;
    const height = canvas.height;

    // Get pixel coordinates
    const px = Math.floor(startX * width);
    const py = Math.floor(startY * height);

    if (px < 0 || px >= width || py < 0 || py >= height) return;

    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    const targetPos = (py * width + px) * 4;
    const targetR = data[targetPos];
    const targetG = data[targetPos + 1];
    const targetB = data[targetPos + 2];
    const targetA = data[targetPos + 3]; // Usually 255 if opaque

    // Parse fill color
    const tempCtx = document.createElement('canvas').getContext('2d');
    if (!tempCtx) return;
    tempCtx.fillStyle = fillColor;
    tempCtx.fillRect(0, 0, 1, 1);
    const fillData = tempCtx.getImageData(0, 0, 1, 1).data;
    const fillR = fillData[0];
    const fillG = fillData[1];
    const fillB = fillData[2];
    const fillA = fillData[3]; // 255

    // Tolerance check
    if (targetR === fillR && targetG === fillG && targetB === fillB && targetA === fillA) return;

    const stack = [[px, py]];

    const matchColor = (pos: number) => {
        return (
            data[pos] === targetR &&
            data[pos + 1] === targetG &&
            data[pos + 2] === targetB &&
            data[pos + 3] === targetA
        );
    };

    const colorPixel = (pos: number) => {
        data[pos] = fillR;
        data[pos + 1] = fillG;
        data[pos + 2] = fillB;
        data[pos + 3] = fillA; // Ensure alpha is set
    };

    // Safety break
    let iterations = 0;
    const MAX_ITERATIONS = width * height; // Max pixels

    while (stack.length) {
        const pop = stack.pop();
        if (!pop) break;
        let [x, y] = pop;

        let pixelPos = (y * width + x) * 4;

        // Check loop condition: while y inside canvas and color matches target
        while (y >= 0 && matchColor(pixelPos)) {
            y--;
            pixelPos -= width * 4;
        }

        // We went one step too far up
        pixelPos += width * 4;
        y++;

        let reachLeft = false;
        let reachRight = false;

        while (y < height && matchColor(pixelPos)) {
            colorPixel(pixelPos);

            if (x > 0) {
                if (matchColor(pixelPos - 4)) {
                    if (!reachLeft) {
                        stack.push([x - 1, y]);
                        reachLeft = true;
                    }
                } else if (reachLeft) {
                    reachLeft = false;
                }
            }

            if (x < width - 1) {
                if (matchColor(pixelPos + 4)) {
                    if (!reachRight) {
                        stack.push([x + 1, y]);
                        reachRight = true;
                    }
                } else if (reachRight) {
                    reachRight = false;
                }
            }

            y++;
            pixelPos += width * 4;
        }

        iterations++;
        if (iterations > MAX_ITERATIONS) break; // Infinite loop guard
    }

    ctx.putImageData(imageData, 0, 0);
}
