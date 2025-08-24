import axios from 'axios';

/**
 * Uploads all base64 images in HTML to the image upload API, replaces their srcs with returned URLs.
 * @param {string} html - HTML string with <img src="data:..."> tags
 * @param {string} uploadEndpoint - API endpoint for image upload
 * @returns {Promise<string>} - HTML with <img> srcs replaced
 */
export async function uploadAndReplaceImagesInHtml(html, uploadEndpoint = `${process.env.REACT_APP_API_BASE_URL}/upload-image`) {
  // Parse HTML
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const images = Array.from(doc.querySelectorAll('img'));
  const uploadPromises = [];

  images.forEach(img => {
    const src = img.getAttribute('src');
    if (src && src.startsWith('data:')) {
      const promise = uploadImageDataUrl(src, uploadEndpoint)
        .then(url => {
          img.setAttribute('src', url);
        })
        .catch(() => {}); // Optionally handle error
      uploadPromises.push(promise);
    }
  });

  await Promise.all(uploadPromises);
  // Center all images by adding style
  images.forEach(img => {
    img.style.display = 'block';
    img.style.margin = '16px auto';
    img.style.maxWidth = '100%';
  });
  return doc.body.innerHTML;
}

/**
 * Uploads a base64 data URL to the backend and returns the image URL.
 * @param {string} dataUrl
 * @param {string} uploadEndpoint
 * @returns {Promise<string>} - Uploaded image URL
 */
async function uploadImageDataUrl(dataUrl, uploadEndpoint) {
  // Convert dataURL to Blob
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  const formData = new FormData();
  formData.append('image', blob, 'upload.png');
  const response = await axios.post(uploadEndpoint, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return response.data.imageUrl;
}
