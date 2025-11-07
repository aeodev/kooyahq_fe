import { useMemo, useRef } from 'react'
import ReactQuill from 'react-quill-new'
import 'react-quill-new/dist/quill.snow.css'
import { cn } from '@/utils/cn'

type RichTextEditorProps = {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

export function RichTextEditor({ value, onChange, placeholder, className }: RichTextEditorProps) {
  const quillRef = useRef<ReactQuill>(null)

  const imageHandler = () => {
    const input = document.createElement('input')
    input.setAttribute('type', 'file')
    input.setAttribute('accept', 'image/*')
    input.click()

    input.onchange = async () => {
      const file = input.files?.[0]
      if (file) {
        const reader = new FileReader()
        reader.onload = () => {
          const imageUrl = reader.result as string
          const quill = quillRef.current?.getEditor()
          const range = quill?.getSelection()
          if (range) {
            quill?.insertEmbed(range.index, 'image', imageUrl)
          }
        }
        reader.readAsDataURL(file)
      }
    }
  }

  const modules = useMemo(
    () => ({
      toolbar: {
        container: [
          [{ header: [1, 2, 3, false] }],
          ['bold', 'italic', 'underline', 'strike'],
          [{ color: [] }, { background: [] }],
          [{ list: 'ordered' }, { list: 'bullet' }, { align: [] }],
          ['blockquote', 'code-block', 'image', 'clean'],
        ],
        handlers: {
          image: imageHandler,
        },
      },
    }),
    []
  )

  const formats = [
    'header',
    'bold',
    'italic',
    'underline',
    'strike',
    'color',
    'background',
    'list',
    'align',
    'blockquote',
    'code-block',
    'image',
  ]

  return (
    <div className={cn('border rounded-lg overflow-hidden w-full max-w-full', className)}>
      <ReactQuill
        ref={quillRef}
        theme="snow"
        value={value}
        onChange={onChange}
        modules={modules}
        formats={formats}
        placeholder={placeholder || 'Start typing...'}
        className="rich-text-editor"
      />
      <style>{`
        .rich-text-editor {
          width: 100%;
          max-width: 100%;
        }
        .rich-text-editor .ql-container {
          min-height: 150px;
          font-size: 0.875rem;
          width: 100%;
          max-width: 100%;
        }
        .rich-text-editor .ql-editor {
          min-height: 150px;
          width: 100%;
          max-width: 100%;
          word-wrap: break-word;
          overflow-wrap: break-word;
          word-break: break-word;
        }
        .rich-text-editor .ql-editor.ql-blank::before {
          color: hsl(var(--muted-foreground));
        }
        .rich-text-editor .ql-toolbar {
          border-top: none;
          border-left: none;
          border-right: none;
          border-bottom: 1px solid hsl(var(--border));
          background: hsl(var(--muted) / 0.5);
          padding: 0.5rem;
          display: flex;
          flex-wrap: nowrap;
          overflow-x: auto;
          width: 100%;
          max-width: 100%;
        }
        .rich-text-editor .ql-toolbar .ql-formats {
          margin-right: 0.5rem;
          display: inline-flex;
          align-items: center;
        }
        .rich-text-editor .ql-container {
          border: none;
          width: 100%;
          max-width: 100%;
          overflow-x: hidden;
        }
        .rich-text-editor .ql-editor {
          padding: 0.75rem;
          width: 100%;
          max-width: 100%;
          overflow-x: hidden;
          box-sizing: border-box;
        }
        .rich-text-editor .ql-editor * {
          max-width: 100%;
          word-wrap: break-word;
          overflow-wrap: break-word;
        }
        .rich-text-editor .ql-editor img {
          max-width: 100%;
          height: auto;
        }
        .rich-text-editor .ql-stroke {
          stroke: hsl(var(--foreground));
        }
        .rich-text-editor .ql-fill {
          fill: hsl(var(--foreground));
        }
        .rich-text-editor .ql-picker-label {
          color: hsl(var(--foreground));
        }
        .rich-text-editor .ql-picker-options {
          background: hsl(var(--popover));
          border: 1px solid hsl(var(--border));
          border-radius: 0.375rem;
        }
        .rich-text-editor .ql-picker-item {
          color: hsl(var(--foreground));
        }
        .rich-text-editor .ql-picker-item:hover {
          background: hsl(var(--accent));
        }
      `}</style>
    </div>
  )
}