import React, { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Box } from '@mui/material'

import Sidebar from './components/Sidebar'
import StudentDashboard from './pages/student/Dashboard'
import MySubjects from './pages/student/MySubjects'
import Assignments from './pages/student/Assignments'
import Profile from './pages/student/Profile'
import MyFees from './pages/student/MyFees'
import MyItems from './pages/student/MyItems'
import MyAfterSchoolClasses from './pages/student/MyAfterSchoolClasses'

import TeacherSidebar from './components/TeacherSidebar'
import TeacherDashboard from './pages/teacher/Dashboard'
import MyClass from './pages/teacher/MyClass'
import EnterMarks from './pages/teacher/EnterMarks'
import ManageStudents from './pages/teacher/ManageStudents'
import TeacherProfile from './pages/teacher/Profile'

import AdminSidebar from './components/AdminSidebar'
import AdminDashboard from './pages/admin/Dashboard'
import UserManagement from './pages/admin/UserManagement'
import SchemaManagement from './pages/admin/SchemaManagement'
import AdminProfile from './pages/admin/Profile'
import ClassDetails from './pages/admin/ClassDetails'
import ItemsManagement from './pages/admin/ItemsManagement'
import Settings from './pages/admin/Settings'

import ParentSidebar from './components/ParentSidebar'
import ParentDashboard from './pages/parent/Dashboard'
import ParentFees from './pages/parent/Fees'
import ParentItems from './pages/parent/Items'
import ParentReceipts from './pages/parent/Receipts'
import ParentPaymentRequests from './pages/parent/PaymentRequests'
import ParentMarks from './pages/parent/Marks'
import ParentProfile from './pages/parent/Profile'

import Login from './pages/Login'
import ForgotPassword from './pages/ForgotPassword'
import VerifyOtp from './pages/VerifyOtp'
import ResetPassword from './pages/ResetPassword'
import { decodeJwtPayload } from './lib/api'

interface UserData {
  email: string
  role: string
  name?: string
  token?: string
}

/** Normalize backend role (ADMIN/TEACHER/STUDENT) to lowercase for UI. */
function normalizeRole(role: string): string {
  const r = (role || '').toString().trim().toLowerCase()
  if (r === 'super_admin' || r === 'administrator') return 'admin'
  if (r === 'admin' || r === 'teacher' || r === 'student' || r === 'parent' || r === 'staff') return r
  return 'student'
}

const App: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false)
  const [userRole, setUserRole] = useState<string>('')
  const [selectedPage, setSelectedPage] = useState<string>('Dashboard')
  const [authPage, setAuthPage] = useState<'login' | 'forgot-password' | 'verify-otp' | 'reset-password'>('login')
  const [resetPasswordEmail, setResetPasswordEmail] = useState<string>('')
  const [resetTokenForPassword, setResetTokenForPassword] = useState<string | null>(null)
  const [forgotPasswordInitialEmail, setForgotPasswordInitialEmail] = useState<string>('')

  useEffect(() => {
    const userStr = localStorage.getItem('user') || sessionStorage.getItem('user')
    if (!userStr) return
    try {
      const user: UserData = JSON.parse(userStr)
      let role = normalizeRole((user.role || '').toString())
      if (user.token) {
        const payload = decodeJwtPayload(user.token)
        const tokenRole = payload.role ? normalizeRole(payload.role.toString()) : ''
        if (tokenRole) role = tokenRole
      }
      setIsAuthenticated(true)
      setUserRole(role)
    } catch {
      localStorage.removeItem('user')
      sessionStorage.removeItem('user')
      setIsAuthenticated(false)
      setUserRole('')
    }
  }, [])

  // When authenticated, read initial page from URL (?page=...)
  useEffect(() => {
    if (!isAuthenticated) return
    const pageFromUrl = searchParams.get('page')
    if (pageFromUrl && pageFromUrl.trim()) {
      setSelectedPage(pageFromUrl.trim())
    }
  }, [isAuthenticated])

  const handleLogin = () => {
    const userStr = localStorage.getItem('user') || sessionStorage.getItem('user')
    if (!userStr) return
    try {
      const user: UserData = JSON.parse(userStr)
      let role = normalizeRole((user.role || '').toString())
      if (user.token) {
        const payload = decodeJwtPayload(user.token)
        const tokenRole = payload.role ? normalizeRole(payload.role.toString()) : ''
        if (tokenRole) role = tokenRole
      }
      setIsAuthenticated(true)
      setUserRole(role)
    } catch {
      localStorage.removeItem('user')
      sessionStorage.removeItem('user')
      setIsAuthenticated(false)
      setUserRole('')
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('user')
    sessionStorage.removeItem('user')
    setIsAuthenticated(false)
    setUserRole('')
    setSelectedPage('Dashboard')
    setSearchParams({}, { replace: true })
  }

  const handlePageSelect = (page: string) => {
    if (page === 'Logout') {
      handleLogout()
    } else {
      setSelectedPage(page)
      setSearchParams({ page }, { replace: true })
    }
  }

  const renderStudentPage = () => {
    switch (selectedPage) {
      case 'Dashboard':
        return <StudentDashboard onSelectPage={handlePageSelect} />
      case 'My Subjects':
        return <MySubjects />
      case 'Payment History':
        return <MyFees />
      case 'Payment Details':
        return <MyItems />
      case 'After-School Classes':
        return <MyAfterSchoolClasses />
      case 'Assignments & Grades':
        return <Assignments />
      case 'Profile & Settings':
        return <Profile />
      default:
        return <StudentDashboard />
    }
  }

  const renderTeacherPage = () => {
    switch (selectedPage) {
      case 'Dashboard':
        return <TeacherDashboard onSelectPage={handlePageSelect} />
      case 'My Class':
        return <MyClass />
      case 'Enter Marks':
        return <EnterMarks />
      case 'Manage Students':
        return <ManageStudents />
      case 'Profile':
        return <TeacherProfile />
      default:
        return <TeacherDashboard />
    }
  }

  const renderAdminPage = () => {
    switch (selectedPage) {
      case 'Dashboard':
        return <AdminDashboard onSelectPage={handlePageSelect} />
      case 'User Management':
        return <UserManagement />
      case 'Subjects':
        return <SchemaManagement />
      case 'Class Details':
        return <ClassDetails />
      case 'Payments':
        return <ItemsManagement />
      case 'Settings':
        return <Settings />
      case 'Profile':
        return <AdminProfile />
      default:
        return <AdminDashboard />
    }
  }

  /** Staff shares Admin's pages, minus Settings — which page(s) render is further gated by
   *  the Super Admin's toggles in Settings (AdminSidebar hides pages Staff isn't allowed;
   *  the backend rejects the underlying API calls either way). */
  const renderStaffPage = () => {
    switch (selectedPage) {
      case 'Dashboard':
        return <AdminDashboard onSelectPage={handlePageSelect} />
      case 'User Management':
        return <UserManagement />
      case 'Subjects':
        return <SchemaManagement />
      case 'Class Details':
        return <ClassDetails />
      case 'Payments':
        return <ItemsManagement />
      case 'Profile':
        return <AdminProfile />
      default:
        return <AdminDashboard />
    }
  }

  const renderParentPage = () => {
    switch (selectedPage) {
      case 'Fees':
        return <ParentFees />
      case 'Items':
        return <ParentItems />
      case 'Receipts':
        return <ParentReceipts />
      case 'Payment Requests':
        return <ParentPaymentRequests />
      case 'Marks':
        return <ParentMarks />
      case 'Profile':
        return <ParentProfile />
      case 'Dashboard':
      default:
        return <ParentDashboard />
    }
  }

  if (!isAuthenticated) {
    if (authPage === 'forgot-password') {
      return (
        <ForgotPassword
          initialEmail={forgotPasswordInitialEmail}
          onBack={() => {
            setForgotPasswordInitialEmail('')
            setAuthPage('login')
          }}
          onSuccess={(email: string) => {
            setResetPasswordEmail(email)
            setAuthPage('verify-otp')
          }}
        />
      )
    }
    if (authPage === 'verify-otp') {
      return (
        <VerifyOtp
          email={resetPasswordEmail}
          onBack={() => setAuthPage('forgot-password')}
          onSuccess={(email: string, resetToken: string) => {
            setResetPasswordEmail(email)
            setResetTokenForPassword(resetToken)
            setAuthPage('reset-password')
          }}
        />
      )
    }
    if (authPage === 'reset-password') {
      if (resetTokenForPassword && resetPasswordEmail) {
        return (
          <ResetPassword
            email={resetPasswordEmail}
            resetToken={resetTokenForPassword}
            onBack={() => {
              setResetTokenForPassword(null)
              setAuthPage('verify-otp')
            }}
            onSuccess={() => {
              setAuthPage('login')
              setResetPasswordEmail('')
              setResetTokenForPassword(null)
            }}
          />
        )
      }
      return (
        <VerifyOtp
          email={resetPasswordEmail || ''}
          onBack={() => setAuthPage('forgot-password')}
          onSuccess={(email: string, resetToken: string) => {
            setResetPasswordEmail(email)
            setResetTokenForPassword(resetToken)
            setAuthPage('reset-password')
          }}
        />
      )
    }
    return (
      <Login
        onLogin={handleLogin}
        onForgotPassword={(email) => {
          setForgotPasswordInitialEmail(email ?? '')
          setAuthPage('forgot-password')
        }}
      />
    )
  }

  const renderPortal = () => {
    switch (userRole) {
      case 'student':
        return (
          <>
            <Sidebar selectedPage={selectedPage} onSelectPage={handlePageSelect} />
            <Box
              component="main"
              sx={{
                flexGrow: 1,
                p: 4,
                backgroundColor: '#f9fafb',
              }}
            >
              <Box sx={{ maxWidth: 1400, margin: '0 auto' }}>
                {renderStudentPage()}
              </Box>
            </Box>
          </>
        )

      case 'teacher':
        return (
          <>
            <TeacherSidebar selectedPage={selectedPage} onSelectPage={handlePageSelect} />
            <Box
              component="main"
              sx={{
                flexGrow: 1,
                p: 4,
                backgroundColor: '#f9fafb',
              }}
            >
              <Box sx={{ maxWidth: 1400, margin: '0 auto' }}>
                {renderTeacherPage()}
              </Box>
            </Box>
          </>
        )

      case 'admin':
        return (
          <>
            <AdminSidebar selectedPage={selectedPage} onSelectPage={handlePageSelect} />
            <Box
              component="main"
              sx={{
                flexGrow: 1,
                p: 4,
                backgroundColor: '#f9fafb',
              }}
            >
              <Box sx={{ maxWidth: 1400, margin: '0 auto' }}>
                {renderAdminPage()}
              </Box>
            </Box>
          </>
        )

      case 'staff':
        return (
          <>
            <AdminSidebar selectedPage={selectedPage} onSelectPage={handlePageSelect} />
            <Box
              component="main"
              sx={{
                flexGrow: 1,
                p: 4,
                backgroundColor: '#f9fafb',
              }}
            >
              <Box sx={{ maxWidth: 1400, margin: '0 auto' }}>
                {renderStaffPage()}
              </Box>
            </Box>
          </>
        )

      case 'parent':
        return (
          <>
            <ParentSidebar selectedPage={selectedPage} onSelectPage={handlePageSelect} />
            <Box
              component="main"
              sx={{
                flexGrow: 1,
                p: 4,
                backgroundColor: '#f9fafb',
              }}
            >
              <Box sx={{ maxWidth: 1400, margin: '0 auto' }}>
                {renderParentPage()}
              </Box>
            </Box>
          </>
        )

      default:
        return (
          <Box textAlign="center" mt={10}>
            <h2>Invalid user role</h2>
            <p>Please contact support.</p>
          </Box>
        )
    }
  }

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f9fafb' }}>
      {renderPortal()}
    </Box>
  )
}

export default App
