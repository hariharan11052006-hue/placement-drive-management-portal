import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import api from '../services/api'

const NotificationContext = createContext()

export const useNotifications = () => useContext(NotificationContext)

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)

  const fetchNotifications = useCallback(async () => {
    try {
      if (!localStorage.getItem('token')) {
        setNotifications([])
        setUnreadCount(0)
        return
      }
      const res = await api.get('/notifications')
      const list = Array.isArray(res.data) ? res.data : []
      setNotifications(list)
      setUnreadCount(list.filter(n => !n.read).length)
    } catch (err) {
      // Keep previous state; 401 is handled globally by api interceptor
    }
  }, [])

  useEffect(() => {
    fetchNotifications()
    const t = setInterval(fetchNotifications, 60000)
    return () => clearInterval(t)
  }, [fetchNotifications])

  const markAsRead = async (id) => {
    setNotifications(prev => prev.map(n => String(n.id) === String(id) ? { ...n, read: true } : n))
    setUnreadCount(prev => Math.max(0, prev - 1))
    try {
      await api.put(`/notifications/${id}/read`)
    } catch (err) {
      fetchNotifications()
    }
  }

  const markAllAsRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    setUnreadCount(0)
    try {
      await api.put('/notifications/read-all')
    } catch (err) {
      fetchNotifications()
    }
  }

  const addNotification = (notification) => {
    setNotifications(prev => [notification, ...prev])
    setUnreadCount(prev => prev + 1)
  }

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, markAsRead, markAllAsRead, addNotification, fetchNotifications }}>
      {children}
    </NotificationContext.Provider>
  )
}
