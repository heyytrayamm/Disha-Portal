import type { ScannedProduct } from '../types/metrology';
import { ApiService } from './api';

/**
 * Intelligent OCR analyzer for custom uploaded image labels.
 * Strictly calls the real FastAPI OCR engine and never invents or simulates compliance data.
 */
export async function analyzeUploadedPackagingImage(
  imageInput: string | File,
  fileName: string = 'Uploaded_Package.jpg',
  inspectorName: string = 'Inspector Officer',
  inspectorLocation: string = 'Field Inspection Desk'
): Promise<ScannedProduct> {
  const actualFileName = imageInput instanceof File ? imageInput.name : fileName;
  const imageSrc = typeof imageInput === 'string' ? imageInput : '';
  const isImported = /import|foreign|us|global|china|luxe/i.test(actualFileName);

  if (imageInput instanceof File) {
    const result = await ApiService.uploadImageFile(imageInput, {
      inspectorName,
      inspectorLocation,
      isImported,
      pdpAreaCm2: 180.0
    });
    if (result && result.id) return result;
  } else if (imageSrc.startsWith('data:') || imageSrc.startsWith('http')) {
    const result = await ApiService.scanImage({
      imageUrl: imageSrc,
      fileName: actualFileName,
      inspectorName,
      inspectorLocation,
      isImported,
      pdpAreaCm2: 180.0
    });
    if (result && result.id) return result;
  }

  throw new Error("Unable to analyze packaging image: backend connection required for real OCR compliance assessment.");
}

