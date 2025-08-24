import axios, { AxiosResponse } from 'axios';

interface ImageUploadResponse {
  imageUrl: string;
}

/**
 * Uploads all base64 images in HTML to the image upload API, replaces their srcs with returned URLs.
 * @param html - HTML string with <img src="data:..."> tags
 * @param uploadEndpoint - API endpoint for image upload
 * @returns HTML with <img> srcs replaced
 */
export async function uploadAndReplaceImagesInHtml(
  html: string, 
  uploadEndpoint: string = `${process.env.REACT_APP_API_BASE_URL}/upload-image`
): Promise<string> {
  // Parse HTML
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const images = Array.from(doc.querySelectorAll('img'));
  const uploadPromises: Promise<void>[] = [];

  images.forEach((img: HTMLImageElement) => {
    const src: string | null = img.getAttribute('src');
    if (src && src.startsWith('data:')) {
      const promise = uploadImageDataUrl(src, uploadEndpoint)
        .then((url: string) => {
          img.setAttribute('src', url);
        })
        .catch(() => {}); // Optionally handle error
      uploadPromises.push(promise);
    }
  });

  await Promise.all(uploadPromises);
  // Center all images by adding style
  images.forEach((img: HTMLImageElement) => {
    img.style.display = 'block';
    img.style.margin = '16px auto';
    img.style.maxWidth = '100%';
  });
  return doc.body.innerHTML;
}

/**
 * Uploads a base64 data URL to the backend and returns the image URL.
 * @param dataUrl - Base64 data URL
 * @param uploadEndpoint - API endpoint for image upload
 * @returns Uploaded image URL
 */
async function uploadImageDataUrl(dataUrl: string, uploadEndpoint: string): Promise<string> {
  // Convert dataURL to Blob
  const res: Response = await fetch(dataUrl);
  const blob: Blob = await res.blob();
  const formData = new FormData();
  formData.append('image', blob, 'upload.png');
  const response: AxiosResponse<ImageUploadResponse> = await axios.post(uploadEndpoint, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return response.data.imageUrl;
}
