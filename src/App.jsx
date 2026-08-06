import { useState, useEffect } from 'react'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'
import {
  Calendar, Users, DollarSign, TrendingUp, LogOut, Plus, Edit2, Trash2, X, Check,
  Wrench, Zap, Sparkles, Waves, Package, MoreHorizontal, Mail, ArrowRight, Home, Loader2,
  Download, FileSpreadsheet, Image, Phone, Receipt, Lock, Share2, CheckCircle, Clock, AlertTriangle, Bell, BellOff
} from 'lucide-react'
import * as db from './db'

const STORAGE_KEYS = {
  AUTH: 'amirs-chalet-auth'
}

// Allowed emails - only these can access the app
const ALLOWED_EMAILS = [
  'hadialjawad237@gmail.com',
  'amir.chalet@gmail.com'
]

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

  // Load auth from localStorage and data from Turso on mount
  useEffect(() => {
    const auth = localStorage.getItem(STORAGE_KEYS.AUTH)
    if (auth) {
      const { email } = JSON.parse(auth)
      setIsAuthenticated(true)
      setUserEmail(email)
    }
  }, [])

  // Load data from Turso when authenticated
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
      const [reservationsData, expensesData, depositPercentSetting] = await Promise.all([
        db.getReservations(),
        db.getExpenses(),
        db.getSetting('deposit_percent', '50')
      ])
      setReservations(reservationsData)
      setExpenses(expensesData)
      setDepositPercent(Number(depositPercentSetting))
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
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ actorEmail: userEmail, ...payload })
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
      // Check if email is allowed
      const emailLower = loginEmail.toLowerCase().trim()
      if (!ALLOWED_EMAILS.map(e => e.toLowerCase()).includes(emailLower)) {
        setAuthError('Access denied. This email is not authorized.')
        return
      }

      try {
        // Check if user exists (normalized email so case/whitespace can't create duplicate accounts)
        const user = await db.getUser(emailLower)

        if (!user) {
          // Create user and prompt for password setup
          await db.createUser(emailLower, loginPassword)
          localStorage.setItem(STORAGE_KEYS.AUTH, JSON.stringify({ email: emailLower }))
          setIsAuthenticated(true)
          setUserEmail(emailLower)
          setLoginEmail('')
          setLoginPassword('')
        } else if (!user.password) {
          // User exists but no password, set it
          await db.updateUserPassword(emailLower, loginPassword)
          localStorage.setItem(STORAGE_KEYS.AUTH, JSON.stringify({ email: emailLower }))
          setIsAuthenticated(true)
          setUserEmail(emailLower)
          setLoginEmail('')
          setLoginPassword('')
        } else {
          // Verify password
          const verified = await db.verifyUser(emailLower, loginPassword)
          if (verified) {
            localStorage.setItem(STORAGE_KEYS.AUTH, JSON.stringify({ email: emailLower }))
            setIsAuthenticated(true)
            setUserEmail(emailLower)
            setLoginEmail('')
            setLoginPassword('')
          } else {
            setAuthError('Invalid password. Please try again.')
          }
        }
      } catch (error) {
        console.error('Login error:', error)
        setAuthError('Login failed. Please try again.')
      }
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
      await db.updateUserPassword(userEmail, newPassword)
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
          notifyEvent({ type: 'full_payment_paid', guestName: reservation.guestName, amount: reservation.totalPrice })
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
          amount: isFullPayment ? reservation.totalPrice : reservation.depositAmount
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
      showToast('Failed to save reservation. Please try again.')
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

  // Calculate totals
  const totalIncome = reservations.reduce((sum, r) => sum + r.totalPrice, 0)
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0)
  const netProfit = totalIncome - totalExpenses

  // Prepare chart data
  const getMonthlyData = () => {
    const monthlyMap = {}

    reservations.forEach(r => {
      const month = r.checkIn.substring(0, 7)
      if (!monthlyMap[month]) {
        monthlyMap[month] = { month, income: 0, expenses: 0 }
      }
      monthlyMap[month].income += r.totalPrice
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

  // Render a receipt as a shareable PNG image
  const generateReceiptImage = (reservation) => {
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

    ctx.fillStyle = '#ffffff'
    ctx.textAlign = 'center'
    ctx.font = 'bold 30px Arial, sans-serif'
    ctx.fillText("🏠 Amir's Chalet", width / 2, 70)
    ctx.font = '15px Arial, sans-serif'
    ctx.fillStyle = 'rgba(255,255,255,0.9)'
    ctx.fillText('Luxury Pool Retreat - Lebanon 🇱🇧', width / 2, 100)

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
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 mb-4 shadow-lg">
                <Home className="w-10 h-10 text-white" />
              </div>
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
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center flex-shrink-0">
                <Home className="w-5 h-5 sm:w-7 sm:h-7 text-white" />
              </div>
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
            <p className="text-gray-400 text-xs mt-2 sm:mt-3">💰 From {reservations.length} reservations</p>
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
            { id: 'expenses', label: 'Expenses', icon: DollarSign },
            { id: 'analytics', label: 'Analytics', icon: TrendingUp }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-6 py-2.5 sm:py-3 rounded-xl font-medium transition-all duration-300 flex-1 sm:flex-none min-w-0 ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <tab.icon className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm sm:text-base truncate">{tab.label}</span>
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

            {/* Reservations List */}
            {reservations.length === 0 ? (
              <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-8 sm:p-12 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-blue-50 mb-4">
                  <Calendar className="w-8 h-8 sm:w-10 sm:h-10 text-blue-400" />
                </div>
                <h3 className="text-lg sm:text-xl font-semibold text-gray-700 mb-2">No Reservations Yet</h3>
                <p className="text-gray-400 text-sm sm:text-base">Add your first reservation to get started!</p>
              </div>
            ) : (
              <div className="grid gap-3 sm:gap-4">
                {reservations.map(reservation => {
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
                                Full Payment Pending (${reservation.totalPrice.toLocaleString()})
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
              <div className="grid gap-3 sm:gap-4">
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
              Has <span className="font-semibold">{paymentCheck.reservation.guestName}</span>'s {paymentCheck.checkType === 'fullPayment' ? 'full payment' : 'deposit'} been paid?
            </p>
            <p className="text-2xl font-bold text-amber-600 mb-6">
              ${(paymentCheck.checkType === 'fullPayment' ? paymentCheck.reservation.totalPrice : paymentCheck.reservation.depositAmount).toLocaleString()}
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
