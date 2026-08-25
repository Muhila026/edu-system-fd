import React, { useEffect, useState } from 'react'
import {
  Alert,
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  IconButton,
  TextField,
  InputAdornment,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
  Autocomplete,
} from '@mui/material'
import CenteredMessage from '../../components/CenteredMessage'
import BackButton from '../../components/BackButton'
import { usePagination } from '../../hooks/usePagination'
import { Add, Edit, Delete, Search, LockReset, Visibility, VisibilityOff, Security, PersonAddAlt1, Badge, School, Groups, FamilyRestroom, Block, CheckCircle, Work } from '@mui/icons-material'
import ConfirmDialog from '../../components/ConfirmDialog'
import Tooltip from '@mui/material/Tooltip'
import { getCurrentUser } from '../../lib/currentUser'
import {
  addUser,
  AdminUser,
  updateUser,
  getUsers,
  getRoles,
  createRole,
  updateRole,
  deleteRole,
  changeUserPassword,
  getStudentDetails,
  getTeacherDetails,
  getParentDetails,
  saveStudentDetails,
  saveTeacherDetails,
  saveParentDetails,
  linkParentChild,
  unlinkParentChild,
  type UserRole,
  type StudentDetail,
  type TeacherDetail,
  type ParentDetail,
} from '../../lib/api'
import { sanitizePhoneInput } from '../../lib/phoneInput'

const THEME = {
  primary: '#1e3a8a',
  primaryLight: '#EFF6FF',
  primaryBorder: '#DBEAFE',
  muted: '#6b7280',
  textDark: '#1f2937',
}

/** Shared outlined-input styling across User Management's add/edit/view forms. */
const fieldSx = {
  '& .MuiOutlinedInput-root': {
    borderRadius: 2,
    backgroundColor: '#fff',
    transition: 'box-shadow 0.15s ease, border-color 0.15s ease',
    '& fieldset': { borderColor: THEME.primaryBorder },
    '&:hover fieldset': { borderColor: '#93c5fd' },
    '&.Mui-focused fieldset': { borderColor: THEME.primary, borderWidth: 2 },
    '&.Mui-focused': { boxShadow: `0 0 0 4px ${THEME.primaryLight}` },
  },
  '& .MuiInputLabel-root.Mui-focused': { color: THEME.primary },
}

/** Icon + accent color per role, used on the Add User header. */
const ROLE_VISUAL: Record<string, { icon: React.ReactNode; accent: string }> = {
  Student: { icon: <School />, accent: '#0d9488' },
  Teacher: { icon: <Badge />, accent: '#b45309' },
  Admin: { icon: <Groups />, accent: '#7c3aed' },
  'Super Admin': { icon: <Security />, accent: '#7c3aed' },
  Staff: { icon: <Work />, accent: '#0891b2' },
  Parent: { icon: <FamilyRestroom />, accent: '#0369a1' },
}

/** Shared card shell for the Add/Edit/View user pages — same gradient header, field
 *  spacing, and footer across all three so they read as one consistent design. */
const FormShell: React.FC<{
  icon: React.ReactNode
  title: string
  subtitle: string
  error?: string | null
  onErrorClose?: () => void
  footer: React.ReactNode
  children: React.ReactNode
}> = ({ icon, title, subtitle, error, onErrorClose, footer, children }) => (
  <Box sx={{ maxWidth: 760, mx: 'auto', mt: 1 }}>
    <Card
      elevation={0}
      sx={{
        border: `1px solid ${THEME.primaryBorder}`,
        borderRadius: 3,
        overflow: 'hidden',
        boxShadow: '0 8px 24px rgba(30, 58, 138, 0.08)',
      }}
    >
      <Box
        sx={{
          p: { xs: 3, sm: 4 },
          background: `linear-gradient(135deg, ${THEME.primary} 0%, #1e40af 100%)`,
          display: 'flex',
          alignItems: 'center',
          gap: 2,
        }}
      >
        <Box
          sx={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            backgroundColor: 'rgba(255,255,255,0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            flexShrink: 0,
          }}
        >
          {icon}
        </Box>
        <Box>
          <Typography variant="h5" fontWeight={700} sx={{ color: '#fff', letterSpacing: '-0.01em' }}>
            {title}
          </Typography>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.85)', mt: 0.5 }}>
            {subtitle}
          </Typography>
        </Box>
      </Box>

      <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
        {error && (
          <Alert severity="error" onClose={onErrorClose} sx={{ mb: 3, borderRadius: 2 }}>
            {error}
          </Alert>
        )}
        <Box display="grid" gap={2.5}>
          {children}
        </Box>
      </CardContent>

      <Box
        sx={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 1.5,
          p: { xs: 3, sm: 4 },
          pt: 3,
          borderTop: `1px solid ${THEME.primaryBorder}`,
          backgroundColor: '#fafbfc',
        }}
      >
        {footer}
      </Box>
    </Card>
  </Box>
)

/** Outlined "Cancel"/"Close" button matching FormShell's footer styling. */
const ShellSecondaryButton: React.FC<React.ComponentProps<typeof Button>> = ({ sx, ...props }) => (
  <Button
    variant="outlined"
    sx={{
      borderRadius: 2,
      textTransform: 'none',
      fontWeight: 600,
      px: 3,
      borderColor: THEME.primaryBorder,
      color: THEME.textDark,
      '&:hover': { borderColor: THEME.primary, backgroundColor: THEME.primaryLight },
      ...sx,
    }}
    {...props}
  />
)

/** Contained primary-action button matching FormShell's footer styling. */
const ShellPrimaryButton: React.FC<React.ComponentProps<typeof Button>> = ({ sx, ...props }) => (
  <Button
    variant="contained"
    sx={{
      borderRadius: 2,
      textTransform: 'none',
      fontWeight: 600,
      px: 3,
      backgroundColor: THEME.primary,
      boxShadow: '0 4px 12px rgba(30, 58, 138, 0.25)',
      '&:hover': { backgroundColor: '#1e40af', boxShadow: '0 6px 16px rgba(30, 58, 138, 0.35)' },
      ...sx,
    }}
    {...props}
  />
)

/** Select styling matching FormShell's fieldSx look (Selects can't use fieldSx directly — no nested .MuiOutlinedInput-root). */
const selectSx = {
  borderRadius: 2,
  backgroundColor: '#fff',
  '& .MuiOutlinedInput-notchedOutline': { borderColor: THEME.primaryBorder },
  '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#93c5fd' },
  '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: THEME.primary, borderWidth: 2 },
}

interface UserManagementProps {
  initialOpenAddDialog?: boolean
  onAddDialogHandled?: () => void
}

const UserManagement: React.FC<UserManagementProps> = ({ initialOpenAddDialog, onAddDialogHandled }) => {
  const [usersLoading, setUsersLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [openDialog, setOpenDialog] = useState(false)
  const [openEditDialog, setOpenEditDialog] = useState(false)
  const [editUser, setEditUser] = useState<AdminUser | null>(null)
  const [openPasswordDialog, setOpenPasswordDialog] = useState(false)
  const [passwordUser, setPasswordUser] = useState<AdminUser | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [showResetPassword, setShowResetPassword] = useState(false)
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [users, setUsers] = useState<AdminUser[]>([])
  const [roles, setRoles] = useState<UserRole[]>([])
  const [roleFilter, setRoleFilter] = useState<string>('')
  const [openRoleManagementPopup, setOpenRoleManagementPopup] = useState(false)
  const [openRoleDialog, setOpenRoleDialog] = useState(false)
  const [openEditRoleDialog, setOpenEditRoleDialog] = useState(false)
  const [editRole, setEditRole] = useState<UserRole | null>(null)
  const [newRole, setNewRole] = useState({ roleKey: '', displayName: '', description: '' })
  const [roleSubmitLoading, setRoleSubmitLoading] = useState(false)
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false)
  const [detailsUser, setDetailsUser] = useState<AdminUser | null>(null)
  const [detailsData, setDetailsData] = useState<StudentDetail | TeacherDetail | ParentDetail | null>(null)
  const [detailsType, setDetailsType] = useState<'student' | 'teacher' | 'parent' | null>(null)
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [detailsError, setDetailsError] = useState<string | null>(null)
  const [editStudentDetails, setEditStudentDetails] = useState<StudentDetail | null>(null)
  const [editTeacherDetails, setEditTeacherDetails] = useState<TeacherDetail | null>(null)
  const [editParentDetails, setEditParentDetails] = useState<ParentDetail | null>(null)
  const [editDetailsLoading, setEditDetailsLoading] = useState(false)
  const [addChildEmail, setAddChildEmail] = useState('')
  const [addChildRelationship, setAddChildRelationship] = useState<'Father' | 'Mother' | 'Guardian'>('Guardian')
  const [addChildLoading, setAddChildLoading] = useState(false)
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' })
  const [deactivateTarget, setDeactivateTarget] = useState<AdminUser | null>(null)
  const [deactivating, setDeactivating] = useState(false)
  const [deleteRoleTarget, setDeleteRoleTarget] = useState<string | null>(null)
  const [deletingRole, setDeletingRole] = useState(false)
  const SYSTEM_ROLE_KEYS = ['Student', 'Teacher', 'Admin', 'Super Admin', 'Staff', 'Parent']

  useEffect(() => {
    setUsersLoading(true)
    getUsers()
      .then(setUsers)
      .finally(() => setUsersLoading(false))
  }, [])
  useEffect(() => { getRoles().then(setRoles) }, [])

  useEffect(() => {
    if (initialOpenAddDialog) {
      setOpenDialog(true)
      onAddDialogHandled?.()
    }
  }, [initialOpenAddDialog, onAddDialogHandled])

  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    role: '',
    password: '',
    phone: '',
    joinedDate: '',
    // Student
    gradeLevel: '',
    dateOfBirth: '',
    gender: '',
    admissionDate: '',
    // Teacher
    qualification: '',
    subjectSpecialization: '',
    joiningDate: '',
    // Parent
    occupation: '',
    address: '',
    emergencyContact: '',
    linkedStudentEmail: '',
    relationship: 'Guardian',
  })
  const [showAddUserPassword, setShowAddUserPassword] = useState(false)
  const [addUserLoading, setAddUserLoading] = useState(false)
  const [addUserError, setAddUserError] = useState<string | null>(null)

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'Super Admin':
        return { bg: '#ede9fe', color: '#6d28d9' }
      case 'Admin':
        return { bg: '#fee2e2', color: '#991b1b' }
      case 'Teacher':
        return { bg: '#dbeafe', color: '#1e40af' }
      case 'Student':
        return { bg: '#dcfce7', color: '#15803d' }
      case 'Staff':
        return { bg: '#cffafe', color: '#0e7490' }
      case 'Parent':
        return { bg: '#ffedd5', color: '#c2410c' }
      default:
        return { bg: '#f3f4f6', color: '#374151' }
    }
  }

  /** Every system role, plus any custom role already in use — so "Add {Role}" is always
   *  reachable even before the first user of that role exists (e.g. the very first Staff account). */
  const ROLE_ORDER = ['Super Admin', 'Admin', 'Staff', 'Teacher', 'Student', 'Parent']
  const isViewerSuperAdmin = getCurrentUser().role === 'super_admin'
  const distinctRoles = Array.from(new Set([...SYSTEM_ROLE_KEYS, ...users.map((u) => u.role)]))
    .filter((r) => isViewerSuperAdmin || r !== 'Super Admin')
    .sort((a, b) => ROLE_ORDER.indexOf(a) - ROLE_ORDER.indexOf(b))

  const getRoleDisplayName = (roleKey: string) =>
    roles.find((r) => r.roleKey === roleKey)?.displayName ?? roleKey

  const handleResetPassword = async () => {
    if (!passwordUser || !newPassword || newPassword.length < 6) {
      setSnackbar({ open: true, message: 'Password must be at least 6 characters', severity: 'error' })
      return
    }
    setPasswordLoading(true)
    try {
      await changeUserPassword({ email: passwordUser.email, new_password: newPassword })
      setOpenPasswordDialog(false)
      setPasswordUser(null)
      setNewPassword('')
      setSnackbar({ open: true, message: 'Password updated successfully', severity: 'success' })
    } catch (error: any) {
      setSnackbar({ open: true, message: error.message || 'Failed to reset password', severity: 'error' })
    } finally {
      setPasswordLoading(false)
    }
  }

const emptyNewUser = {
    name: '',
    email: '',
    role: '',
    password: '',
    phone: '',
    joinedDate: '',
    gradeLevel: '',
    dateOfBirth: '',
    gender: '',
    admissionDate: '',
    qualification: '',
    subjectSpecialization: '',
    joiningDate: '',
    occupation: '',
    address: '',
    emergencyContact: '',
    linkedStudentEmail: '',
    relationship: 'Guardian',
  }

  const handleAddUser = async () => {
    if (!newUser.name || !newUser.name.trim()) {
      setSnackbar({ open: true, message: 'Full name is required', severity: 'error' })
      return
    }
    if (!newUser.email || !newUser.email.trim()) {
      setSnackbar({ open: true, message: 'Email is required', severity: 'error' })
      return
    }
    const emailTrimmed = newUser.email.trim().toLowerCase()
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(emailTrimmed)) {
      setSnackbar({ open: true, message: 'Please enter a valid email address', severity: 'error' })
      return
    }
    if (!newUser.role || !['Student', 'Teacher', 'Admin', 'Super Admin', 'Staff', 'Parent'].includes(newUser.role)) {
      setSnackbar({ open: true, message: 'Please select a valid role', severity: 'error' })
      return
    }
    if (!newUser.password || newUser.password.length < 6) {
      setSnackbar({ open: true, message: 'Password must be at least 6 characters long', severity: 'error' })
      return
    }
    if (newUser.role === 'Student' && (!newUser.gradeLevel || !newUser.dateOfBirth || !newUser.gender)) {
      setSnackbar({ open: true, message: 'Grade level, date of birth and gender are required for a student', severity: 'error' })
      return
    }
    if (newUser.role === 'Teacher' && (!newUser.qualification.trim() || !newUser.subjectSpecialization.trim())) {
      setSnackbar({ open: true, message: 'Qualification and subject specialization are required for a teacher', severity: 'error' })
      return
    }
    if (newUser.role === 'Parent' && (!newUser.occupation.trim() || !newUser.address.trim() || !newUser.emergencyContact.trim())) {
      setSnackbar({ open: true, message: 'Occupation, address and emergency contact are required for a parent', severity: 'error' })
      return
    }
    setAddUserError(null)
    setAddUserLoading(true)
    try {
      await addUser({
        name: newUser.name.trim(),
        email: emailTrimmed,
        role: newUser.role as 'Student' | 'Teacher' | 'Admin' | 'Super Admin' | 'Staff' | 'Parent',
        status: 'Active',
        password: newUser.password,
        phone: newUser.phone.trim() || undefined,
        joinedDate: newUser.joinedDate || undefined,
        gradeLevel: (newUser.gradeLevel || undefined) as 'Primary' | 'Secondary' | 'O/L' | 'A/L' | undefined,
        dateOfBirth: newUser.dateOfBirth || undefined,
        gender: (newUser.gender || undefined) as 'Male' | 'Female' | 'Other' | undefined,
        admissionDate: newUser.admissionDate || undefined,
        qualification: newUser.qualification.trim() || undefined,
        subjectSpecialization: newUser.subjectSpecialization.trim() || undefined,
        joiningDate: newUser.joiningDate || undefined,
        occupation: newUser.occupation.trim() || undefined,
        address: newUser.address.trim() || undefined,
        emergencyContact: newUser.emergencyContact.trim() || undefined,
        linkedStudentEmail: newUser.linkedStudentEmail || undefined,
        relationship: (newUser.relationship || undefined) as 'Father' | 'Mother' | 'Guardian' | undefined,
      })
      setOpenDialog(false)
      setNewUser(emptyNewUser)
      setAddUserError(null)
      setUsers(await getUsers())
      setSnackbar({ open: true, message: 'User added successfully', severity: 'success' })
    } catch (error: any) {
      const errorMessage = error?.message || error?.detail || 'Failed to create user'
      setAddUserError(errorMessage)
      setSnackbar({ open: true, message: errorMessage, severity: 'error' })
    } finally {
      setAddUserLoading(false)
    }
  }

  const handleEditUser = async () => {
    if (!editUser) return
    if (!editUser.name || !editUser.name.trim()) {
      setSnackbar({ open: true, message: 'Name is required', severity: 'error' })
      return
    }
    if (!editUser.email || !editUser.email.trim()) {
      setSnackbar({ open: true, message: 'Email is required', severity: 'error' })
      return
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(editUser.email.trim())) {
      setSnackbar({ open: true, message: 'Please enter a valid email address', severity: 'error' })
      return
    }
    if (!['Student', 'Teacher', 'Admin', 'Super Admin', 'Staff', 'Parent'].includes(editUser.role)) {
      setSnackbar({ open: true, message: 'Please select a valid role', severity: 'error' })
      return
    }
    const emailNormalized = editUser.email.trim().toLowerCase()
    try {
      await updateUser(editUser.id, {
        name: editUser.name.trim(),
        email: emailNormalized,
        role: editUser.role,
        status: editUser.status,
        joinedDate: editUser.joinedDate || undefined,
      })
      if (editUser.role === 'Student' && editStudentDetails) {
        await saveStudentDetails(emailNormalized, editStudentDetails)
      } else if (editUser.role === 'Teacher' && editTeacherDetails) {
        await saveTeacherDetails({ ...editTeacherDetails, email: emailNormalized })
      } else if (editUser.role === 'Parent' && editParentDetails) {
        await saveParentDetails(emailNormalized, editParentDetails)
      }
      setOpenEditDialog(false)
      setEditUser(null)
      setEditStudentDetails(null)
      setEditTeacherDetails(null)
      setEditParentDetails(null)
      setUsers(await getUsers())
      setSnackbar({ open: true, message: 'User updated successfully', severity: 'success' })
    } catch (error: any) {
      setSnackbar({ open: true, message: error.message || 'Failed to update user', severity: 'error' })
    }
  }

  /** Links another existing student to the parent currently being edited — a parent can have more than one child. */
  const handleLinkChild = async () => {
    if (!editUser || !addChildEmail) return
    setAddChildLoading(true)
    try {
      await linkParentChild(editUser.email, addChildEmail, addChildRelationship)
      setEditParentDetails(await getParentDetails(editUser.email))
      setAddChildEmail('')
      setAddChildRelationship('Guardian')
      setSnackbar({ open: true, message: 'Child linked successfully', severity: 'success' })
    } catch (error: any) {
      setSnackbar({ open: true, message: error.message || 'Failed to link child', severity: 'error' })
    } finally {
      setAddChildLoading(false)
    }
  }

  const handleUnlinkChild = async (linkId: string) => {
    if (!editUser) return
    try {
      await unlinkParentChild(linkId)
      setEditParentDetails(await getParentDetails(editUser.email))
      setSnackbar({ open: true, message: 'Child removed', severity: 'success' })
    } catch (error: any) {
      setSnackbar({ open: true, message: error.message || 'Failed to remove child', severity: 'error' })
    }
  }

  const handleAddRole = async () => {
    if (!newRole.roleKey?.trim() || !newRole.displayName?.trim()) {
      setSnackbar({ open: true, message: 'Role key and display name are required', severity: 'error' })
      return
    }
    const key = newRole.roleKey.trim()
    if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(key)) {
      setSnackbar({ open: true, message: 'Role key must start with a letter and contain only letters, numbers, and underscore', severity: 'error' })
      return
    }
    setRoleSubmitLoading(true)
    try {
      await createRole({
        roleKey: key,
        displayName: newRole.displayName.trim(),
        description: newRole.description?.trim() || undefined,
      })
      setOpenRoleDialog(false)
      setNewRole({ roleKey: '', displayName: '', description: '' })
      setRoles(await getRoles())
      setSnackbar({ open: true, message: 'Role added successfully', severity: 'success' })
    } catch (error: any) {
      setSnackbar({ open: true, message: error.message || 'Failed to add role', severity: 'error' })
    } finally {
      setRoleSubmitLoading(false)
    }
  }

  const handleEditRole = async () => {
    if (!editRole?.roleKey?.trim() || !editRole?.displayName?.trim()) return
    setRoleSubmitLoading(true)
    try {
      await updateRole(editRole.roleKey, {
        displayName: editRole.displayName.trim(),
        description: editRole.description?.trim() || undefined,
      })
      setOpenEditRoleDialog(false)
      setEditRole(null)
      setRoles(await getRoles())
      setSnackbar({ open: true, message: 'Role updated successfully', severity: 'success' })
    } catch (error: any) {
      setSnackbar({ open: true, message: error.message || 'Failed to update role', severity: 'error' })
    } finally {
      setRoleSubmitLoading(false)
    }
  }

  const handleDeleteRole = (roleKey: string) => {
    if (SYSTEM_ROLE_KEYS.includes(roleKey)) {
      setSnackbar({ open: true, message: 'System roles (Student, Teacher, Admin) cannot be deleted.', severity: 'error' })
      return
    }
    setDeleteRoleTarget(roleKey)
  }

  const confirmDeleteRole = async () => {
    if (!deleteRoleTarget) return
    setDeletingRole(true)
    try {
      await deleteRole(deleteRoleTarget)
      setRoles(await getRoles())
      setSnackbar({ open: true, message: 'Role deleted', severity: 'success' })
      setDeleteRoleTarget(null)
    } catch (error: any) {
      setSnackbar({ open: true, message: error.message || 'Failed to delete role', severity: 'error' })
    } finally {
      setDeletingRole(false)
    }
  }

  const handleViewDetails = async (user: AdminUser) => {
    setDetailsUser(user)
    setDetailsData(null)
    setDetailsError(null)
    setDetailsDialogOpen(true)
    if (user.role === 'Admin' || user.role === 'Super Admin') {
      setDetailsType(null)
      setDetailsLoading(false)
      setDetailsError(null)
      return
    }
    setDetailsType(user.role === 'Student' ? 'student' : user.role === 'Teacher' ? 'teacher' : 'parent')
    setDetailsLoading(true)
    try {
      if (user.role === 'Student') {
        const data = await getStudentDetails(user.email)
        setDetailsData(data)
      } else if (user.role === 'Teacher') {
        const data = await getTeacherDetails(user.email)
        setDetailsData(data)
      } else {
        const data = await getParentDetails(user.email)
        setDetailsData(data)
      }
      setDetailsError(null)
    } catch (error: any) {
      setDetailsError(error.message || 'Failed to load details')
      setDetailsData(null)
    } finally {
      setDetailsLoading(false)
    }
  }

  /** Opens Edit for a user and loads their role-specific profile fields, if any.
   *  Shared by the table row's Edit button and the View page's "Edit user" shortcut. */
  const handleEditClick = async (user: AdminUser) => {
    setEditUser({ ...user })
    setEditStudentDetails(null)
    setEditTeacherDetails(null)
    setEditParentDetails(null)
    setAddChildEmail('')
    setAddChildRelationship('Guardian')
    setOpenEditDialog(true)
    if (user.role === 'Student') {
      setEditDetailsLoading(true)
      try {
        setEditStudentDetails(await getStudentDetails(user.email))
      } finally {
        setEditDetailsLoading(false)
      }
    } else if (user.role === 'Teacher') {
      setEditDetailsLoading(true)
      try {
        setEditTeacherDetails(await getTeacherDetails(user.email))
      } finally {
        setEditDetailsLoading(false)
      }
    } else if (user.role === 'Parent') {
      setEditDetailsLoading(true)
      try {
        setEditParentDetails(await getParentDetails(user.email))
      } finally {
        setEditDetailsLoading(false)
      }
    }
  }

  /** Being Inactive is this app's "delete" for a user — history-bearing accounts can't be
   *  hard-deleted anyway, so toggling status is the one action that always works. */
  const handleToggleStatus = async (user: AdminUser) => {
    if (user.status === 'Active') {
      setDeactivateTarget(user)
      return
    }
    try {
      await updateUser(user.id, { status: 'Active' })
      setUsers(await getUsers())
      setSnackbar({ open: true, message: `${user.name} reactivated`, severity: 'success' })
    } catch (error: any) {
      setSnackbar({ open: true, message: error.message || 'Failed to update status', severity: 'error' })
    }
  }

  const confirmDeactivate = async () => {
    if (!deactivateTarget) return
    setDeactivating(true)
    try {
      await updateUser(deactivateTarget.id, { status: 'Inactive' })
      setUsers(await getUsers())
      setSnackbar({ open: true, message: `${deactivateTarget.name} set to Inactive`, severity: 'success' })
      setDeactivateTarget(null)
    } catch (error: any) {
      setSnackbar({ open: true, message: error.message || 'Failed to update status', severity: 'error' })
    } finally {
      setDeactivating(false)
    }
  }

  const filteredUsers = users.filter(
    (u) =>
      (!roleFilter || u.role === roleFilter) &&
      (!searchQuery.trim() ||
        u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.status.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const { page, rowsPerPage, pageItems: pagedUsers, handleChangePage, handleChangeRowsPerPage } = usePagination(filteredUsers, 10)

  if (openPasswordDialog) {
    return (
      <Box sx={{ fontFamily: "'Poppins', sans-serif" }}>
        <BackButton
          onClick={() => {
            setOpenPasswordDialog(false)
            setPasswordUser(null)
            setNewPassword('')
            setShowResetPassword(false)
          }}
        />
        <Typography variant="h5" fontWeight={700} sx={{ color: THEME.textDark, mb: 3 }}>
          Reset password
        </Typography>
        {passwordUser && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            User: {passwordUser.name} ({passwordUser.email})
          </Typography>
        )}
        <Box sx={{ maxWidth: 480 }}>
          <TextField
            fullWidth
            label="New password"
            type={showResetPassword ? 'text' : 'password'}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Min 6 characters"
            autoComplete="new-password"
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    aria-label={showResetPassword ? 'Hide password' : 'Show password'}
                    onClick={() => setShowResetPassword((v) => !v)}
                    edge="end"
                  >
                    {showResetPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
        </Box>
        <Box sx={{ display: 'flex', gap: 1, mt: 3 }}>
          <Button
            onClick={() => {
              setOpenPasswordDialog(false)
              setPasswordUser(null)
              setNewPassword('')
              setShowResetPassword(false)
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleResetPassword}
            disabled={passwordLoading || !newPassword || newPassword.length < 6}
          >
            {passwordLoading ? 'Saving...' : 'Reset password'}
          </Button>
        </Box>
      </Box>
    )
  }

  if (openEditDialog) {
    const closeEditDialog = () => { setOpenEditDialog(false); setEditUser(null); setEditStudentDetails(null); setEditTeacherDetails(null); setEditParentDetails(null) }
    const editVisual = (editUser && ROLE_VISUAL[editUser.role]) || { icon: <Edit />, accent: THEME.primary }
    return (
      <Box sx={{ fontFamily: "'Poppins', sans-serif" }}>
        <BackButton onClick={closeEditDialog} />
        {editUser && (
          <FormShell
            icon={editVisual.icon}
            title={`Edit ${getRoleDisplayName(editUser.role)}`}
            subtitle="Update the account details below"
            footer={
              <>
                <ShellSecondaryButton onClick={closeEditDialog}>Cancel</ShellSecondaryButton>
                <ShellPrimaryButton startIcon={<Edit />} onClick={handleEditUser} disabled={!editUser}>
                  Save changes
                </ShellPrimaryButton>
              </>
            }
          >
            <TextField
              fullWidth
              label="Full Name"
              value={editUser.name}
              onChange={(e) => setEditUser({ ...editUser, name: e.target.value })}
              variant="outlined"
              autoComplete="off"
              InputLabelProps={{ shrink: true, sx: { color: THEME.textDark } }}
              sx={fieldSx}
            />
            <TextField
              fullWidth
              label="Email"
              value={editUser.email}
              onChange={(e) => setEditUser({ ...editUser, email: e.target.value })}
              variant="outlined"
              autoComplete="off"
              InputLabelProps={{ shrink: true, sx: { color: THEME.textDark } }}
              sx={fieldSx}
            />
            <FormControl fullWidth variant="outlined">
              <InputLabel id="edit-user-status-label" shrink sx={{ color: THEME.textDark }}>
                Status
              </InputLabel>
              <Select
                labelId="edit-user-status-label"
                value={editUser.status}
                label="Status"
                onChange={(e) => setEditUser({ ...editUser, status: e.target.value as 'Active' | 'Inactive' })}
                sx={selectSx}
              >
                <MenuItem value="Active">Active</MenuItem>
                <MenuItem value="Inactive">Inactive</MenuItem>
              </Select>
            </FormControl>
            {editUser.role !== 'Student' && editUser.role !== 'Teacher' && (
              <TextField
                fullWidth
                label="Joining Date"
                type="date"
                value={editUser.joinedDate || ''}
                onChange={(e) => setEditUser({ ...editUser, joinedDate: e.target.value })}
                variant="outlined"
                autoComplete="off"
                InputLabelProps={{ shrink: true, sx: { color: THEME.textDark } }}
                sx={fieldSx}
              />
            )}

            {editDetailsLoading && (
              <Box display="flex" justifyContent="center" py={2}>
                <CircularProgress size={24} sx={{ color: THEME.primary }} />
              </Box>
            )}

            {!editDetailsLoading && editUser.role === 'Student' && editStudentDetails && (
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                  gap: 2.5,
                  p: 2.5,
                  borderRadius: 2,
                  backgroundColor: THEME.primaryLight,
                  border: `1px solid ${THEME.primaryBorder}`,
                }}
              >
                <Typography variant="subtitle2" fontWeight={700} sx={{ gridColumn: '1 / -1', color: THEME.primary, display: 'flex', alignItems: 'center', gap: 0.75 }}>
                  <School sx={{ fontSize: 18 }} /> Student Details
                </Typography>
                <TextField fullWidth label="Student ID" value={editStudentDetails.studentId} disabled InputProps={{ readOnly: true }} InputLabelProps={{ shrink: true, sx: { color: THEME.textDark } }} sx={fieldSx} />
                <FormControl fullWidth variant="outlined">
                  <InputLabel id="edit-student-grade-level-label" shrink sx={{ color: THEME.textDark }}>Grade Level</InputLabel>
                  <Select
                    labelId="edit-student-grade-level-label"
                    value={editStudentDetails.gradeLevel || ''}
                    label="Grade Level"
                    onChange={(e) => setEditStudentDetails({ ...editStudentDetails, gradeLevel: e.target.value as StudentDetail['gradeLevel'] })}
                    sx={selectSx}
                  >
                    <MenuItem value="Primary">Primary</MenuItem>
                    <MenuItem value="Secondary">Secondary</MenuItem>
                    <MenuItem value="O/L">O/L</MenuItem>
                    <MenuItem value="A/L">A/L</MenuItem>
                  </Select>
                </FormControl>
                <TextField fullWidth label="Date of Birth" type="date" value={editStudentDetails.dateOfBirth || ''} onChange={(e) => setEditStudentDetails({ ...editStudentDetails, dateOfBirth: e.target.value })} autoComplete="off" InputLabelProps={{ shrink: true, sx: { color: THEME.textDark } }} sx={fieldSx} />
                <FormControl fullWidth variant="outlined">
                  <InputLabel id="edit-student-gender-label" shrink sx={{ color: THEME.textDark }}>Gender</InputLabel>
                  <Select
                    labelId="edit-student-gender-label"
                    value={editStudentDetails.gender || ''}
                    label="Gender"
                    onChange={(e) => setEditStudentDetails({ ...editStudentDetails, gender: e.target.value as StudentDetail['gender'] })}
                    sx={selectSx}
                  >
                    <MenuItem value="Male">Male</MenuItem>
                    <MenuItem value="Female">Female</MenuItem>
                    <MenuItem value="Other">Other</MenuItem>
                  </Select>
                </FormControl>
                <TextField fullWidth label="Batch" value={editStudentDetails.batch} onChange={(e) => setEditStudentDetails({ ...editStudentDetails, batch: e.target.value })} autoComplete="off" InputLabelProps={{ shrink: true, sx: { color: THEME.textDark } }} sx={fieldSx} />
                <TextField fullWidth label="Contact Number" value={editStudentDetails.contactNumber || ''} onChange={(e) => setEditStudentDetails({ ...editStudentDetails, contactNumber: sanitizePhoneInput(e.target.value) })} autoComplete="off" InputLabelProps={{ shrink: true, sx: { color: THEME.textDark } }} sx={fieldSx} />
                <TextField fullWidth label="Joining Date" type="date" value={editStudentDetails.admissionDate || ''} onChange={(e) => setEditStudentDetails({ ...editStudentDetails, admissionDate: e.target.value })} autoComplete="off" InputLabelProps={{ shrink: true, sx: { color: THEME.textDark } }} sx={fieldSx} />
                <TextField fullWidth label="Address" multiline rows={2} value={editStudentDetails.address || ''} onChange={(e) => setEditStudentDetails({ ...editStudentDetails, address: e.target.value })} autoComplete="off" InputLabelProps={{ shrink: true, sx: { color: THEME.textDark } }} sx={{ ...fieldSx, gridColumn: { xs: '1', sm: '1 / -1' } }} />
              </Box>
            )}

            {!editDetailsLoading && editUser.role === 'Teacher' && editTeacherDetails && (
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                  gap: 2.5,
                  p: 2.5,
                  borderRadius: 2,
                  backgroundColor: THEME.primaryLight,
                  border: `1px solid ${THEME.primaryBorder}`,
                }}
              >
                <Typography variant="subtitle2" fontWeight={700} sx={{ gridColumn: '1 / -1', color: THEME.primary, display: 'flex', alignItems: 'center', gap: 0.75 }}>
                  <Badge sx={{ fontSize: 18 }} /> Teacher Details
                </Typography>
                <TextField fullWidth label="Employee ID" value={editTeacherDetails.employeeId} disabled InputProps={{ readOnly: true }} InputLabelProps={{ shrink: true, sx: { color: THEME.textDark } }} sx={fieldSx} />
                <TextField fullWidth label="Qualification" value={editTeacherDetails.qualification} onChange={(e) => setEditTeacherDetails({ ...editTeacherDetails, qualification: e.target.value })} autoComplete="off" InputLabelProps={{ shrink: true, sx: { color: THEME.textDark } }} sx={fieldSx} />
                <TextField fullWidth label="Subject Specialization" value={editTeacherDetails.subjectSpecialization} onChange={(e) => setEditTeacherDetails({ ...editTeacherDetails, subjectSpecialization: e.target.value })} autoComplete="off" InputLabelProps={{ shrink: true, sx: { color: THEME.textDark } }} sx={fieldSx} />
                <TextField fullWidth label="Joining Date" type="date" value={editTeacherDetails.joiningDate || ''} onChange={(e) => setEditTeacherDetails({ ...editTeacherDetails, joiningDate: e.target.value })} autoComplete="off" InputLabelProps={{ shrink: true, sx: { color: THEME.textDark } }} sx={{ ...fieldSx, gridColumn: { xs: '1', sm: '1 / -1' } }} />
              </Box>
            )}

            {!editDetailsLoading && editUser.role === 'Parent' && editParentDetails && (
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                  gap: 2.5,
                  p: 2.5,
                  borderRadius: 2,
                  backgroundColor: THEME.primaryLight,
                  border: `1px solid ${THEME.primaryBorder}`,
                }}
              >
                <Typography variant="subtitle2" fontWeight={700} sx={{ gridColumn: '1 / -1', color: THEME.primary, display: 'flex', alignItems: 'center', gap: 0.75 }}>
                  <FamilyRestroom sx={{ fontSize: 18 }} /> Parent Details
                </Typography>
                <TextField fullWidth label="Occupation" value={editParentDetails.occupation || ''} onChange={(e) => setEditParentDetails({ ...editParentDetails, occupation: e.target.value })} autoComplete="off" InputLabelProps={{ shrink: true, sx: { color: THEME.textDark } }} sx={fieldSx} />
                <TextField fullWidth label="Emergency Contact" value={editParentDetails.emergencyContact || ''} onChange={(e) => setEditParentDetails({ ...editParentDetails, emergencyContact: sanitizePhoneInput(e.target.value) })} autoComplete="off" InputLabelProps={{ shrink: true, sx: { color: THEME.textDark } }} sx={fieldSx} />
                <TextField fullWidth label="Address" multiline rows={2} value={editParentDetails.address || ''} onChange={(e) => setEditParentDetails({ ...editParentDetails, address: e.target.value })} autoComplete="off" InputLabelProps={{ shrink: true, sx: { color: THEME.textDark } }} sx={{ ...fieldSx, gridColumn: { xs: '1', sm: '1 / -1' } }} />

                <Box sx={{ gridColumn: '1 / -1', display: 'grid', gap: 1 }}>
                  <Typography variant="caption" sx={{ color: THEME.muted, fontWeight: 600 }}>
                    Linked children — a parent can have more than one
                  </Typography>
                  <Box display="flex" flexWrap="wrap" gap={1}>
                    {editParentDetails.children && editParentDetails.children.length > 0 ? (
                      editParentDetails.children.map((c) => (
                        <Chip
                          key={c.linkId}
                          label={`${c.studentName} (${c.relationship})`}
                          onDelete={() => handleUnlinkChild(c.linkId)}
                          sx={{ bgcolor: '#fff', border: `1px solid ${THEME.primaryBorder}` }}
                        />
                      ))
                    ) : (
                      <Typography variant="body2" sx={{ color: THEME.muted }}>No children linked yet.</Typography>
                    )}
                  </Box>
                </Box>

                <Autocomplete
                  disabled={addChildLoading}
                  options={users.filter((u) => u.role === 'Student' && !editParentDetails.children?.some((c) => c.studentEmail === u.email))}
                  getOptionLabel={(s) => `${s.name} (${s.email})`}
                  value={users.find((u) => u.email === addChildEmail) || null}
                  onChange={(_, val) => setAddChildEmail(val?.email || '')}
                  isOptionEqualToValue={(o, v) => o.email === v.email}
                  renderInput={(params) => (
                    <TextField {...params} label="Link another child" placeholder="Search by name or email" InputLabelProps={{ ...params.InputLabelProps, shrink: true, sx: { color: THEME.textDark } }} sx={fieldSx} />
                  )}
                />
                <Box display="flex" gap={1.5}>
                  <FormControl fullWidth disabled={addChildLoading} variant="outlined">
                    <InputLabel id="edit-add-child-relationship-label" shrink sx={{ color: THEME.textDark }}>Relationship</InputLabel>
                    <Select
                      labelId="edit-add-child-relationship-label"
                      value={addChildRelationship}
                      label="Relationship"
                      onChange={(e) => setAddChildRelationship(e.target.value as 'Father' | 'Mother' | 'Guardian')}
                      sx={selectSx}
                    >
                      <MenuItem value="Father">Father</MenuItem>
                      <MenuItem value="Mother">Mother</MenuItem>
                      <MenuItem value="Guardian">Guardian</MenuItem>
                    </Select>
                  </FormControl>
                  <ShellPrimaryButton
                    onClick={handleLinkChild}
                    disabled={!addChildEmail || addChildLoading}
                    sx={{ flexShrink: 0, alignSelf: 'center' }}
                  >
                    {addChildLoading ? 'Linking...' : 'Add child'}
                  </ShellPrimaryButton>
                </Box>
              </Box>
            )}

            <ShellSecondaryButton
              startIcon={<LockReset />}
              onClick={() => {
                setPasswordUser(editUser)
                setNewPassword('')
                setOpenPasswordDialog(true)
              }}
              sx={{ color: THEME.primary, justifySelf: 'start' }}
            >
              Reset Password
            </ShellSecondaryButton>
          </FormShell>
        )}
      </Box>
    )
  }

  if (openRoleDialog) {
    return (
      <Box sx={{ fontFamily: "'Poppins', sans-serif" }}>
        <BackButton onClick={() => { setOpenRoleDialog(false); setNewRole({ roleKey: '', displayName: '', description: '' }) }} />
        <Typography variant="h5" fontWeight={700} sx={{ color: THEME.textDark, mb: 3 }}>
          Add user role
        </Typography>
        <Box display="grid" gap={2} sx={{ maxWidth: 480 }}>
          <TextField
            fullWidth
            label="Role key"
            value={newRole.roleKey}
            onChange={(e) => setNewRole({ ...newRole, roleKey: e.target.value })}
            placeholder="e.g. Moderator"
            helperText="Letters, numbers, underscore only. Used in code."
            autoComplete="off"
          />
          <TextField
            fullWidth
            label="Display name"
            value={newRole.displayName}
            onChange={(e) => setNewRole({ ...newRole, displayName: e.target.value })}
            placeholder="e.g. Moderator"
            autoComplete="off"
          />
          <TextField
            fullWidth
            label="Description"
            value={newRole.description}
            onChange={(e) => setNewRole({ ...newRole, description: e.target.value })}
            placeholder="Optional"
            multiline
            rows={2}
            autoComplete="off"
          />
        </Box>
        <Box sx={{ display: 'flex', gap: 1, mt: 3 }}>
          <Button onClick={() => { setOpenRoleDialog(false); setNewRole({ roleKey: '', displayName: '', description: '' }) }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleAddRole}
            disabled={roleSubmitLoading || !newRole.roleKey?.trim() || !newRole.displayName?.trim()}
          >
            {roleSubmitLoading ? 'Adding...' : 'Add role'}
          </Button>
        </Box>
      </Box>
    )
  }

  if (openEditRoleDialog) {
    return (
      <Box sx={{ fontFamily: "'Poppins', sans-serif" }}>
        <BackButton onClick={() => { setOpenEditRoleDialog(false); setEditRole(null) }} />
        <Typography variant="h5" fontWeight={700} sx={{ color: THEME.textDark, mb: 3 }}>
          Edit user role
        </Typography>
        {editRole && (
          <Box display="grid" gap={2} sx={{ maxWidth: 480 }}>
            <TextField
              fullWidth
              label="Role key"
              value={editRole.roleKey}
              disabled
              helperText="Role key cannot be changed"
            />
            <TextField
              fullWidth
              label="Display name"
              value={editRole.displayName}
              onChange={(e) => setEditRole({ ...editRole, displayName: e.target.value })}
              autoComplete="off"
            />
            <TextField
              fullWidth
              label="Description"
              value={editRole.description ?? ''}
              onChange={(e) => setEditRole({ ...editRole, description: e.target.value })}
              placeholder="Optional"
              multiline
              rows={2}
              autoComplete="off"
            />
          </Box>
        )}
        <Box sx={{ display: 'flex', gap: 1, mt: 3 }}>
          <Button onClick={() => { setOpenEditRoleDialog(false); setEditRole(null) }}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleEditRole}
            disabled={roleSubmitLoading || !editRole?.displayName?.trim()}
          >
            {roleSubmitLoading ? 'Saving...' : 'Save changes'}
          </Button>
        </Box>
      </Box>
    )
  }

  if (openRoleManagementPopup) {
    return (
      <Box sx={{ fontFamily: "'Poppins', sans-serif" }}>
        <BackButton onClick={() => setOpenRoleManagementPopup(false)} />
        <Typography variant="h5" fontWeight={700} sx={{ color: THEME.textDark, mb: 3 }}>
          User Role Management
        </Typography>
        <Card elevation={0} sx={{ border: `1px solid ${THEME.primaryBorder}`, borderRadius: 0 }}>
          <CardContent sx={{ p: 0 }}>
            <Box sx={{ px: 2.5, py: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${THEME.primaryBorder}` }}>
              <Typography variant="body2" sx={{ color: THEME.muted }}>
                Add, edit, or remove user roles. System roles (Student, Teacher, Admin) cannot be deleted.
              </Typography>
              <Button
                variant="contained"
                size="small"
                startIcon={<Add />}
                onClick={() => setOpenRoleDialog(true)}
                sx={{ borderRadius: 0, textTransform: 'none', fontWeight: 600, backgroundColor: THEME.primary, '&:hover': { backgroundColor: '#1e40af' } }}
              >
                Add role
              </Button>
            </Box>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ backgroundColor: THEME.primaryLight }}>
                    <TableCell sx={{ fontWeight: 600, color: THEME.textDark }}>Role</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: THEME.textDark }}>Display name</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: THEME.textDark }}>Description</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600, color: THEME.textDark }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {roles.map((r) => (
                    <TableRow key={r.roleKey} sx={{ '&:hover': { backgroundColor: THEME.primaryLight } }}>
                      <TableCell>
                        <Chip
                          label={r.roleKey}
                          size="small"
                          sx={{ borderRadius: 0, bgcolor: getRoleColor(r.roleKey).bg, color: getRoleColor(r.roleKey).color }}
                        />
                      </TableCell>
                      <TableCell>{r.displayName}</TableCell>
                      <TableCell sx={{ color: THEME.muted }}>{r.description || '—'}</TableCell>
                      <TableCell align="right">
                        <Box display="flex" gap={0.5} justifyContent="flex-end">
                          <IconButton
                            size="small"
                            sx={{ color: THEME.primary }}
                            title="Edit role"
                            onClick={() => { setEditRole({ ...r }); setOpenEditRoleDialog(true) }}
                          >
                            <Edit fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            color="error"
                            title={SYSTEM_ROLE_KEYS.includes(r.roleKey) ? 'System role cannot be deleted' : 'Delete role'}
                            disabled={SYSTEM_ROLE_KEYS.includes(r.roleKey)}
                            onClick={() => handleDeleteRole(r.roleKey)}
                          >
                            <Delete fontSize="small" />
                          </IconButton>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      </Box>
    )
  }

  if (detailsDialogOpen) {
    const closeDetailsDialog = () => {
      setDetailsDialogOpen(false)
      setDetailsUser(null)
      setDetailsData(null)
      setDetailsType(null)
      setDetailsError(null)
    }
    const detailsVisual = (detailsUser && ROLE_VISUAL[detailsUser.role]) || { icon: <Visibility />, accent: THEME.primary }
    return (
      <Box sx={{ fontFamily: "'Poppins', sans-serif" }}>
        <BackButton onClick={closeDetailsDialog} />
        {detailsUser && (
          <FormShell
            icon={detailsVisual.icon}
            title={`${getRoleDisplayName(detailsUser.role)} details — ${detailsUser.name}`}
            subtitle="Read-only overview of this account"
            footer={
              <>
                <ShellSecondaryButton onClick={closeDetailsDialog}>Close</ShellSecondaryButton>
                <ShellPrimaryButton
                  startIcon={<Edit />}
                  onClick={() => {
                    const user = detailsUser
                    closeDetailsDialog()
                    handleEditClick(user)
                  }}
                >
                  Edit user
                </ShellPrimaryButton>
              </>
            }
          >
            {(detailsUser.role === 'Admin' || detailsUser.role === 'Super Admin') && (
              <>
                <TextField fullWidth label="ID" value={detailsUser.displayId || '—'} disabled InputProps={{ readOnly: true }} InputLabelProps={{ shrink: true, sx: { color: THEME.textDark } }} sx={fieldSx} />
                <TextField fullWidth label="Name" value={detailsUser.name} disabled InputProps={{ readOnly: true }} InputLabelProps={{ shrink: true, sx: { color: THEME.textDark } }} sx={fieldSx} />
                <TextField fullWidth label="Email" value={detailsUser.email} disabled InputProps={{ readOnly: true }} InputLabelProps={{ shrink: true, sx: { color: THEME.textDark } }} sx={fieldSx} />
                <TextField fullWidth label="Status" value={detailsUser.status} disabled InputProps={{ readOnly: true }} InputLabelProps={{ shrink: true, sx: { color: THEME.textDark } }} sx={fieldSx} />
                <TextField fullWidth label="Joining date" value={detailsUser.joinedDate} disabled InputProps={{ readOnly: true }} InputLabelProps={{ shrink: true, sx: { color: THEME.textDark } }} sx={fieldSx} />
              </>
            )}
            {detailsType === 'student' && (
              <>
                {detailsLoading && (
                  <Box display="flex" justifyContent="center" py={3}>
                    <CircularProgress sx={{ color: THEME.primary }} />
                  </Box>
                )}
                {!detailsLoading && detailsError && (
                  <Typography color="error">{detailsError}</Typography>
                )}
                {!detailsLoading && detailsData && detailsType === 'student' && (
                  <>
                    <TextField fullWidth label="Name" value={detailsUser.name} disabled InputProps={{ readOnly: true }} InputLabelProps={{ shrink: true, sx: { color: THEME.textDark } }} sx={fieldSx} />
                    <TextField fullWidth label="Email" value={(detailsData as StudentDetail).email} disabled InputProps={{ readOnly: true }} InputLabelProps={{ shrink: true, sx: { color: THEME.textDark } }} sx={fieldSx} />
                    <TextField fullWidth label="Student ID" value={(detailsData as StudentDetail).studentId} disabled InputProps={{ readOnly: true }} InputLabelProps={{ shrink: true, sx: { color: THEME.textDark } }} sx={fieldSx} />
                    <TextField fullWidth label="Grade level" value={(detailsData as StudentDetail).gradeLevel || '—'} disabled InputProps={{ readOnly: true }} InputLabelProps={{ shrink: true, sx: { color: THEME.textDark } }} sx={fieldSx} />
                    <TextField fullWidth label="Date of birth" value={(detailsData as StudentDetail).dateOfBirth || '—'} disabled InputProps={{ readOnly: true }} InputLabelProps={{ shrink: true, sx: { color: THEME.textDark } }} sx={fieldSx} />
                    <TextField fullWidth label="Gender" value={(detailsData as StudentDetail).gender || '—'} disabled InputProps={{ readOnly: true }} InputLabelProps={{ shrink: true, sx: { color: THEME.textDark } }} sx={fieldSx} />
                    <TextField fullWidth label="Batch" value={(detailsData as StudentDetail).batch} disabled InputProps={{ readOnly: true }} InputLabelProps={{ shrink: true, sx: { color: THEME.textDark } }} sx={fieldSx} />
                    <TextField fullWidth label="Guardian" value={(detailsData as StudentDetail).guardianName ? `${(detailsData as StudentDetail).guardianName} (${(detailsData as StudentDetail).guardianRelationship || 'Guardian'})` : '—'} disabled InputProps={{ readOnly: true }} InputLabelProps={{ shrink: true, sx: { color: THEME.textDark } }} sx={fieldSx} />
                    <TextField fullWidth label="Contact" value={(detailsData as StudentDetail).contactNumber || '—'} disabled InputProps={{ readOnly: true }} InputLabelProps={{ shrink: true, sx: { color: THEME.textDark } }} sx={fieldSx} />
                    <TextField fullWidth label="Joining date" value={(detailsData as StudentDetail).admissionDate || '—'} disabled InputProps={{ readOnly: true }} InputLabelProps={{ shrink: true, sx: { color: THEME.textDark } }} sx={fieldSx} />
                    <TextField fullWidth label="Address" value={(detailsData as StudentDetail).address || '—'} disabled InputProps={{ readOnly: true }} InputLabelProps={{ shrink: true, sx: { color: THEME.textDark } }} sx={fieldSx} multiline />
                  </>
                )}
              </>
            )}
            {detailsType === 'teacher' && (
              <>
                {detailsLoading && (
                  <Box display="flex" justifyContent="center" py={3}>
                    <CircularProgress sx={{ color: THEME.primary }} />
                  </Box>
                )}
                {!detailsLoading && detailsError && (
                  <Typography color="error">{detailsError}</Typography>
                )}
                {!detailsLoading && detailsData && detailsType === 'teacher' && (
                  <>
                    <TextField fullWidth label="Name" value={detailsUser.name} disabled InputProps={{ readOnly: true }} InputLabelProps={{ shrink: true, sx: { color: THEME.textDark } }} sx={fieldSx} />
                    <TextField fullWidth label="Email" value={(detailsData as TeacherDetail).email} disabled InputProps={{ readOnly: true }} InputLabelProps={{ shrink: true, sx: { color: THEME.textDark } }} sx={fieldSx} />
                    <TextField fullWidth label="Employee ID" value={(detailsData as TeacherDetail).employeeId} disabled InputProps={{ readOnly: true }} InputLabelProps={{ shrink: true, sx: { color: THEME.textDark } }} sx={fieldSx} />
                    <TextField fullWidth label="Qualification" value={(detailsData as TeacherDetail).qualification || '—'} disabled InputProps={{ readOnly: true }} InputLabelProps={{ shrink: true, sx: { color: THEME.textDark } }} sx={fieldSx} />
                    <TextField fullWidth label="Subject specialization" value={(detailsData as TeacherDetail).subjectSpecialization || '—'} disabled InputProps={{ readOnly: true }} InputLabelProps={{ shrink: true, sx: { color: THEME.textDark } }} sx={fieldSx} />
                    <TextField fullWidth label="Joining date" value={(detailsData as TeacherDetail).joiningDate || '—'} disabled InputProps={{ readOnly: true }} InputLabelProps={{ shrink: true, sx: { color: THEME.textDark } }} sx={fieldSx} />
                  </>
                )}
              </>
            )}
            {detailsType === 'parent' && (
              <>
                {detailsLoading && (
                  <Box display="flex" justifyContent="center" py={3}>
                    <CircularProgress sx={{ color: THEME.primary }} />
                  </Box>
                )}
                {!detailsLoading && detailsError && (
                  <Typography color="error">{detailsError}</Typography>
                )}
                {!detailsLoading && detailsData && detailsType === 'parent' && (
                  <>
                    <TextField fullWidth label="Name" value={detailsUser.name} disabled InputProps={{ readOnly: true }} InputLabelProps={{ shrink: true, sx: { color: THEME.textDark } }} sx={fieldSx} />
                    <TextField fullWidth label="Email" value={(detailsData as ParentDetail).email} disabled InputProps={{ readOnly: true }} InputLabelProps={{ shrink: true, sx: { color: THEME.textDark } }} sx={fieldSx} />
                    <TextField fullWidth label="Joining date" value={detailsUser.joinedDate || '—'} disabled InputProps={{ readOnly: true }} InputLabelProps={{ shrink: true, sx: { color: THEME.textDark } }} sx={fieldSx} />
                    <TextField fullWidth label="Occupation" value={(detailsData as ParentDetail).occupation || '—'} disabled InputProps={{ readOnly: true }} InputLabelProps={{ shrink: true, sx: { color: THEME.textDark } }} sx={fieldSx} />
                    <TextField fullWidth label="Address" value={(detailsData as ParentDetail).address || '—'} disabled InputProps={{ readOnly: true }} InputLabelProps={{ shrink: true, sx: { color: THEME.textDark } }} sx={fieldSx} multiline />
                    <TextField fullWidth label="Emergency Contact" value={(detailsData as ParentDetail).emergencyContact || '—'} disabled InputProps={{ readOnly: true }} InputLabelProps={{ shrink: true, sx: { color: THEME.textDark } }} sx={fieldSx} />
                    <TextField
                      fullWidth
                      label="Linked children"
                      value={
                        (detailsData as ParentDetail).children && (detailsData as ParentDetail).children!.length > 0
                          ? (detailsData as ParentDetail).children!.map((c) => `${c.studentName} (${c.relationship})`).join(', ')
                          : '—'
                      }
                      disabled
                      InputProps={{ readOnly: true }}
                      InputLabelProps={{ shrink: true, sx: { color: THEME.textDark } }}
                      sx={fieldSx}
                      multiline
                    />
                  </>
                )}
              </>
            )}
          </FormShell>
        )}
      </Box>
    )
  }

  if (openDialog) {
    const roleVisual = ROLE_VISUAL[newUser.role] || { icon: <PersonAddAlt1 />, accent: THEME.primary }
    const closeAddDialog = () => {
      if (!addUserLoading) {
        setOpenDialog(false)
        setAddUserError(null)
      }
    }
    return (
      <Box sx={{ fontFamily: "'Poppins', sans-serif" }}>
        <BackButton onClick={closeAddDialog} />
        <FormShell
          icon={roleVisual.icon}
          title={newUser.role ? `Add New ${getRoleDisplayName(newUser.role)}` : 'Add New User'}
          subtitle="Fill in the details below to create the account"
          error={addUserError}
          onErrorClose={() => setAddUserError(null)}
          footer={
            <>
              <ShellSecondaryButton onClick={closeAddDialog} disabled={addUserLoading}>
                Cancel
              </ShellSecondaryButton>
              <ShellPrimaryButton
                startIcon={addUserLoading ? <CircularProgress size={18} color="inherit" /> : <Add />}
                onClick={handleAddUser}
                disabled={
                  addUserLoading ||
                  !newUser.name.trim() ||
                  !newUser.email.trim() ||
                  !newUser.role ||
                  (newUser.password?.length ?? 0) < 6 ||
                  (newUser.role === 'Student' && (!newUser.gradeLevel || !newUser.dateOfBirth || !newUser.gender)) ||
                  (newUser.role === 'Teacher' && (!newUser.qualification.trim() || !newUser.subjectSpecialization.trim())) ||
                  (newUser.role === 'Parent' && (!newUser.occupation.trim() || !newUser.address.trim() || !newUser.emergencyContact.trim()))
                }
              >
                {addUserLoading ? 'Adding...' : newUser.role ? `Add ${getRoleDisplayName(newUser.role)}` : 'Add User'}
              </ShellPrimaryButton>
            </>
          }
        >
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2.5 }}>
            <TextField
              fullWidth
              required
              label="Full Name"
              placeholder="John Doe"
              value={newUser.name}
              onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
              disabled={addUserLoading}
              variant="outlined"
              autoComplete="off"
              InputLabelProps={{ shrink: true, sx: { color: THEME.textDark } }}
              sx={fieldSx}
            />
            <TextField
              fullWidth
              required
              label="Email Address"
              type="email"
              placeholder="john@example.com"
              value={newUser.email}
              onChange={(e) => {
                setNewUser({ ...newUser, email: e.target.value })
                if (addUserError) setAddUserError(null)
              }}
              disabled={addUserLoading}
              error={!!addUserError}
              helperText={addUserError && addUserError.toLowerCase().includes('email') ? addUserError : undefined}
              variant="outlined"
              autoComplete="off"
              InputLabelProps={{ shrink: true, sx: { color: THEME.textDark } }}
              sx={fieldSx}
            />
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2.5 }}>
            <TextField
              fullWidth
              label="Phone Number"
              placeholder="07XXXXXXXX"
              value={newUser.phone}
              onChange={(e) => setNewUser({ ...newUser, phone: sanitizePhoneInput(e.target.value) })}
              disabled={addUserLoading}
              variant="outlined"
              autoComplete="off"
              InputLabelProps={{ shrink: true, sx: { color: THEME.textDark } }}
              sx={fieldSx}
            />
            {newUser.role !== 'Student' && newUser.role !== 'Teacher' && (
              <TextField
                fullWidth
                label="Joining Date"
                type="date"
                value={newUser.joinedDate}
                onChange={(e) => setNewUser({ ...newUser, joinedDate: e.target.value })}
                disabled={addUserLoading}
                variant="outlined"
                autoComplete="off"
                InputLabelProps={{ shrink: true, sx: { color: THEME.textDark } }}
                helperText="Defaults to today if left blank"
                sx={fieldSx}
              />
            )}
          </Box>

          {newUser.role === 'Student' && (
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                gap: 2.5,
                p: 2.5,
                borderRadius: 2,
                backgroundColor: THEME.primaryLight,
                border: `1px solid ${THEME.primaryBorder}`,
              }}
            >
              <Typography
                variant="subtitle2"
                fontWeight={700}
                sx={{ gridColumn: '1 / -1', color: THEME.primary, display: 'flex', alignItems: 'center', gap: 0.75 }}
              >
                <School sx={{ fontSize: 18 }} /> Student Details
              </Typography>
              <FormControl fullWidth required disabled={addUserLoading} variant="outlined">
                <InputLabel id="add-user-grade-level-label" shrink sx={{ color: THEME.textDark }}>Grade Level</InputLabel>
                <Select
                  labelId="add-user-grade-level-label"
                  value={newUser.gradeLevel}
                  label="Grade Level"
                  onChange={(e) => setNewUser({ ...newUser, gradeLevel: e.target.value })}
                  sx={selectSx}
                >
                  <MenuItem value="Primary">Primary</MenuItem>
                  <MenuItem value="Secondary">Secondary</MenuItem>
                  <MenuItem value="O/L">O/L</MenuItem>
                  <MenuItem value="A/L">A/L</MenuItem>
                </Select>
              </FormControl>
              <TextField
                fullWidth
                required
                label="Date of Birth"
                type="date"
                value={newUser.dateOfBirth}
                onChange={(e) => setNewUser({ ...newUser, dateOfBirth: e.target.value })}
                disabled={addUserLoading}
                variant="outlined"
                autoComplete="off"
                InputLabelProps={{ shrink: true, sx: { color: THEME.textDark } }}
                sx={fieldSx}
              />
              <FormControl fullWidth required disabled={addUserLoading} variant="outlined">
                <InputLabel id="add-user-gender-label" shrink sx={{ color: THEME.textDark }}>Gender</InputLabel>
                <Select
                  labelId="add-user-gender-label"
                  value={newUser.gender}
                  label="Gender"
                  onChange={(e) => setNewUser({ ...newUser, gender: e.target.value })}
                  sx={selectSx}
                >
                  <MenuItem value="Male">Male</MenuItem>
                  <MenuItem value="Female">Female</MenuItem>
                  <MenuItem value="Other">Other</MenuItem>
                </Select>
              </FormControl>
              <TextField
                fullWidth
                label="Joining Date"
                type="date"
                value={newUser.admissionDate}
                onChange={(e) => setNewUser({ ...newUser, admissionDate: e.target.value })}
                disabled={addUserLoading}
                variant="outlined"
                autoComplete="off"
                InputLabelProps={{ shrink: true, sx: { color: THEME.textDark } }}
                helperText="Defaults to today if left blank"
                sx={fieldSx}
              />
            </Box>
          )}

          {newUser.role === 'Teacher' && (
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                gap: 2.5,
                p: 2.5,
                borderRadius: 2,
                backgroundColor: THEME.primaryLight,
                border: `1px solid ${THEME.primaryBorder}`,
              }}
            >
              <Typography
                variant="subtitle2"
                fontWeight={700}
                sx={{ gridColumn: '1 / -1', color: THEME.primary, display: 'flex', alignItems: 'center', gap: 0.75 }}
              >
                <Badge sx={{ fontSize: 18 }} /> Teacher Details
              </Typography>
              <TextField
                fullWidth
                required
                label="Qualification"
                placeholder="e.g. B.Sc, B.Ed"
                value={newUser.qualification}
                onChange={(e) => setNewUser({ ...newUser, qualification: e.target.value })}
                disabled={addUserLoading}
                variant="outlined"
                autoComplete="off"
                InputLabelProps={{ shrink: true, sx: { color: THEME.textDark } }}
                sx={fieldSx}
              />
              <TextField
                fullWidth
                required
                label="Subject Specialization"
                placeholder="e.g. Mathematics"
                value={newUser.subjectSpecialization}
                onChange={(e) => setNewUser({ ...newUser, subjectSpecialization: e.target.value })}
                disabled={addUserLoading}
                variant="outlined"
                autoComplete="off"
                InputLabelProps={{ shrink: true, sx: { color: THEME.textDark } }}
                sx={fieldSx}
              />
              <TextField
                fullWidth
                label="Joining Date"
                type="date"
                value={newUser.joiningDate}
                onChange={(e) => setNewUser({ ...newUser, joiningDate: e.target.value })}
                disabled={addUserLoading}
                variant="outlined"
                autoComplete="off"
                InputLabelProps={{ shrink: true, sx: { color: THEME.textDark } }}
                helperText="Defaults to today if left blank"
                sx={{ ...fieldSx, gridColumn: { xs: '1', sm: '1 / -1' } }}
              />
            </Box>
          )}

          {newUser.role === 'Parent' && (
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                gap: 2.5,
                p: 2.5,
                borderRadius: 2,
                backgroundColor: THEME.primaryLight,
                border: `1px solid ${THEME.primaryBorder}`,
              }}
            >
              <Typography
                variant="subtitle2"
                fontWeight={700}
                sx={{ gridColumn: '1 / -1', color: THEME.primary, display: 'flex', alignItems: 'center', gap: 0.75 }}
              >
                <FamilyRestroom sx={{ fontSize: 18 }} /> Parent Details
              </Typography>
              <TextField
                fullWidth
                required
                label="Occupation"
                value={newUser.occupation}
                onChange={(e) => setNewUser({ ...newUser, occupation: e.target.value })}
                disabled={addUserLoading}
                variant="outlined"
                autoComplete="off"
                InputLabelProps={{ shrink: true, sx: { color: THEME.textDark } }}
                sx={fieldSx}
              />
              <TextField
                fullWidth
                required
                label="Emergency Contact"
                placeholder="07XXXXXXXX"
                value={newUser.emergencyContact}
                onChange={(e) => setNewUser({ ...newUser, emergencyContact: sanitizePhoneInput(e.target.value) })}
                disabled={addUserLoading}
                variant="outlined"
                autoComplete="off"
                InputLabelProps={{ shrink: true, sx: { color: THEME.textDark } }}
                sx={fieldSx}
              />
              <TextField
                fullWidth
                required
                label="Address"
                multiline
                rows={2}
                value={newUser.address}
                onChange={(e) => setNewUser({ ...newUser, address: e.target.value })}
                disabled={addUserLoading}
                variant="outlined"
                autoComplete="off"
                InputLabelProps={{ shrink: true, sx: { color: THEME.textDark } }}
                sx={{ ...fieldSx, gridColumn: { xs: '1', sm: '1 / -1' } }}
              />
              <Autocomplete
                disabled={addUserLoading}
                options={users.filter((u) => u.role === 'Student')}
                getOptionLabel={(s) => `${s.name} (${s.email})`}
                value={users.find((u) => u.email === newUser.linkedStudentEmail) || null}
                onChange={(_, val) => setNewUser({ ...newUser, linkedStudentEmail: val?.email || '' })}
                isOptionEqualToValue={(o, v) => o.email === v.email}
                renderInput={(params) => (
                  <TextField {...params} label="Link to Student (optional)" placeholder="Search by name or email" InputLabelProps={{ ...params.InputLabelProps, shrink: true, sx: { color: THEME.textDark } }} sx={fieldSx} />
                )}
              />
              {newUser.linkedStudentEmail && (
                <FormControl fullWidth disabled={addUserLoading} variant="outlined">
                  <InputLabel id="add-user-relationship-label" shrink sx={{ color: THEME.textDark }}>Relationship</InputLabel>
                  <Select
                    labelId="add-user-relationship-label"
                    value={newUser.relationship}
                    label="Relationship"
                    onChange={(e) => setNewUser({ ...newUser, relationship: e.target.value })}
                    sx={selectSx}
                  >
                    <MenuItem value="Father">Father</MenuItem>
                    <MenuItem value="Mother">Mother</MenuItem>
                    <MenuItem value="Guardian">Guardian</MenuItem>
                  </Select>
                </FormControl>
              )}
            </Box>
          )}

          <TextField
            fullWidth
            required
            label="Password"
            type={showAddUserPassword ? 'text' : 'password'}
            placeholder="Min 6 characters"
            value={newUser.password}
            onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
            disabled={addUserLoading}
            variant="outlined"
            autoComplete="new-password"
            InputLabelProps={{ shrink: true, sx: { color: THEME.textDark } }}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    aria-label={showAddUserPassword ? 'Hide password' : 'Show password'}
                    onClick={() => setShowAddUserPassword((v) => !v)}
                    edge="end"
                    size="small"
                  >
                    {showAddUserPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
            sx={fieldSx}
          />
        </FormShell>
      </Box>
    )
  }

  return (
    <Box sx={{ fontFamily: "'Poppins', sans-serif" }}>
      {/* Header */}
      <Box
        sx={{
          mb: 3,
          pb: 3,
          borderBottom: `1px solid ${THEME.primaryBorder}`,
        }}
      >
        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 2,
            mb: 2,
          }}
        >
          <Box>
            <Typography variant="h5" fontWeight="700" sx={{ color: THEME.textDark, letterSpacing: '-0.02em', mb: 0.5 }}>
              User Management
            </Typography>
            <Typography variant="body2" sx={{ color: THEME.muted }}>
              Manage students, teachers, and admins in one place
            </Typography>
          </Box>
          <Box display="flex" gap={1.5} flexWrap="wrap">
          <Button
            variant="outlined"
            startIcon={<Security />}
            onClick={() => setOpenRoleManagementPopup(true)}
            sx={{
              borderColor: THEME.primary,
              color: THEME.primary,
              borderRadius: 0,
              textTransform: 'none',
              fontWeight: 600,
              px: 2.5,
              py: 1.25,
              '&:hover': { borderColor: '#1e40af', backgroundColor: THEME.primaryLight },
            }}
          >
            User Role
          </Button>
        </Box>
        </Box>

        {/* Role filter buttons */}
        <Box display="flex" gap={1} flexWrap="wrap">
          <Tooltip title="Show all users" arrow>
            <Box
              component="button"
              onClick={() => setRoleFilter('')}
              sx={{
                height: 40,
                px: 2,
                borderRadius: 0,
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontWeight: 700,
                fontSize: '0.8rem',
                whiteSpace: 'nowrap',
                border: `1.5px solid ${!roleFilter ? THEME.primary : THEME.primaryBorder}`,
                backgroundColor: !roleFilter ? THEME.primary : THEME.primaryLight,
                color: !roleFilter ? '#fff' : THEME.primary,
                transition: 'all 0.15s ease',
                '&:hover': {
                  borderColor: THEME.primary,
                  boxShadow: `0 0 0 2px ${THEME.primary}33`,
                },
              }}
            >
              All
            </Box>
          </Tooltip>
          {distinctRoles.map((role) => {
            const isActive = roleFilter === role
            const colors = getRoleColor(role)
            return (
              <Tooltip key={role} title={`Show only ${getRoleDisplayName(role)}`} arrow>
                <Box
                  component="button"
                  onClick={() => setRoleFilter(isActive ? '' : role)}
                  sx={{
                    height: 40,
                    px: 2,
                    borderRadius: 0,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    fontWeight: 700,
                    fontSize: '0.8rem',
                    whiteSpace: 'nowrap',
                    border: `1.5px solid ${isActive ? colors.color : THEME.primaryBorder}`,
                    backgroundColor: isActive ? colors.color : colors.bg,
                    color: isActive ? '#fff' : colors.color,
                    transition: 'all 0.15s ease',
                    '&:hover': {
                      borderColor: colors.color,
                      boxShadow: `0 0 0 2px ${colors.color}33`,
                    },
                  }}
                >
                  {getRoleDisplayName(role)}
                </Box>
              </Tooltip>
            )
          })}
        </Box>
      </Box>

      {/* Stats */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(4, 1fr)' }, gap: 2, mb: 3 }}>
        <Card elevation={0} sx={{ border: `1px solid ${THEME.primaryBorder}`, borderRadius: 0 }}>
          <CardContent sx={{ py: 2, px: 2 }}>
            <Typography variant="h4" fontWeight="700" sx={{ color: THEME.primary }}>
              {users.length}
            </Typography>
            <Typography variant="body2" sx={{ color: THEME.muted }}>Total Users</Typography>
          </CardContent>
        </Card>
        <Card elevation={0} sx={{ border: `1px solid ${THEME.primaryBorder}`, borderRadius: 0 }}>
          <CardContent sx={{ py: 2, px: 2 }}>
            <Typography variant="h4" fontWeight="700" sx={{ color: '#15803d' }}>
              {users.filter((u) => u.role === 'Student').length}
            </Typography>
            <Typography variant="body2" sx={{ color: THEME.muted }}>Students</Typography>
          </CardContent>
        </Card>
        <Card elevation={0} sx={{ border: `1px solid ${THEME.primaryBorder}`, borderRadius: 0 }}>
          <CardContent sx={{ py: 2, px: 2 }}>
            <Typography variant="h4" fontWeight="700" sx={{ color: '#1e40af' }}>
              {users.filter((u) => u.role === 'Teacher').length}
            </Typography>
            <Typography variant="body2" sx={{ color: THEME.muted }}>Teachers</Typography>
          </CardContent>
        </Card>
        <Card elevation={0} sx={{ border: `1px solid ${THEME.primaryBorder}`, borderRadius: 0 }}>
          <CardContent sx={{ py: 2, px: 2 }}>
            <Typography variant="h4" fontWeight="700" sx={{ color: '#991b1b' }}>
              {users.filter((u) => u.role === 'Admin').length}
            </Typography>
            <Typography variant="body2" sx={{ color: THEME.muted }}>Admins</Typography>
          </CardContent>
        </Card>
      </Box>

      {/* Search */}
      <Card elevation={0} sx={{ border: `1px solid ${THEME.primaryBorder}`, borderRadius: 0, mb: 3 }}>
        <CardContent sx={{ py: 2, px: 2.5 }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Search by name, email, or role..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoComplete="off"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search sx={{ color: THEME.muted, fontSize: 20 }} />
                </InputAdornment>
              ),
            }}
          />
        </CardContent>
      </Card>

      {/* Users Table (main) */}
      <Card elevation={0} sx={{ border: `1px solid ${THEME.primaryBorder}`, borderRadius: 0, mb: 3 }}>
        <CardContent sx={{ p: 0 }}>
          <Box
            sx={{
              px: 2.5,
              py: 2,
              borderBottom: `1px solid ${THEME.primaryBorder}`,
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 1.5,
            }}
          >
            <Typography variant="h6" fontWeight="600" sx={{ color: THEME.textDark }}>
              Users
            </Typography>
            {roleFilter && (
              <Button
                variant="contained"
                size="small"
                startIcon={<Add />}
                onClick={() => {
                  setNewUser({ ...emptyNewUser, role: roleFilter })
                  setOpenDialog(true)
                }}
                sx={{
                  backgroundColor: getRoleColor(roleFilter).color,
                  borderRadius: 0,
                  textTransform: 'none',
                  fontWeight: 600,
                  '&:hover': { backgroundColor: getRoleColor(roleFilter).color, opacity: 0.9 },
                }}
              >
                Add {getRoleDisplayName(roleFilter)}
              </Button>
            )}
          </Box>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ backgroundColor: THEME.primaryLight }}>
                  <TableCell sx={{ fontWeight: 600, color: THEME.textDark }}>ID</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: THEME.textDark }}>User</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: THEME.textDark }}>Email</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: THEME.textDark }}>Role</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: THEME.textDark }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: THEME.textDark }}>Joined</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600, color: THEME.textDark }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {usersLoading && (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                      <CircularProgress size={32} sx={{ color: THEME.primary }} />
                    </TableCell>
                  </TableRow>
                )}
                {!usersLoading && filteredUsers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 4, color: THEME.muted }}>
                      {roleFilter || searchQuery.trim()
                        ? 'No users match your filter.'
                        : 'No users yet. Add a user to get started.'}
                    </TableCell>
                  </TableRow>
                )}
                {!usersLoading && pagedUsers.map((user) => (
                  <TableRow key={user.id} sx={{ '&:hover': { backgroundColor: THEME.primaryLight } }}>
                    <TableCell sx={{ color: THEME.muted, fontFamily: 'monospace' }}>{user.displayId || '—'}</TableCell>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={1.5}>
                        <Box
                          sx={{
                            width: 36,
                            height: 36,
                            borderRadius: 0,
                            backgroundColor: THEME.primary,
                            color: '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 600,
                            fontSize: '0.9rem',
                          }}
                        >
                          {user.name.charAt(0).toUpperCase()}
                        </Box>
                        <Typography variant="body2" fontWeight={600} sx={{ color: THEME.textDark }}>
                          {user.name}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Chip
                        label={getRoleDisplayName(user.role)}
                        size="small"
                        sx={{
                          bgcolor: getRoleColor(user.role).bg,
                          color: getRoleColor(user.role).color,
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={user.status}
                        size="small"
                        sx={{
                          bgcolor: user.status === 'Active' ? '#dcfce7' : '#f3f4f6',
                          color: user.status === 'Active' ? '#15803d' : '#6b7280',
                        }}
                      />
                    </TableCell>
                    <TableCell>{user.joinedDate}</TableCell>
                    <TableCell>
                      <Box display="flex" gap={1}>
                        <IconButton
                          size="small"
                          color="primary"
                          title="View details"
                          onClick={() => handleViewDetails(user)}
                        >
                          <Visibility fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="primary"
                          title="Edit user"
                          onClick={() => handleEditClick(user)}
                        >
                          <Edit fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          color={user.status === 'Active' ? 'error' : 'success'}
                          title={user.status === 'Active' ? 'Deactivate user' : 'Reactivate user'}
                          onClick={() => handleToggleStatus(user)}
                        >
                          {user.status === 'Active' ? <Block fontSize="small" /> : <CheckCircle fontSize="small" />}
                        </IconButton>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          {filteredUsers.length > 0 && (
            <TablePagination
              component="div"
              count={filteredUsers.length}
              page={page}
              onPageChange={handleChangePage}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              rowsPerPageOptions={[10, 25, 50]}
            />
          )}
        </CardContent>
      </Card>

      <CenteredMessage
        open={snackbar.open}
        message={snackbar.message}
        severity={snackbar.severity}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        autoHideDuration={6000}
      />

      <ConfirmDialog
        open={!!deactivateTarget}
        title="Deactivate user?"
        message={deactivateTarget ? `${deactivateTarget.name} will no longer be able to log in. You can reactivate them anytime.` : ''}
        confirmLabel="Deactivate"
        tone="danger"
        loading={deactivating}
        onConfirm={confirmDeactivate}
        onCancel={() => setDeactivateTarget(null)}
      />

      <ConfirmDialog
        open={!!deleteRoleTarget}
        title="Delete role?"
        message={deleteRoleTarget ? `Delete role "${deleteRoleTarget}"? Users with this role will need to be reassigned.` : ''}
        confirmLabel="Delete"
        tone="danger"
        loading={deletingRole}
        onConfirm={confirmDeleteRole}
        onCancel={() => setDeleteRoleTarget(null)}
      />
    </Box>
  )
}

export default UserManagement

