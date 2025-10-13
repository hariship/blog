import React, { useState, useRef } from 'react';
import ReactQuill, { Quill } from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import './CMSPostEditor.css';
import axios from 'axios';
import { PostFormData, SubmitStatus, PostSettings } from '../../../types';
import ThemeToggle from '../../../components/common/ThemeToggle';
import { Eye, EyeOff, Settings, Save } from 'lucide-react';

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

// Custom Toggle Blot
class ToggleBlot extends BlockEmbed {
  static create(value) {
    const node = document.createElement('details');
    node.setAttribute('class', 'cms-toggle-details');
    node.innerHTML = `
      <summary class="cms-toggle-summary">Toggle title</summary>
      <div class="cms-toggle-content">
        <p>Add your content here...</p>
      </div>
    `;
    return node;
  }

  static value(node) {
    const summary = node.querySelector('.cms-toggle-summary');
    const content = node.querySelector('.cms-toggle-content');
    return {
      title: summary ? summary.textContent : 'Toggle title',
      content: content ? content.innerHTML : '<p>Add your content here...</p>'
    };
  }
}

ToggleBlot.blotName = 'toggle';
ToggleBlot.tagName = 'details';

Quill.register(HrBlot);
Quill.register(ToggleBlot);


export default function CMSPostEditor(): React.ReactElement {
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [imageUrl, setImageUrl] = useState<string>('');
  const [content, setContent] = useState<string>('');
  const [category, setCategory] = useState<string>('Life');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitStatus, setSubmitStatus] = useState<SubmitStatus | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState<boolean>(false);
  const [showPreview, setShowPreview] = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [postSettings, setPostSettings] = useState<PostSettings>({
    publishImmediately: true,
    enableComments: true,
    featured: false,
    sendNewsletter: false,
  });
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isDraftLoaded, setIsDraftLoaded] = useState<boolean>(false);
  const [showAutoSaveIndicator, setShowAutoSaveIndicator] = useState<boolean>(false);
  const [lastAutoSaveTime, setLastAutoSaveTime] = useState<string>('');

  const quillRef = useRef<ReactQuill>(null);

  // Load draft from localStorage on mount
  React.useEffect(() => {
    const savedDraft = localStorage.getItem('cms-draft');
    console.log('Checking for saved draft...', savedDraft ? 'Found!' : 'Not found');

    if (savedDraft) {
      try {
        const draft = JSON.parse(savedDraft);
        console.log('Loading draft:', draft);

        setTitle(draft.title || '');
        setDescription(draft.description || '');
        setImageUrl(draft.image_url || '');
        setContent(draft.content || '');
        setCategory(draft.category || 'Life');

        if (draft.publishImmediately !== undefined || draft.enableComments !== undefined) {
          setPostSettings({
            publishImmediately: draft.publishImmediately ?? true,
            enableComments: draft.enableComments ?? true,
            featured: draft.featured ?? false,
            sendNewsletter: draft.sendNewsletter ?? false,
          });
        }

        // Show saved time if available
        if (draft.lastSaved) {
          const savedDate = new Date(draft.lastSaved);
          setLastAutoSaveTime(savedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
          setShowAutoSaveIndicator(true);
        }

        setSubmitStatus({
          type: 'success',
          message: 'Draft loaded from previous session'
        });
        setTimeout(() => setSubmitStatus(null), 3000);
      } catch (error) {
        console.error('Failed to load draft:', error);
      }
    }

    setIsDraftLoaded(true);
  }, []); // Run only once on mount

  // Auto-save draft every 5 seconds
  React.useEffect(() => {
    const autoSaveInterval = setInterval(() => {
      if (title || content) {
        const now = new Date();
        const draftData = {
          title: title.trim(),
          description: description.trim(),
          image_url: imageUrl.trim(),
          content: content,
          category,
          enclosure: imageUrl.trim(),
          ...postSettings,
          isDraft: true,
          lastSaved: now.toISOString()
        };
        localStorage.setItem('cms-draft', JSON.stringify(draftData));

        // Show auto-save indicator
        setLastAutoSaveTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        setShowAutoSaveIndicator(true);

        console.log('Auto-saved draft at', now.toLocaleTimeString());
      }
    }, 5000); // 5 seconds

    return () => clearInterval(autoSaveInterval);
  }, [title, description, imageUrl, content, category, postSettings]);

  
  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminTokenExpiry');
    window.location.reload(); // Simple reset, shows login again
  };

  const compressImage = (file: File, maxSizeKB: number = 300): Promise<File> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Calculate max dimensions while keeping aspect ratio
          const maxDimension = 1200;
          if (width > height && width > maxDimension) {
            height = (height * maxDimension) / width;
            width = maxDimension;
          } else if (height > maxDimension) {
            width = (width * maxDimension) / height;
            height = maxDimension;
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);

          // Try different quality levels to get under target size
          let quality = 0.8;
          const tryCompress = () => {
            canvas.toBlob(
              (blob) => {
                if (!blob) {
                  reject(new Error('Compression failed'));
                  return;
                }

                const sizeKB = blob.size / 1024;
                console.log(`Compressed to ${sizeKB.toFixed(2)}KB at quality ${quality}`);

                if (sizeKB <= maxSizeKB || quality <= 0.5) {
                  // Success or reached minimum quality
                  const compressedFile = new File([blob], file.name, {
                    type: 'image/jpeg',
                    lastModified: Date.now(),
                  });
                  resolve(compressedFile);
                } else {
                  // Try lower quality
                  quality -= 0.1;
                  tryCompress();
                }
              },
              'image/jpeg',
              quality
            );
          };

          tryCompress();
        };
        img.onerror = () => reject(new Error('Failed to load image'));
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
    });
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

    setIsUploadingImage(true);
    setSubmitStatus(null);

    try {
      // Compress image for WhatsApp compatibility (target: 300KB)
      console.log(`Original image size: ${(file.size / 1024).toFixed(2)}KB`);
      const compressedFile = await compressImage(file, 300);
      console.log(`Compressed image size: ${(compressedFile.size / 1024).toFixed(2)}KB`);

      const formData = new FormData();
      formData.append('image', compressedFile);

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
          message: `Image compressed to ${(compressedFile.size / 1024).toFixed(0)}KB and uploaded successfully!`
        });
      } else {
        throw new Error(response.data.message || 'Upload failed');
      }

    } catch (error: any) {
      console.error('Image upload error:', error);
      setSubmitStatus({
        type: 'error',
        message: error.response?.data?.message || error.message || 'Failed to upload image. Please try again.'
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

  const insertToggle = () => {
    if (quillRef.current) {
      const editor = quillRef.current.getEditor();
      const range = editor.getSelection(true);
      if (range) {
        const currentIndex = range.index;

        // Insert new line if not at start
        if (currentIndex > 0) {
          const prevChar = editor.getText(currentIndex - 1, 1);
          if (prevChar !== '\n') {
            editor.insertText(currentIndex, '\n', 'user');
          }
        }

        // Insert toggle marker with title
        editor.insertText(currentIndex + 1, '[TOGGLE] Toggle title\n', {
          'background': '#f0f0f0',
          'bold': true
        });

        // Insert content placeholder
        editor.insertText(currentIndex + 1 + 22, 'Add your content here...\n', 'user');

        // Insert end toggle marker
        editor.insertText(currentIndex + 1 + 22 + 24, '[END TOGGLE]\n\n', {
          'background': '#f0f0f0',
          'bold': true
        });

        // Position cursor after title for editing
        editor.setSelection(currentIndex + 1 + 9, 13); // Select "Toggle title"
      }
    }
  };

  const insertEndToggle = () => {
    if (quillRef.current) {
      const editor = quillRef.current.getEditor();
      const range = editor.getSelection(true);
      if (range) {
        const currentIndex = range.index;

        // Insert new line if not at start
        if (currentIndex > 0) {
          const prevChar = editor.getText(currentIndex - 1, 1);
          if (prevChar !== '\n') {
            editor.insertText(currentIndex, '\n', 'user');
          }
        }

        // Insert end toggle marker
        editor.insertText(currentIndex + 1, '[END TOGGLE]\n\n', {
          'background': '#f0f0f0',
          'bold': true
        });

        // Position cursor after the end marker
        editor.setSelection(currentIndex + 1 + 14, 0);
      }
    }
  };

  const handleSave = () => {
    // Don't validate for saving drafts - allow saving incomplete posts
    if (!title && !content) {
      setSubmitStatus({
        type: 'error',
        message: 'Nothing to save'
      });
      return;
    }

    setIsSaving(true);
    setSubmitStatus(null);

    try {
      const now = new Date();
      const draftData = {
        title: title.trim(),
        description: description.trim(),
        image_url: imageUrl.trim(),
        content: content, // Save raw content, don't process images
        category,
        enclosure: imageUrl.trim(),
        ...postSettings,
        isDraft: true,
        lastSaved: now.toISOString()
      };

      // Save to localStorage
      localStorage.setItem('cms-draft', JSON.stringify(draftData));

      // Show auto-save indicator
      setLastAutoSaveTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      setShowAutoSaveIndicator(true);

      setSubmitStatus({
        type: 'success',
        message: 'Draft saved successfully!'
      });

      // Clear success message after 2 seconds
      setTimeout(() => {
        setSubmitStatus(null);
      }, 2000);

    } catch (error: any) {
      console.error('Error saving draft:', error);
      setSubmitStatus({
        type: 'error',
        message: 'Failed to save draft. Please try again.'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setImageUrl('');
    setContent('');
    setCategory('Life');
    setSubmitStatus(null);
    setShowAutoSaveIndicator(false);
    setLastAutoSaveTime('');
    localStorage.removeItem('cms-draft');
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
      enclosure: imageUrl.trim(),
      ...postSettings
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

      // Clear draft from localStorage
      localStorage.removeItem('cms-draft');

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
    'code-block', 'align', 'hr', 'toggle'
  ];

  const processContentForPreview = (htmlContent: string) => {
    if (!htmlContent) return '<p>No content yet...</p>';

    // Convert [TOGGLE] markers to actual details/summary elements
    let processed = htmlContent;

    // Match toggle markers and capture content until [END TOGGLE]
    // [END TOGGLE] can be anywhere in the content, not just in its own paragraph
    processed = processed.replace(
      /<p><strong[^>]*>\[TOGGLE\]\s*([^<]+)<\/strong><\/p>([\s\S]*?)(?:<strong[^>]*>\[END TOGGLE\]<\/strong>|(?=<p><strong[^>]*>\[TOGGLE\])|$)/gi,
      (match, title, content) => {
        // Clean up the content and wrap in toggle
        // Remove [END TOGGLE] marker from content if it exists
        let cleanContent = content.trim() || '<p>Add your content here...</p>';

        // Remove any trailing [END TOGGLE] markers and their surrounding tags
        cleanContent = cleanContent.replace(/<strong[^>]*>\[END TOGGLE\]<\/strong>/gi, '');

        return `<details class="cms-toggle-details">
          <summary class="cms-toggle-summary">${title.trim()}</summary>
          <div class="cms-toggle-content">${cleanContent}</div>
        </details>`;
      }
    );

    // Remove any remaining standalone [END TOGGLE] markers
    processed = processed.replace(
      /<strong[^>]*>\[END TOGGLE\]<\/strong>/gi,
      ''
    );

    return processed;
  };

  const renderPreview = () => {
    if (!showPreview) return null;

    return (
      <div className="cms-preview-overlay">
        <div className="cms-preview-container">
          <div className="cms-preview-header">
            <h3>Preview</h3>
            <button
              onClick={() => setShowPreview(false)}
              className="cms-preview-close"
              type="button"
            >
              ✕
            </button>
          </div>
          <div className="cms-preview-content">
            <article className="cms-preview-article">
              {imageUrl && (
                <img
                  src={imageUrl}
                  alt={title}
                  className="cms-preview-image"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              )}
              <div className="cms-preview-meta">
                <span className="cms-preview-category">{category}</span>
                <span className="cms-preview-date">
                  {new Date().toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </span>
                {postSettings.featured && (
                  <span className="cms-preview-featured">Featured</span>
                )}
              </div>
              <h1 className="cms-preview-title">{title || 'Untitled Post'}</h1>
              {description && (
                <p className="cms-preview-description">{description}</p>
              )}
              <div
                className="cms-preview-body"
                dangerouslySetInnerHTML={{ __html: processContentForPreview(content) }}
              />
            </article>
          </div>
        </div>
      </div>
    );
  };

  const renderSettings = () => {
    if (!showSettings) return null;

    return (
      <div className="cms-settings-panel">
        <div className="cms-settings-header">
          <h3>Post Settings</h3>
          <button
            onClick={() => setShowSettings(false)}
            className="cms-settings-close"
            type="button"
          >
            ✕
          </button>
        </div>
        <div className="cms-settings-content">
          <div className="cms-setting-item">
            <label className="cms-toggle-label">
              <input
                type="checkbox"
                checked={postSettings.publishImmediately}
                onChange={(e) => setPostSettings(prev => ({
                  ...prev,
                  publishImmediately: e.target.checked
                }))}
                className="cms-toggle-input"
              />
              <span className="cms-toggle-slider"></span>
              <span className="cms-toggle-text">Publish Immediately</span>
            </label>
            <p className="cms-setting-description">
              Post will be published immediately after submission
            </p>
          </div>

          <div className="cms-setting-item">
            <label className="cms-toggle-label">
              <input
                type="checkbox"
                checked={postSettings.enableComments}
                onChange={(e) => setPostSettings(prev => ({
                  ...prev,
                  enableComments: e.target.checked
                }))}
                className="cms-toggle-input"
              />
              <span className="cms-toggle-slider"></span>
              <span className="cms-toggle-text">Enable Comments</span>
            </label>
            <p className="cms-setting-description">
              Allow readers to comment on this post
            </p>
          </div>

          <div className="cms-setting-item">
            <label className="cms-toggle-label">
              <input
                type="checkbox"
                checked={postSettings.featured}
                onChange={(e) => setPostSettings(prev => ({
                  ...prev,
                  featured: e.target.checked
                }))}
                className="cms-toggle-input"
              />
              <span className="cms-toggle-slider"></span>
              <span className="cms-toggle-text">Featured Post</span>
            </label>
            <p className="cms-setting-description">
              Display this post as a featured article
            </p>
          </div>

          <div className="cms-setting-item">
            <label className="cms-toggle-label">
              <input
                type="checkbox"
                checked={postSettings.sendNewsletter}
                onChange={(e) => setPostSettings(prev => ({
                  ...prev,
                  sendNewsletter: e.target.checked
                }))}
                className="cms-toggle-input"
              />
              <span className="cms-toggle-slider"></span>
              <span className="cms-toggle-text">Send Newsletter</span>
            </label>
            <p className="cms-setting-description">
              Send this post to newsletter subscribers
            </p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="cms-editor-container">
  <div className="cms-editor-header">
    <div className="cms-header-left">
      <h2>Create Blog Post</h2>
      {showAutoSaveIndicator && (
        <div className="cms-autosave-indicator">
          <span className="cms-autosave-tick">✓</span>
          <span className="cms-autosave-text">Saved at {lastAutoSaveTime}</span>
        </div>
      )}
    </div>
    <div className="cms-header-controls">
      <button
        onClick={handleSave}
        className="cms-save-button"
        type="button"
        disabled={isSaving || isSubmitting}
        title="Save Draft"
      >
        <Save size={18} />
      </button>
      <button
        onClick={() => setShowPreview(!showPreview)}
        className="cms-preview-button"
        type="button"
        disabled={!title && !content}
        title="Preview Post"
      >
        {showPreview ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
      <button
        onClick={() => setShowSettings(!showSettings)}
        className="cms-settings-button"
        type="button"
        title="Post Settings"
      >
        <Settings size={18} />
      </button>
      <ThemeToggle />
      <button onClick={handleLogout} className="cms-logout-button">
        Logout
      </button>
    </div>
  </div>

  {renderSettings()}

  <form onSubmit={handleSubmit}>
    <div className="cms-metadata-grid">
      <div className="cms-metadata-full">
        <input
          type="text"
          placeholder="Post Title *"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="cms-editor-input cms-title-input"
          disabled={isSubmitting}
          required
        />
      </div>

      <div className="cms-metadata-full">
        <input
          type="text"
          placeholder="Short Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="cms-editor-input"
          disabled={isSubmitting}
        />
      </div>

      <div className="cms-metadata-row">
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
          className="cms-editor-input cms-category-select"
          disabled={isSubmitting}
        >
          <option value="Life">Life</option>
          <option value="Work">Work</option>
          <option value="Books">Books</option>
          <option value="Notes">Notes</option>
          <option value="Motives">Motives</option>
        </select>
      </div>
    </div>

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
      <button
        type="button"
        onClick={insertToggle}
        disabled={isSubmitting}
        className="cms-toggle-button"
        title="Insert Toggle Block"
      >
        ▶
      </button>
      <button
        type="button"
        onClick={insertEndToggle}
        disabled={isSubmitting}
        className="cms-end-toggle-button"
        title="End Toggle Block"
      >
        ▼
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

  {renderPreview()}
</div>

  );
}