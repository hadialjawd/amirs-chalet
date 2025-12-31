import { useState, useEffect } from 'react'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'
import {
  Calendar, Users, DollarSign, TrendingUp, LogOut, Plus, Edit2, Trash2, X, Check,
  Wrench, Zap, Sparkles, Waves, Package, MoreHorizontal, Mail, ArrowRight, Home, Loader2,
  Download, FileSpreadsheet, Image
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
  const [authError, setAuthError] = useState('')

  // App state
  const [activeTab, setActiveTab] = useState('reservations')
  const [reservations, setReservations] = useState([])
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Form state
  const [showReservationForm, setShowReservationForm] = useState(false)
  const [showExpenseForm, setShowExpenseForm] = useState(false)
  const [editingReservation, setEditingReservation] = useState(null)
  const [editingExpense, setEditingExpense] = useState(null)

  // Reservation form
  const [reservationForm, setReservationForm] = useState({
    guestName: '',
    checkIn: '',
    checkOut: '',
    guests: 1,
    pricePerNight: ''
  })

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

  const loadData = async () => {
    setLoading(true)
    try {
      const [reservationsData, expensesData] = await Promise.all([
        db.getReservations(),
        db.getExpenses()
      ])
      setReservations(reservationsData)
      setExpenses(expensesData)
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Calculate nights between dates
  const calculateNights = (checkIn, checkOut) => {
    const start = new Date(checkIn)
    const end = new Date(checkOut)
    return Math.ceil((end - start) / (1000 * 60 * 60 * 24))
  }

  // Auth handlers
  const handleSendMagicLink = async (e) => {
    e.preventDefault()
    setAuthError('')

    if (loginEmail) {
      // Check if email is allowed
      const emailLower = loginEmail.toLowerCase().trim()
      if (!ALLOWED_EMAILS.map(e => e.toLowerCase()).includes(emailLower)) {
        setAuthError('Access denied. This email is not authorized.')
        return
      }

      // Log in directly (in production, this would send a real magic link email)
      try {
        await db.createUser(loginEmail)
      } catch (error) {
        console.error('Error creating user:', error)
      }
      localStorage.setItem(STORAGE_KEYS.AUTH, JSON.stringify({ email: loginEmail }))
      setIsAuthenticated(true)
      setUserEmail(loginEmail)
      setLoginEmail('')
    }
  }

  const handleLogout = () => {
    localStorage.removeItem(STORAGE_KEYS.AUTH)
    setIsAuthenticated(false)
    setUserEmail('')
  }

  // Reservation handlers
  const resetReservationForm = () => {
    setReservationForm({
      guestName: '',
      checkIn: '',
      checkOut: '',
      guests: 1,
      pricePerNight: ''
    })
    setEditingReservation(null)
    setShowReservationForm(false)
  }

  const handleSaveReservation = async (e) => {
    e.preventDefault()
    setSaving(true)
    const nights = calculateNights(reservationForm.checkIn, reservationForm.checkOut)
    const totalPrice = nights * Number(reservationForm.pricePerNight)

    try {
      const reservationData = {
        guestName: reservationForm.guestName,
        checkIn: reservationForm.checkIn,
        checkOut: reservationForm.checkOut,
        guests: Number(reservationForm.guests),
        pricePerNight: Number(reservationForm.pricePerNight),
        nights,
        totalPrice
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
      }
      resetReservationForm()
    } catch (error) {
      console.error('Error saving reservation:', error)
      alert('Failed to save reservation. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleEditReservation = (reservation) => {
    setReservationForm({
      guestName: reservation.guestName,
      checkIn: reservation.checkIn,
      checkOut: reservation.checkOut,
      guests: reservation.guests,
      pricePerNight: reservation.pricePerNight
    })
    setEditingReservation(reservation)
    setShowReservationForm(true)
  }

  const handleDeleteReservation = async (id) => {
    if (confirm('Are you sure you want to delete this reservation?')) {
      try {
        await db.deleteReservation(id)
        setReservations(reservations.filter(r => r.id !== id))
      } catch (error) {
        console.error('Error deleting reservation:', error)
        alert('Failed to delete reservation. Please try again.')
      }
    }
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
      }
      resetExpenseForm()
    } catch (error) {
      console.error('Error saving expense:', error)
      alert('Failed to save expense. Please try again.')
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

  const handleDeleteExpense = async (id) => {
    if (confirm('Are you sure you want to delete this expense?')) {
      try {
        await db.deleteExpense(id)
        setExpenses(expenses.filter(e => e.id !== id))
      } catch (error) {
        console.error('Error deleting expense:', error)
        alert('Failed to delete expense. Please try again.')
      }
    }
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
      checkin: r.checkIn,
      checkout: r.checkOut,
      guests: r.guests,
      pricepernight: r.pricePerNight,
      nights: r.nights,
      totalprice: r.totalPrice
    }))
    exportToCSV(data, 'reservations.csv', ['GuestName', 'CheckIn', 'CheckOut', 'Guests', 'PricePerNight', 'Nights', 'TotalPrice'])
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
      'Guest Name,Check-In,Check-Out,Guests,Price/Night,Nights,Total',
      ...reservations.map(r => `${r.guestName},${r.checkIn},${r.checkOut},${r.guests},$${r.pricePerNight},${r.nights},$${r.totalPrice}`),
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

            <form onSubmit={handleSendMagicLink} className="space-y-4">
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
                onClick={handleLogout}
                className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-all duration-300"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline text-sm">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Summary Cards */}
      <div className="max-w-7xl mx-auto px-3 sm:px-4 -mt-4 sm:-mt-6 relative z-10">
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
                    <label className="block text-gray-600 text-sm font-medium mb-2">Check-in Date <span className="text-blue-500">(8 PM)</span></label>
                    <input
                      type="date"
                      value={reservationForm.checkIn}
                      onChange={(e) => setReservationForm({ ...reservationForm, checkIn: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-gray-600 text-sm font-medium mb-2">Check-out Date <span className="text-blue-500">(6 PM)</span></label>
                    <input
                      type="date"
                      value={reservationForm.checkOut}
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
                    <label className="block text-gray-600 text-sm font-medium mb-2">Price per Night ($)</label>
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
                {reservations.map(reservation => (
                  <div
                    key={reservation.id}
                    className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 border border-gray-100 hover:shadow-xl transition-all duration-300"
                  >
                    <div className="flex flex-col gap-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center flex-shrink-0">
                            <Users className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-base sm:text-lg font-semibold text-gray-800 truncate">{reservation.guestName}</h4>
                            <p className="text-xs sm:text-sm text-gray-400">{reservation.guests} guest{reservation.guests > 1 ? 's' : ''}</p>
                          </div>
                        </div>
                        <div className="flex gap-1.5 sm:gap-2 flex-shrink-0">
                          <button
                            onClick={() => handleEditReservation(reservation)}
                            className="p-2 sm:p-3 rounded-lg sm:rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-600 transition-all duration-300"
                          >
                            <Edit2 className="w-4 h-4 sm:w-5 sm:h-5" />
                          </button>
                          <button
                            onClick={() => handleDeleteReservation(reservation.id)}
                            className="p-2 sm:p-3 rounded-lg sm:rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 transition-all duration-300"
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
                    </div>
                  </div>
                ))}
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
                            >
                              <Edit2 className="w-4 h-4 sm:w-5 sm:h-5" />
                            </button>
                            <button
                              onClick={() => handleDeleteExpense(expense.id)}
                              className="p-2 sm:p-3 rounded-lg sm:rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 transition-all duration-300"
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
