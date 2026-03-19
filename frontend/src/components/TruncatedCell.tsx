import { useState, useRef } from 'react'

interface TruncatedCellProps {
  content: string
  maxWidth?: number
}

export default function TruncatedCell({
  content,
  maxWidth = 150
}: TruncatedCellProps) {
  const [showTooltip, setShowTooltip] = useState(false)
  const cellRef = useRef<HTMLTableCellElement>(null)

  // Truncate if content is long or has newlines
  const shouldTruncate = content.length > 30 || content.includes('\n')

  const handleMouseEnter = () => {
    if (shouldTruncate) setShowTooltip(true)
  }

  const handleMouseLeave = () => {
    setShowTooltip(false)
  }

  const getTooltipPosition = () => {
    if (!cellRef.current) return { top: 0, left: 0 }
    const rect = cellRef.current.getBoundingClientRect()
    return {
      top: rect.bottom + 4,
      left: rect.left
    }
  }

  return (
    <td
      ref={cellRef}
      style={{
        border: '1px solid var(--border-color)',
        padding: '0',
        maxWidth: maxWidth,
        width: maxWidth,
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div
        style={{
          maxWidth: maxWidth,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          padding: '6px 8px',
          boxSizing: 'border-box'
        }}
      >
        {content}
      </div>
      {showTooltip && (
        <div
          style={{
            position: 'fixed',
            top: getTooltipPosition().top,
            left: getTooltipPosition().left,
            padding: '8px 12px',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: '6px',
            maxWidth: '350px',
            maxHeight: '200px',
            overflow: 'auto',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            zIndex: 9999,
            boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
            fontSize: '12px',
            lineHeight: '1.4'
          }}
        >
          {content}
        </div>
      )}
    </td>
  )
}
