"use client"

import * as React from "react"

export type ToastProps = {
  id: string | number
  title?: React.ReactNode
  description?: React.ReactNode
  action?: React.ReactNode
  variant?: "default" | "destructive" // Remove 'success' variant as it's not supported
}

const TOAST_LIMIT = 5
const TOAST_REMOVE_DELAY = 1000

type ToasterToast = ToastProps

let count = 0

function genId() {
  count = (count + 1) % Number.MAX_VALUE
  return count.toString()
}

const toasts = new Map<string | number, ToasterToast>()

const listeners: Array<(toasts: Array<ToasterToast>) => void> = []

function emitChange() {
  listeners.forEach((listener) => {
    listener(Array.from(toasts.values()))
  })
}

export function toast(props: Omit<ToasterToast, "id">) {
  const id = genId()

  const toast = { id, ...props }
  toasts.set(id, toast)
  emitChange()

  return id
}

toast.dismiss = (toastId?: string | number) => {
  if (toastId) {
    toasts.delete(toastId)
    emitChange()
    return toastId
  }
  toasts.clear()
  emitChange()
  return null
}

export function useToast() {
  const [statefulToasts, setStatefulToasts] = React.useState<ToasterToast[]>(
    Array.from(toasts.values())
  )

  React.useEffect(() => {
    const handleChange = (newToasts: ToasterToast[]) => {
      setStatefulToasts(newToasts)
    }

    listeners.push(handleChange)
    return () => {
      const index = listeners.indexOf(handleChange)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }, [])

  return {
    toast,
    dismiss: toast.dismiss,
    toasts: statefulToasts,
  }
} 