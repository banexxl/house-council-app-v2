import React, { forwardRef, useImperativeHandle, useEffect } from 'react'
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
          ['link', 'image'],
          ['clean'],
        ],
      },
      placeholder: placeholder || 'Start typing...',
    })

    useImperativeHandle(ref, () => ({
      getEditor: () => quill,
      getContents: () => quill?.root.innerHTML || '',
    }))

    useEffect(() => {
      if (quill) {
        quill.on('text-change', () => {
          onChange && onChange(quill.root.innerHTML)
        })

        quill.root.addEventListener('blur', () => {
          onBlur && onBlur()
        })

        return () => {
          quill.off('text-change')
          quill.root.removeEventListener('blur', onBlur as EventListener)
        }
      }
    }, [quill, onChange, onBlur])

    useEffect(() => {
      if (quill && value !== undefined && value !== quill.root.innerHTML) {
        quill.root.innerHTML = value
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

