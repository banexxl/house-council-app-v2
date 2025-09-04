import React, { forwardRef, useImperativeHandle, useEffect, useRef } from 'react'
import { useQuill } from 'react-quilljs'
import 'quill/dist/quill.snow.css'
import Box from '@mui/material/Box'

interface QuillEditorProps {
  placeholder?: string
  onChange?: (value: string) => void
  onBlur?: () => void
  value?: string
}

export interface QuillEditorRef {
  getEditor: () => any
  getContents: () => string
}

// Removed StyledQuillWrapper; using Box with sx instead.

const QuillEditor = forwardRef<QuillEditorRef, QuillEditorProps>(
  ({ placeholder, onChange, onBlur, value }, ref) => {
    const { quill, quillRef } = useQuill({
      modules: {
        toolbar: [
          ['bold', 'italic', 'underline', 'strike'],
          [{ list: 'ordered' }, { list: 'bullet' }],
          ['link'],
          ['clean'],
        ],
      },
      placeholder: placeholder || 'Start typing...',
    })

    useImperativeHandle(ref, () => ({
      getEditor: () => quill,
      getContents: () => quill?.root.innerHTML || '',
    }))

    const currentValueRef = useRef<string | undefined>(value)
    const textChangeHandlerRef = useRef<(() => void) | null>(null)
    const blurHandlerRef = useRef<(() => void) | null>(null)

    // Attach handlers once quill is ready
    useEffect(() => {
      if (!quill) return

      const handleTextChange = () => {
        if (!quill) return
        const html = quill.root.innerHTML
        // Only propagate if different from last known external value to avoid loops
        if (html !== currentValueRef.current) {
          currentValueRef.current = html
          onChange && onChange(html)
        }
      }
      const handleBlur = () => {
        onBlur && onBlur()
      }
      textChangeHandlerRef.current = handleTextChange
      blurHandlerRef.current = handleBlur
      quill.on('text-change', handleTextChange)
      quill.root.addEventListener('blur', handleBlur)

      return () => {
        if (textChangeHandlerRef.current) {
          quill.off('text-change', textChangeHandlerRef.current)
        }
        if (blurHandlerRef.current) {
          quill.root.removeEventListener('blur', blurHandlerRef.current as EventListener)
        }
      }
    }, [quill, onChange, onBlur])

    // Sync external value into editor when it changes (and is different)
    useEffect(() => {
      if (!quill) return
      if (value !== undefined && value !== currentValueRef.current) {
        // Update editor only if content truly differs
        if (quill.root.innerHTML !== value) {
          quill.root.innerHTML = value
        }
        currentValueRef.current = value
      }
    }, [quill, value])

    return (
      <Box
        sx={(theme) => ({
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 2,
          display: 'flex',
          flexDirection: 'column',
          '& .quill': {
            display: 'flex',
            flexDirection: 'column',
            flexGrow: 1,
            minHeight: 0,
          },
          '& .ql-toolbar.ql-snow': {
            border: '1px solid',
            borderBottom: `1px solid ${theme.palette.divider}`,
            borderRadius: `${theme.shape.borderRadius}px ${theme.shape.borderRadius}px 0 0`,
            backgroundColor: theme.palette.background.paper,
          },
          '& .ql-container.ql-snow': {
            border: '1px solid',
            flexGrow: 1,
            display: 'flex',
            flexDirection: 'column',
          },
          '& .ql-editor': {
            fontFamily: theme.typography.fontFamily,
            fontSize: theme.typography.body1.fontSize,
            color: theme.palette.text.primary,
            // Approximate 5 text rows minimum height
            minHeight: `calc(${typeof theme.typography.body1.lineHeight === 'number' ? theme.typography.body1.lineHeight * 7 + 'em' : '5 * 1.5em'})`,
            paddingBottom: theme.spacing(2),
            '&.ql-blank::before': {
              color: theme.palette.text.secondary,
              fontStyle: 'normal',
            },
          },
        })}
      >
        <div ref={quillRef} />
      </Box>
    )
  }
)

QuillEditor.displayName = 'QuillEditor'

export default QuillEditor

