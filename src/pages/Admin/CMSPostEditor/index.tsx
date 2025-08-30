import React, { useState, useRef } from 'react';
import ReactQuill, { Quill } from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import './CMSPostEditor.css';
import axios from 'axios';
import { PostFormData, SubmitStatus } from '../../../types';
import ThemeToggle from '../../../components/common/ThemeToggle';

// Custom HR Blot
const BlockEmbed = Quill.import('blots/block/embed');

class HrBlot extends BlockEmbed {
  static create() {
    let node = super.create();
    return node;
  }
}
HrBlot.blotName = 'hr';
HrBlot.tagName = 'hr';

Quill.register(HrBlot);

export default function CMSPostEditor(): React.ReactElement {
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [imageUrl, setImageUrl] = useState<string>('');
  const [content, setContent] = useState<string>('');
  const [category, setCategory] = useState<string>('Life');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitStatus, setSubmitStatus] = useState<SubmitStatus | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState<boolean>(false);

  const quillRef = useRef<ReactQuill>(null);
  
  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminTokenExpiry');
    window.location.reload(); // Simple reset, shows login again
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setSubmitStatus({
        type: 'error',
        message: 'Please select an image file'
      });
      return;
    }

    // Validate file size (e.g., 5MB limit)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      setSubmitStatus({
        type: 'error',
        message: 'Image size must be less than 5MB'
      });
      return;
    }

    setIsUploadingImage(true);
    setSubmitStatus(null);

    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await axios.post(`${process.env.REACT_APP_API_BASE_URL}/upload-image`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 30000, // 30 second timeout for image upload
      });

      if (response.data.success) {
        setImageUrl(response.data.imageUrl);
        setSubmitStatus({
          type: 'success',
          message: 'Image uploaded successfully!'
        });
      } else {
        throw new Error(response.data.message || 'Upload failed');
      }

    } catch (error: any) {
      console.error('Image upload error:', error);
      setSubmitStatus({
        type: 'error',
        message: error.response?.data?.message || 'Failed to upload image. Please try again.'
      });
    } finally {
      setIsUploadingImage(false);
      // Clear the file input
      event.target.value = '';
    }
  };
  const insertHr = () => {
    if (quillRef.current) {
      const editor = quillRef.current.getEditor();
      const range = editor.getSelection(true);
      if (range) {
        editor.insertEmbed(range.index, 'hr', true, 'user');
        editor.setSelection(range.index + 1, 0);
      }
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setImageUrl('');
    setContent('');
    setCategory('Life');
    setSubmitStatus(null);
  };

  const validateForm = () => {
    const errors = [];
    
    if (!title.trim()) {
      errors.push('Title is required');
    }
    
    if (!content.trim() || content === '<p><br></p>') {
      errors.push('Content is required');
    }
    
    if (imageUrl && !isValidUrl(imageUrl)) {
      errors.push('Please enter a valid image URL');
    }
    
    return errors;
  };

  const isValidUrl = (string: string): boolean => {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    const validationErrors = validateForm();
    if (validationErrors.length > 0) {
      setSubmitStatus({
        type: 'error',
        message: validationErrors.join(', ')
      });
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus(null);

    // Upload and replace base64 images in content HTML
    let processedContent = content.trim();
    try {
      const { uploadAndReplaceImagesInHtml } = await import('../../../utils/imageUploadReplace');
      processedContent = await uploadAndReplaceImagesInHtml(processedContent, `${process.env.REACT_APP_API_BASE_URL}/upload-image`);
    } catch (err) {
      console.error('Failed to upload/replace images:', err);
      setSubmitStatus({ type: 'error', message: 'Failed to upload images in content.' });
      setIsSubmitting(false);
      return;
    }

    const postData = {
      title: title.trim(),
      description: description.trim(),
      image_url: imageUrl.trim(),
      content: processedContent,
      category,
      enclosure: imageUrl.trim()
    };

    try {
      // Make API call to your backend
      const response = await axios.post(`${process.env.REACT_APP_API_BASE_URL}/admin/post`, postData, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 10000, // 10 second timeout
      });

      // Success response
      setSubmitStatus({
        type: 'success',
        message: 'Post created successfully!'
      });
      
      // Reset form after successful submission
      setTimeout(() => {
        resetForm();
      }, 2000);

      console.log('Post created:', response.data);
      
    } catch (error: any) {
      console.error('Error creating post:', error);
      
      let errorMessage = 'Failed to create post. Please try again.';
      
      if (error && typeof error === 'object') {
        if ('response' in error && error.response) {
          // Server responded with error status
          errorMessage = error.response.data?.error || error.response.data?.message || errorMessage;
        } else if ('request' in error) {
          // Request made but no response
          errorMessage = 'Network error. Please check your connection.';
        } else if ('message' in error) {
          // Something else happened
          errorMessage = error.message || errorMessage;
        }
      }
      
      setSubmitStatus({
        type: 'error',
        message: errorMessage
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const modules = {
    toolbar: {
      container: "#toolbar",
    }
  };

  const formats = [
    'header', 'bold', 'italic', 'underline', 'strike',
    'list', 'bullet', 'link', 'image', 'blockquote',
    'code-block', 'align', 'hr'
  ];

  return (
    <div className="cms-editor-container">
  <div className="cms-editor-header">
    <h2>Create Blog Post</h2>
    <div className="cms-header-controls">
      <ThemeToggle />
      <button onClick={handleLogout} className="cms-logout-button">
        Logout
      </button>
    </div>
  </div>

  <form onSubmit={handleSubmit}>
    <input
      type="text"
      placeholder="Title *"
      value={title}
      onChange={(e) => setTitle(e.target.value)}
      className="cms-editor-input"
      disabled={isSubmitting}
      required
    />

    <input
      type="text"
      placeholder="Description"
      value={description}
      onChange={(e) => setDescription(e.target.value)}
      className="cms-editor-input"
      disabled={isSubmitting}
    />

    <div className="cms-image-input-container">
      <input
        type="url"
        placeholder="Image URL"
        value={imageUrl}
        onChange={(e) => setImageUrl(e.target.value)}
        className="cms-editor-input cms-image-url-input"
        disabled={isSubmitting || isUploadingImage}
      />
      <div className="cms-image-upload-section">
        <input
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          className="cms-file-input"
          id="image-file-input"
          disabled={isSubmitting || isUploadingImage}
        />
        <label 
          htmlFor="image-file-input" 
          className={`cms-upload-button ${isUploadingImage ? 'uploading' : ''}`}
        >
          <div className="cms-upload-icon">
            📁
          </div>
          <span className="cms-upload-text">
            {isUploadingImage ? 'Uploading...' : 'Upload'}
          </span>
        </label>
      </div>
    </div>

    <select
      value={category}
      onChange={(e) => setCategory(e.target.value)}
      className="cms-editor-input"
      disabled={isSubmitting}
    >
      <option value="Life">Life</option>
      <option value="Work">Work</option>
      <option value="Books">Books</option>
      <option value="Notes">Notes</option>
      <option value="Motives">Motives</option>
    </select>

    {/* Custom Toolbar */}
    <div id="toolbar">
      <select className="ql-header" defaultValue={""}>
        <option value="1"></option>
        <option value="2"></option>
        <option value=""></option>
      </select>
      <button className="ql-bold"></button>
      <button className="ql-italic"></button>
      <button className="ql-underline"></button>
      <button className="ql-strike"></button>
      <button className="ql-list" value="ordered"></button>
      <button className="ql-list" value="bullet"></button>
      <button className="ql-link"></button>
      <button className="ql-image"></button>
      <button className="ql-blockquote"></button>
      <button className="ql-code-block"></button>
      <button className="ql-align"></button>
      <button
        type="button"
        onClick={insertHr}
        disabled={isSubmitting}
        className="cms-hr-button"
        title="Insert Horizontal Rule"
      >
        HR
      </button>
    </div>

    <ReactQuill
      ref={quillRef}
      value={content}
      onChange={setContent}
      className="cms-editor-quill"
      modules={modules}
      formats={formats}
      readOnly={isSubmitting}
    />

    {submitStatus && (
      <div className={`cms-status-message ${submitStatus.type}`}>
        {submitStatus.message}
      </div>
    )}

    {/* Submit + Reset aligned */}
    <div className="cms-editor-buttons-row">
      <button
        type="submit"
        className="cms-editor-button"
        disabled={isSubmitting}
      >
        {isSubmitting ? 'Creating Post...' : 'Submit Post'}
      </button>

      <button
        type="button"
        onClick={resetForm}
        className="cms-editor-button cms-editor-button-secondary"
        disabled={isSubmitting}
      >
        Reset Form
      </button>
    </div>
  </form>
</div>

  );
}