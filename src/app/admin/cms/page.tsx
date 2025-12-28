'use client'

import React, { useState, useRef, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { Eye, EyeOff, Settings, Save } from 'lucide-react'
import { ThemeToggle } from '@/components/common'
import './CMSPostEditor.css'

// Dynamically import ReactQuill to avoid SSR issues
const ReactQuill = dynamic(
  async () => {
    const { default: RQ } = await import('react-quill-new')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return function QuillWrapper({ forwardedRef, ...props }: any) {
      return <RQ ref={forwardedRef} {...props} />
    }
  },
  {
    ssr: false,
    loading: () => <div className="quill-loading">Loading editor...</div>
  }
)

interface PostSettings {
  publishImmediately: boolean
  enableComments: boolean
  featured: boolean
  sendNewsletter: boolean
}

interface SubmitStatus {
  type: 'success' | 'error'
  message: string
}

export default function CMSPostEditor() {
  const [title, setTitle] = useState<string>('')
  const [description, setDescription] = useState<string>('')
  const [imageUrl, setImageUrl] = useState<string>('')
  const [content, setContent] = useState<string>('')
  const [category, setCategory] = useState<string>('Life')
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const [submitStatus, setSubmitStatus] = useState<SubmitStatus | null>(null)
  const [isUploadingImage, setIsUploadingImage] = useState<boolean>(false)
  const [showPreview, setShowPreview] = useState<boolean>(false)
  const [showSettings, setShowSettings] = useState<boolean>(false)
  const [postSettings, setPostSettings] = useState<PostSettings>({
    publishImmediately: true,
    enableComments: true,
    featured: false,
    sendNewsletter: false,
  })
  const [isSaving, setIsSaving] = useState<boolean>(false)
  const [showAutoSaveIndicator, setShowAutoSaveIndicator] = useState<boolean>(false)
  const [lastAutoSaveTime, setLastAutoSaveTime] = useState<string>('')
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false)
  const [loginPin, setLoginPin] = useState<string>('')
  const [loginError, setLoginError] = useState<string>('')
  const [mounted, setMounted] = useState(false)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const quillRef = useRef<any>(null)

  // Set mounted state and load Quill CSS
  useEffect(() => {
    setMounted(true)
    // Load Quill CSS dynamically
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = 'https://cdn.jsdelivr.net/npm/quill@2.0.2/dist/quill.snow.css'
    document.head.appendChild(link)
    return () => {
      document.head.removeChild(link)
    }
  }, [])

  // Check authentication on mount
  useEffect(() => {
    const token = localStorage.getItem('adminToken')
    const expiry = localStorage.getItem('adminTokenExpiry')

    if (token && expiry && new Date(expiry) > new Date()) {
      setIsAuthenticated(true)
    }
  }, [])

  // Load draft from localStorage on mount
  useEffect(() => {
    if (!isAuthenticated) return

    const savedDraft = localStorage.getItem('cms-draft')
    if (savedDraft) {
      try {
        const draft = JSON.parse(savedDraft)
        setTitle(draft.title || '')
        setDescription(draft.description || '')
        setImageUrl(draft.image_url || '')
        setContent(draft.content || '')
        setCategory(draft.category || 'Life')

        if (draft.publishImmediately !== undefined) {
          setPostSettings({
            publishImmediately: draft.publishImmediately ?? true,
            enableComments: draft.enableComments ?? true,
            featured: draft.featured ?? false,
            sendNewsletter: draft.sendNewsletter ?? false,
          })
        }

        if (draft.lastSaved) {
          const savedDate = new Date(draft.lastSaved)
          setLastAutoSaveTime(savedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))
          setShowAutoSaveIndicator(true)
        }

        setSubmitStatus({ type: 'success', message: 'Draft loaded from previous session' })
        setTimeout(() => setSubmitStatus(null), 3000)
      } catch (error) {
        console.error('Failed to load draft:', error)
      }
    }
  }, [isAuthenticated])

  // Auto-save draft every 5 seconds
  useEffect(() => {
    if (!isAuthenticated) return

    const autoSaveInterval = setInterval(() => {
      if (title || content) {
        const now = new Date()
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
        }
        localStorage.setItem('cms-draft', JSON.stringify(draftData))
        setLastAutoSaveTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))
        setShowAutoSaveIndicator(true)
      }
    }, 5000)

    return () => clearInterval(autoSaveInterval)
  }, [isAuthenticated, title, description, imageUrl, content, category, postSettings])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginError('')

    try {
      const response = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: loginPin })
      })

      const data = await response.json()

      if (response.ok && data.token) {
        localStorage.setItem('adminToken', data.token)
        const expiry = new Date()
        expiry.setHours(expiry.getHours() + 24)
        localStorage.setItem('adminTokenExpiry', expiry.toISOString())
        setIsAuthenticated(true)
      } else {
        setLoginError(data.error || 'Invalid PIN')
      }
    } catch {
      setLoginError('Login failed. Please try again.')
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('adminToken')
    localStorage.removeItem('adminTokenExpiry')
    setIsAuthenticated(false)
  }

  const compressImage = (file: File, maxSizeKB: number = 300): Promise<File> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = (event) => {
        const img = new Image()
        img.src = event.target?.result as string
        img.onload = () => {
          const canvas = document.createElement('canvas')
          let width = img.width
          let height = img.height

          const maxDimension = 1200
          if (width > height && width > maxDimension) {
            height = (height * maxDimension) / width
            width = maxDimension
          } else if (height > maxDimension) {
            width = (width * maxDimension) / height
            height = maxDimension
          }

          canvas.width = width
          canvas.height = height

          const ctx = canvas.getContext('2d')
          ctx?.drawImage(img, 0, 0, width, height)

          let quality = 0.8
          const tryCompress = () => {
            canvas.toBlob(
              (blob) => {
                if (!blob) {
                  reject(new Error('Compression failed'))
                  return
                }

                const sizeKB = blob.size / 1024
                if (sizeKB <= maxSizeKB || quality <= 0.5) {
                  const compressedFile = new File([blob], file.name, {
                    type: 'image/jpeg',
                    lastModified: Date.now(),
                  })
                  resolve(compressedFile)
                } else {
                  quality -= 0.1
                  tryCompress()
                }
              },
              'image/jpeg',
              quality
            )
          }
          tryCompress()
        }
        img.onerror = () => reject(new Error('Failed to load image'))
      }
      reader.onerror = () => reject(new Error('Failed to read file'))
    })
  }

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setSubmitStatus({ type: 'error', message: 'Please select an image file' })
      return
    }

    setIsUploadingImage(true)
    setSubmitStatus(null)

    try {
      const compressedFile = await compressImage(file, 300)
      const formData = new FormData()
      formData.append('image', compressedFile)

      const response = await fetch('/api/upload-image', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (data.success && data.url) {
        setImageUrl(data.url)
        setSubmitStatus({
          type: 'success',
          message: `Image compressed to ${(compressedFile.size / 1024).toFixed(0)}KB and uploaded!`
        })
      } else {
        throw new Error(data.error || data.message || 'Upload failed')
      }
    } catch (error: unknown) {
      const err = error as Error
      setSubmitStatus({ type: 'error', message: err.message || 'Failed to upload image' })
    } finally {
      setIsUploadingImage(false)
      event.target.value = ''
    }
  }

  const handleSave = () => {
    if (!title && !content) {
      setSubmitStatus({ type: 'error', message: 'Nothing to save' })
      return
    }

    setIsSaving(true)
    try {
      const now = new Date()
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
      }

      localStorage.setItem('cms-draft', JSON.stringify(draftData))
      setLastAutoSaveTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))
      setShowAutoSaveIndicator(true)
      setSubmitStatus({ type: 'success', message: 'Draft saved successfully!' })
      setTimeout(() => setSubmitStatus(null), 2000)
    } catch {
      setSubmitStatus({ type: 'error', message: 'Failed to save draft' })
    } finally {
      setIsSaving(false)
    }
  }

  const resetForm = () => {
    setTitle('')
    setDescription('')
    setImageUrl('')
    setContent('')
    setCategory('Life')
    setSubmitStatus(null)
    setShowAutoSaveIndicator(false)
    setLastAutoSaveTime('')
    localStorage.removeItem('cms-draft')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!title.trim()) {
      setSubmitStatus({ type: 'error', message: 'Title is required' })
      return
    }

    if (!content.trim() || content === '<p><br></p>') {
      setSubmitStatus({ type: 'error', message: 'Content is required' })
      return
    }

    setIsSubmitting(true)
    setSubmitStatus(null)

    // Replace &nbsp; with regular spaces for proper word wrapping
    const cleanedContent = content.replace(/&nbsp;/g, ' ').trim()

    const postData = {
      title: title.trim(),
      description: description.trim(),
      image_url: imageUrl.trim(),
      content: cleanedContent,
      category,
      enclosure: imageUrl.trim(),
      ...postSettings
    }

    try {
      const token = localStorage.getItem('adminToken')
      const response = await fetch('/api/admin/post', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(postData)
      })

      const data = await response.json()

      if (response.ok) {
        setSubmitStatus({ type: 'success', message: 'Post created successfully!' })
        resetForm()
      } else {
        throw new Error(data.error || 'Failed to create post')
      }
    } catch (error: unknown) {
      const err = error as Error
      setSubmitStatus({ type: 'error', message: err.message || 'Failed to create post' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const processContentForPreview = (htmlContent: string): string => {
    if (!htmlContent) return htmlContent

    let processed = htmlContent
    processed = processed.replace(
      /<p><strong[^>]*>\[TOGGLE\]\s*([^<]+)<\/strong><\/p>([\s\S]*?)(?:<strong[^>]*>\[END TOGGLE\]<\/strong>|(?=<p><strong[^>]*>\[TOGGLE\])|$)/gi,
      (match, toggleTitle, toggleContent) => {
        let cleanContent = toggleContent.trim() || ''
        cleanContent = cleanContent.replace(/<strong[^>]*>\[END TOGGLE\]<\/strong>/gi, '')
        return `<details class="cms-toggle-details">
          <summary class="cms-toggle-summary">${toggleTitle.trim()}</summary>
          <div class="cms-toggle-content">${cleanContent}</div>
        </details>`
      }
    )
    processed = processed.replace(/<strong[^>]*>\[END TOGGLE\]<\/strong>/gi, '')
    return processed
  }

  const quillModules = {
    toolbar: {
      container: '#toolbar'
    }
  }

  const insertHr = () => {
    if (quillRef.current) {
      const editor = quillRef.current.getEditor()
      const range = editor.getSelection(true)
      if (range) {
        editor.insertEmbed(range.index, 'hr', true, 'user')
        editor.setSelection(range.index + 1, 0)
      }
    }
  }

  const insertToggle = () => {
    if (quillRef.current) {
      const editor = quillRef.current.getEditor()
      const range = editor.getSelection(true)
      if (range) {
        const currentIndex = range.index
        editor.insertText(currentIndex, '\n[TOGGLE] Toggle title\n', { bold: true })
        editor.insertText(currentIndex + 22, 'Add your content here...\n')
        editor.insertText(currentIndex + 46, '[END TOGGLE]\n\n', { bold: true })
        editor.setSelection(currentIndex + 9, 12)
      }
    }
  }

  const insertEndToggle = () => {
    if (quillRef.current) {
      const editor = quillRef.current.getEditor()
      const range = editor.getSelection(true)
      if (range) {
        editor.insertText(range.index, '\n[END TOGGLE]\n\n', { bold: true })
        editor.setSelection(range.index + 14, 0)
      }
    }
  }

  // Login form
  if (!isAuthenticated) {
    return (
      <div className="cms-login-container">
        <div className="cms-login-card">
          <h2>Admin Login</h2>
          <form onSubmit={handleLogin}>
            <div className="cms-login-field">
              <label htmlFor="pin">Enter PIN</label>
              <input
                type="password"
                id="pin"
                value={loginPin}
                onChange={(e) => setLoginPin(e.target.value)}
                placeholder="****"
                maxLength={10}
                autoComplete="off"
                required
              />
            </div>
            {loginError && <div className="cms-login-error">{loginError}</div>}
            <button type="submit" className="cms-login-button">Login</button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="cms-editor-container">
      {/* Header */}
      <div className="cms-editor-header">
        <div className="cms-header-left">
          <h2>Create New Post</h2>
          {showAutoSaveIndicator && (
            <div className="cms-autosave-indicator">
              <span className="cms-autosave-tick">✓</span>
              <span className="cms-autosave-text">Saved at {lastAutoSaveTime}</span>
            </div>
          )}
        </div>
        <div className="cms-header-controls">
          <button className="cms-save-button" onClick={handleSave} disabled={isSaving}>
            <Save size={16} />
            {isSaving ? 'Saving...' : 'Save'}
          </button>
          <button className="cms-preview-button" onClick={() => setShowPreview(!showPreview)}>
            {showPreview ? <EyeOff size={16} /> : <Eye size={16} />}
            {showPreview ? 'Edit' : 'Preview'}
          </button>
          <button className="cms-settings-button" onClick={() => setShowSettings(!showSettings)}>
            <Settings size={16} />
            Settings
          </button>
          <ThemeToggle />
          <button className="cms-logout-button" onClick={handleLogout}>Logout</button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="cms-settings-panel">
          <div className="cms-settings-header">
            <h3>Post Settings</h3>
            <button className="cms-settings-close" onClick={() => setShowSettings(false)}>&times;</button>
          </div>
          <div className="cms-settings-content">
            <div className="cms-setting-item">
              <label className="cms-toggle-label">
                <input
                  type="checkbox"
                  className="cms-toggle-input"
                  checked={postSettings.publishImmediately}
                  onChange={(e) => setPostSettings({ ...postSettings, publishImmediately: e.target.checked })}
                />
                <span className="cms-toggle-slider"></span>
                <span className="cms-toggle-text">Publish immediately</span>
              </label>
            </div>
            <div className="cms-setting-item">
              <label className="cms-toggle-label">
                <input
                  type="checkbox"
                  className="cms-toggle-input"
                  checked={postSettings.enableComments}
                  onChange={(e) => setPostSettings({ ...postSettings, enableComments: e.target.checked })}
                />
                <span className="cms-toggle-slider"></span>
                <span className="cms-toggle-text">Enable comments</span>
              </label>
            </div>
            <div className="cms-setting-item">
              <label className="cms-toggle-label">
                <input
                  type="checkbox"
                  className="cms-toggle-input"
                  checked={postSettings.featured}
                  onChange={(e) => setPostSettings({ ...postSettings, featured: e.target.checked })}
                />
                <span className="cms-toggle-slider"></span>
                <span className="cms-toggle-text">Featured post</span>
              </label>
            </div>
            <div className="cms-setting-item">
              <label className="cms-toggle-label">
                <input
                  type="checkbox"
                  className="cms-toggle-input"
                  checked={postSettings.sendNewsletter}
                  onChange={(e) => setPostSettings({ ...postSettings, sendNewsletter: e.target.checked })}
                />
                <span className="cms-toggle-slider"></span>
                <span className="cms-toggle-text">Send newsletter</span>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Status Message */}
      {submitStatus && (
        <div className={`cms-status-message ${submitStatus.type}`}>
          {submitStatus.message}
        </div>
      )}

      {showPreview ? (
        /* Preview Mode */
        <div className="cms-preview-overlay" onClick={() => setShowPreview(false)}>
          <div className="cms-preview-container" onClick={(e) => e.stopPropagation()}>
            <div className="cms-preview-header">
              <h3>Preview</h3>
              <button className="cms-preview-close" onClick={() => setShowPreview(false)}>&times;</button>
            </div>
            <div className="cms-preview-content">
              <article className="cms-preview-article">
                {imageUrl && <img src={imageUrl} alt={title} className="cms-preview-image" />}
                <div className="cms-preview-meta">
                  <span className="cms-preview-category">{category}</span>
                  <span className="cms-preview-date">{new Date().toLocaleDateString()}</span>
                  {postSettings.featured && <span className="cms-preview-featured">Featured</span>}
                </div>
                <h1 className="cms-preview-title">{title || 'Untitled Post'}</h1>
                {description && <p className="cms-preview-description">{description}</p>}
                <div
                  className="cms-preview-body"
                  dangerouslySetInnerHTML={{ __html: processContentForPreview(content) }}
                />
              </article>
            </div>
          </div>
        </div>
      ) : (
        /* Edit Mode */
        <form onSubmit={handleSubmit}>
          {/* Metadata */}
          <div className="cms-metadata-grid">
            <div className="cms-metadata-full">
              <input
                type="text"
                className="cms-editor-input cms-title-input"
                placeholder="Post Title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="cms-metadata-full">
              <textarea
                className="cms-editor-input"
                placeholder="Description (for SEO and previews)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
              />
            </div>
            <div className="cms-metadata-row">
              <div className="cms-image-input-container">
                <input
                  type="text"
                  className="cms-editor-input cms-image-url-input"
                  placeholder="Image URL"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                />
                <div className="cms-image-upload-section">
                  <input
                    type="file"
                    id="image-upload"
                    className="cms-file-input"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={isUploadingImage}
                  />
                  <label htmlFor="image-upload" className={`cms-upload-button ${isUploadingImage ? 'uploading' : ''}`}>
                    <span className="cms-upload-icon">📷</span>
                    <span className="cms-upload-text">{isUploadingImage ? 'Uploading...' : 'Upload'}</span>
                  </label>
                </div>
              </div>
              <select
                className="cms-editor-input cms-category-select"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="Life">Life</option>
                <option value="Work">Work</option>
                <option value="Travel">Travel</option>
                <option value="Technology">Technology</option>
                <option value="Experience">Experience</option>
                <option value="Motives">Motives</option>
              </select>
            </div>
          </div>

          {/* Editor with Custom Toolbar */}
          {mounted ? (
            <>
              <div id="toolbar">
                <span className="ql-formats">
                  <select className="ql-header" defaultValue="">
                    <option value="1">Heading 1</option>
                    <option value="2">Heading 2</option>
                    <option value="3">Heading 3</option>
                    <option value="">Normal</option>
                  </select>
                </span>
                <span className="ql-formats">
                  <button className="ql-bold" />
                  <button className="ql-italic" />
                  <button className="ql-underline" />
                  <button className="ql-strike" />
                </span>
                <span className="ql-formats">
                  <button className="ql-list" value="ordered" />
                  <button className="ql-list" value="bullet" />
                </span>
                <span className="ql-formats">
                  <button className="ql-blockquote" />
                  <button className="ql-code-block" />
                </span>
                <span className="ql-formats">
                  <button className="ql-link" />
                  <button className="ql-image" />
                </span>
                <span className="ql-formats">
                  <button className="cms-hr-button" type="button" onClick={insertHr} title="Insert Horizontal Rule">HR</button>
                  <button className="cms-toggle-button" type="button" onClick={insertToggle} title="Insert Toggle Block">▼+</button>
                  <button className="cms-end-toggle-button" type="button" onClick={insertEndToggle} title="End Toggle Block">/▼</button>
                </span>
                <span className="ql-formats">
                  <button className="ql-clean" />
                </span>
              </div>
              <div className="cms-editor-quill">
                <ReactQuill
                  forwardedRef={quillRef}
                  theme="snow"
                  value={content}
                  onChange={setContent}
                  modules={quillModules}
                  placeholder="Write your post content here..."
                />
              </div>
            </>
          ) : (
            <div className="quill-loading">Loading editor...</div>
          )}

          {/* Action Buttons */}
          <div className="cms-editor-buttons-row">
            <button
              type="button"
              className="cms-editor-button cms-editor-button-secondary"
              onClick={resetForm}
            >
              Clear All
            </button>
            <button
              type="submit"
              className="cms-editor-button"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Publishing...' : 'Publish Post'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
