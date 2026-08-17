/** Reads the logged-in user from local/session storage (set by login()). */
export function getCurrentUser(): { id: string; name: string; role: string; email?: string } {
  let userStr = localStorage.getItem('user')
  if (!userStr) userStr = sessionStorage.getItem('user')
  if (userStr) {
    try {
      const user = JSON.parse(userStr)
      const roleRaw = user.role || 'student'
      const role = typeof roleRaw === 'string' ? roleRaw.toLowerCase() : 'student'
      return {
        id: user.id ?? (role === 'teacher' ? 'teacher-1' : role === 'admin' ? 'admin-1' : 'student-1'),
        name: user.name || 'User',
        role,
        email: user.email || undefined,
      }
    } catch {
    }
  }
  return { id: 'user-1', name: 'User', role: 'student' }
}
