'use client'

import React, { Suspense, useState, useRef, useEffect, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { useSearchParams } from 'next/navigation'
import { Eye, EyeOff, Settings, Save, ImagePlus } from 'lucide-react'
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
    loading: () => null
  }
)

interface PostSettings {
  publishImmediately: boolean
  enableComments: boolean
  featured: boolean
  sendNewsletter: boolean
  publishToInkHouse: boolean
}

interface SubmitStatus {
  type: 'success' | 'error'
  message: string
}

export default function CMSPostEditor() {
  return (
    <Suspense fallback={null}>
      <CMSPostEditorInner />
    </Suspense>
  )
}

function CMSPostEditorInner() {
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
    publishToInkHouse: false,
  })
  const [isSaving, setIsSaving] = useState<boolean>(false)
  const [showAutoSaveIndicator, setShowAutoSaveIndicator] = useState<boolean>(false)
  const [lastAutoSaveTime, setLastAutoSaveTime] = useState<string>('')
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false)
  const [loginPin, setLoginPin] = useState<string>('')
  const [loginError, setLoginError] = useState<string>('')
  const [mounted, setMounted] = useState(false)
  const [editingPostId, setEditingPostId] = useState<number | null>(null)
  const [inkHouseError, setInkHouseError] = useState<string | null>(null)
  const [isRetryingInkHouse, setIsRetryingInkHouse] = useState<boolean>(false)
  const [showMeta, setShowMeta] = useState<boolean>(false)
  const [watermarkDate, setWatermarkDate] = useState<string>('')
  const [lastSubmittedPost, setLastSubmittedPost] = useState<{
    postId: number
    title: string
    content: string
    description: string
    category: string
    publishImmediately: boolean
    image_url: string
  } | null>(null)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const quillRef = useRef<any>(null)
  const searchParams = useSearchParams()

  // Check authentication and set mounted state
  useEffect(() => {
    const token = localStorage.getItem('adminToken')
    if (token) {
      setIsAuthenticated(true)
    }

    // Load Quill CSS dynamically
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = 'https://cdn.jsdelivr.net/npm/quill@2.0.2/dist/quill.snow.css'
    document.head.appendChild(link)

    setMounted(true)
    return () => {
      document.head.removeChild(link)
    }
  }, [])

  // Load draft or edit post from localStorage on mount
  useEffect(() => {
    if (!isAuthenticated) return

    // Check if we're in edit mode
    const editId = searchParams.get('edit')
    if (editId) {
      const editData = localStorage.getItem('cms-edit-post')
      if (editData) {
        try {
          const post = JSON.parse(editData)
          setEditingPostId(post.id)
          setTitle(post.title || '')
          setDescription(post.description || '')
          setImageUrl(post.image_url || post.enclosure || '')
          setContent(post.content || '')
          setCategory(post.category || 'Life')
          setSubmitStatus({ type: 'success', message: 'Post loaded for editing' })
          setTimeout(() => setSubmitStatus(null), 3000)
          return
        } catch (error) {
          console.error('Failed to load edit post:', error)
        }
      }
    }

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
            publishToInkHouse: draft.publishToInkHouse ?? false,
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // Word count derived from content
  const wordCount = content
    ? content.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim().split(/\s+/).filter(Boolean).length
    : 0

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
    setIsAuthenticated(false)
  }

  const compressImage = (
    file: File,
    maxSizeKB: number = 300,
    borderPx: number = 0,
    watermarkText: string = ''
  ): Promise<File> => {
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

          if (ctx) {
            // White border
            if (borderPx > 0) {
              ctx.strokeStyle = '#ffffff'
              ctx.lineWidth = borderPx * 2
              ctx.strokeRect(0, 0, width, height)
            }

            // Watermark text bottom-right
            if (watermarkText) {
              const fontSize = Math.max(12, Math.round(width * 0.025))
              ctx.font = `${fontSize}px sans-serif`
              ctx.fillStyle = 'rgba(255,255,255,0.75)'
              ctx.textAlign = 'right'
              ctx.textBaseline = 'bottom'
              const padding = borderPx + Math.round(fontSize * 0.5)
              ctx.fillText(watermarkText, width - padding, height - padding)
            }
          }

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
      const compressedFile = await compressImage(file, 300, 12, watermarkDate)
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
    setInkHouseError(null)
    setLastSubmittedPost(null)
    setEditingPostId(null)
    localStorage.removeItem('cms-draft')
    localStorage.removeItem('cms-edit-post')
  }

  const publishToInkHouse = async (postData: {
    postId: number
    title: string
    content: string
    description: string
    category: string
    publishImmediately: boolean
    image_url: string
  }): Promise<{ success: boolean; error?: string }> => {
    try {
      const token = localStorage.getItem('adminToken')
      const response = await fetch('/api/admin/inkhouse', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          postId: postData.postId,
          title: postData.title,
          content: postData.content,
          description: postData.description,
          category: postData.category,
          status: postData.publishImmediately ? 'published' : 'draft',
          image_url: postData.image_url
        })
      })

      const data = await response.json()

      if (!response.ok) {
        return { success: false, error: data.error || data.details || 'Unknown error' }
      }

      return { success: true }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Network error'
      return { success: false, error: errorMessage }
    }
  }

  const handleRetryInkHouse = async () => {
    if (!lastSubmittedPost) return

    setIsRetryingInkHouse(true)
    setInkHouseError(null)

    const result = await publishToInkHouse(lastSubmittedPost)

    if (result.success) {
      setSubmitStatus({ type: 'success', message: 'Successfully published to InkHouse!' })
      setLastSubmittedPost(null)
      setInkHouseError(null)
      resetForm()
    } else {
      setInkHouseError(result.error || 'Failed to publish to InkHouse')
      setSubmitStatus({ type: 'error', message: `InkHouse publish failed: ${result.error}` })
    }

    setIsRetryingInkHouse(false)
  }

  const handleSubmit = async () => {
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
    setInkHouseError(null)

    // Replace &nbsp; with regular spaces for proper word wrapping
    const cleanedContent = content.replace(/&nbsp;/g, ' ').trim()

    const postData = {
      ...(editingPostId ? { id: editingPostId } : {}),
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

      if (response.status === 401) {
        handleLogout()
        return
      }

      if (response.ok) {
        let successMessage = editingPostId ? 'Post updated successfully!' : 'Post created successfully!'

        // If InkHouse toggle is on, attempt to publish there too
        if (postSettings.publishToInkHouse && data.id) {
          const inkHouseData = {
            postId: data.id,
            title: title.trim(),
            content: cleanedContent,
            description: description.trim(),
            category,
            publishImmediately: postSettings.publishImmediately,
            image_url: imageUrl.trim()
          }

          const inkHouseResult = await publishToInkHouse(inkHouseData)

          if (inkHouseResult.success) {
            successMessage = 'Post created and published to InkHouse!'
            resetForm()
          } else {
            // Store post data for retry
            setLastSubmittedPost(inkHouseData)
            setInkHouseError(inkHouseResult.error || 'Unknown error')
            successMessage = 'Post created, but InkHouse publish failed. You can retry below.'
          }
        } else {
          resetForm()
        }

        setSubmitStatus({ type: 'success', message: successMessage })
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

  const quillModules = useMemo(() => ({
    toolbar: {
      container: '#toolbar-focus'
    }
  }), [])

  const insertHr = () => {
    if (quillRef.current) {
      const editor = quillRef.current.getEditor()
      editor.focus()
      const range = editor.getSelection()
      if (range) {
        editor.insertEmbed(range.index, 'hr', true, 'user')
        editor.setSelection(range.index + 1, 0)
      }
    }
  }

  const insertToggle = () => {
    if (quillRef.current) {
      const editor = quillRef.current.getEditor()
      editor.focus()
      const range = editor.getSelection()
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
      editor.focus()
      const range = editor.getSelection()
      if (range) {
        editor.insertText(range.index, '\n[END TOGGLE]\n\n', { bold: true })
        editor.setSelection(range.index + 14, 0)
      }
    }
  }

  if (!mounted) {
    return null
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
    <div className="cms-focus-mode">
      {/* Header bar */}
      <div className="cms-focus-header">
        <div className="cms-focus-header-left">
          {showAutoSaveIndicator && (
            <span className="cms-focus-autosave">
              <span className="cms-autosave-tick">✓</span> Saved {lastAutoSaveTime}
            </span>
          )}
          {submitStatus && (
            <span className={`cms-focus-status ${submitStatus.type}`}>
              {submitStatus.message}
            </span>
          )}
        </div>
        <div className="cms-focus-header-right">
          <span className="cms-focus-wordcount">{wordCount} {wordCount === 1 ? 'word' : 'words'}</span>
          <button type="button" className="cms-focus-btn" onClick={handleSave} disabled={isSaving} title="Save draft">
            <Save size={15} />
          </button>
          <button type="button" className="cms-focus-btn" onClick={() => setShowPreview(!showPreview)} title="Preview">
            {showPreview ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
          <button type="button" className="cms-focus-btn" onClick={() => setShowSettings(!showSettings)} title="Settings">
            <Settings size={15} />
          </button>
          <ThemeToggle />
          <button
            type="button"
            className="cms-focus-publish"
            disabled={isSubmitting}
            onClick={handleSubmit}
          >
            {isSubmitting ? (editingPostId ? 'Updating...' : 'Publishing...') : (editingPostId ? 'Update' : 'Publish')}
          </button>
          <button type="button" className="cms-focus-logout" onClick={handleLogout}>Logout</button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="cms-focus-settings">
          <div className="cms-focus-settings-inner">
            <div className="cms-setting-item">
              <label className="cms-toggle-label">
                <input type="checkbox" className="cms-toggle-input" checked={postSettings.publishImmediately} onChange={(e) => setPostSettings({ ...postSettings, publishImmediately: e.target.checked })} />
                <span className="cms-toggle-slider"></span>
                <span className="cms-toggle-text">Publish immediately</span>
              </label>
            </div>
            <div className="cms-setting-item">
              <label className="cms-toggle-label">
                <input type="checkbox" className="cms-toggle-input" checked={postSettings.enableComments} onChange={(e) => setPostSettings({ ...postSettings, enableComments: e.target.checked })} />
                <span className="cms-toggle-slider"></span>
                <span className="cms-toggle-text">Enable comments</span>
              </label>
            </div>
            <div className="cms-setting-item">
              <label className="cms-toggle-label">
                <input type="checkbox" className="cms-toggle-input" checked={postSettings.featured} onChange={(e) => setPostSettings({ ...postSettings, featured: e.target.checked })} />
                <span className="cms-toggle-slider"></span>
                <span className="cms-toggle-text">Featured post</span>
              </label>
            </div>
            <div className="cms-setting-item">
              <label className="cms-toggle-label">
                <input type="checkbox" className="cms-toggle-input" checked={postSettings.sendNewsletter} onChange={(e) => setPostSettings({ ...postSettings, sendNewsletter: e.target.checked })} />
                <span className="cms-toggle-slider"></span>
                <span className="cms-toggle-text">Send newsletter</span>
              </label>
            </div>
            <div className="cms-setting-item">
              <label className="cms-toggle-label">
                <input type="checkbox" className="cms-toggle-input" checked={postSettings.publishToInkHouse} onChange={(e) => setPostSettings({ ...postSettings, publishToInkHouse: e.target.checked })} />
                <span className="cms-toggle-slider"></span>
                <span className="cms-toggle-text">Publish to InkHouse</span>
              </label>
            </div>
            <div className="cms-setting-item">
              <button type="button" className="cms-focus-clear" onClick={resetForm}>Clear All</button>
            </div>
          </div>
        </div>
      )}

      {/* InkHouse Error */}
      {inkHouseError && lastSubmittedPost && (
        <div className="cms-inkhouse-error">
          <div className="cms-inkhouse-error-message">
            <span className="cms-inkhouse-error-icon">!</span>
            <span>InkHouse publish failed: {inkHouseError}</span>
          </div>
          <button type="button" className="cms-inkhouse-retry-button" onClick={handleRetryInkHouse} disabled={isRetryingInkHouse}>
            {isRetryingInkHouse ? 'Retrying...' : 'Retry InkHouse'}
          </button>
        </div>
      )}

      {/* Preview Overlay */}
      {showPreview && (
        <div className="cms-preview-overlay" onClick={() => setShowPreview(false)}>
          <div className="cms-preview-container" onClick={(e) => e.stopPropagation()}>
            <div className="cms-preview-header">
              <h3>Preview</h3>
              <button type="button" className="cms-preview-close" onClick={() => setShowPreview(false)}>&times;</button>
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
                <div className="cms-preview-body" dangerouslySetInnerHTML={{ __html: processContentForPreview(content) }} />
              </article>
            </div>
          </div>
        </div>
      )}

      {/* Writing area */}
      <div className="cms-focus-body">
        <input
          type="text"
          className="cms-focus-title"
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <button
          type="button"
          className="cms-focus-meta-toggle"
          onClick={() => setShowMeta(!showMeta)}
        >
          <span className="cms-focus-meta-summary">
            {category}
            {description ? ` · ${description.slice(0, 50)}${description.length > 50 ? '...' : ''}` : ''}
            {imageUrl ? ' · 🖼' : ''}
          </span>
          <span className="cms-focus-meta-arrow">{showMeta ? '▲' : '▼'}</span>
        </button>

        {showMeta && (
          <div className="cms-focus-meta">
            <textarea
              className="cms-focus-description"
              placeholder="Description (for SEO and previews)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
            <div className="cms-focus-meta-row">
              <select
                className="cms-focus-category"
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
              <div className="cms-focus-image-upload">
                <input
                  type="text"
                  className="cms-focus-image-url"
                  placeholder="Image URL"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                />
                <input
                  type="file"
                  id="focus-image-upload"
                  className="cms-focus-file-input"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={isUploadingImage}
                />
                <label htmlFor="focus-image-upload" className="cms-focus-upload-label">
                  <ImagePlus size={14} />
                  {isUploadingImage ? 'Uploading...' : 'Upload'}
                </label>
                <input
                  type="text"
                  className="cms-focus-watermark-date"
                  placeholder="22 Feb 2026"
                  value={watermarkDate}
                  onChange={(e) => setWatermarkDate(e.target.value)}
                />
              </div>
            </div>
            {imageUrl && (
              <div className="cms-focus-image-preview">
                <img src={imageUrl} alt="Feature" />
                <button type="button" onClick={() => setImageUrl('')} className="cms-focus-image-remove">&times;</button>
              </div>
            )}
          </div>
        )}

        {/* Toolbar + Editor */}
        {mounted ? (
          <>
            <div id="toolbar-focus">
              <span className="ql-formats">
                <button type="button" className="ql-header" value="1">H1</button>
                <button type="button" className="ql-header" value="2">H2</button>
                <button type="button" className="ql-header" value="3">H3</button>
                <button type="button" className="cms-header-normal" onClick={() => { if (quillRef.current) { const editor = quillRef.current.getEditor(); editor.format('header', false); } }}>P</button>
              </span>
              <span className="ql-formats">
                <button type="button" className="ql-bold" />
                <button type="button" className="ql-italic" />
                <button type="button" className="ql-underline" />
                <button type="button" className="ql-strike" />
              </span>
              <span className="ql-formats">
                <button type="button" className="ql-list" value="ordered" />
                <button type="button" className="ql-list" value="bullet" />
              </span>
              <span className="ql-formats">
                <button type="button" className="ql-blockquote" />
                <button type="button" className="ql-code-block" />
              </span>
              <span className="ql-formats">
                <button type="button" className="ql-link" />
                <button type="button" className="ql-image" />
              </span>
              <span className="ql-formats">
                <button className="cms-hr-button" type="button" onClick={insertHr} title="Insert Horizontal Rule">HR</button>
                <button className="cms-toggle-button" type="button" onClick={insertToggle} title="Insert Toggle Block">▼+</button>
                <button className="cms-end-toggle-button" type="button" onClick={insertEndToggle} title="End Toggle Block">/▼</button>
              </span>
              <span className="ql-formats">
                <button type="button" className="ql-clean" />
              </span>
            </div>
            <div className="cms-focus-editor">
              <ReactQuill
                forwardedRef={quillRef}
                theme="snow"
                value={content}
                onChange={setContent}
                modules={quillModules}
                placeholder="Start writing..."
              />
            </div>
          </>
        ) : (
          <div className="quill-loading">Loading editor...</div>
        )}
      </div>
    </div>
  )
}
