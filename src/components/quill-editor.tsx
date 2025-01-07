import React, { forwardRef, useImperativeHandle, useEffect } from 'react'
import { useQuill } from 'react-quilljs'
import 'quill/dist/quill.snow.css'
import { styled } from '@mui/material/styles'

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

const StyledQuillWrapper = styled('div')(({ theme }) => ({
  '& .quill': {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
  },
  '& .ql-toolbar.ql-snow': {
    border: 'none',
    borderBottom: `1px solid ${theme.palette.divider}`,
  },
  '& .ql-container.ql-snow': {
    border: 'none',
    flexGrow: 1,
  },
  '& .ql-editor': {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.body1.fontSize,
    color: theme.palette.text.primary,
    '&.ql-blank::before': {
      color: theme.palette.text.secondary,
      fontStyle: 'normal',
    },
  },
}))

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
      <StyledQuillWrapper>
        <div ref={quillRef} />
      </StyledQuillWrapper>
    )
  }
)

QuillEditor.displayName = 'QuillEditor'

export default QuillEditor

