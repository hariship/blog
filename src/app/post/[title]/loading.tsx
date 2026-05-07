import AccessingOverlay from '@/components/AccessingOverlay'
import './Post.css'

export default function Loading() {
  return (
    <div className="post-container post-container-loading">
      <AccessingOverlay message="ACCESSING LOG ENTRY" />
    </div>
  )
}
