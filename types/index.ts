export interface User {
  id: string
  email: string
  name?: string
  image?: string
  accessToken?: string
  refreshToken?: string
}

export interface EmailSender {
  id: string
  email: string
  name: string
  emailCount: number
  lastReceivedDate: Date
  unsubscribeUrl?: string
  hasListUnsubscribe: boolean
}

export interface Email {
  id: string
  sender: string
  senderName: string
  subject: string
  timestamp: Date
  labels: string[]
  unsubscribeUrl?: string
  hasListUnsubscribe: boolean
}

export interface CleanupAction {
  senderId: string
  action: 'trash' | 'archive'
  emailIds: string[]
  timestamp: Date
}

export interface UnsubscribeAction {
  senderId: string
  timestamp: Date
  success: boolean
  error?: string
}

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email: string
      name?: string
      image?: string
    }
    accessToken?: string
    refreshToken?: string
    expiresAt?: number
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    accessToken?: string
    refreshToken?: string
    expiresAt?: number
  }
}
