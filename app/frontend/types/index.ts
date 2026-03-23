export interface User {
  email_address: string
}

export interface SharedProps {
  auth: {
    user: User | null
  }
}
