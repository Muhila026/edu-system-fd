/**
 * API Client for FastAPI Backend
 * Connects frontend to the real backend API
 */

import { getCurrentUser } from './currentUser'

export { getCurrentUser }

const USE_MOCK_ONLY = false
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api/v1'

let backendConnected: boolean | null = null
let backendCheckInProgress = false

export type StudyTask = {
  id: string
  title: string
  subject: string
  type: string
  duration: string
  priority: 'High' | 'Medium' | 'Low'
  completed: boolean
}

export type AssignmentItem = {
  id: string
  title: string
  subject: string
  dueDate: string
  status: 'submitted' | 'pending' | 'in-progress' | 'overdue'
  grade: string | null
  score: number | null
  submittedDate: string | null
}

export type NotificationItem = {
  id: number
  type: string
  title: string
  message: string
  time: string
  read: boolean
  color: string
}

const USER_STORAGE_KEY = 'user'

/** Decode JWT payload (no verify; for role on init). Returns { role?: string } or {}. */
export function decodeJwtPayload(token: string): { role?: string; email?: string; user_id?: unknown } {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return {}
    const payload = JSON.parse(atob(parts[1]))
    return payload || {}
  } catch {
    return {}
  }
}

function getAuthToken(): string | null {
  let userStr = localStorage.getItem(USER_STORAGE_KEY)
  if (!userStr) userStr = sessionStorage.getItem(USER_STORAGE_KEY)
  if (userStr) {
    try {
      const user = JSON.parse(userStr)
      return user.token || null
    } catch {
      return null
    }
  }
  return null
}

const DEMO_USERS = [
  { email: 'student@edu.com', password: 'student123', role: 'student', name: 'John Doe' },
  { email: 'teacher@edu.com', password: 'teacher123', role: 'teacher', name: 'Dr. Emily Johnson' },
  { email: 'admin@edu.com', password: 'admin123', role: 'admin', name: 'Admin Smith' },
]

export async function checkBackendConnection(): Promise<boolean> {
  if (USE_MOCK_ONLY) {
    return true
  }

  if (backendCheckInProgress) {
    return backendConnected === true
  }

  try {
    backendCheckInProgress = true
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 3000)

    try {
      const response = await fetch(`${API_BASE_URL}/auth/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      })
      clearTimeout(timeoutId)
      backendConnected = response.ok
      return backendConnected
    } catch (error) {
      clearTimeout(timeoutId)
      throw error
    }
  } catch (error) {
    backendConnected = false
    console.warn('Backend not connected:', error)
    return false
  } finally {
    backendCheckInProgress = false
  }
}

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  if (USE_MOCK_ONLY) {
    throw new Error('Backend disabled (mock mode)')
  }

  const token = getAuthToken()
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  }

  if (token) {
    (headers as any)['Authorization'] = `Bearer ${token}`
  }

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000)

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
      signal: controller.signal,
    })
    clearTimeout(timeoutId)

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Request failed' }))
      const detail = error?.detail
      const message =
        typeof detail === 'string'
          ? detail
          : Array.isArray(detail)
            ? detail.map((err: any) => (err.loc ? err.loc.join('.') + ': ' + (err.msg || err.message) : err.msg || err.message)).join(', ')
            : detail && typeof detail === 'object' && (detail.message || detail.msg)
              ? (detail.message || detail.msg)
              : detail && typeof detail === 'object'
                ? JSON.stringify(detail)
                : `HTTP error! status: ${response.status}`
      throw new Error(message)
    }

    backendConnected = true
    return response.json()
  } catch (error: any) {
    if (error.name === 'AbortError' || error.name === 'TypeError' || error.message?.includes('Failed to fetch')) {
      backendConnected = false
      throw new Error(`Backend not connected. Please ensure the backend server is running at ${API_BASE_URL}`)
    }
    throw error
  }
}

/** Same-origin base for static files (uploaded proof images) — API_BASE_URL without the /api/v1 suffix. */
const API_ORIGIN = API_BASE_URL.replace(/\/api\/v1\/?$/, '')

export function resolveUploadUrl(path: string): string {
  return `${API_ORIGIN}${path}`
}

/** Like apiRequest, but for multipart/form-data (file upload) bodies — no Content-Type override, the browser sets the boundary. */
async function apiRequestFormData<T>(endpoint: string, formData: FormData, method: string = 'POST'): Promise<T> {
  const token = getAuthToken()
  const headers: HeadersInit = {}
  if (token) (headers as any)['Authorization'] = `Bearer ${token}`

  const response = await fetch(`${API_BASE_URL}${endpoint}`, { method, headers, body: formData })
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Request failed' }))
    throw new Error(typeof error?.detail === 'string' ? error.detail : 'Request failed')
  }
  return response.json()
}

export async function forgotPassword(email: string): Promise<{ message: string; otp?: string }> {
  try {
    return await apiRequest<{ message: string; otp?: string }>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    })
  } catch (error: any) {
    throw new Error(error.message || 'Failed to send password reset email')
  }
}

/** Verify OTP (from forgot-password flow). Returns resetToken to use with resetPassword. */
export async function verifyOtp(email: string, otpCode: string): Promise<{ resetToken: string; email: string }> {
  try {
    const res = await apiRequest<{ success: boolean; message: string; data?: { resetToken: string; email: string } }>('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ email, otpCode }),
    })
    if (!res.data?.resetToken) throw new Error('Invalid response from server')
    return res.data
  } catch (error: any) {
    throw new Error(error.message || 'Invalid or expired OTP. Please try again.')
  }
}

/**
 * Reset password. Backend accepts either:
 * - otpCode: 4-digit OTP from email (single request), or
 * - resetToken: from verifyOtp() (two-step flow).
 */
export async function resetPassword(
  email: string,
  newPassword: string,
  options: { otpCode?: string; resetToken?: string }
): Promise<{ message: string }> {
  const { otpCode, resetToken } = options
  if (!otpCode && !resetToken) {
    throw new Error('Provide either OTP code or reset token')
  }
  try {
    const body = otpCode
      ? { email, otpCode, newPassword }
      : { email, resetToken, newPassword }
    return await apiRequest<{ message: string }>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(body),
    })
  } catch (error: any) {
    throw new Error(error.message || 'Failed to reset password')
  }
}

/** Change password for current user (any role). */
export async function changePassword(currentPassword: string, newPassword: string): Promise<{ message: string }> {
  return await apiRequest<{ message: string }>('/auth/change-password', {
    method: 'POST',
    body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
  })
}

/** Admin: reset another user's password by user_id or email. */
export async function changeUserPassword(params: {
  user_id?: number
  email?: string
  new_password: string
}): Promise<void> {
  await apiRequest('/admin/change-user-password', {
    method: 'PUT',
    body: JSON.stringify(params),
  })
}

export async function login(email: string, password: string) {
  if (USE_MOCK_ONLY) {
    const demoUser = DEMO_USERS.find(
      (u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password
    )
    if (!demoUser) {
      throw new Error('Invalid credentials. Demo mode only.')
    }
    const mockResponse = {
      access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkZW1vLXVzZXIiLCJpYXQiOjE1MTYyMzkwMjJ9.demo-signature',
      token_type: 'Bearer',
      user: { email: demoUser.email, role: demoUser.role, name: demoUser.name },
    }
    const userData = {
      email: demoUser.email,
      role: demoUser.role,
      name: demoUser.name,
      token: mockResponse.access_token,
    }
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userData))
    sessionStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userData))
    return mockResponse
  }

  const isBackendAvailable = await checkBackendConnection()

  if (!isBackendAvailable) {
    throw new Error(
      `Backend server is not running. Please start the backend server at ${API_BASE_URL.replace('/api', '')} before logging in.`
    )
  }

  try {
    const response = await apiRequest<{
      success?: boolean
      data?: { token: string; email: string; firstName?: string; lastName?: string; role?: string }
      access_token?: string
      user?: { id?: number | string; email: string; role: string; name: string }
    }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })

    const raw = response as any
    const data = raw.data ?? raw
    const token = data.token ?? raw.access_token
    const emailVal = data.email ?? raw.user?.email
    const roleRaw = data.role ?? raw.user?.role ?? ''
    const role = typeof roleRaw === 'string' ? roleRaw.toLowerCase() : 'student'
    const normalizedRole = role === 'administrator' ? 'admin' : (role === 'user' ? 'student' : role)
    const first = (data as { firstName?: string; lastName?: string }).firstName
    const last = (data as { firstName?: string; lastName?: string }).lastName
    const name = raw.user?.name ?? ([first, last].filter(Boolean).join(' ') || emailVal)

    const userData = {
      email: (emailVal || '').toString().trim().toLowerCase(),
      role: normalizedRole,
      name: (name || emailVal || '').toString().trim(),
      token,
      id: raw.user?.id,
    }
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userData))
    sessionStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userData))
    return { access_token: token, token_type: 'Bearer', user: { ...userData } }
  } catch (error: any) {
    if (error.message?.includes('Backend not connected') || error.message?.includes('Failed to fetch')) {
      throw new Error(
        `Cannot connect to backend server at ${API_BASE_URL}. Please ensure the backend is running.`
      )
    }
    throw error
  }
}

/** Teacher: generic roster of students (used to seed marks entry dialogs). */
export type StudentListItem = { student_id: number; name: string; email: string }
export async function getAttendanceStudentList(): Promise<StudentListItem[]> {
  try {
    return await apiRequest<StudentListItem[]>('/teachers/student-roster')
  } catch {
    return []
  }
}

export type StudentTotalScore = {
  student_id: number
  total_score: number
  total_marks: number
  total_max_marks: number
  submission_count: number
}

/** Current student's total_score = (sum(marks)/sum(max_marks))*100. */
export async function getMyTotalScore(): Promise<StudentTotalScore | null> {
  try {
    return await apiRequest<StudentTotalScore | null>('/assignment-submissions/me/total-score')
  } catch {
    return null
  }
}

export async function getRecentActivities(): Promise<Array<{ activity: string; time: string }>> {
  try {
    return await apiRequest<Array<{ activity: string; time: string }>>('/students/dashboard/recent-activities')
  } catch (error) {
    console.error('Error fetching activities:', error)
    return [
      { activity: 'Completed Quiz: Algebra Basics', time: '2 hours ago' },
      { activity: "Watched Video: Newton's Laws", time: '5 hours ago' },
    ]
  }
}

export async function getUpcomingExams(): Promise<Array<{ subject: string; date: string; time: string }>> {
  try {
    return await apiRequest<Array<{ subject: string; date: string; time: string }>>('/students/dashboard/upcoming-exams')
  } catch (error) {
    console.error('Error fetching exams:', error)
    return [
      { subject: 'Mathematics', date: 'Nov 5, 2025', time: '10:00 AM' },
      { subject: 'Physics', date: 'Nov 8, 2025', time: '2:00 PM' },
    ]
  }
}

export async function getStudyTasks(): Promise<StudyTask[]> {
  try {
    return await apiRequest<StudyTask[]>('/students/study-plan/tasks')
  } catch (error) {
    console.error('Error fetching tasks:', error)
    return []
  }
}

export async function toggleTaskCompleted(id: string): Promise<StudyTask[]> {
  try {
    return await apiRequest<StudyTask[]>(`/students/study-plan/tasks/${id}/toggle`, {
      method: 'POST',
    })
  } catch (error) {
    console.error('Error toggling task:', error)
    return getStudyTasks()
  }
}

export async function getRecommendedVideos(): Promise<
  Array<{ title: string; channel: string; duration: string; thumbnail: string }>
> {
  try {
    return await apiRequest<Array<{ title: string; channel: string; duration: string; thumbnail: string }>>(
      '/students/study-plan/recommended-videos'
    )
  } catch (error) {
    console.error('Error fetching videos:', error)
    return [
      { title: 'Advanced Calculus Made Simple', channel: 'Math Academy', duration: '25 min', thumbnail: '📐' },
    ]
  }
}

export async function getWeeklyProgress(): Promise<{ tasksCompleted: [number, number]; studyHours: [number, number] }> {
  try {
    return await apiRequest<{ tasksCompleted: [number, number]; studyHours: [number, number] }>(
      '/students/study-plan/weekly-progress'
    )
  } catch (error) {
    console.error('Error fetching progress:', error)
    return { tasksCompleted: [12, 15], studyHours: [18, 20] }
  }
}

export async function getAssignments(): Promise<AssignmentItem[]> {
  try {
    return await apiRequest<AssignmentItem[]>('/students/assignments')
  } catch (error) {
    console.error('Error fetching assignments:', error)
    return []
  }
}

export async function updateAssignmentStatus(
  id: string,
  status: AssignmentItem['status']
): Promise<AssignmentItem[]> {
  try {
    return await apiRequest<AssignmentItem[]>(`/students/assignments/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    })
  } catch (error) {
    console.error('Error updating assignment:', error)
    return getAssignments()
  }
}

export async function getNotifications(): Promise<NotificationItem[]> {
  try {
    return await apiRequest<NotificationItem[]>('/students/notifications')
  } catch (error) {
    console.error('Error fetching notifications:', error)
    return []
  }
}

export async function dismissNotification(id: number): Promise<NotificationItem[]> {
  try {
    return await apiRequest<NotificationItem[]>(`/students/notifications/${id}`, {
      method: 'DELETE',
    })
  } catch (error) {
    console.error('Error dismissing notification:', error)
    return getNotifications()
  }
}

export async function saveProfile(profileData: any): Promise<boolean> {
  try {
    await apiRequest('/students/profile', {
      method: 'POST',
      body: JSON.stringify(profileData),
    })
    return true
  } catch (error) {
    console.error('Error saving profile:', error)
    return false
  }
}

export type StudentProfile = {
  fullName: string
  email: string
  phone?: string | null
  studentId?: string
  major?: string
  year?: string
  gpa?: string
  address?: string
}

/** Current student's profile for Student Profile page. */
export async function getStudentProfile(): Promise<StudentProfile> {
  return await apiRequest<StudentProfile>('/users/student/profile')
}

/** Save current student's profile. */
export async function saveStudentProfile(profile: StudentProfile): Promise<StudentProfile> {
  return await apiRequest<StudentProfile>('/users/student/profile', {
    method: 'POST',
    body: JSON.stringify(profile),
  })
}

export type AdminUser = {
  id: number | string
  /** Role-prefixed display ID, e.g. ST00007, TE00012, AD00001, SA00001, PA00003. */
  displayId?: string
  name: string
  email: string
  role: 'Student' | 'Teacher' | 'Admin' | 'Super Admin' | 'Parent'
  status: 'Active' | 'Inactive'
  joinedDate: string
}

export type AdminDashboardData = {
  counts: { totalUsers: number; students: number; teachers: number; other: number }
  todayCollection: number
  paymentSeries: Array<{ date: string; total: number }>
}

export async function getAdminDashboard(): Promise<AdminDashboardData> {
  return apiRequest<AdminDashboardData>('/admin/dashboard')
}

export type UserRole = {
  roleKey: string
  displayName: string
  description?: string
  permissions?: string[]
}

export async function getRoles(): Promise<UserRole[]> {
  try {
    return await apiRequest<UserRole[]>('/users/roles')
  } catch (error) {
    console.error('Error fetching roles:', error)
    return []
  }
}

export async function createRole(role: UserRole): Promise<UserRole> {
  return apiRequest<UserRole>('/users/roles', {
    method: 'POST',
    body: JSON.stringify(role),
  })
}

export async function updateRole(
  roleKey: string,
  data: { displayName?: string; description?: string }
): Promise<UserRole> {
  return apiRequest<UserRole>(`/users/roles/${encodeURIComponent(roleKey)}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export async function deleteRole(roleKey: string): Promise<{ message: string }> {
  return apiRequest<{ message: string }>(`/users/roles/${encodeURIComponent(roleKey)}`, {
    method: 'DELETE',
  })
}

// ==================== Schema: Subjects, Student/Teacher Subjects, Marks ====================
export type SchemaSubject = { _id: string; subject_name: string; attendance_days?: number | null }
export type SchemaStudentSubject = { _id: string; student_id: string; subject_id: string }
export type SchemaTeacherSubject = { _id: string; teacher_id: string; subject_id: string; teacher_name?: string }
export type ExamType = 'Assignment' | 'Quiz' | 'Mid Exam' | 'Term Exam' | 'Final Exam'
export const EXAM_TYPES: ExamType[] = ['Assignment', 'Quiz', 'Mid Exam', 'Term Exam', 'Final Exam']

export type SchemaStudentSubjectMarks = {
  _id: string
  student_id: string
  subject_id: string
  exam_type: ExamType
  marks: number
  note: string | null
}
export async function getSchemaSubjects(): Promise<SchemaSubject[]> {
  try {
    return await apiRequest<SchemaSubject[]>('/schema/subjects')
  } catch (e) {
    console.error('getSchemaSubjects', e)
    return []
  }
}

export async function createSchemaSubject(body: { id: string; subject_name: string }): Promise<SchemaSubject> {
  return apiRequest<SchemaSubject>('/schema/subjects', { method: 'POST', body: JSON.stringify(body) })
}

export async function updateSchemaSubject(subjectId: string, body: { subject_name?: string; attendance_days?: number }): Promise<SchemaSubject> {
  return apiRequest<SchemaSubject>(`/schema/subjects/${encodeURIComponent(subjectId)}`, { method: 'PUT', body: JSON.stringify(body) })
}

export async function deleteSchemaSubject(subjectId: string): Promise<{ message: string }> {
  return apiRequest<{ message: string }>(`/schema/subjects/${encodeURIComponent(subjectId)}`, { method: 'DELETE' })
}

export async function getSchemaStudentSubjects(studentId?: string): Promise<SchemaStudentSubject[]> {
  try {
    const q = studentId ? `?student_id=${encodeURIComponent(studentId)}` : ''
    return await apiRequest<SchemaStudentSubject[]>(`/schema/student-subjects${q}`)
  } catch (e) {
    console.error('getSchemaStudentSubjects', e)
    return []
  }
}

export async function createSchemaStudentSubject(body: { id: string; student_id: string; subject_id: string }): Promise<SchemaStudentSubject> {
  return apiRequest<SchemaStudentSubject>('/schema/student-subjects', { method: 'POST', body: JSON.stringify(body) })
}

export async function deleteSchemaStudentSubject(recordId: string): Promise<{ message: string }> {
  return apiRequest<{ message: string }>(`/schema/student-subjects/${encodeURIComponent(recordId)}`, { method: 'DELETE' })
}

export async function getSchemaTeacherSubjects(teacherId?: string, subjectId?: string): Promise<SchemaTeacherSubject[]> {
  try {
    const params = new URLSearchParams()
    if (teacherId) params.append('teacher_id', teacherId)
    if (subjectId) params.append('subject_id', subjectId)
    const q = params.toString() ? `?${params.toString()}` : ''
    return await apiRequest<SchemaTeacherSubject[]>(`/schema/teacher-subjects${q}`)
  } catch (e) {
    console.error('getSchemaTeacherSubjects', e)
    return []
  }
}

/** Current teacher's subjects from teacher_subjects table (with subject_name). Use for My Subjects page. */
export type TeacherSubjectWithName = {
  id: string
  teacher_id: string
  subject_id: string
  subject_name: string
}

export async function getTeacherMySubjects(): Promise<TeacherSubjectWithName[]> {
  const raw = await apiRequest<TeacherSubjectWithName[] | { data?: TeacherSubjectWithName[] }>('/teachers/my-subjects')
  const arr = Array.isArray(raw) ? raw : (raw?.data ?? [])
  return Array.isArray(arr) ? arr : []
}

export async function createSchemaTeacherSubject(body: { id: string; teacher_id: string; subject_id: string }): Promise<SchemaTeacherSubject> {
  return apiRequest<SchemaTeacherSubject>('/schema/teacher-subjects', { method: 'POST', body: JSON.stringify(body) })
}

export async function deleteSchemaTeacherSubject(recordId: string): Promise<{ message: string }> {
  return apiRequest<{ message: string }>(`/schema/teacher-subjects/${encodeURIComponent(recordId)}`, { method: 'DELETE' })
}

export async function getSchemaStudentSubjectMarks(studentId?: string, subjectId?: string): Promise<SchemaStudentSubjectMarks[]> {
  try {
    const params = new URLSearchParams()
    if (studentId) params.append('student_id', studentId)
    if (subjectId) params.append('subject_id', subjectId)
    const q = params.toString() ? `?${params.toString()}` : ''
    return await apiRequest<SchemaStudentSubjectMarks[]>(`/schema/student-subject-marks${q}`)
  } catch (e) {
    console.error('getSchemaStudentSubjectMarks', e)
    return []
  }
}

export async function createOrUpdateSchemaStudentSubjectMarks(body: {
  student_id: string
  subject_id: string
  exam_type: ExamType
  marks?: number
  note?: string
}): Promise<SchemaStudentSubjectMarks> {
  return apiRequest<SchemaStudentSubjectMarks>('/schema/student-subject-marks', {
    method: 'POST',
    body: JSON.stringify({
      student_id: body.student_id,
      subject_id: body.subject_id,
      exam_type: body.exam_type,
      marks: body.marks ?? 0,
      note: body.note ?? '',
    }),
  })
}

export async function deleteSchemaStudentSubjectMarks(recordId: string): Promise<{ message: string }> {
  return apiRequest<{ message: string }>(`/schema/student-subject-marks/${encodeURIComponent(recordId)}`, { method: 'DELETE' })
}


export async function getUsers(): Promise<AdminUser[]> {
  try {
    return await apiRequest<AdminUser[]>('/admin/users')
  } catch (error) {
    console.error('Error fetching users:', error)
    return []
  }
}

/** List users with role Teacher (from users; backend keeps teachers table in sync). */
export async function getTeachers(): Promise<AdminUser[]> {
  try {
    return await apiRequest<AdminUser[]>('/admin/teachers')
  } catch (error) {
    console.error('Error fetching teachers:', error)
    return []
  }
}

/** List users with role Student (admin: /admin/students; teacher: /teachers/students). Backend keeps students table in sync. */
export async function getStudents(): Promise<AdminUser[]> {
  try {
    const user = getCurrentUser()
    const role = user.role

    let endpoint = '/admin/students'
    if (role === 'teacher') {
      endpoint = '/teachers/students'
    }

    return await apiRequest<AdminUser[]>(endpoint)
  } catch (error) {
    console.error('Error fetching students:', error)
    return []
  }
}

/** Create user with role Teacher. Backend stores in users and syncs to teachers table. */
export async function addTeacher(user: Omit<AdminUser, 'id' | 'joinedDate'> & { joinedDate?: string; password?: string }): Promise<AdminUser[]> {
  try {
    return await apiRequest<AdminUser[]>('/admin/users', {
      method: 'POST',
      body: JSON.stringify(user),
    })
  } catch (error) {
    console.error('Error adding teacher:', error)
    throw error
  }
}

/** Create user with role Student. Backend stores in users and syncs to students table. */
export async function addStudent(user: Omit<AdminUser, 'id' | 'joinedDate'> & { joinedDate?: string; password?: string }): Promise<AdminUser[]> {
  try {
    return await apiRequest<AdminUser[]>('/admin/users', {
      method: 'POST',
      body: JSON.stringify(user),
    })
  } catch (error) {
    console.error('Error adding student:', error)
    throw error
  }
}

export async function deleteTeacher(id: number | string): Promise<AdminUser[]> {
  try {
    return await apiRequest<AdminUser[]>(`/admin/users/${id}`, {
      method: 'DELETE',
    })
  } catch (error) {
    console.error('Error deleting teacher:', error)
    throw error
  }
}

export async function deleteStudent(id: number | string): Promise<AdminUser[]> {
  try {
    return await apiRequest<AdminUser[]>(`/admin/users/${id}`, {
      method: 'DELETE',
    })
  } catch (error) {
    console.error('Error deleting student:', error)
    throw error
  }
}

export type StudentDetail = {
  email: string
  name?: string
  studentId: string
  gradeLevel?: 'Primary' | 'Secondary' | 'O/L' | 'A/L' | null
  dateOfBirth?: string | null
  gender?: 'Male' | 'Female' | 'Other' | null
  batch: string
  program: string
  currentSemester: number
  guardianName?: string
  guardianRelationship?: 'Father' | 'Mother' | 'Guardian'
  contactNumber?: string
  address?: string
  admissionDate?: string | null
}

export async function getStudentDetails(email: string): Promise<StudentDetail> {
  try {
    const user = getCurrentUser()
    const role = user.role

    let endpoint = `/admin/students/${email}/details`
    if (role === 'teacher') {
      endpoint = `/users/students/details/${email}`
    }

    return await apiRequest<StudentDetail>(endpoint)
  } catch (error) {
    console.error('Error fetching student details:', error)
    return {
      email,
      studentId: '',
      batch: '',
      program: '',
      currentSemester: 1,
      guardianName: undefined,
      contactNumber: undefined,
      address: undefined,
    }
  }
}

export async function saveStudentDetails(email: string, details: Partial<StudentDetail>): Promise<StudentDetail> {
  return await apiRequest<StudentDetail>(`/admin/students/${email}/details`, {
    method: 'POST',
    body: JSON.stringify(details),
  })
}

export type ParentDetail = {
  email: string
  occupation?: string
  address?: string
  emergencyContact?: string
  children?: { linkId: string; studentEmail: string; studentName: string; relationship: string }[]
}

export async function getParentDetails(email: string): Promise<ParentDetail> {
  try {
    return await apiRequest<ParentDetail>(`/admin/parents/${email}/details`)
  } catch (error) {
    console.error('Error fetching parent details:', error)
    return { email, occupation: '', address: '', emergencyContact: '' }
  }
}

export async function saveParentDetails(email: string, details: Partial<ParentDetail>): Promise<ParentDetail> {
  return await apiRequest<ParentDetail>(`/admin/parents/${email}/details`, {
    method: 'POST',
    body: JSON.stringify(details),
  })
}

/** Links an existing parent to another existing student — a parent can have more than one child. */
export async function linkParentChild(
  parentEmail: string,
  studentEmail: string,
  relationship?: 'Father' | 'Mother' | 'Guardian'
): Promise<{ id: string; parentEmail: string; studentEmail: string; relationship: string }> {
  return await apiRequest(`/admin/parents/link`, {
    method: 'POST',
    body: JSON.stringify({ parentEmail, studentEmail, relationship }),
  })
}

export async function unlinkParentChild(linkId: string): Promise<{ message: string }> {
  return await apiRequest<{ message: string }>(`/admin/parents/link/${encodeURIComponent(linkId)}`, {
    method: 'DELETE',
  })
}

export type TeacherDetail = {
  email: string
  employeeId: string
  department: string
  qualification: string
  subjectSpecialization: string
  joiningDate?: string | null
  joinedDate: string
}

export async function getTeacherDetails(email: string): Promise<TeacherDetail> {
  try {
    return await apiRequest<TeacherDetail>(`/admin/teachers/${email}/details`)
  } catch (error) {
    console.error('Error fetching teacher details:', error)
    return {
      email,
      employeeId: '',
      department: '',
      qualification: '',
      subjectSpecialization: '',
      joiningDate: undefined,
      joinedDate: '',
    }
  }
}

export type TeacherProfile = {
  fullName: string
  email: string
  phone?: string | null
  teacherId?: string
  department?: string
  subjects: string[]
}

/** Current teacher's profile for Teacher Profile page. */
export async function getTeacherProfile(): Promise<TeacherProfile> {
  return await apiRequest<TeacherProfile>('/users/teacher/profile')
}

/** Save current teacher's profile. */
export async function saveTeacherProfile(profile: TeacherProfile): Promise<TeacherProfile> {
  return await apiRequest<TeacherProfile>('/users/teacher/profile', {
    method: 'POST',
    body: JSON.stringify(profile),
  })
}

export async function saveTeacherDetails(details: TeacherDetail): Promise<TeacherDetail> {
  try {
    return await apiRequest<TeacherDetail>('/users/teachers/details', {
      method: 'POST',
      body: JSON.stringify(details),
    })
  } catch (error) {
    console.error('Error saving teacher details:', error)
    throw error
  }
}

export type NewUserInput = Omit<AdminUser, 'id' | 'joinedDate'> & {
  joinedDate?: string
  password?: string
  phone?: string
  // Student-only, required by the school's data schema when role === 'Student'
  gradeLevel?: 'Primary' | 'Secondary' | 'O/L' | 'A/L'
  dateOfBirth?: string
  gender?: 'Male' | 'Female' | 'Other'
  admissionDate?: string
  // Teacher-only, required when role === 'Teacher'
  qualification?: string
  subjectSpecialization?: string
  joiningDate?: string
  // Parent-only, required when role === 'Parent'
  occupation?: string
  address?: string
  emergencyContact?: string
  /** Optional: link this new parent to an existing student by email, with a relationship. */
  linkedStudentEmail?: string
  relationship?: 'Father' | 'Mother' | 'Guardian'
}

export async function addUser(user: NewUserInput): Promise<AdminUser[]> {
  try {
    return await apiRequest<AdminUser[]>('/admin/users', {
      method: 'POST',
      body: JSON.stringify(user),
    })
  } catch (error) {
    console.error('Error adding user:', error)
    throw error
  }
}

export async function deleteUser(id: number | string): Promise<AdminUser[]> {
  try {
    const pathId = typeof id === 'string' ? encodeURIComponent(id) : id
    return await apiRequest<AdminUser[]>(`/admin/users/${pathId}`, {
      method: 'DELETE',
    })
  } catch (error) {
    console.error('Error deleting user:', error)
    throw error
  }
}

export async function updateUser(
  id: number | string,
  data: { name?: string; email?: string; role?: AdminUser['role']; status?: 'Active' | 'Inactive'; joinedDate?: string }
): Promise<AdminUser[]> {
  try {
    const pathId = typeof id === 'string' ? encodeURIComponent(id) : id
    return await apiRequest<AdminUser[]>(`/admin/users/${pathId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  } catch (error) {
    console.error('Error updating user:', error)
    throw error
  }
}

export async function saveAdminProfile(profileData: any) {
  try {
    await apiRequest('/admin/profile', {
      method: 'POST',
      body: JSON.stringify(profileData),
    })
    return true
  } catch (error) {
    console.error('Error saving admin profile:', error)
    return false
  }
}

export async function getTeacherDashboard() {
  try {
    return await apiRequest<{
      stats: Array<{ title: string; value: string; change: string }>
    }>('/teachers/dashboard')
  } catch (error) {
    console.error('Error fetching teacher dashboard:', error)
    return {
      stats: [
        { title: 'Total Students', value: '142', change: '+8 this semester' },
        { title: 'Active Courses', value: '5', change: '2 ongoing' },
        { title: 'Avg Performance', value: '78%', change: '+3% from last term' },
        { title: 'Pending Grading', value: '23', change: '5 urgent' },
      ],
    }
  }
}

/** Teacher: the class(es) where the current teacher is the class teacher. */
export type TeacherMyClass = {
  id: string
  gradeName: string
  name: string
  fullName: string
  studentCount: number
}

export async function getTeacherMyClass(): Promise<TeacherMyClass[]> {
  try {
    return await apiRequest<TeacherMyClass[]>('/teachers/my-class')
  } catch (error) {
    console.error('Error fetching teacher class:', error)
    return []
  }
}

/** Teacher: classes their students belong to, with which of the teacher's subjects are taught in each. */
export type TeacherTeachingClass = {
  classId: string
  className: string
  studentCount: number
  subjects: Array<{ subjectId: string; subjectName: string }>
}

export async function getTeacherTeachingClasses(): Promise<TeacherTeachingClass[]> {
  try {
    return await apiRequest<TeacherTeachingClass[]>('/teachers/my-teaching-classes')
  } catch (error) {
    console.error('Error fetching teacher teaching classes:', error)
    return []
  }
}

export type StudentResult = {
  result_id: number | string
  student_id: number
  assessment_id: number | string
  marks_obtained: number
  grade: string
  student_name?: string
  student_email?: string
  assessment_title?: string
  module_name?: string
  module_code?: string
  max_marks?: number
  created_at?: string
  updated_at?: string
}

/** Student's own results (GET /results/me). Use for student My Results page. */
export async function getMyResults(): Promise<StudentResult[]> {
  try {
    return await apiRequest<StudentResult[]>('/results/me')
  } catch (error) {
    console.error('Error fetching my results:', error)
    return []
  }
}

// ==================== Fees & Payments ====================

export type FeeType =
  | 'School Fee'
  | 'Admission Fee'
  | 'Term 1 Exam Fee'
  | 'Term 2 Exam Fee'
  | 'Term 3 Exam Fee'
  | 'Event/Activity Fee'
  | 'After-School Class Admission Fee'

/** A fee an admin has defined (catalog entry), e.g. "Sports Meet 2026" under Event/Activity Fee. */
export type FeeStructure = {
  id: string
  feeType: FeeType
  title: string
  description?: string | null
  amount: number
  dueDate?: string | null
  /** Grade this fee applies to — null means school-wide (e.g. a general Admission or Event fee). */
  gradeId?: string | null
  gradeName?: string | null
  isPackage?: boolean
  packageItems?: Array<{ id: string; title: string; amount: number }>
}

export type NewFeeStructure = Omit<FeeStructure, 'id' | 'packageItems' | 'gradeName'> & { packageItemIds?: string[] }

/** A fee assigned to a specific student, with payment status. */
export type FeeRecord = {
  id: string
  feeStructureId: string
  feeType: FeeType
  title: string
  amount: number
  dueDate?: string | null
  gradeName?: string | null
  studentId: string
  studentName: string
  studentEmail: string
  /** Grade + division, e.g. "Grade 1A" — null if the student isn't placed in a class yet. */
  className?: string | null
  status: 'Paid' | 'Unpaid' | 'Partial'
  paidAmount: number
  paidDate?: string | null
}

export async function getFeeStructures(): Promise<FeeStructure[]> {
  return apiRequest<FeeStructure[]>('/fees/structures')
}

export async function addFeeStructure(fee: NewFeeStructure): Promise<FeeStructure[]> {
  return apiRequest<FeeStructure[]>('/fees/structures', { method: 'POST', body: JSON.stringify(fee) })
}

export async function deleteFeeStructure(id: string): Promise<FeeStructure[]> {
  return apiRequest<FeeStructure[]>(`/fees/structures/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

/** Admin: all fee records across students (optionally filtered by student). */
export async function getFeeRecords(studentEmail?: string): Promise<FeeRecord[]> {
  const q = studentEmail ? `?studentEmail=${encodeURIComponent(studentEmail)}` : ''
  return apiRequest<FeeRecord[]>(`/fees/records${q}`)
}

/** Admin: assign a fee structure to a student, creating a fee record. */
export async function assignFeeToStudent(params: {
  feeStructureId: string
  studentId: string
  studentName: string
  studentEmail: string
}): Promise<FeeRecord[]> {
  return apiRequest<FeeRecord[]>('/fees/records', {
    method: 'POST',
    body: JSON.stringify({ feeStructureId: params.feeStructureId, studentEmail: params.studentEmail }),
  })
}

/** Admin: assign a fee to every student in a grade at once (fees are given to a whole class, not one student at a time).
 *  Skips students who already have a record for this fee. */
export async function assignFeeToClass(params: {
  feeStructureId: string
  gradeId: string
}): Promise<{ studentsInGrade: number; created: number; alreadyAssigned: number }> {
  return apiRequest('/fees/records/assign-class', {
    method: 'POST',
    body: JSON.stringify(params),
  })
}

/** Admin: record a payment against a fee record. `paidAmount` is the new absolute total paid. */
export async function recordFeePayment(recordId: string, paidAmount: number, paymentMode?: PaymentMode): Promise<FeeRecord[]> {
  return apiRequest<FeeRecord[]>(`/fees/records/${encodeURIComponent(recordId)}/pay`, {
    method: 'POST',
    body: JSON.stringify({ paidAmount, paymentMode }),
  })
}

/** Student: my own fee records. */
// ==================== Settings: role page permissions ====================

export type RolePermissionsGrid = Record<string, Array<{ pageKey: string; allowed: boolean }>>

export async function getRolePermissions(): Promise<RolePermissionsGrid> {
  try {
    return await apiRequest<RolePermissionsGrid>('/admin/permissions')
  } catch (error) {
    console.error('Error fetching role permissions:', error)
    return {}
  }
}

export async function setRolePermission(role: string, pageKey: string, allowed: boolean): Promise<void> {
  await apiRequest('/admin/permissions', { method: 'PUT', body: JSON.stringify({ role, pageKey, allowed }) })
}

export type MyPermissions = { allPages: boolean; pages: string[] }

export async function getMyPermissions(): Promise<MyPermissions> {
  try {
    return await apiRequest<MyPermissions>('/permissions/me')
  } catch (error) {
    console.error('Error fetching my permissions:', error)
    return { allPages: true, pages: [] }
  }
}

// ==================== Settings: school branding (name + logo) ====================

export interface SchoolBranding {
  schoolName: string
  logoUrl: string
}

const DEFAULT_SCHOOL_BRANDING: SchoolBranding = { schoolName: 'Cloud Campus', logoUrl: '/logo.png' }

/** Resolves a branding logoUrl to a loadable src — uploaded logos live on the backend, the default lives in the frontend's /public. */
export function resolveLogoSrc(logoUrl: string): string {
  return logoUrl.startsWith('/uploads/') ? resolveUploadUrl(logoUrl) : logoUrl
}

export async function getSchoolBranding(): Promise<SchoolBranding> {
  try {
    return await apiRequest<SchoolBranding>('/school-settings')
  } catch (error) {
    console.error('Error fetching school branding:', error)
    return DEFAULT_SCHOOL_BRANDING
  }
}

/** Admin or Super Admin only. */
export async function updateSchoolName(schoolName: string): Promise<SchoolBranding> {
  return apiRequest<SchoolBranding>('/admin/school-settings', {
    method: 'PUT',
    body: JSON.stringify({ schoolName }),
  })
}

/** Admin or Super Admin only. */
export async function uploadSchoolLogo(file: File): Promise<SchoolBranding> {
  const formData = new FormData()
  formData.append('logo', file)
  return apiRequestFormData<SchoolBranding>('/admin/school-settings/logo', formData, 'POST')
}

export async function getMyFees(): Promise<FeeRecord[]> {
  try {
    return await apiRequest<FeeRecord[]>('/fees/me')
  } catch (error) {
    console.error('Error fetching my fees:', error)
    return []
  }
}

// ==================== Academic: Grades, Class Sections, Class Details ====================

export type AcademicGrade = { id: string; name: string; order: number }

export async function getGrades(): Promise<AcademicGrade[]> {
  try {
    return await apiRequest<AcademicGrade[]>('/academic/grades')
  } catch (error) {
    console.error('Error fetching grades:', error)
    return []
  }
}

export async function addGrade(name: string): Promise<AcademicGrade[]> {
  return apiRequest<AcademicGrade[]>('/academic/grades', { method: 'POST', body: JSON.stringify({ name }) })
}

export async function updateGrade(id: string, name: string): Promise<AcademicGrade[]> {
  return apiRequest<AcademicGrade[]>(`/academic/grades/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify({ name }) })
}

export async function deleteGrade(id: string): Promise<AcademicGrade[]> {
  return apiRequest<AcademicGrade[]>(`/academic/grades/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

export type AcademicYearItem = { id: string; year: number; isCurrent: boolean }

export async function getAcademicYears(): Promise<AcademicYearItem[]> {
  try {
    return await apiRequest<AcademicYearItem[]>('/academic/years')
  } catch (error) {
    console.error('Error fetching academic years:', error)
    return []
  }
}

export type ClassSectionItem = {
  id: string
  gradeId: string
  gradeName: string
  academicYearId: string
  name: string
  fullName: string
  classTeacherId: string | null
  classTeacherName: string | null
}

export async function getClassSections(): Promise<ClassSectionItem[]> {
  try {
    return await apiRequest<ClassSectionItem[]>('/academic/classes')
  } catch (error) {
    console.error('Error fetching class sections:', error)
    return []
  }
}

export async function createClassSection(body: {
  gradeId: string
  academicYearId: string
  name: string
  classTeacherId?: string
}): Promise<{ id: string; name: string }[]> {
  return apiRequest('/academic/classes', { method: 'POST', body: JSON.stringify(body) })
}

export async function updateClassSection(
  id: string,
  body: { name?: string; classTeacherId?: string | null }
): Promise<{ id: string; name: string }[]> {
  return apiRequest(`/academic/classes/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(body) })
}

export async function deleteClassSection(id: string): Promise<{ id: string; name: string }[]> {
  return apiRequest(`/academic/classes/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

/** Admin: put a student into a class division, or take them out with classSectionId: null. */
export async function assignStudentToClass(studentId: string, classSectionId: string | null): Promise<void> {
  await apiRequest(`/students/${encodeURIComponent(studentId)}/assign-class`, {
    method: 'PUT',
    body: JSON.stringify({ classSectionId }),
  })
}

/** Admin: enroll every student currently in a division into a subject (how a subject shows up on the class's Subjects & Teachers list). */
export async function assignClassSubject(classSectionId: string, subjectId: string): Promise<{ studentsInClass: number; added: number }> {
  return apiRequest(`/academic/classes/${encodeURIComponent(classSectionId)}/subjects`, {
    method: 'POST',
    body: JSON.stringify({ subjectId }),
  })
}

export type ClassDetails = {
  classInfo: { id: string; name: string; gradeName: string; fullName: string; classTeacherName: string | null }
  studentCount: number
  students: Array<{ id: string; name: string; email: string }>
  subjectsWithTeachers: Array<{ subjectId: string; subjectName: string; teachers: string[] }>
  marks: Array<{
    id: string
    studentId: string
    studentName: string
    subjectId: string
    subjectName: string
    examType: ExamType
    marks: number
    note: string | null
  }>
}

export async function getClassDetails(classSectionId: string): Promise<ClassDetails | null> {
  try {
    return await apiRequest<ClassDetails>(`/academic/classes/${encodeURIComponent(classSectionId)}/details`)
  } catch (error) {
    console.error('Error fetching class details:', error)
    return null
  }
}

// ==================== Items Provided to Students ====================

export type SchoolItemType =
  | 'Report Card'
  | 'Communication Book'
  | 'Uniform Set'
  | 'Cap'
  | 'Badge'
  | 'Tie'
  | 'Uniform Package (Bundle)'

/** A record of an item issued to a student. */
export type ItemRecord = {
  id: string
  /** An item's fixed SchoolItemType name, or a custom admin-defined package name. */
  item: string
  quantity: number
  /** price x quantity, at the item's current catalog price. */
  amount: number
  studentId: string
  studentName: string
  studentEmail: string
  issuedDate: string
  notes?: string | null
}

export const SCHOOL_ITEM_TYPES: SchoolItemType[] = [
  'Report Card',
  'Communication Book',
  'Uniform Set',
  'Cap',
  'Badge',
  'Tie',
  'Uniform Package (Bundle)',
]

/** Admin: all issued-item records (optionally filtered by student). */
export async function getItemRecords(studentEmail?: string): Promise<ItemRecord[]> {
  const q = studentEmail ? `?studentEmail=${encodeURIComponent(studentEmail)}` : ''
  return apiRequest<ItemRecord[]>(`/items/records${q}`)
}

/** Admin: issue an item to a student. */
export async function issueItemToStudent(item: {
  item: string
  quantity: number
  studentEmail: string
}): Promise<ItemRecord[]> {
  return apiRequest<ItemRecord[]>('/items/records', {
    method: 'POST',
    body: JSON.stringify({
      item: item.item,
      quantity: item.quantity,
      studentEmail: item.studentEmail,
    }),
  })
}

/** Admin: fix the quantity on an already-issued item record. */
export async function updateItemRecord(id: string, quantity: number): Promise<ItemRecord[]> {
  return apiRequest<ItemRecord[]>(`/items/records/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify({ quantity }),
  })
}

export async function deleteItemRecord(id: string): Promise<ItemRecord[]> {
  return apiRequest<ItemRecord[]>(`/items/records/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

/** Student: items issued to me. */
// ==================== Student: Payment / Receipt History ====================

export type TransactionType = 'Fee' | 'Item' | 'After-School Class'
export type PaymentMode = 'Cash' | 'Card' | 'Online Transfer'
export const PAYMENT_MODES: PaymentMode[] = ['Cash', 'Card', 'Online Transfer']

export type TransactionRecord = {
  id: string
  amount: number
  paymentDate: string
  type: TransactionType
  /** Human-readable name of what was paid for — the fee title, item name, or class name. */
  label: string
  /** The fee record / item record / class id this transaction paid for, if any. */
  referenceId?: string | null
  receiptNumber: string
  paymentMode: PaymentMode
  notes?: string | null
}

/** Student: my own payment/receipt history, optionally filtered by type. */
export async function getMyTransactions(type?: TransactionType): Promise<TransactionRecord[]> {
  try {
    const query = type ? `?type=${encodeURIComponent(type)}` : ''
    return await apiRequest<TransactionRecord[]>(`/transactions/me${query}`)
  } catch (error) {
    console.error('Error fetching my transactions:', error)
    return []
  }
}

/** Admin: payment/receipt history, optionally filtered by student and/or type. */
export async function getTransactions(studentEmail?: string, type?: TransactionType): Promise<TransactionRecord[]> {
  try {
    const params = new URLSearchParams()
    if (studentEmail) params.set('studentEmail', studentEmail)
    if (type) params.set('type', type)
    const query = params.toString() ? `?${params.toString()}` : ''
    return await apiRequest<TransactionRecord[]>(`/transactions${query}`)
  } catch (error) {
    console.error('Error fetching transactions:', error)
    return []
  }
}

export type ManualPaymentReceipt = {
  receipt: {
    receiptNumber: string
    studentId: string
    studentName: string
    studentEmail: string
    amount: number
    paymentDate: string
    paymentMode: PaymentMode
    type: TransactionType
    collectedBy: string
  }
  detail: Record<string, unknown>
}

/** Admin/Super Admin: record cash collected at the counter for a class installment or item purchase. */
export async function recordManualPayment(payload: {
  studentEmail: string
  type: TransactionType
  referenceId: string
  amount: number
  quantity?: number
  paymentMode?: PaymentMode
  notes?: string
}): Promise<ManualPaymentReceipt> {
  return apiRequest<ManualPaymentReceipt>('/payments/manual', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

// ==================== Payment Requests (student/parent submits proof, admin approves) ====================

export type PaymentRequestStatus = 'Pending' | 'Approved' | 'Rejected'

export type PaymentRequestRecord = {
  id: string
  studentId: string
  studentName: string
  studentEmail: string
  submittedByName: string
  submittedByRole: string
  type: TransactionType
  referenceId: string
  label: string
  quantity: number | null
  amount: number
  paymentMode: PaymentMode
  receiptNumber: string | null
  proofImageUrl: string
  note: string | null
  status: PaymentRequestStatus
  reviewedByName: string | null
  reviewNote: string | null
  reviewedAt: string | null
  createdAt: string
}

export type InventoryItemOption = { id: string; name: string; price: number; isPackage: boolean; packageItems: string[] }

/** Catalog of purchasable items and packages — for "Issue Item" and the student/parent "submit payment" picker. */
export async function getInventoryItems(): Promise<InventoryItemOption[]> {
  try {
    return await apiRequest<InventoryItemOption[]>('/items/inventory')
  } catch (error) {
    console.error('Error fetching inventory items:', error)
    return []
  }
}

/** Admin: define a new purchasable package — a named bundle of existing item types at one price. */
export async function createPackage(body: {
  name: string
  price: number
  itemNames: string[]
  stockQuantity?: number
}): Promise<InventoryItemOption> {
  return apiRequest<InventoryItemOption>('/items/packages', { method: 'POST', body: JSON.stringify(body) })
}

/** Admin: edit an existing package's name, price, included items, or stock. */
export async function updatePackage(
  id: string,
  body: { name?: string; price?: number; itemNames?: string[]; stockQuantity?: number | null }
): Promise<InventoryItemOption> {
  return apiRequest<InventoryItemOption>(`/items/packages/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(body) })
}

/** Student/parent: submit proof of an online transfer for a fee, item, or class payment. */
export async function submitPaymentRequest(payload: {
  studentId?: string // required when submitting as a parent
  type: TransactionType
  referenceId: string
  amount: number
  quantity?: number
  receiptNumber?: string
  note?: string
  proofImage: File
}): Promise<PaymentRequestRecord> {
  const formData = new FormData()
  if (payload.studentId) formData.append('studentId', payload.studentId)
  formData.append('type', payload.type)
  formData.append('referenceId', payload.referenceId)
  formData.append('amount', String(payload.amount))
  if (payload.quantity) formData.append('quantity', String(payload.quantity))
  if (payload.receiptNumber) formData.append('receiptNumber', payload.receiptNumber)
  if (payload.note) formData.append('note', payload.note)
  formData.append('proof', payload.proofImage)
  return apiRequestFormData<PaymentRequestRecord>('/payment-requests', formData)
}

/** Student: my own submitted payment requests. */
export async function getMyPaymentRequests(): Promise<PaymentRequestRecord[]> {
  try {
    return await apiRequest<PaymentRequestRecord[]>('/payment-requests/me')
  } catch (error) {
    console.error('Error fetching my payment requests:', error)
    return []
  }
}

/** Parent: submitted payment requests for one of their children. */
export async function getChildPaymentRequests(studentId: string): Promise<PaymentRequestRecord[]> {
  try {
    return await apiRequest<PaymentRequestRecord[]>(`/parents/children/${encodeURIComponent(studentId)}/payment-requests`)
  } catch (error) {
    console.error('Error fetching child payment requests:', error)
    return []
  }
}

/** Admin/Super Admin: the review queue, optionally filtered by status. */
export async function getPaymentRequests(status?: PaymentRequestStatus): Promise<PaymentRequestRecord[]> {
  try {
    const query = status ? `?status=${encodeURIComponent(status)}` : ''
    return await apiRequest<PaymentRequestRecord[]>(`/payment-requests${query}`)
  } catch (error) {
    console.error('Error fetching payment requests:', error)
    return []
  }
}

export async function approvePaymentRequest(id: string, paymentMode: PaymentMode): Promise<PaymentRequestRecord> {
  return apiRequest<PaymentRequestRecord>(`/payment-requests/${encodeURIComponent(id)}/approve`, {
    method: 'PUT',
    body: JSON.stringify({ paymentMode }),
  })
}

export async function rejectPaymentRequest(id: string, reviewNote?: string): Promise<PaymentRequestRecord> {
  return apiRequest<PaymentRequestRecord>(`/payment-requests/${encodeURIComponent(id)}/reject`, {
    method: 'PUT',
    body: JSON.stringify({ reviewNote }),
  })
}

// ==================== After-School Special Classes ====================

/** Freeform course name, admin-typed (e.g. "Computer / IT Course", "Abacus", "Electrician Training", or any new course). */
export type AfterSchoolClassName = string

export type AfterSchoolClass = {
  id: string
  name: AfterSchoolClassName
  description?: string | null
  schedule?: string | null
  level: 'O/L' | 'A/L' | 'All'
  admissionFee: number
}

export type ClassEnrollment = {
  id: string
  classId: string
  className: AfterSchoolClassName
  studentId: string
  studentName: string
  studentEmail: string
  enrolledDate: string
  status: 'Active' | 'Pending' | 'Completed'
  amountPaid: number
  targetFee: number
  outstanding: number
}

export async function getAfterSchoolClasses(): Promise<AfterSchoolClass[]> {
  try {
    return await apiRequest<AfterSchoolClass[]>('/after-school-classes')
  } catch (error) {
    console.error('Error fetching after-school classes:', error)
    return []
  }
}

export async function addAfterSchoolClass(cls: Omit<AfterSchoolClass, 'id'>): Promise<AfterSchoolClass[]> {
  return apiRequest<AfterSchoolClass[]>('/after-school-classes', { method: 'POST', body: JSON.stringify(cls) })
}

export async function updateAfterSchoolClass(id: string, cls: Partial<Omit<AfterSchoolClass, 'id'>>): Promise<AfterSchoolClass[]> {
  return apiRequest<AfterSchoolClass[]>(`/after-school-classes/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(cls) })
}

export async function deleteAfterSchoolClass(id: string): Promise<AfterSchoolClass[]> {
  return apiRequest<AfterSchoolClass[]>(`/after-school-classes/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

/** Admin: all class enrollments (optionally filtered by class). */
export async function getClassEnrollments(classId?: string): Promise<ClassEnrollment[]> {
  const q = classId ? `?classId=${encodeURIComponent(classId)}` : ''
  return apiRequest<ClassEnrollment[]>(`/after-school-classes/enrollments${q}`)
}

export async function updateEnrollmentStatus(id: string, status: ClassEnrollment['status']): Promise<ClassEnrollment[]> {
  return apiRequest<ClassEnrollment[]>(`/after-school-classes/enrollments/${encodeURIComponent(id)}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status }),
  })
}

/** Student: enroll myself in an after-school class (admission fee is tracked separately in Fees). */
export async function enrollInAfterSchoolClass(classId: string): Promise<ClassEnrollment[]> {
  return apiRequest<ClassEnrollment[]>(`/after-school-classes/${encodeURIComponent(classId)}/enroll`, {
    method: 'POST',
  })
}

/** Student: my own class enrollments. */
export async function getMyClassEnrollments(): Promise<ClassEnrollment[]> {
  try {
    return await apiRequest<ClassEnrollment[]>('/after-school-classes/enrollments/me')
  } catch (error) {
    console.error('Error fetching my class enrollments:', error)
    return []
  }
}

// ==================== Parent Portal (read-only) ====================

export type ParentChild = {
  studentId: string
  name: string
  email: string
  relationship: 'Father' | 'Mother' | 'Guardian'
}

export type ChildFeeRecord = {
  id: string
  feeType: string
  title: string
  amount: number
  paidAmount: number
  status: 'Paid' | 'Unpaid' | 'Partial'
  dueDate: string | null
}

export type ChildItemRecord = {
  id: string
  item: string
  quantity: number
  issuedDate: string
}

export type ChildReceipt = {
  id: string
  receiptNumber: string
  amount: number
  paymentDate: string
  type: 'Fee' | 'Item' | 'After-School Class'
  paymentMode: string
}

export type ParentProfile = {
  fullName: string
  email: string
  phone?: string | null
  occupation?: string
  address?: string
  emergencyContact?: string
}

/** Current parent's profile for Parent Profile page. */
export async function getParentProfile(): Promise<ParentProfile> {
  return await apiRequest<ParentProfile>('/parents/profile')
}

/** Save current parent's profile. */
export async function saveParentProfile(profile: ParentProfile): Promise<ParentProfile> {
  return await apiRequest<ParentProfile>('/parents/profile', {
    method: 'POST',
    body: JSON.stringify(profile),
  })
}

/** Parent: children linked to my account. */
export async function getMyChildren(): Promise<ParentChild[]> {
  try {
    return await apiRequest<ParentChild[]>('/parents/children')
  } catch (error) {
    console.error('Error fetching children:', error)
    return []
  }
}

export async function getChildFees(studentId: string): Promise<ChildFeeRecord[]> {
  try {
    return await apiRequest<ChildFeeRecord[]>(`/parents/children/${encodeURIComponent(studentId)}/fees`)
  } catch (error) {
    console.error('Error fetching child fees:', error)
    return []
  }
}

export async function getChildItems(studentId: string): Promise<ChildItemRecord[]> {
  try {
    return await apiRequest<ChildItemRecord[]>(`/parents/children/${encodeURIComponent(studentId)}/items`)
  } catch (error) {
    console.error('Error fetching child items:', error)
    return []
  }
}

export async function getChildReceipts(studentId: string): Promise<ChildReceipt[]> {
  try {
    return await apiRequest<ChildReceipt[]>(`/parents/children/${encodeURIComponent(studentId)}/receipts`)
  } catch (error) {
    console.error('Error fetching child receipts:', error)
    return []
  }
}

export type ChildMarksRecord = {
  id: string
  subject: string
  examType: 'Assignment' | 'Quiz' | 'Mid Exam' | 'Term Exam' | 'Final Exam'
  marks: number
  note: string | null
}

export async function getChildMarks(studentId: string): Promise<ChildMarksRecord[]> {
  try {
    return await apiRequest<ChildMarksRecord[]>(`/parents/children/${encodeURIComponent(studentId)}/marks`)
  } catch (error) {
    console.error('Error fetching child marks:', error)
    return []
  }
}

