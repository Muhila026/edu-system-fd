import React, { useEffect, useRef, useState } from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Switch,
  CircularProgress,
  TextField,
  Button,
  Avatar,
} from '@mui/material'
import { Security, Edit as EditIcon, Save as SaveIcon, PhotoCamera, Download as DownloadIcon, Storage as StorageIcon } from '@mui/icons-material'
import {
  getRolePermissions,
  setRolePermission,
  type RolePermissionsGrid,
  getSchoolBranding,
  updateSchoolName,
  uploadSchoolLogo,
  resolveLogoSrc,
  decodeJwtPayload,
  downloadDatabaseExport,
} from '../../lib/api'
import CenteredMessage from '../../components/CenteredMessage'

const THEME = {
  primary: '#1e3a8a',
  primaryLight: '#EFF6FF',
  primaryBorder: '#DBEAFE',
  muted: '#6b7280',
  textDark: '#1f2937',
}

const ROLE_LABELS: Record<string, string> = {
  teacher: 'Teacher',
  student: 'Student',
  staff: 'Staff',
  parent: 'Parent',
}

function useIsSuperAdmin(): boolean {
  const storedUserStr = localStorage.getItem('user') || sessionStorage.getItem('user')
  const token = storedUserStr ? (JSON.parse(storedUserStr).token as string | undefined) : undefined
  return token ? decodeJwtPayload(token).role === 'super_admin' : false
}

const BrandingCard: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [logoSrc, setLogoSrc] = useState('/logo.png')
  const [schoolName, setSchoolName] = useState('')
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState('')
  const [savingName, setSavingName] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' })

  const load = async () => {
    const branding = await getSchoolBranding()
    setSchoolName(branding.schoolName)
    setNameInput(branding.schoolName)
    setLogoSrc(resolveLogoSrc(branding.logoUrl))
  }

  useEffect(() => {
    load()
  }, [])

  const handleSaveName = async () => {
    const trimmed = nameInput.trim()
    if (!trimmed || trimmed === schoolName) {
      setEditingName(false)
      setNameInput(schoolName)
      return
    }
    setSavingName(true)
    try {
      const branding = await updateSchoolName(trimmed)
      setSchoolName(branding.schoolName)
      setEditingName(false)
      setSnackbar({ open: true, message: 'School name updated', severity: 'success' })
    } catch (err: any) {
      setSnackbar({ open: true, message: err.message || 'Failed to update school name', severity: 'error' })
    } finally {
      setSavingName(false)
    }
  }

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setUploadingLogo(true)
    try {
      const branding = await uploadSchoolLogo(file)
      setLogoSrc(resolveLogoSrc(branding.logoUrl))
      setSnackbar({ open: true, message: 'School logo updated', severity: 'success' })
    } catch (err: any) {
      setSnackbar({ open: true, message: err.message || 'Failed to upload logo', severity: 'error' })
    } finally {
      setUploadingLogo(false)
    }
  }

  return (
    <Card elevation={0} sx={{ border: `1px solid ${THEME.primaryBorder}`, borderRadius: 0, mb: 3 }}>
      <CardContent sx={{ p: 0 }}>
        <Box sx={{ px: 2.5, py: 2, borderBottom: `1px solid ${THEME.primaryBorder}`, display: 'flex', alignItems: 'center', gap: 1 }}>
          <PhotoCamera sx={{ color: THEME.primary, fontSize: 20 }} />
          <Typography variant="h6" fontWeight="600" sx={{ color: THEME.textDark }}>
            School branding
          </Typography>
        </Box>
        <Box sx={{ p: 2.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 3 }}>
            <Box sx={{ position: 'relative' }}>
              <Avatar src={logoSrc} alt={schoolName} variant="rounded" sx={{ width: 88, height: 88, border: `1px solid ${THEME.primaryBorder}` }} />
              <Button
                size="small"
                variant="contained"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingLogo}
                startIcon={uploadingLogo ? <CircularProgress size={14} color="inherit" /> : <PhotoCamera fontSize="small" />}
                sx={{ mt: 1, backgroundColor: THEME.primary, textTransform: 'none', fontSize: '0.75rem', '&:hover': { backgroundColor: '#1e40af' } }}
              >
                {uploadingLogo ? 'Uploading...' : 'Change logo'}
              </Button>
              <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handleLogoChange} />
            </Box>

            <Box sx={{ flex: 1 }}>
              <Typography variant="caption" sx={{ color: THEME.muted, fontWeight: 600, display: 'block', mb: 0.5 }}>
                School name
              </Typography>
              {editingName ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <TextField
                    size="small"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    disabled={savingName}
                    autoFocus
                  />
                  <Button
                    size="small"
                    variant="contained"
                    onClick={handleSaveName}
                    disabled={savingName}
                    startIcon={savingName ? <CircularProgress size={14} color="inherit" /> : <SaveIcon fontSize="small" />}
                    sx={{ backgroundColor: THEME.primary, textTransform: 'none', '&:hover': { backgroundColor: '#1e40af' } }}
                  >
                    Save
                  </Button>
                </Box>
              ) : (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="h6" fontWeight="700" sx={{ color: THEME.textDark }}>
                    {schoolName}
                  </Typography>
                  <Button
                    size="small"
                    onClick={() => setEditingName(true)}
                    startIcon={<EditIcon fontSize="small" />}
                    sx={{ color: THEME.primary, textTransform: 'none' }}
                  >
                    Edit
                  </Button>
                </Box>
              )}
            </Box>
          </Box>
        </Box>
      </CardContent>

      <CenteredMessage
        open={snackbar.open}
        message={snackbar.message}
        severity={snackbar.severity}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        autoHideDuration={4000}
      />
    </Card>
  )
}

const DataExportCard: React.FC = () => {
  const [exporting, setExporting] = useState<'data' | 'structure' | null>(null)
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' })

  const handleExport = async (kind: 'data' | 'structure') => {
    setExporting(kind)
    try {
      await downloadDatabaseExport(kind)
      setSnackbar({ open: true, message: `Database ${kind} export downloaded`, severity: 'success' })
    } catch (err: any) {
      setSnackbar({ open: true, message: err.message || `Failed to export ${kind}`, severity: 'error' })
    } finally {
      setExporting(null)
    }
  }

  return (
    <Card elevation={0} sx={{ border: `1px solid ${THEME.primaryBorder}`, borderRadius: 0, mb: 3 }}>
      <CardContent sx={{ p: 0 }}>
        <Box sx={{ px: 2.5, py: 2, borderBottom: `1px solid ${THEME.primaryBorder}`, display: 'flex', alignItems: 'center', gap: 1 }}>
          <StorageIcon sx={{ color: THEME.primary, fontSize: 20 }} />
          <Typography variant="h6" fontWeight="600" sx={{ color: THEME.textDark }}>
            Data export
          </Typography>
        </Box>
        <Box sx={{ p: 2.5 }}>
          <Typography variant="body2" sx={{ color: THEME.muted, mb: 2 }}>
            Download the full database as SQL files — rows only, or schema only.
          </Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="contained"
              startIcon={exporting === 'data' ? <CircularProgress size={16} color="inherit" /> : <DownloadIcon fontSize="small" />}
              disabled={exporting !== null}
              onClick={() => handleExport('data')}
              sx={{ backgroundColor: THEME.primary, borderRadius: 0, textTransform: 'none', fontWeight: 600, '&:hover': { backgroundColor: '#1e40af' } }}
            >
              {exporting === 'data' ? 'Exporting...' : 'Export Data'}
            </Button>
            <Button
              variant="outlined"
              startIcon={exporting === 'structure' ? <CircularProgress size={16} color="inherit" /> : <DownloadIcon fontSize="small" />}
              disabled={exporting !== null}
              onClick={() => handleExport('structure')}
              sx={{ borderColor: THEME.primary, color: THEME.primary, borderRadius: 0, textTransform: 'none', fontWeight: 600, '&:hover': { borderColor: THEME.primary, backgroundColor: THEME.primaryLight } }}
            >
              {exporting === 'structure' ? 'Exporting...' : 'Export Structure'}
            </Button>
          </Box>
        </Box>
      </CardContent>

      <CenteredMessage
        open={snackbar.open}
        message={snackbar.message}
        severity={snackbar.severity}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        autoHideDuration={4000}
      />
    </Card>
  )
}

const Settings: React.FC = () => {
  const isSuperAdmin = useIsSuperAdmin()
  const [loading, setLoading] = useState(true)
  const [grid, setGrid] = useState<RolePermissionsGrid>({})
  const [savingKey, setSavingKey] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    setGrid(await getRolePermissions())
    setLoading(false)
  }

  useEffect(() => {
    if (isSuperAdmin) load()
    else setLoading(false)
  }, [isSuperAdmin])

  const handleToggle = async (role: string, pageKey: string, allowed: boolean) => {
    const key = `${role}:${pageKey}`
    setSavingKey(key)
    setGrid((g) => ({
      ...g,
      [role]: g[role].map((p) => (p.pageKey === pageKey ? { ...p, allowed } : p)),
    }))
    try {
      await setRolePermission(role, pageKey, allowed)
    } finally {
      setSavingKey(null)
    }
  }

  return (
    <Box sx={{ fontFamily: "'Poppins', sans-serif" }}>
      <Box sx={{ mb: 3, pb: 3, borderBottom: `1px solid ${THEME.primaryBorder}` }}>
        <Typography variant="h5" fontWeight="700" sx={{ color: THEME.textDark, letterSpacing: '-0.02em', mb: 0.5 }}>
          Settings
        </Typography>
        <Typography variant="body2" sx={{ color: THEME.muted }}>
          {isSuperAdmin
            ? 'Edit school branding and control which pages Teacher, Student, and Parent accounts can access'
            : 'Edit school branding'}
        </Typography>
      </Box>

      <BrandingCard />

      {isSuperAdmin && <DataExportCard />}

      {!isSuperAdmin ? null : loading ? (
        <Box display="flex" justifyContent="center" py={6}>
          <CircularProgress sx={{ color: THEME.primary }} />
        </Box>
      ) : (
        Object.entries(grid).map(([role, pages]) => (
          <Card key={role} elevation={0} sx={{ border: `1px solid ${THEME.primaryBorder}`, borderRadius: 0, mb: 3 }}>
            <CardContent sx={{ p: 0 }}>
              <Box sx={{ px: 2.5, py: 2, borderBottom: `1px solid ${THEME.primaryBorder}`, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Security sx={{ color: THEME.primary, fontSize: 20 }} />
                <Typography variant="h6" fontWeight="600" sx={{ color: THEME.textDark }}>
                  {ROLE_LABELS[role] || role} pages
                </Typography>
              </Box>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ backgroundColor: THEME.primaryLight }}>
                      <TableCell sx={{ fontWeight: 600, color: THEME.textDark }}>Page</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600, color: THEME.textDark }}>Allowed</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {pages.map((p) => (
                      <TableRow key={p.pageKey} sx={{ '&:hover': { backgroundColor: THEME.primaryLight } }}>
                        <TableCell>{p.pageKey}</TableCell>
                        <TableCell align="right">
                          <Switch
                            checked={p.allowed}
                            disabled={savingKey === `${role}:${p.pageKey}` || p.pageKey === 'Dashboard'}
                            onChange={(e) => handleToggle(role, p.pageKey, e.target.checked)}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        ))
      )}
    </Box>
  )
}

export default Settings
