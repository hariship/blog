'use client'

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'

interface AdminContextType {
  isAdmin: boolean
  adminToken: string | null
  mounted: boolean
  logout: () => void
}

interface AdminProviderProps {
  children: ReactNode
}

const AdminContext = createContext<AdminContextType | undefined>(undefined)

export const AdminProvider: React.FC<AdminProviderProps> = ({ children }) => {
  const [isAdmin, setIsAdmin] = useState(false)
  const [adminToken, setAdminToken] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)

    const token = localStorage.getItem('adminToken')
    const expiry = localStorage.getItem('adminTokenExpiry')

    if (token && expiry && new Date(expiry) > new Date()) {
      setIsAdmin(true)
      setAdminToken(token)
    }
  }, [])

  const logout = () => {
    localStorage.removeItem('adminToken')
    localStorage.removeItem('adminTokenExpiry')
    setIsAdmin(false)
    setAdminToken(null)
  }

  const value: AdminContextType = {
    isAdmin,
    adminToken,
    mounted,
    logout,
  }

  return (
    <AdminContext.Provider value={value}>
      {children}
    </AdminContext.Provider>
  )
}

export const useAdmin = (): AdminContextType => {
  const context = useContext(AdminContext)
  if (context === undefined) {
    throw new Error('useAdmin must be used within an AdminProvider')
  }
  return context
}

export default AdminContext
