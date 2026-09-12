'use client'

import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import React from 'react'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  /** Read out with the title by screen readers; keep it to one sentence. */
  description?: string
  children: React.ReactNode
  footer?: React.ReactNode
}

/**
 * Built on Radix Dialog rather than a bare fixed div: that brings the focus
 * trap, Escape handling, scroll locking, `role="dialog"`, `aria-modal` and the
 * title/description wiring, none of which the previous hand-rolled version had.
 */
export function Modal({ isOpen, onClose, title, description, children, footer }: ModalProps) {
  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-gray-900/50" />
        <Dialog.Content
          // Radix sets aria-describedby from its own Description, then spreads
          // our props over it. So: when there is no description, pass the key
          // explicitly as undefined to clear the dangling reference and silence
          // the dev warning; when there is one, pass nothing and let Radix's id
          // stand. A filler sr-only Description would instead get the title
          // announced twice.
          {...(description ? {} : { 'aria-describedby': undefined })}
          className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg bg-white shadow-xl focus:outline-none"
        >
          <div className="flex items-start justify-between gap-4 border-b border-gray-200 px-6 py-4">
            <div>
              <Dialog.Title className="text-lg font-semibold text-gray-900">{title}</Dialog.Title>
              {description ? (
                <Dialog.Description className="mt-1 text-sm text-gray-600">
                  {description}
                </Dialog.Description>
              ) : null}
            </div>
            <Dialog.Close
              className="rounded p-1 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              aria-label="Close dialog"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </Dialog.Close>
          </div>

          <div className="px-6 py-4">{children}</div>

          {footer ? (
            <div className="flex justify-end gap-3 border-t border-gray-200 px-6 py-4">{footer}</div>
          ) : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
