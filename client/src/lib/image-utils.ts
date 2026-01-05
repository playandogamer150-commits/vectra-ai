export const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
        const image = new Image();
        image.addEventListener('load', () => resolve(image));
        image.addEventListener('error', (error) => reject(error));
        image.setAttribute('crossOrigin', 'anonymous'); // needed to avoid cross-origin issues
        image.src = url;
    });

export function getRadianAngle(degreeValue: number) {
    return (degreeValue * Math.PI) / 180;
}

/**
 * Returns the new bounding area of a rotated rectangle.
 */
export function rotateSize(width: number, height: number, rotation: number) {
    const rotRad = getRadianAngle(rotation);

    return {
        width:
            Math.abs(Math.cos(rotRad) * width) + Math.abs(Math.sin(rotRad) * height),
        height:
            Math.abs(Math.sin(rotRad) * width) + Math.abs(Math.cos(rotRad) * height),
    };
}

export interface ImageFilters {
    brightness: number;
    contrast: number;
    saturation: number;
    grayscale: number;
    sepia: number;
    blur: number;
}

/**
 * This function was adapted from the one in the react-easy-crop's README.
 */
export default async function getCroppedImg(
    imageSrc: string,
    pixelCrop: { x: number; y: number; width: number; height: number },
    rotation = 0,
    flip = { horizontal: false, vertical: false },
    filters?: ImageFilters
): Promise<string | null> {
    const image = await createImage(imageSrc);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
        return null;
    }

    const rotRad = getRadianAngle(rotation);

    // calculate bounding box of the rotated image
    const { width: bBoxWidth, height: bBoxHeight } = rotateSize(
        image.width,
        image.height,
        rotation
    );

    // set canvas size to match the bounding box
    canvas.width = bBoxWidth;
    canvas.height = bBoxHeight;

    // translate canvas context to a central location to allow rotating and flipping around the center
    ctx.translate(bBoxWidth / 2, bBoxHeight / 2);
    ctx.rotate(rotRad);
    ctx.scale(flip.horizontal ? -1 : 1, flip.vertical ? -1 : 1);
    ctx.translate(-image.width / 2, -image.height / 2);

    // Apply filters if provided
    if (filters) {
        ctx.filter = `
            brightness(${filters.brightness}%) 
            contrast(${filters.contrast}%) 
            saturate(${filters.saturation}%) 
            grayscale(${filters.grayscale}%) 
            sepia(${filters.sepia}%) 
            blur(${filters.blur}px)
        `;
    }

    // draw rotated image
    ctx.drawImage(image, 0, 0);

    // croppedAreaPixels values are bounding box relative
    // extract the cropped image using these values
    const data = ctx.getImageData(
        pixelCrop.x,
        pixelCrop.y,
        pixelCrop.width,
        pixelCrop.height
    );

    // set canvas width to final desired crop size - this will clear existing context
    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;

    // Paste data and clear filter for the final output
    ctx.filter = 'none';
    ctx.putImageData(data, 0, 0);

    // As a blob
    return new Promise((resolve) => {
        canvas.toBlob((file) => {
            if (file) {
                const reader = new FileReader();
                reader.readAsDataURL(file);
                reader.onloadend = () => {
                    resolve(reader.result as string);
                };
            } else {
                resolve(null);
            }
        }, 'image/jpeg', 0.85); // Increased quality slightly
    });
}

export async function getAutoCroppedImg(
    imageSrc: string,
    targetWidth = 1600,
    targetHeight = 600
): Promise<string> {
    const image = await createImage(imageSrc);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) throw new Error('No 2d context');

    // Calculate aspect ratios
    const sourceAspect = image.width / image.height;
    const targetAspect = targetWidth / targetHeight;

    let renderWidth, renderHeight, offsetX, offsetY;

    if (sourceAspect > targetAspect) {
        // Source is wider than target: fit to height, center width
        renderHeight = image.height;
        renderWidth = image.height * targetAspect;
        offsetX = (image.width - renderWidth) / 2;
        offsetY = 0;
    } else {
        // Source is taller than target: fit to width, center height
        renderWidth = image.width;
        renderHeight = image.width / targetAspect;
        offsetX = 0;
        offsetY = (image.height - renderHeight) / 2;
    }

    // Set canvas dimensions to target resolution
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    // Draw image centered and resized
    ctx.drawImage(
        image,
        offsetX, offsetY, renderWidth, renderHeight, // Source rect
        0, 0, targetWidth, targetHeight             // Destination rect
    );

    return new Promise((resolve) => {
        canvas.toBlob((file) => {
            if (file) {
                const reader = new FileReader();
                reader.readAsDataURL(file);
                reader.onloadend = () => resolve(reader.result as string);
            }
        }, 'image/jpeg', 0.90);
    });
}
