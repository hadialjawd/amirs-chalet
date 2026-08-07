import { useState, useEffect } from 'react'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'
import {
  Calendar, CalendarDays, Users, DollarSign, TrendingUp, LogOut, Plus, Edit2, Trash2, X, Check,
  Wrench, Zap, Sparkles, Waves, Package, MoreHorizontal, Mail, ArrowRight, Loader2,
  Download, FileSpreadsheet, Image, Phone, Receipt, Lock, Share2, CheckCircle, Clock, AlertTriangle, Bell, BellOff,
  ChevronLeft, ChevronRight, ArrowUpDown
} from 'lucide-react'
import * as db from './db'

const STORAGE_KEYS = {
  AUTH: 'amirs-chalet-auth'
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  return Uint8Array.from([...rawData].map(char => char.charCodeAt(0)))
}

const EXPENSE_CATEGORIES = [
  { id: 'maintenance', label: 'Maintenance', icon: Wrench },
  { id: 'utilities', label: 'Utilities', icon: Zap },
  { id: 'cleaning', label: 'Cleaning', icon: Sparkles },
  { id: 'pool', label: 'Pool Maintenance', icon: Waves },
  { id: 'supplies', label: 'Supplies', icon: Package },
  { id: 'other', label: 'Other', icon: MoreHorizontal }
]

// Inline (base64) so it always renders in dynamically-written popup windows, regardless of base-URL resolution
const LOGO_DATA_URI = "data:image/png;base64,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"

function App() {
  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [userEmail, setUserEmail] = useState('')
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [authError, setAuthError] = useState('')
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')

  // App state
  const [activeTab, setActiveTab] = useState('reservations')
  const [reservations, setReservations] = useState([])
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)
  const [reservationFilter, setReservationFilter] = useState('all')
  const [reservationSort, setReservationSort] = useState('asc')
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const d = new Date()
    d.setDate(1)
    d.setHours(0, 0, 0, 0)
    return d
  })
  const [confirmDialog, setConfirmDialog] = useState(null)
  const [pushSubscribed, setPushSubscribed] = useState(false)
  const [pushBusy, setPushBusy] = useState(false)
  const [depositPercent, setDepositPercent] = useState(50)
  const [depositPercentInput, setDepositPercentInput] = useState('50')
  const [savingDepositPercent, setSavingDepositPercent] = useState(false)
  const [paymentCheck, setPaymentCheck] = useState(null)
  const [pendingPaymentCheck, setPendingPaymentCheck] = useState(null)

  // Form state
  const [showReservationForm, setShowReservationForm] = useState(false)
  const [showExpenseForm, setShowExpenseForm] = useState(false)
  const [editingReservation, setEditingReservation] = useState(null)
  const [editingExpense, setEditingExpense] = useState(null)

  // Reservation form
  const [reservationForm, setReservationForm] = useState({
    guestName: '',
    guestPhone: '',
    checkIn: '',
    checkOut: '',
    guests: 1,
    pricePerNight: '',
    depositPaid: false,
    depositAmount: ''
  })
  const [depositAuto, setDepositAuto] = useState(true)

  // Expense form
  const [expenseForm, setExpenseForm] = useState({
    description: '',
    amount: '',
    date: '',
    category: 'maintenance'
  })

  // Restore session on mount — a stored token isn't proof it's still valid, but if it's
  // stale/expired the first API call below will 401 and the listener further down logs out
  useEffect(() => {
    const auth = localStorage.getItem(STORAGE_KEYS.AUTH)
    if (auth && db.hasSession()) {
      const { email } = JSON.parse(auth)
      setIsAuthenticated(true)
      setUserEmail(email)
    }
  }, [])

  // If any API call comes back 401 (expired/invalid session), drop back to the login screen
  useEffect(() => {
    const onUnauthorized = () => {
      localStorage.removeItem(STORAGE_KEYS.AUTH)
      setIsAuthenticated(false)
      setUserEmail('')
    }
    window.addEventListener('amirs-chalet:unauthorized', onUnauthorized)
    return () => window.removeEventListener('amirs-chalet:unauthorized', onUnauthorized)
  }, [])

  // Load data from the API when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      loadData()
    }
  }, [isAuthenticated])

  // Pick up a ?depositCheck=<id>&checkType=deposit|fullPayment deep link from a notification tap (cold app launch)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const id = params.get('depositCheck')
    if (id) {
      setPendingPaymentCheck({ id: Number(id), checkType: params.get('checkType') === 'fullPayment' ? 'fullPayment' : 'deposit' })
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

  // Same, but for when the app is already open and the notification is tapped
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    const onMessage = (event) => {
      if (event.data?.type === 'DEPOSIT_CHECK' && event.data.reservationId) {
        setPendingPaymentCheck({ id: Number(event.data.reservationId), checkType: event.data.checkType === 'fullPayment' ? 'fullPayment' : 'deposit' })
      }
    }
    navigator.serviceWorker.addEventListener('message', onMessage)
    return () => navigator.serviceWorker.removeEventListener('message', onMessage)
  }, [])

  // Once reservations are loaded, resolve a pending deep link into the actual popup
  useEffect(() => {
    if (!pendingPaymentCheck || reservations.length === 0) return
    const reservation = reservations.find(r => r.id === pendingPaymentCheck.id)
    if (reservation) {
      setPaymentCheck({ reservation, checkType: pendingPaymentCheck.checkType })
    }
    setPendingPaymentCheck(null)
  }, [pendingPaymentCheck, reservations])

  // Check current push subscription status
  useEffect(() => {
    if (!isAuthenticated) return
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return

    navigator.serviceWorker.register('/sw.js')
      .then(registration => registration.pushManager.getSubscription())
      .then(subscription => setPushSubscribed(!!subscription))
      .catch(error => console.error('Error checking push subscription:', error))
  }, [isAuthenticated, userEmail])

  const handleTogglePush = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      showToast('Push notifications are not supported on this browser.')
      return
    }

    setPushBusy(true)
    try {
      const registration = await navigator.serviceWorker.register('/sw.js')

      if (pushSubscribed) {
        const subscription = await registration.pushManager.getSubscription()
        if (subscription) {
          await db.deletePushSubscription(subscription.endpoint)
          await subscription.unsubscribe()
        }
        setPushSubscribed(false)
        showToast('Notifications turned off.', 'success')
        return
      }

      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        showToast('Notification permission was denied.')
        return
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(import.meta.env.VITE_VAPID_PUBLIC_KEY)
      })

      await db.savePushSubscription(userEmail, subscription.toJSON())
      setPushSubscribed(true)
      showToast('Notifications enabled! You\'ll get alerts for upcoming check-ins/outs and unpaid deposits.', 'success')
    } catch (error) {
      console.error('Error toggling push notifications:', error)
      showToast('Failed to enable notifications. Please try again.')
    } finally {
      setPushBusy(false)
    }
  }

  const loadData = async () => {
    setLoading(true)
    try {
      const [{ reservations: reservationsData, calendarSync }, expensesData, depositPercentSetting] = await Promise.all([
        db.getReservations(),
        db.getExpenses(),
        db.getSetting('deposit_percent', '50')
      ])
      setReservations(reservationsData)
      setExpenses(expensesData)
      setDepositPercent(Number(depositPercentSetting))
      if (calendarSync?.skipped?.length) {
        const first = calendarSync.skipped[0]
        const more = calendarSync.skipped.length > 1 ? ` (+${calendarSync.skipped.length - 1} more)` : ''
        showToast(`⚠️ Skipped "${first.summary}" from Google Calendar — ${first.reason}${more}`, 'error')
      } else if (calendarSync?.imported?.length) {
        showToast(`Imported ${calendarSync.imported.length} booking(s) from Google Calendar: ${calendarSync.imported.join(', ')}`, 'success')
      }
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const showToast = (message, type = 'error') => {
    setToast({ message, type })
  }

  useEffect(() => {
    setDepositPercentInput(String(depositPercent))
  }, [depositPercent])

  // Best-effort push notification to Hadi about something someone else just added
  const notifyEvent = (payload) => {
    fetch('/api/notify-event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...db.getAuthHeader() },
      body: JSON.stringify(payload)
    }).catch(error => console.error('notify-event failed:', error))
  }

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(null), 3500)
    return () => clearTimeout(timer)
  }, [toast])

  // Calculate nights between dates
  const calculateNights = (checkIn, checkOut) => {
    const start = new Date(checkIn)
    const end = new Date(checkOut)
    return Math.ceil((end - start) / (1000 * 60 * 60 * 24))
  }

  // Auto-suggest the deposit amount at the default %, unless the user has typed a custom amount
  useEffect(() => {
    if (!depositAuto) return
    const nights = calculateNights(reservationForm.checkIn, reservationForm.checkOut)
    if (nights > 0 && reservationForm.pricePerNight) {
      const total = nights * Number(reservationForm.pricePerNight)
      setReservationForm(prev => ({ ...prev, depositAmount: Math.round(total * depositPercent / 100) }))
    }
  }, [reservationForm.checkIn, reservationForm.checkOut, reservationForm.pricePerNight, depositAuto, depositPercent])

  // Get default price based on check-in day
  // Friday or Saturday check-in = $120 (weekend)
  // Sunday through Thursday check-in = $90 (weekday)
  const getDefaultPrice = (dateString) => {
    const date = new Date(dateString)
    const day = date.getDay() // 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
    return (day === 5 || day === 6) ? 120 : 90
  }

  // Auth handlers
  const handleLogin = async (e) => {
    e.preventDefault()
    setAuthError('')

    if (loginEmail && loginPassword) {
      const emailLower = loginEmail.toLowerCase().trim()
      const result = await db.login(emailLower, loginPassword)

      if (!result.success) {
        setAuthError(result.error)
        return
      }

      localStorage.setItem(STORAGE_KEYS.AUTH, JSON.stringify({ email: result.email }))
      setIsAuthenticated(true)
      setUserEmail(result.email)
      setLoginEmail('')
      setLoginPassword('')
    }
  }

  const handleChangePassword = async (e) => {
    e.preventDefault()
    setPasswordError('')

    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match.')
      return
    }

    if (newPassword.length < 4) {
      setPasswordError('Password must be at least 4 characters.')
      return
    }

    try {
      await db.changePassword(newPassword)
      setShowPasswordModal(false)
      setNewPassword('')
      setConfirmPassword('')
      showToast('Password updated successfully!', 'success')
    } catch (error) {
      console.error('Password update error:', error)
      setPasswordError('Failed to update password.')
    }
  }

  const handleSaveDepositPercent = async () => {
    const value = Number(depositPercentInput)
    if (!Number.isFinite(value) || value <= 0 || value > 100) {
      showToast('Deposit percentage must be between 1 and 100.')
      return
    }
    setSavingDepositPercent(true)
    try {
      await db.setSetting('deposit_percent', value)
      setDepositPercent(value)
      showToast(`Deposit percentage updated to ${value}%.`, 'success')
    } catch (error) {
      console.error('Error saving deposit percentage:', error)
      showToast('Failed to update deposit percentage.')
    } finally {
      setSavingDepositPercent(false)
    }
  }

  const handleLogout = () => {
    db.logout()
    localStorage.removeItem(STORAGE_KEYS.AUTH)
    setIsAuthenticated(false)
    setUserEmail('')
    setLoginPassword('')
  }

  // Toggle deposit status
  const handleToggleDeposit = async (id, currentStatus) => {
    try {
      await db.toggleDepositStatus(id, !currentStatus)
      setReservations(reservations.map(r =>
        r.id === id ? { ...r, depositPaid: !currentStatus } : r
      ))
      if (!currentStatus) {
        const reservation = reservations.find(r => r.id === id)
        if (reservation) {
          notifyEvent({ type: 'deposit_paid', guestName: reservation.guestName, amount: reservation.depositAmount })
        }
      }
    } catch (error) {
      console.error('Error toggling deposit:', error)
      showToast('Failed to update deposit status.')
    }
  }

  const handleToggleFullPayment = async (id, currentStatus) => {
    try {
      await db.toggleFullPaymentStatus(id, !currentStatus)
      setReservations(reservations.map(r =>
        r.id === id ? { ...r, fullPaymentPaid: !currentStatus } : r
      ))
      if (!currentStatus) {
        const reservation = reservations.find(r => r.id === id)
        if (reservation) {
          notifyEvent({ type: 'full_payment_paid', guestName: reservation.guestName, amount: getRemainingBalance(reservation) })
        }
      }
    } catch (error) {
      console.error('Error toggling full payment:', error)
      showToast('Failed to update full payment status.')
    }
  }

  // From the notification-triggered popup: explicitly set (not toggle) the deposit/full-payment status
  const handlePaymentCheckResponse = async (paid) => {
    const check = paymentCheck
    setPaymentCheck(null)
    if (!check) return
    const { reservation, checkType } = check
    const isFullPayment = checkType === 'fullPayment'
    const currentValue = isFullPayment ? reservation.fullPaymentPaid : reservation.depositPaid
    if (paid === currentValue) return

    try {
      if (isFullPayment) {
        await db.toggleFullPaymentStatus(reservation.id, paid)
        setReservations(prev => prev.map(r => r.id === reservation.id ? { ...r, fullPaymentPaid: paid } : r))
      } else {
        await db.toggleDepositStatus(reservation.id, paid)
        setReservations(prev => prev.map(r => r.id === reservation.id ? { ...r, depositPaid: paid } : r))
      }
      if (paid) {
        notifyEvent({
          type: isFullPayment ? 'full_payment_paid' : 'deposit_paid',
          guestName: reservation.guestName,
          amount: isFullPayment ? getRemainingBalance(reservation) : reservation.depositAmount
        })
      }
    } catch (error) {
      console.error('Error updating payment status:', error)
      showToast('Failed to update payment status.')
    }
  }

  // Reservation handlers
  const resetReservationForm = () => {
    setReservationForm({
      guestName: '',
      guestPhone: '',
      checkIn: '',
      checkOut: '',
      guests: 1,
      pricePerNight: '',
      depositPaid: false,
      depositAmount: ''
    })
    setDepositAuto(true)
    setEditingReservation(null)
    setShowReservationForm(false)
  }

  const handleSaveReservation = async (e) => {
    e.preventDefault()
    const nights = calculateNights(reservationForm.checkIn, reservationForm.checkOut)
    if (nights <= 0) {
      showToast('Check-out date must be after the check-in date.')
      return
    }

    const conflict = reservations.find(r => {
      if (editingReservation && r.id === editingReservation.id) return false
      return reservationForm.checkIn < r.checkOut && r.checkIn < reservationForm.checkOut
    })
    if (conflict) {
      showToast(`${conflict.guestName} is already booked ${conflict.checkIn} to ${conflict.checkOut} — pick different dates.`)
      return
    }

    setSaving(true)
    const totalPrice = nights * Number(reservationForm.pricePerNight)

    try {
      const reservationData = {
        guestName: reservationForm.guestName,
        guestPhone: reservationForm.guestPhone,
        checkIn: reservationForm.checkIn,
        checkOut: reservationForm.checkOut,
        guests: Number(reservationForm.guests),
        pricePerNight: Number(reservationForm.pricePerNight),
        nights,
        totalPrice,
        depositPaid: reservationForm.depositPaid,
        depositAmount: Number(reservationForm.depositAmount) || 0
      }

      if (editingReservation) {
        await db.updateReservation(editingReservation.id, reservationData)
        setReservations(reservations.map(r =>
          r.id === editingReservation.id
            ? { ...r, ...reservationData }
            : r
        ))
      } else {
        const newReservation = await db.addReservation(reservationData)
        setReservations([...reservations, newReservation])
        notifyEvent({ type: 'reservation', guestName: reservationData.guestName })
      }
      resetReservationForm()
    } catch (error) {
      console.error('Error saving reservation:', error)
      showToast(error.message || 'Failed to save reservation. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleEditReservation = (reservation) => {
    setReservationForm({
      guestName: reservation.guestName,
      guestPhone: reservation.guestPhone || '',
      checkIn: reservation.checkIn,
      checkOut: reservation.checkOut,
      guests: reservation.guests,
      pricePerNight: reservation.pricePerNight,
      depositPaid: reservation.depositPaid || false,
      depositAmount: reservation.depositAmount
    })
    setDepositAuto(false)
    setEditingReservation(reservation)
    setShowReservationForm(true)
  }

  const handleDeleteReservation = (id) => {
    setConfirmDialog({
      title: 'Delete Reservation',
      message: 'Are you sure you want to delete this reservation? This cannot be undone.',
      onConfirm: async () => {
        setConfirmDialog(null)
        try {
          await db.deleteReservation(id)
          setReservations(reservations.filter(r => r.id !== id))
        } catch (error) {
          console.error('Error deleting reservation:', error)
          showToast('Failed to delete reservation. Please try again.')
        }
      }
    })
  }

  // Expense handlers
  const resetExpenseForm = () => {
    setExpenseForm({
      description: '',
      amount: '',
      date: '',
      category: 'maintenance'
    })
    setEditingExpense(null)
    setShowExpenseForm(false)
  }

  const handleSaveExpense = async (e) => {
    e.preventDefault()
    setSaving(true)

    try {
      const expenseData = {
        description: expenseForm.description,
        amount: Number(expenseForm.amount),
        date: expenseForm.date,
        category: expenseForm.category
      }

      if (editingExpense) {
        await db.updateExpense(editingExpense.id, expenseData)
        setExpenses(expenses.map(exp =>
          exp.id === editingExpense.id
            ? { ...exp, ...expenseData }
            : exp
        ))
      } else {
        const newExpense = await db.addExpense(expenseData)
        setExpenses([...expenses, newExpense])
        notifyEvent({ type: 'expense', description: expenseData.description, amount: expenseData.amount })
      }
      resetExpenseForm()
    } catch (error) {
      console.error('Error saving expense:', error)
      showToast('Failed to save expense. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleEditExpense = (expense) => {
    setExpenseForm({
      description: expense.description,
      amount: expense.amount,
      date: expense.date,
      category: expense.category
    })
    setEditingExpense(expense)
    setShowExpenseForm(true)
  }

  const handleDeleteExpense = (id) => {
    setConfirmDialog({
      title: 'Delete Expense',
      message: 'Are you sure you want to delete this expense? This cannot be undone.',
      onConfirm: async () => {
        setConfirmDialog(null)
        try {
          await db.deleteExpense(id)
          setExpenses(expenses.filter(e => e.id !== id))
        } catch (error) {
          console.error('Error deleting expense:', error)
          showToast('Failed to delete expense. Please try again.')
        }
      }
    })
  }

  // How much has actually been collected for a reservation so far (not the booked total)
  const getReceivedAmount = (reservation) => {
    if (reservation.fullPaymentPaid) return reservation.totalPrice
    if (reservation.depositPaid) return reservation.depositAmount
    return 0
  }

  // What's still owed toward the full total — the deposit already paid doesn't count twice
  const getRemainingBalance = (reservation) => {
    return reservation.totalPrice - (reservation.depositPaid ? reservation.depositAmount : 0)
  }

  // Calculate totals
  const totalIncome = reservations.reduce((sum, r) => sum + getReceivedAmount(r), 0)
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0)
  const netProfit = totalIncome - totalExpenses

  // Reservations tab: filter + sort
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const weekFromNow = new Date(todayStart)
  weekFromNow.setDate(todayStart.getDate() + 7)

  const filteredReservations = reservations
    .filter(r => {
      if (reservationFilter === 'all') return true
      const checkInDate = new Date(r.checkIn)
      if (reservationFilter === 'upcoming') return checkInDate >= todayStart
      if (reservationFilter === 'week') return checkInDate >= todayStart && checkInDate <= weekFromNow
      return true
    })
    .sort((a, b) => {
      const aDate = new Date(a.checkIn)
      const bDate = new Date(b.checkIn)
      if (reservationSort === 'asc') {
        const aPast = aDate < todayStart
        const bPast = bDate < todayStart
        if (aPast !== bPast) return aPast ? 1 : -1 // upcoming/current before past
        return aPast ? bDate - aDate : aDate - bDate // upcoming: soonest first; past: most recent first
      }
      return bDate - aDate // latest first: furthest-future first
    })

  // Calendar tab helpers
  const getReservationsForDay = (date) => {
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    return reservations.filter(r => r.checkIn <= dateStr && dateStr < r.checkOut)
  }

  const buildCalendarGrid = (monthDate) => {
    const year = monthDate.getFullYear()
    const month = monthDate.getMonth()
    const firstDay = new Date(year, month, 1)
    const startOffset = firstDay.getDay() // 0=Sun
    const daysInMonth = new Date(year, month + 1, 0).getDate()

    const cells = []
    for (let i = 0; i < startOffset; i++) cells.push(null)
    for (let day = 1; day <= daysInMonth; day++) cells.push(new Date(year, month, day))
    return cells
  }

  // Prepare chart data
  const getMonthlyData = () => {
    const monthlyMap = {}

    reservations.forEach(r => {
      const month = r.checkIn.substring(0, 7)
      if (!monthlyMap[month]) {
        monthlyMap[month] = { month, income: 0, expenses: 0 }
      }
      monthlyMap[month].income += getReceivedAmount(r)
    })

    expenses.forEach(e => {
      const month = e.date.substring(0, 7)
      if (!monthlyMap[month]) {
        monthlyMap[month] = { month, income: 0, expenses: 0 }
      }
      monthlyMap[month].expenses += e.amount
    })

    return Object.values(monthlyMap).sort((a, b) => a.month.localeCompare(b.month))
  }

  const monthlyData = getMonthlyData()

  // Get category icon
  const getCategoryIcon = (categoryId) => {
    const cat = EXPENSE_CATEGORIES.find(c => c.id === categoryId)
    return cat ? cat.icon : MoreHorizontal
  }

  const getCategoryLabel = (categoryId) => {
    const cat = EXPENSE_CATEGORIES.find(c => c.id === categoryId)
    return cat ? cat.label : 'Other'
  }

  // Export functions
  const exportToCSV = (data, filename, headers) => {
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(h => {
        const value = row[h.toLowerCase().replace(/ /g, '')] || row[h.toLowerCase()] || ''
        return typeof value === 'string' && value.includes(',') ? `"${value}"` : value
      }).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = filename
    link.click()
  }

  const exportReservations = () => {
    const data = reservations.map(r => ({
      guestname: r.guestName,
      phone: r.guestPhone || '',
      checkin: r.checkIn,
      checkout: r.checkOut,
      guests: r.guests,
      pricepernight: r.pricePerNight,
      nights: r.nights,
      totalprice: r.totalPrice
    }))
    exportToCSV(data, 'reservations.csv', ['GuestName', 'Phone', 'CheckIn', 'CheckOut', 'Guests', 'PricePerNight', 'Nights', 'TotalPrice'])
  }

  const exportExpenses = () => {
    const data = expenses.map(e => ({
      description: e.description,
      amount: e.amount,
      date: e.date,
      category: getCategoryLabel(e.category)
    }))
    exportToCSV(data, 'expenses.csv', ['Description', 'Amount', 'Date', 'Category'])
  }

  const exportAnalytics = () => {
    const data = monthlyData.map(m => ({
      month: m.month,
      income: m.income,
      expenses: m.expenses,
      profit: m.income - m.expenses
    }))
    exportToCSV(data, 'monthly-analytics.csv', ['Month', 'Income', 'Expenses', 'Profit'])
  }

  const exportFullReport = () => {
    const report = [
      '=== AMIR\'S CHALET FINANCIAL REPORT ===',
      `Generated: ${new Date().toLocaleDateString()}`,
      '',
      '--- SUMMARY ---',
      `Total Income: $${totalIncome.toLocaleString()}`,
      `Total Expenses: $${totalExpenses.toLocaleString()}`,
      `Net Profit: $${netProfit.toLocaleString()}`,
      '',
      '--- RESERVATIONS ---',
      'Guest Name,Phone,Check-In,Check-Out,Guests,Price/Night,Nights,Total',
      ...reservations.map(r => `${r.guestName},${r.guestPhone || ''},${r.checkIn},${r.checkOut},${r.guests},$${r.pricePerNight},${r.nights},$${r.totalPrice}`),
      '',
      '--- EXPENSES ---',
      'Description,Amount,Date,Category',
      ...expenses.map(e => `${e.description},$${e.amount},${e.date},${getCategoryLabel(e.category)}`),
      '',
      '--- MONTHLY BREAKDOWN ---',
      'Month,Income,Expenses,Profit',
      ...monthlyData.map(m => `${m.month},$${m.income},$${m.expenses},$${m.income - m.expenses}`)
    ].join('\n')

    const blob = new Blob([report], { type: 'text/plain;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `amirs-chalet-report-${new Date().toISOString().split('T')[0]}.txt`
    link.click()
  }

  // Generate printable receipt
  const generateReceipt = (reservation) => {
    const receiptWindow = window.open('', '_blank', 'width=400,height=600')
    const receiptHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Receipt - Amir's Chalet</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: 'Segoe UI', Arial, sans-serif;
            padding: 20px;
            max-width: 400px;
            margin: 0 auto;
            color: #333;
          }
          .header {
            text-align: center;
            border-bottom: 2px dashed #ccc;
            padding-bottom: 15px;
            margin-bottom: 20px;
          }
          .header h1 {
            font-size: 24px;
            color: #0891b2;
            margin-bottom: 5px;
          }
          .header p {
            font-size: 12px;
            color: #666;
          }
          .receipt-number {
            background: #f0f9ff;
            padding: 8px;
            border-radius: 8px;
            text-align: center;
            margin-bottom: 20px;
            font-size: 12px;
            color: #0369a1;
          }
          .section {
            margin-bottom: 15px;
          }
          .section-title {
            font-size: 11px;
            color: #999;
            text-transform: uppercase;
            margin-bottom: 5px;
            letter-spacing: 1px;
          }
          .section-content {
            font-size: 14px;
            font-weight: 500;
          }
          .row {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid #eee;
          }
          .row:last-child { border-bottom: none; }
          .row .label { color: #666; }
          .row .value { font-weight: 500; }
          .total-section {
            background: linear-gradient(135deg, #0891b2 0%, #0369a1 100%);
            color: white;
            padding: 15px;
            border-radius: 10px;
            margin-top: 20px;
          }
          .total-section .row { border-bottom: 1px solid rgba(255,255,255,0.2); }
          .total-section .label { color: rgba(255,255,255,0.8); }
          .total-section .value { color: white; }
          .grand-total {
            font-size: 24px;
            text-align: center;
            margin-top: 10px;
            font-weight: bold;
          }
          .footer {
            text-align: center;
            margin-top: 25px;
            padding-top: 15px;
            border-top: 2px dashed #ccc;
            font-size: 11px;
            color: #999;
          }
          .footer p { margin-bottom: 5px; }
          @media print {
            body { padding: 10px; }
            .no-print { display: none; }
          }
          .print-btn {
            display: block;
            width: 100%;
            padding: 12px;
            background: #0891b2;
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 14px;
            cursor: pointer;
            margin-top: 20px;
          }
          .print-btn:hover { background: #0369a1; }
        </style>
      </head>
      <body>
        <div class="header">
          <img src="${LOGO_DATA_URI}" alt="Amir's Chalet" style="width:64px;height:64px;margin-bottom:8px;" />
          <h1>Amir's Chalet</h1>
          <p>Luxury Pool Retreat - Lebanon</p>
        </div>

        <div class="receipt-number">
          Receipt #${reservation.id} | ${new Date().toLocaleDateString()}
        </div>

        <div class="section">
          <div class="section-title">Guest Information</div>
          <div class="section-content">${reservation.guestName}</div>
          ${reservation.guestPhone ? `<div class="section-content" style="font-size:12px;color:#666;margin-top:3px;">${reservation.guestPhone}</div>` : ''}
        </div>

        <div class="section">
          <div class="section-title">Stay Details</div>
          <div class="row">
            <span class="label">Check-in</span>
            <span class="value">${new Date(reservation.checkIn).toLocaleDateString()} at 8 PM</span>
          </div>
          <div class="row">
            <span class="label">Check-out</span>
            <span class="value">${new Date(reservation.checkOut).toLocaleDateString()} at 6 PM</span>
          </div>
          <div class="row">
            <span class="label">Guests</span>
            <span class="value">${reservation.guests} guest${reservation.guests > 1 ? 's' : ''}</span>
          </div>
        </div>

        <div class="total-section">
          <div class="row">
            <span class="label">Price per Night</span>
            <span class="value">$${reservation.pricePerNight}</span>
          </div>
          <div class="row">
            <span class="label">Number of Nights</span>
            <span class="value">${reservation.nights}</span>
          </div>
          <div class="grand-total">$${reservation.totalPrice.toLocaleString()}</div>
        </div>

        <div style="margin-top: 15px; padding: 12px; border-radius: 10px; background: ${reservation.depositPaid ? '#ecfdf5' : '#fef3c7'}; border: 1px solid ${reservation.depositPaid ? '#a7f3d0' : '#fcd34d'};">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div>
              <span style="font-size: 12px; color: #666;">Deposit</span>
              <div style="font-size: 16px; font-weight: 600; color: ${reservation.depositPaid ? '#059669' : '#d97706'};">
                $${reservation.depositAmount.toLocaleString()}
              </div>
            </div>
            <span style="padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 600; background: ${reservation.depositPaid ? '#059669' : '#f59e0b'}; color: white;">
              ${reservation.depositPaid ? 'PAID' : 'PENDING'}
            </span>
          </div>
        </div>

        <div class="footer">
          <p>Thank you for choosing Amir's Chalet!</p>
          <p>We hope you enjoy your stay</p>
        </div>

        <button class="print-btn no-print" onclick="window.print()">Print Receipt</button>
      </body>
      </html>
    `
    receiptWindow.document.write(receiptHTML)
    receiptWindow.document.close()
  }

  // Draw a rounded rectangle path
  const roundRect = (ctx, x, y, w, h, r) => {
    ctx.beginPath()
    ctx.moveTo(x + r, y)
    ctx.arcTo(x + w, y, x + w, y + h, r)
    ctx.arcTo(x + w, y + h, x, y + h, r)
    ctx.arcTo(x, y + h, x, y, r)
    ctx.arcTo(x, y, x + w, y, r)
    ctx.closePath()
  }

  // Draws the badge logo with plain shapes — no image loading involved, so it can't fail to load
  const drawLogoBadge = (ctx, cx, cy, r) => {
    ctx.save()
    ctx.translate(cx, cy)
    ctx.scale(r / 120, r / 120)
    ctx.translate(-120, -120)

    ctx.beginPath()
    ctx.arc(120, 120, 117, 0, Math.PI * 2)
    ctx.fillStyle = '#f6ece2'
    ctx.fill()
    ctx.lineWidth = 6
    ctx.strokeStyle = '#201f1d'
    ctx.stroke()

    ctx.beginPath()
    ctx.arc(120, 120, 100, 0, Math.PI * 2)
    ctx.fillStyle = '#f0ad86'
    ctx.fill()

    ctx.save()
    ctx.beginPath()
    ctx.arc(120, 120, 100, 0, Math.PI * 2)
    ctx.clip()

    ctx.beginPath()
    ctx.arc(68, 64, 18, 0, Math.PI * 2)
    ctx.fillStyle = '#ffd27f'
    ctx.fill()

    ctx.fillStyle = '#c9bda6'
    ctx.fillRect(0, 130, 240, 46)
    ctx.fillStyle = '#cfa189'
    ctx.fillRect(0, 176, 240, 70)

    ctx.beginPath()
    ctx.moveTo(86, 88)
    ctx.lineTo(142, 46)
    ctx.lineTo(198, 88)
    ctx.closePath()
    ctx.fillStyle = '#c69a53'
    ctx.fill()

    ctx.beginPath()
    ctx.moveTo(82, 88)
    ctx.lineTo(202, 88)
    ctx.strokeStyle = '#7d5411'
    ctx.lineWidth = 7
    ctx.stroke()

    ctx.fillStyle = '#a8804d'
    ctx.fillRect(90, 90, 104, 24)
    ctx.fillStyle = '#b08a55'
    ctx.fillRect(84, 114, 116, 22)

    ctx.strokeStyle = '#4a4744'
    ctx.lineWidth = 8
    ctx.beginPath()
    ctx.moveTo(96, 136)
    ctx.lineTo(96, 176)
    ctx.moveTo(188, 136)
    ctx.lineTo(188, 176)
    ctx.stroke()

    ctx.beginPath()
    ctx.moveTo(70, 186)
    ctx.lineTo(170, 186)
    ctx.lineTo(230, 224)
    ctx.lineTo(10, 224)
    ctx.closePath()
    ctx.fillStyle = '#efe7dd'
    ctx.fill()

    ctx.beginPath()
    ctx.moveTo(80, 193)
    ctx.lineTo(160, 193)
    ctx.lineTo(212, 217)
    ctx.lineTo(28, 217)
    ctx.closePath()
    ctx.fillStyle = '#4098c2'
    ctx.fill()

    ctx.restore()

    ctx.beginPath()
    ctx.arc(120, 120, 100, 0, Math.PI * 2)
    ctx.strokeStyle = '#201f1d'
    ctx.lineWidth = 5
    ctx.stroke()

    ctx.restore()
  }

  // Render a receipt as a shareable PNG image
  const generateReceiptImage = async (reservation) => {
    const width = 640
    const height = 900
    const scale = 2
    const canvas = document.createElement('canvas')
    canvas.width = width * scale
    canvas.height = height * scale
    const ctx = canvas.getContext('2d')
    ctx.scale(scale, scale)

    const pad = 40
    const contentW = width - pad * 2

    // Page background
    ctx.fillStyle = '#f0f9ff'
    ctx.fillRect(0, 0, width, height)

    // Header
    const headerGrad = ctx.createLinearGradient(0, 0, width, 0)
    headerGrad.addColorStop(0, '#0891b2')
    headerGrad.addColorStop(1, '#0369a1')
    ctx.fillStyle = headerGrad
    ctx.fillRect(0, 0, width, 150)

    drawLogoBadge(ctx, 90, 75, 42)

    ctx.fillStyle = '#ffffff'
    ctx.textAlign = 'left'
    ctx.font = 'bold 26px Arial, sans-serif'
    ctx.fillText("Amir's Chalet", 150, 70)
    ctx.font = '14px Arial, sans-serif'
    ctx.fillStyle = 'rgba(255,255,255,0.9)'
    ctx.fillText('Luxury Pool Retreat - Lebanon 🇱🇧', 150, 96)

    let y = 190

    // Card background
    roundRect(ctx, pad, y, contentW, height - y - pad, 20)
    ctx.fillStyle = '#ffffff'
    ctx.fill()

    y += 30
    ctx.fillStyle = '#0369a1'
    ctx.font = '13px Arial, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(`Receipt #${reservation.id}  |  ${new Date().toLocaleDateString()}`, width / 2, y)

    y += 40
    ctx.textAlign = 'left'
    ctx.fillStyle = '#9ca3af'
    ctx.font = '11px Arial, sans-serif'
    ctx.fillText('GUEST', pad + 30, y)
    y += 24
    ctx.fillStyle = '#1f2937'
    ctx.font = 'bold 20px Arial, sans-serif'
    ctx.fillText(reservation.guestName, pad + 30, y)
    if (reservation.guestPhone) {
      y += 22
      ctx.fillStyle = '#6b7280'
      ctx.font = '14px Arial, sans-serif'
      ctx.fillText(reservation.guestPhone, pad + 30, y)
    }

    y += 35
    ctx.strokeStyle = '#e5e7eb'
    ctx.beginPath()
    ctx.moveTo(pad + 30, y)
    ctx.lineTo(width - pad - 30, y)
    ctx.stroke()

    const row = (label, value) => {
      y += 34
      ctx.fillStyle = '#6b7280'
      ctx.font = '14px Arial, sans-serif'
      ctx.textAlign = 'left'
      ctx.fillText(label, pad + 30, y)
      ctx.fillStyle = '#1f2937'
      ctx.font = 'bold 14px Arial, sans-serif'
      ctx.textAlign = 'right'
      ctx.fillText(value, width - pad - 30, y)
    }

    y += 15
    row('Check-in', `${new Date(reservation.checkIn).toLocaleDateString()} (8 PM)`)
    row('Check-out', `${new Date(reservation.checkOut).toLocaleDateString()} (6 PM)`)
    row('Guests', `${reservation.guests} guest${reservation.guests > 1 ? 's' : ''}`)

    y += 35
    // Pricing box
    const boxH = 150
    const priceGrad = ctx.createLinearGradient(pad + 30, y, width - pad - 30, y)
    priceGrad.addColorStop(0, '#0891b2')
    priceGrad.addColorStop(1, '#0369a1')
    roundRect(ctx, pad + 30, y, contentW - 60, boxH, 14)
    ctx.fillStyle = priceGrad
    ctx.fill()

    let py = y + 34
    ctx.font = '13px Arial, sans-serif'
    ctx.fillStyle = 'rgba(255,255,255,0.8)'
    ctx.textAlign = 'left'
    ctx.fillText('Price per Night', pad + 55, py)
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 13px Arial, sans-serif'
    ctx.textAlign = 'right'
    ctx.fillText(`$${reservation.pricePerNight}`, width - pad - 55, py)

    py += 30
    ctx.fillStyle = 'rgba(255,255,255,0.8)'
    ctx.font = '13px Arial, sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText('Nights', pad + 55, py)
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 13px Arial, sans-serif'
    ctx.textAlign = 'right'
    ctx.fillText(`${reservation.nights}`, width - pad - 55, py)

    py += 50
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 32px Arial, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(`$${reservation.totalPrice.toLocaleString()}`, width / 2, py)

    y += boxH + 25

    // Deposit status box
    const depositAmount = reservation.depositAmount
    const paid = reservation.depositPaid
    roundRect(ctx, pad + 30, y, contentW - 60, 70, 14)
    ctx.fillStyle = paid ? '#ecfdf5' : '#fef3c7'
    ctx.fill()
    ctx.lineWidth = 1
    ctx.strokeStyle = paid ? '#a7f3d0' : '#fcd34d'
    ctx.stroke()

    ctx.fillStyle = '#6b7280'
    ctx.font = '12px Arial, sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText('Deposit', pad + 55, y + 28)
    ctx.fillStyle = paid ? '#059669' : '#d97706'
    ctx.font = 'bold 18px Arial, sans-serif'
    ctx.fillText(`$${depositAmount.toLocaleString()}`, pad + 55, y + 52)

    const badgeText = paid ? 'PAID' : 'PENDING'
    ctx.font = 'bold 12px Arial, sans-serif'
    const badgeW = ctx.measureText(badgeText).width + 28
    roundRect(ctx, width - pad - 55 - badgeW, y + 22, badgeW, 26, 13)
    ctx.fillStyle = paid ? '#059669' : '#f59e0b'
    ctx.fill()
    ctx.fillStyle = '#ffffff'
    ctx.textAlign = 'center'
    ctx.fillText(badgeText, width - pad - 55 - badgeW / 2, y + 39)

    y += 100
    ctx.fillStyle = '#9ca3af'
    ctx.font = '13px Arial, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('Thank you for choosing Amir’s Chalet! 🏊', width / 2, y)

    return new Promise(resolve => canvas.toBlob(resolve, 'image/png'))
  }

  // Share receipt via WhatsApp (as an image where the platform allows it)
  const shareReceipt = async (reservation) => {
    const blob = await generateReceiptImage(reservation)
    const fileName = `receipt-${reservation.id}.png`
    const file = new File([blob], fileName, { type: 'image/png' })

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: "Amir's Chalet Receipt",
          text: `Receipt for ${reservation.guestName}`
        })
        return
      } catch (error) {
        if (error.name === 'AbortError') return
        console.error('Share failed:', error)
      }
    }

    // Fallback (mainly desktop): download the image and open a prefilled WhatsApp chat
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    link.click()
    URL.revokeObjectURL(url)

    showToast('Receipt image downloaded — attach it in the WhatsApp chat that just opened.', 'success')

    const message = `🏠 *Amir's Chalet - Reservation Receipt*\n\nReceipt #${reservation.id} attached above 👆\n\n👤 *Guest:* ${reservation.guestName}\n💰 *Total:* $${reservation.totalPrice.toLocaleString()}\n💳 *Deposit:* $${reservation.depositAmount.toLocaleString()} ${reservation.depositPaid ? '(Paid)' : '(Pending)'}`
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank')
  }

  // Login screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-cyan-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-white/20">
            <div className="text-center mb-8">
              <img src="/logo.svg" alt="Amir's Chalet" className="w-24 h-24 mx-auto mb-4 drop-shadow-lg" />
              <h1 className="text-3xl font-bold text-white mb-2">Amir's Chalet</h1>
              <p className="text-cyan-200">Luxury Pool Retreat Management</p>
              <p className="text-cyan-300/70 text-sm mt-1">Lebanon 🇱🇧</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-cyan-100 text-sm font-medium mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-cyan-300" />
                  <input
                    type="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="w-full pl-11 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-cyan-200/50 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition-all"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-cyan-100 text-sm font-medium mb-2">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-cyan-300" />
                  <input
                    type="password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full pl-11 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-cyan-200/50 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition-all"
                    required
                  />
                </div>
                <p className="text-cyan-200/60 text-xs mt-2">First time? Enter any password to set it.</p>
              </div>
              <button
                type="submit"
                className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center gap-2"
              >
                Sign In
                <ArrowRight className="w-5 h-5" />
              </button>
              {authError && (
                <div className="mt-4 p-3 bg-red-500/20 border border-red-500/30 rounded-xl text-red-300 text-sm text-center">
                  {authError}
                </div>
              )}
            </form>
          </div>
        </div>
      </div>
    )
  }

  // Loading screen
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-cyan-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading your data...</p>
        </div>
      </div>
    )
  }

  // Main app
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-cyan-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-500 shadow-xl">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3">
              <img src="/logo.svg" alt="Amir's Chalet" className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex-shrink-0 shadow-lg" />
              <div className="min-w-0">
                <h1 className="text-lg sm:text-2xl font-bold text-white truncate">Amir's Chalet</h1>
                <p className="text-cyan-100 text-xs sm:text-sm">🏊 Luxury Pool Retreat</p>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              <span className="text-cyan-100 text-xs sm:text-sm hidden md:block truncate max-w-32">{userEmail}</span>
              <button
                onClick={handleTogglePush}
                disabled={pushBusy}
                className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-xl text-white transition-all duration-300 disabled:opacity-50 ${
                  pushSubscribed ? 'bg-white/25 hover:bg-white/30' : 'bg-white/10 hover:bg-white/20'
                }`}
                title={pushSubscribed ? 'Notifications On (tap to disable)' : 'Enable Notifications'}
                aria-label={pushSubscribed ? 'Notifications On (tap to disable)' : 'Enable Notifications'}
              >
                {pushBusy ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : pushSubscribed ? (
                  <Bell className="w-4 h-4" />
                ) : (
                  <BellOff className="w-4 h-4" />
                )}
              </button>
              <button
                onClick={() => setShowPasswordModal(true)}
                className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-all duration-300"
                title="Change Password"
                aria-label="Change Password"
              >
                <Lock className="w-4 h-4" />
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-all duration-300"
                title="Logout"
                aria-label="Logout"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline text-sm">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Summary Cards */}
      <div className="max-w-7xl mx-auto px-3 sm:px-4 mt-4 sm:mt-6 relative z-10">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-xl p-4 sm:p-6 border border-emerald-100">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-gray-500 text-xs sm:text-sm font-medium">Total Income</p>
                <p className="text-2xl sm:text-3xl font-bold text-emerald-600 mt-1 truncate">
                  ${totalIncome.toLocaleString()}
                </p>
              </div>
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-gradient-to-br from-emerald-400 to-green-500 flex items-center justify-center shadow-lg flex-shrink-0 ml-2">
                <TrendingUp className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
              </div>
            </div>
            <p className="text-gray-400 text-xs mt-2 sm:mt-3">💰 Actually received so far, from {reservations.length} reservation{reservations.length !== 1 ? 's' : ''}</p>
          </div>

          <div className="bg-white rounded-xl sm:rounded-2xl shadow-xl p-4 sm:p-6 border border-rose-100">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-gray-500 text-xs sm:text-sm font-medium">Total Expenses</p>
                <p className="text-2xl sm:text-3xl font-bold text-rose-600 mt-1 truncate">
                  ${totalExpenses.toLocaleString()}
                </p>
              </div>
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-gradient-to-br from-rose-400 to-red-500 flex items-center justify-center shadow-lg flex-shrink-0 ml-2">
                <DollarSign className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
              </div>
            </div>
            <p className="text-gray-400 text-xs mt-2 sm:mt-3">📋 From {expenses.length} expenses</p>
          </div>

          <div className="bg-white rounded-xl sm:rounded-2xl shadow-xl p-4 sm:p-6 border border-blue-100">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-gray-500 text-xs sm:text-sm font-medium">Net Profit</p>
                <p className={`text-2xl sm:text-3xl font-bold mt-1 truncate ${netProfit >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                  ${netProfit.toLocaleString()}
                </p>
              </div>
              <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0 ml-2 ${netProfit >= 0 ? 'bg-gradient-to-br from-blue-400 to-cyan-500' : 'bg-gradient-to-br from-red-400 to-rose-500'}`}>
                <DollarSign className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
              </div>
            </div>
            <p className="text-gray-400 text-xs mt-2 sm:mt-3">📊 Income - Expenses</p>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="max-w-7xl mx-auto px-3 sm:px-4 mt-6 sm:mt-8">
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-1.5 sm:p-2 flex gap-1 sm:gap-2 w-full sm:w-auto sm:inline-flex overflow-x-auto">
          {[
            { id: 'reservations', label: 'Reservations', icon: Calendar },
            { id: 'calendar', label: 'Calendar', icon: CalendarDays },
            { id: 'expenses', label: 'Expenses', icon: DollarSign },
            { id: 'analytics', label: 'Analytics', icon: TrendingUp }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              title={tab.label}
              aria-label={tab.label}
              className={`flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-6 py-2.5 sm:py-3 rounded-xl font-medium transition-all duration-300 flex-1 sm:flex-none min-w-0 ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <tab.icon className="w-5 h-5 flex-shrink-0" />
              <span className="hidden sm:inline text-sm sm:text-base truncate">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content Area */}
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        {/* Reservations Tab */}
        {activeTab === 'reservations' && (
          <div className="space-y-6">
            {/* Add Button */}
            {!showReservationForm && (
              <button
                onClick={() => setShowReservationForm(true)}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <Plus className="w-5 h-5" />
                Add Reservation
              </button>
            )}

            {/* Reservation Form */}
            {showReservationForm && (
              <div className="bg-white rounded-xl sm:rounded-2xl shadow-xl p-4 sm:p-6 border border-blue-100">
                <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-blue-500" />
                  {editingReservation ? 'Edit Reservation' : 'New Reservation'}
                </h3>
                <form onSubmit={handleSaveReservation} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-gray-600 text-sm font-medium mb-2">Guest Name</label>
                    <input
                      type="text"
                      value={reservationForm.guestName}
                      onChange={(e) => setReservationForm({ ...reservationForm, guestName: e.target.value })}
                      placeholder="Enter guest name"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-gray-600 text-sm font-medium mb-2">Phone Number</label>
                    <input
                      type="tel"
                      value={reservationForm.guestPhone}
                      onChange={(e) => setReservationForm({ ...reservationForm, guestPhone: e.target.value })}
                      placeholder="+961 XX XXX XXX"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-600 text-sm font-medium mb-2">Check-in Date <span className="text-blue-500">(8 PM)</span></label>
                    <input
                      type="date"
                      value={reservationForm.checkIn}
                      onChange={(e) => {
                        const newDate = e.target.value
                        const defaultPrice = newDate ? getDefaultPrice(newDate) : ''
                        setReservationForm({
                          ...reservationForm,
                          checkIn: newDate,
                          pricePerNight: defaultPrice
                        })
                      }}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-gray-600 text-sm font-medium mb-2">Check-out Date <span className="text-blue-500">(6 PM)</span></label>
                    <input
                      type="date"
                      value={reservationForm.checkOut}
                      min={reservationForm.checkIn || undefined}
                      onChange={(e) => setReservationForm({ ...reservationForm, checkOut: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-gray-600 text-sm font-medium mb-2">Number of Guests</label>
                    <input
                      type="number"
                      min="1"
                      value={reservationForm.guests}
                      onChange={(e) => setReservationForm({ ...reservationForm, guests: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-gray-600 text-sm font-medium mb-2">
                      Price per Night ($)
                      {reservationForm.checkIn && (
                        <span className={`ml-2 text-xs ${
                          getDefaultPrice(reservationForm.checkIn) === 120 ? 'text-amber-500' : 'text-blue-500'
                        }`}>
                          {getDefaultPrice(reservationForm.checkIn) === 120 ? '(Weekend)' : '(Weekday)'}
                        </span>
                      )}
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={reservationForm.pricePerNight}
                      onChange={(e) => setReservationForm({ ...reservationForm, pricePerNight: e.target.value })}
                      placeholder="0.00"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all"
                      required
                    />
                  </div>
                  {reservationForm.checkIn && reservationForm.checkOut && reservationForm.pricePerNight && (
                    <div className="flex items-end">
                      <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl p-4 w-full border border-blue-100">
                        <p className="text-sm text-gray-500">Calculated Total</p>
                        <p className="text-2xl font-bold text-blue-600">
                          ${(calculateNights(reservationForm.checkIn, reservationForm.checkOut) * Number(reservationForm.pricePerNight)).toLocaleString()}
                        </p>
                        <p className="text-xs text-gray-400">
                          {calculateNights(reservationForm.checkIn, reservationForm.checkOut)} nights
                        </p>
                      </div>
                    </div>
                  )}
                  <div>
                    <label className="block text-gray-600 text-sm font-medium mb-2">
                      Deposit Amount ($)
                      {!depositAuto && (
                        <button
                          type="button"
                          onClick={() => setDepositAuto(true)}
                          className="ml-2 text-xs text-blue-500 hover:text-blue-600 font-normal"
                        >
                          Reset to default ({depositPercent}%)
                        </button>
                      )}
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={reservationForm.depositAmount}
                      onChange={(e) => {
                        setDepositAuto(false)
                        setReservationForm({ ...reservationForm, depositAmount: e.target.value })
                      }}
                      placeholder="0.00"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all"
                    />
                    <p className="text-xs text-gray-400 mt-1">Defaults to {depositPercent}% of the total, but you can enter any flat amount (e.g. $30).</p>
                  </div>
                  <div className="flex items-end">
                    <label className="flex items-center gap-3 cursor-pointer bg-gray-50 rounded-xl p-4 w-full border border-gray-200 hover:bg-gray-100 transition-all">
                      <input
                        type="checkbox"
                        checked={reservationForm.depositPaid}
                        onChange={(e) => setReservationForm({ ...reservationForm, depositPaid: e.target.checked })}
                        className="w-5 h-5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      <div>
                        <span className="text-sm font-medium text-gray-700">
                          Deposit Paid{reservationForm.depositAmount ? ` ($${Number(reservationForm.depositAmount).toLocaleString()})` : ''}
                        </span>
                        <p className="text-xs text-gray-400">Required 1 week before check-in</p>
                      </div>
                    </label>
                  </div>
                  <div className="sm:col-span-2 lg:col-span-3 flex flex-col sm:flex-row gap-2 sm:gap-3 mt-2">
                    <button
                      type="submit"
                      disabled={saving}
                      className="flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {saving ? <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" /> : <Check className="w-4 h-4 sm:w-5 sm:h-5" />}
                      {saving ? 'Saving...' : (editingReservation ? 'Update' : 'Save')}
                    </button>
                    <button
                      type="button"
                      onClick={resetReservationForm}
                      className="flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-all duration-300 text-sm sm:text-base"
                    >
                      <X className="w-4 h-4 sm:w-5 sm:h-5" />
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Filter + Sort */}
            {reservations.length > 0 && (
              <div className="flex items-center gap-1.5 sm:gap-3">
                <div className="bg-white rounded-xl shadow-md p-1 flex gap-1 flex-1 min-w-0">
                  {[
                    { id: 'all', label: 'All' },
                    { id: 'upcoming', label: 'Upcoming' },
                    { id: 'week', label: 'This Week' }
                  ].map(f => (
                    <button
                      key={f.id}
                      onClick={() => setReservationFilter(f.id)}
                      className={`flex-1 min-w-0 px-1.5 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-300 truncate ${
                        reservationFilter === f.id
                          ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setReservationSort(reservationSort === 'asc' ? 'desc' : 'asc')}
                  className="flex-shrink-0 flex items-center gap-1.5 px-2.5 sm:px-4 py-2.5 bg-white rounded-xl shadow-md text-sm font-medium text-gray-600 hover:bg-gray-50 transition-all duration-300"
                  title={reservationSort === 'asc' ? 'Soonest first' : 'Latest first'}
                  aria-label={reservationSort === 'asc' ? 'Soonest first' : 'Latest first'}
                >
                  <ArrowUpDown className="w-4 h-4" />
                  <span className="hidden sm:inline">{reservationSort === 'asc' ? 'Soonest first' : 'Latest first'}</span>
                </button>
              </div>
            )}

            {/* Reservations List */}
            {reservations.length === 0 ? (
              <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-8 sm:p-12 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-blue-50 mb-4">
                  <Calendar className="w-8 h-8 sm:w-10 sm:h-10 text-blue-400" />
                </div>
                <h3 className="text-lg sm:text-xl font-semibold text-gray-700 mb-2">No Reservations Yet</h3>
                <p className="text-gray-400 text-sm sm:text-base">Add your first reservation to get started!</p>
              </div>
            ) : filteredReservations.length === 0 ? (
              <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-8 sm:p-12 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-blue-50 mb-4">
                  <Calendar className="w-8 h-8 sm:w-10 sm:h-10 text-blue-400" />
                </div>
                <h3 className="text-lg sm:text-xl font-semibold text-gray-700 mb-2">No Matches</h3>
                <p className="text-gray-400 text-sm sm:text-base">Nothing in this filter — try "All" instead.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:gap-4">
                {filteredReservations.map(reservation => {
                  const depositAmount = reservation.depositAmount
                  const checkInDate = new Date(reservation.checkIn)
                  const oneWeekBefore = new Date(checkInDate)
                  oneWeekBefore.setDate(checkInDate.getDate() - 7)
                  const isDepositDueSoon = !reservation.depositPaid && new Date() >= oneWeekBefore

                  return (
                    <div
                      key={reservation.id}
                      className={`bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 border hover:shadow-xl transition-all duration-300 ${
                        isDepositDueSoon ? 'border-amber-300 bg-amber-50/30' : 'border-gray-100'
                      }`}
                    >
                      <div className="flex flex-col gap-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center flex-shrink-0">
                              <Users className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                            </div>
                            <div className="min-w-0">
                              <h4 className="text-base sm:text-lg font-semibold text-gray-800 truncate">{reservation.guestName}</h4>
                              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                                <p className="text-xs sm:text-sm text-gray-400">{reservation.guests} guest{reservation.guests > 1 ? 's' : ''}</p>
                                {reservation.guestPhone && (
                                  <a href={`tel:${reservation.guestPhone}`} className="flex items-center gap-1 text-xs sm:text-sm text-blue-500 hover:text-blue-600">
                                    <Phone className="w-3 h-3" />
                                    {reservation.guestPhone}
                                  </a>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-1.5 sm:gap-2 flex-shrink-0">
                            <button
                              onClick={() => shareReceipt(reservation)}
                              className="p-2 sm:p-3 rounded-lg sm:rounded-xl bg-green-50 hover:bg-green-100 text-green-600 transition-all duration-300"
                              title="Share via WhatsApp"
                              aria-label="Share via WhatsApp"
                            >
                              <Share2 className="w-4 h-4 sm:w-5 sm:h-5" />
                            </button>
                            <button
                              onClick={() => generateReceipt(reservation)}
                              className="p-2 sm:p-3 rounded-lg sm:rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-600 transition-all duration-300"
                              title="Generate Receipt"
                              aria-label="Generate Receipt"
                            >
                              <Receipt className="w-4 h-4 sm:w-5 sm:h-5" />
                            </button>
                            <button
                              onClick={() => handleEditReservation(reservation)}
                              className="p-2 sm:p-3 rounded-lg sm:rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-600 transition-all duration-300"
                              title="Edit Reservation"
                              aria-label="Edit Reservation"
                            >
                              <Edit2 className="w-4 h-4 sm:w-5 sm:h-5" />
                            </button>
                            <button
                              onClick={() => handleDeleteReservation(reservation.id)}
                              className="p-2 sm:p-3 rounded-lg sm:rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 transition-all duration-300"
                              title="Delete Reservation"
                              aria-label="Delete Reservation"
                            >
                              <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                            </button>
                          </div>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                          <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 sm:gap-4">
                            <div className="flex items-center gap-2 text-gray-600">
                              <Calendar className="w-4 h-4 text-blue-400 flex-shrink-0" />
                              <span className="text-xs sm:text-sm">
                                {new Date(reservation.checkIn).toLocaleDateString()} (8 PM) - {new Date(reservation.checkOut).toLocaleDateString()} (6 PM)
                              </span>
                            </div>
                            <div className="text-xs sm:text-sm text-gray-500">
                              🌙 {reservation.nights} night{reservation.nights > 1 ? 's' : ''} @ ${reservation.pricePerNight}/night
                            </div>
                          </div>
                          <div className="flex items-center justify-between sm:justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100">
                            <span className="text-xs text-gray-400 sm:hidden">Total</span>
                            <p className="text-xl sm:text-2xl font-bold text-emerald-600">${reservation.totalPrice.toLocaleString()}</p>
                          </div>
                        </div>
                        {/* Deposit Status */}
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-3 border-t border-gray-100">
                          <div className="flex items-center gap-2">
                            {reservation.depositPaid ? (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-medium">
                                <CheckCircle className="w-3.5 h-3.5" />
                                Deposit Paid (${depositAmount.toLocaleString()})
                              </span>
                            ) : (
                              <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${
                                isDepositDueSoon ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'
                              }`}>
                                <Clock className="w-3.5 h-3.5" />
                                {isDepositDueSoon ? 'Deposit Due!' : 'Deposit Pending'} (${depositAmount.toLocaleString()})
                              </span>
                            )}
                          </div>
                          <button
                            onClick={() => handleToggleDeposit(reservation.id, reservation.depositPaid)}
                            className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-all ${
                              reservation.depositPaid
                                ? 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                                : 'bg-emerald-500 hover:bg-emerald-600 text-white'
                            }`}
                          >
                            {reservation.depositPaid ? 'Mark Unpaid' : 'Mark as Paid'}
                          </button>
                        </div>
                        {/* Full Payment Status */}
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-3 border-t border-gray-100">
                          <div className="flex items-center gap-2">
                            {reservation.fullPaymentPaid ? (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-medium">
                                <CheckCircle className="w-3.5 h-3.5" />
                                Full Payment Received (${reservation.totalPrice.toLocaleString()})
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 text-gray-600 text-xs font-medium">
                                <Clock className="w-3.5 h-3.5" />
                                Balance Pending (${getRemainingBalance(reservation).toLocaleString()})
                              </span>
                            )}
                          </div>
                          <button
                            onClick={() => handleToggleFullPayment(reservation.id, reservation.fullPaymentPaid)}
                            className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-all ${
                              reservation.fullPaymentPaid
                                ? 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                                : 'bg-emerald-500 hover:bg-emerald-600 text-white'
                            }`}
                          >
                            {reservation.fullPaymentPaid ? 'Mark Unpaid' : 'Mark as Paid'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Calendar Tab */}
        {activeTab === 'calendar' && (
          <div className="space-y-4 sm:space-y-6">
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-xl p-2.5 sm:p-6 overflow-hidden">
              <div className="flex items-center justify-between mb-3 sm:mb-6">
                <button
                  onClick={() => setCalendarMonth(m => {
                    const d = new Date(m)
                    d.setMonth(d.getMonth() - 1)
                    return d
                  })}
                  className="p-1.5 sm:p-2 rounded-xl hover:bg-gray-100 text-gray-500 transition-all flex-shrink-0"
                  aria-label="Previous month"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <h3 className="text-sm sm:text-xl font-bold text-gray-800 truncate px-1">
                  {calendarMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
                </h3>
                <button
                  onClick={() => setCalendarMonth(m => {
                    const d = new Date(m)
                    d.setMonth(d.getMonth() + 1)
                    return d
                  })}
                  className="p-1.5 sm:p-2 rounded-xl hover:bg-gray-100 text-gray-500 transition-all flex-shrink-0"
                  aria-label="Next month"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-7 gap-0.5 sm:gap-2 mb-1 sm:mb-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                  <div key={d} className="text-center text-[10px] sm:text-xs font-semibold text-gray-400 py-1">
                    <span className="sm:hidden">{d[0]}</span>
                    <span className="hidden sm:inline">{d}</span>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-0.5 sm:gap-2">
                {buildCalendarGrid(calendarMonth).map((date, i) => {
                  if (!date) return <div key={`empty-${i}`} />
                  const dayReservations = getReservationsForDay(date)
                  const isToday = date.toDateString() === new Date().toDateString()
                  return (
                    <div
                      key={date.toISOString()}
                      className={`min-h-12 sm:min-h-24 rounded sm:rounded-xl border p-0.5 sm:p-1.5 overflow-hidden ${
                        isToday ? 'border-blue-400 bg-blue-50/50' : 'border-gray-100'
                      }`}
                    >
                      <div className={`text-[10px] sm:text-xs font-medium mb-0.5 sm:mb-1 ${isToday ? 'text-blue-600' : 'text-gray-400'}`}>
                        {date.getDate()}
                      </div>
                      <div className="space-y-0.5">
                        {dayReservations.slice(0, 2).map(r => (
                          <button
                            key={r.id}
                            onClick={() => {
                              handleEditReservation(r)
                              setActiveTab('reservations')
                            }}
                            title={`${r.guestName} — ${r.checkIn} to ${r.checkOut}`}
                            className={`block w-full text-left px-0.5 sm:px-1.5 py-0.5 rounded text-[8px] sm:text-xs leading-tight truncate transition-all ${
                              r.fullPaymentPaid
                                ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                                : r.depositPaid
                                  ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                                  : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                            }`}
                          >
                            {r.guestName}
                          </button>
                        ))}
                        {dayReservations.length > 2 && (
                          <div className="text-[8px] sm:text-[10px] text-gray-400 px-0.5">+{dayReservations.length - 2}</div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="flex flex-wrap gap-3 sm:gap-4 mt-4 sm:mt-6 pt-4 border-t border-gray-100 text-xs text-gray-500">
                <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span> Fully paid</div>
                <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-400"></span> Deposit paid</div>
                <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span> Unpaid</div>
              </div>
            </div>
          </div>
        )}

        {/* Expenses Tab */}
        {activeTab === 'expenses' && (
          <div className="space-y-6">
            {/* Add Button */}
            {!showExpenseForm && (
              <button
                onClick={() => setShowExpenseForm(true)}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-rose-500 to-red-500 hover:from-rose-600 hover:to-red-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <Plus className="w-5 h-5" />
                Add Expense
              </button>
            )}

            {/* Expense Form */}
            {showExpenseForm && (
              <div className="bg-white rounded-xl sm:rounded-2xl shadow-xl p-4 sm:p-6 border border-rose-100">
                <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <DollarSign className="w-5 h-5 sm:w-6 sm:h-6 text-rose-500" />
                  {editingExpense ? 'Edit Expense' : 'New Expense'}
                </h3>
                <form onSubmit={handleSaveExpense} className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-gray-600 text-sm font-medium mb-2">Description</label>
                    <input
                      type="text"
                      value={expenseForm.description}
                      onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                      placeholder="Enter expense description"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-400 focus:border-transparent transition-all"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-gray-600 text-sm font-medium mb-2">Amount ($)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={expenseForm.amount}
                      onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                      placeholder="0.00"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-400 focus:border-transparent transition-all"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-gray-600 text-sm font-medium mb-2">Date</label>
                    <input
                      type="date"
                      value={expenseForm.date}
                      onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-400 focus:border-transparent transition-all"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-gray-600 text-sm font-medium mb-2">Category</label>
                    <select
                      value={expenseForm.category}
                      onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-400 focus:border-transparent transition-all"
                    >
                      {EXPENSE_CATEGORIES.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="sm:col-span-2 flex flex-col sm:flex-row gap-2 sm:gap-3 mt-2">
                    <button
                      type="submit"
                      disabled={saving}
                      className="flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-rose-500 to-red-500 hover:from-rose-600 hover:to-red-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {saving ? <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" /> : <Check className="w-4 h-4 sm:w-5 sm:h-5" />}
                      {saving ? 'Saving...' : (editingExpense ? 'Update' : 'Save')}
                    </button>
                    <button
                      type="button"
                      onClick={resetExpenseForm}
                      className="flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-all duration-300 text-sm sm:text-base"
                    >
                      <X className="w-4 h-4 sm:w-5 sm:h-5" />
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Expenses List */}
            {expenses.length === 0 ? (
              <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-8 sm:p-12 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-rose-50 mb-4">
                  <DollarSign className="w-8 h-8 sm:w-10 sm:h-10 text-rose-400" />
                </div>
                <h3 className="text-lg sm:text-xl font-semibold text-gray-700 mb-2">No Expenses Yet</h3>
                <p className="text-gray-400 text-sm sm:text-base">Track your expenses to see where your money goes!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:gap-4">
                {expenses.map(expense => {
                  const CategoryIcon = getCategoryIcon(expense.category)
                  return (
                    <div
                      key={expense.id}
                      className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 border border-gray-100 hover:shadow-xl transition-all duration-300"
                    >
                      <div className="flex flex-col gap-3 sm:gap-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-gradient-to-br from-rose-400 to-red-500 flex items-center justify-center flex-shrink-0">
                              <CategoryIcon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                            </div>
                            <div className="min-w-0">
                              <h4 className="text-base sm:text-lg font-semibold text-gray-800 truncate">{expense.description}</h4>
                              <div className="flex flex-wrap items-center gap-2 mt-1">
                                <span className="inline-flex items-center px-2 sm:px-3 py-0.5 sm:py-1 rounded-full bg-rose-50 text-rose-600 text-xs font-medium">
                                  {getCategoryLabel(expense.category)}
                                </span>
                                <span className="text-xs sm:text-sm text-gray-400">
                                  {new Date(expense.date).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-1.5 sm:gap-2 flex-shrink-0">
                            <button
                              onClick={() => handleEditExpense(expense)}
                              className="p-2 sm:p-3 rounded-lg sm:rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-600 transition-all duration-300"
                              title="Edit Expense"
                              aria-label="Edit Expense"
                            >
                              <Edit2 className="w-4 h-4 sm:w-5 sm:h-5" />
                            </button>
                            <button
                              onClick={() => handleDeleteExpense(expense.id)}
                              className="p-2 sm:p-3 rounded-lg sm:rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 transition-all duration-300"
                              title="Delete Expense"
                              aria-label="Delete Expense"
                            >
                              <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                            </button>
                          </div>
                        </div>
                        <div className="flex items-center justify-between pt-2 border-t border-gray-100 sm:hidden">
                          <span className="text-xs text-gray-400">Amount</span>
                          <p className="text-xl font-bold text-rose-600">-${expense.amount.toLocaleString()}</p>
                        </div>
                        <p className="hidden sm:block text-2xl font-bold text-rose-600 text-right">-${expense.amount.toLocaleString()}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div className="space-y-4 sm:space-y-6">
            {/* Export Buttons */}
            <div className="flex flex-wrap gap-2 sm:gap-3">
              <button
                onClick={exportFullReport}
                className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 text-sm"
              >
                <Download className="w-4 h-4" />
                Full Report
              </button>
              <button
                onClick={exportAnalytics}
                className="flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-gray-50 text-gray-700 font-medium rounded-xl shadow-md border border-gray-200 transition-all duration-300 text-sm"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Monthly CSV
              </button>
              <button
                onClick={exportReservations}
                className="flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-gray-50 text-gray-700 font-medium rounded-xl shadow-md border border-gray-200 transition-all duration-300 text-sm"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Reservations
              </button>
              <button
                onClick={exportExpenses}
                className="flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-gray-50 text-gray-700 font-medium rounded-xl shadow-md border border-gray-200 transition-all duration-300 text-sm"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Expenses
              </button>
            </div>

            {monthlyData.length === 0 ? (
              <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-8 sm:p-12 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-blue-50 mb-4">
                  <TrendingUp className="w-8 h-8 sm:w-10 sm:h-10 text-blue-400" />
                </div>
                <h3 className="text-lg sm:text-xl font-semibold text-gray-700 mb-2">No Data Yet</h3>
                <p className="text-gray-400 text-sm sm:text-base">Add reservations and expenses to see analytics!</p>
              </div>
            ) : (
              <>
                {/* Monthly Trend Line Chart */}
                <div className="bg-white rounded-xl sm:rounded-2xl shadow-xl p-4 sm:p-6">
                  <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-4 sm:mb-6 flex items-center gap-2">
                    📈 Monthly Trend
                  </h3>
                  <div className="h-64 sm:h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={monthlyData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="month" stroke="#6b7280" fontSize={10} tick={{ fontSize: 10 }} />
                        <YAxis stroke="#6b7280" fontSize={10} tick={{ fontSize: 10 }} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#fff',
                            border: 'none',
                            borderRadius: '12px',
                            boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
                            fontSize: '12px'
                          }}
                          formatter={(value) => [`$${value.toLocaleString()}`, '']}
                        />
                        <Legend wrapperStyle={{ fontSize: '12px' }} />
                        <Line
                          type="monotone"
                          dataKey="income"
                          stroke="#10b981"
                          strokeWidth={2}
                          dot={{ fill: '#10b981', strokeWidth: 2, r: 3 }}
                          name="Income"
                        />
                        <Line
                          type="monotone"
                          dataKey="expenses"
                          stroke="#f43f5e"
                          strokeWidth={2}
                          dot={{ fill: '#f43f5e', strokeWidth: 2, r: 3 }}
                          name="Expenses"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Monthly Comparison Bar Chart */}
                <div className="bg-white rounded-xl sm:rounded-2xl shadow-xl p-4 sm:p-6">
                  <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-4 sm:mb-6 flex items-center gap-2">
                    📊 Monthly Comparison
                  </h3>
                  <div className="h-64 sm:h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={monthlyData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="month" stroke="#6b7280" fontSize={10} tick={{ fontSize: 10 }} />
                        <YAxis stroke="#6b7280" fontSize={10} tick={{ fontSize: 10 }} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#fff',
                            border: 'none',
                            borderRadius: '12px',
                            boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
                            fontSize: '12px'
                          }}
                          formatter={(value) => [`$${value.toLocaleString()}`, '']}
                        />
                        <Legend wrapperStyle={{ fontSize: '12px' }} />
                        <Bar dataKey="income" fill="#10b981" radius={[4, 4, 0, 0]} name="Income" />
                        <Bar dataKey="expenses" fill="#f43f5e" radius={[4, 4, 0, 0]} name="Expenses" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Settings Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <Lock className="w-5 h-5 text-blue-500" />
                Settings
              </h3>
              <button
                onClick={() => {
                  setShowPasswordModal(false)
                  setNewPassword('')
                  setConfirmPassword('')
                  setPasswordError('')
                }}
                className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-6 pb-6 border-b border-gray-100">
              <h4 className="text-sm font-semibold text-gray-700 mb-1">Default Deposit Percentage</h4>
              <p className="text-xs text-gray-400 mb-3">Used to auto-suggest the deposit on new reservations. You can still enter any flat amount per booking.</p>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={depositPercentInput}
                    onChange={(e) => setDepositPercentInput(e.target.value)}
                    className="w-full pl-4 pr-8 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span>
                </div>
                <button
                  type="button"
                  onClick={handleSaveDepositPercent}
                  disabled={savingDepositPercent}
                  className="px-4 py-2.5 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-xl transition-all duration-300 disabled:opacity-50"
                >
                  {savingDepositPercent ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
                </button>
              </div>
            </div>

            <h4 className="text-sm font-semibold text-gray-700 mb-3">Change Password</h4>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-gray-600 text-sm font-medium mb-2">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all"
                  required
                />
              </div>
              <div>
                <label className="block text-gray-600 text-sm font-medium mb-2">Confirm Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all"
                  required
                />
              </div>
              {passwordError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
                  {passwordError}
                </div>
              )}
              <div className="flex gap-3 mt-6">
                <button
                  type="submit"
                  className="flex-1 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  Update Password
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordModal(false)
                    setNewPassword('')
                    setConfirmPassword('')
                    setPasswordError('')
                  }}
                  className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-all duration-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payment Check Popup (opened from a notification tap) */}
      {paymentCheck && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-800">
                {paymentCheck.checkType === 'fullPayment' ? 'Full Payment Check' : 'Deposit Check'}
              </h3>
            </div>
            <p className="text-gray-600 text-sm mb-1">
              Has <span className="font-semibold">{paymentCheck.reservation.guestName}</span>'s {paymentCheck.checkType === 'fullPayment' ? 'remaining balance' : 'deposit'} been paid?
            </p>
            <p className="text-2xl font-bold text-amber-600 mb-6">
              ${(paymentCheck.checkType === 'fullPayment' ? getRemainingBalance(paymentCheck.reservation) : paymentCheck.reservation.depositAmount).toLocaleString()}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => handlePaymentCheckResponse(true)}
                className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl transition-all duration-300"
              >
                Paid
              </button>
              <button
                onClick={() => handlePaymentCheckResponse(false)}
                className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-all duration-300"
              >
                Not Yet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Dialog */}
      {confirmDialog && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-800">{confirmDialog.title}</h3>
            </div>
            <p className="text-gray-500 text-sm mb-6">{confirmDialog.message}</p>
            <div className="flex gap-3">
              <button
                onClick={confirmDialog.onConfirm}
                className="flex-1 py-2.5 bg-rose-500 hover:bg-rose-600 text-white font-semibold rounded-xl transition-all duration-300"
              >
                Delete
              </button>
              <button
                onClick={() => setConfirmDialog(null)}
                className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-all duration-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-[60] w-[calc(100%-2rem)] max-w-sm px-4">
          <div className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border text-sm font-medium ${
            toast.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}>
            {toast.type === 'success' ? (
              <CheckCircle className="w-5 h-5 flex-shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            )}
            <span className="flex-1">{toast.message}</span>
            <button onClick={() => setToast(null)} className="flex-shrink-0 opacity-60 hover:opacity-100">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-white/50 backdrop-blur-sm border-t border-gray-200 py-4 sm:py-6 mt-6 sm:mt-8">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 text-center">
          <p className="text-gray-500 text-xs sm:text-sm">
            🏊 Amir's Chalet - Luxury Pool Retreat Management | Lebanon 🇱🇧
          </p>
        </div>
      </footer>
    </div>
  )
}

export default App
