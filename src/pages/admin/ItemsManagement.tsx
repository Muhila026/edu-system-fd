import React, { useEffect, useState } from 'react'
import {
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
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
  Checkbox,
  ListItemText,
  OutlinedInput,
} from '@mui/material'
import { Delete, Edit, Inventory2, Payments as PaymentsIcon, Inventory as PackageIcon, PointOfSale } from '@mui/icons-material'
import CenteredMessage from '../../components/CenteredMessage'
import ConfirmDialog from '../../components/ConfirmDialog'
import BackButton from '../../components/BackButton'
import FeesManagement from './FeesManagement'
import Payments from './Payments'
import { usePagination } from '../../hooks/usePagination'
import {
  getItemRecords,
  updateItemRecord,
  deleteItemRecord,
  getInventoryItems,
  createItem,
  createPackage,
  updatePackage,
  type ItemRecord,
  type InventoryItemOption,
} from '../../lib/api'

const THEME = {
  primary: '#1e3a8a',
  primaryLight: '#EFF6FF',
  primaryBorder: '#DBEAFE',
  muted: '#6b7280',
  textDark: '#1f2937',
}

const ItemsManagement: React.FC = () => {
  const [loading, setLoading] = useState(true)
  const [records, setRecords] = useState<ItemRecord[]>([])
  const [catalog, setCatalog] = useState<InventoryItemOption[]>([])
  const [tab, setTab] = useState<'items' | 'fees' | 'payments'>('items')

  const [openAddItem, setOpenAddItem] = useState(false)
  const [itemSaving, setItemSaving] = useState(false)
  const [itemForm, setItemForm] = useState<{ name: string; price: string; stockQuantity: string }>({
    name: '',
    price: '',
    stockQuantity: '',
  })

  const [openAddPackage, setOpenAddPackage] = useState(false)
  const [editPackageId, setEditPackageId] = useState<string | null>(null)
  const [packageSaving, setPackageSaving] = useState(false)
  const [packageForm, setPackageForm] = useState<{ name: string; price: string; itemNames: string[]; stockQuantity: string }>({
    name: '',
    price: '',
    itemNames: [],
    stockQuantity: '',
  })

  const [editRecord, setEditRecord] = useState<ItemRecord | null>(null)
  const [editQuantity, setEditQuantity] = useState('')
  const [editRecordSaving, setEditRecordSaving] = useState(false)

  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' })

  const loadAll = async () => {
    setLoading(true)
    const [r, c] = await Promise.all([getItemRecords(), getInventoryItems()])
    setRecords(r)
    setCatalog(c)
    setLoading(false)
  }

  useEffect(() => {
    loadAll()
  }, [])

  const [deleteRecordTarget, setDeleteRecordTarget] = useState<string | null>(null)
  const [deletingRecord, setDeletingRecord] = useState(false)

  const handleDelete = (id: string) => setDeleteRecordTarget(id)

  const confirmDeleteRecord = async () => {
    if (!deleteRecordTarget) return
    setDeletingRecord(true)
    try {
      setRecords(await deleteItemRecord(deleteRecordTarget))
      setSnackbar({ open: true, message: 'Item record removed', severity: 'success' })
      setDeleteRecordTarget(null)
    } catch (err) {
      setSnackbar({ open: true, message: err instanceof Error ? err.message : 'Failed to remove item record', severity: 'error' })
    } finally {
      setDeletingRecord(false)
    }
  }

  const handleUpdateRecord = async () => {
    if (!editRecord) return
    const quantity = Number(editQuantity)
    if (!quantity || quantity <= 0) {
      setSnackbar({ open: true, message: 'Enter a valid quantity', severity: 'error' })
      return
    }
    setEditRecordSaving(true)
    try {
      setRecords(await updateItemRecord(editRecord.id, quantity))
      setEditRecord(null)
      setSnackbar({ open: true, message: 'Item record updated', severity: 'success' })
    } catch (err) {
      setSnackbar({ open: true, message: err instanceof Error ? err.message : 'Failed to update item record', severity: 'error' })
    } finally {
      setEditRecordSaving(false)
    }
  }

  const handleCreateItem = async () => {
    if (!itemForm.name.trim() || !itemForm.price) {
      setSnackbar({ open: true, message: 'Give the item a name and a price', severity: 'error' })
      return
    }
    setItemSaving(true)
    try {
      const created = await createItem({
        name: itemForm.name.trim(),
        price: Number(itemForm.price),
        stockQuantity: itemForm.stockQuantity ? Number(itemForm.stockQuantity) : undefined,
      })
      setCatalog((c) => [created, ...c])
      setSnackbar({ open: true, message: 'Item added — students can now buy it from their Payments page', severity: 'success' })
      setOpenAddItem(false)
      setItemForm({ name: '', price: '', stockQuantity: '' })
    } catch (err) {
      setSnackbar({ open: true, message: err instanceof Error ? err.message : 'Failed to save item', severity: 'error' })
    } finally {
      setItemSaving(false)
    }
  }

  const handleCreatePackage = async () => {
    if (!packageForm.name.trim() || !packageForm.price || packageForm.itemNames.length === 0) {
      setSnackbar({ open: true, message: 'Give the package a name, a price, and at least one included item', severity: 'error' })
      return
    }
    setPackageSaving(true)
    try {
      if (editPackageId) {
        const updated = await updatePackage(editPackageId, {
          name: packageForm.name.trim(),
          price: Number(packageForm.price),
          itemNames: packageForm.itemNames,
          stockQuantity: packageForm.stockQuantity ? Number(packageForm.stockQuantity) : null,
        })
        setCatalog((c) => c.map((item) => (item.id === editPackageId ? updated : item)))
        setSnackbar({ open: true, message: 'Package updated', severity: 'success' })
      } else {
        const created = await createPackage({
          name: packageForm.name.trim(),
          price: Number(packageForm.price),
          itemNames: packageForm.itemNames,
          stockQuantity: packageForm.stockQuantity ? Number(packageForm.stockQuantity) : undefined,
        })
        setCatalog((c) => [created, ...c])
        setSnackbar({ open: true, message: 'Package added — students can now buy it from their Payments page', severity: 'success' })
      }
      setOpenAddPackage(false)
      setEditPackageId(null)
      setPackageForm({ name: '', price: '', itemNames: [], stockQuantity: '' })
    } catch (err) {
      setSnackbar({ open: true, message: err instanceof Error ? err.message : 'Failed to save package', severity: 'error' })
    } finally {
      setPackageSaving(false)
    }
  }

  const openEditPackage = (pkg: InventoryItemOption) => {
    setEditPackageId(pkg.id)
    setPackageForm({
      name: pkg.name,
      price: String(pkg.price),
      itemNames: pkg.packageItems,
      stockQuantity: '',
    })
    setOpenAddPackage(true)
  }

  const packagesList = catalog.filter((c) => c.isPackage)
  const itemsList = catalog.filter((c) => !c.isPackage)
  const {
    page: packagePage,
    rowsPerPage: packageRowsPerPage,
    pageItems: pagedPackages,
    handleChangePage: handlePackageChangePage,
    handleChangeRowsPerPage: handlePackageChangeRowsPerPage,
  } = usePagination(packagesList, 10)
  const {
    page: itemsPage,
    rowsPerPage: itemsRowsPerPage,
    pageItems: pagedItems,
    handleChangePage: handleItemsChangePage,
    handleChangeRowsPerPage: handleItemsChangeRowsPerPage,
  } = usePagination(itemsList, 10)

  const {
    page: recordsPage,
    rowsPerPage: recordsRowsPerPage,
    pageItems: pagedRecords,
    handleChangePage: handleRecordsChangePage,
    handleChangeRowsPerPage: handleRecordsChangeRowsPerPage,
  } = usePagination(records, 10)


  if (editRecord) {
    return (
      <Box sx={{ fontFamily: "'Poppins', sans-serif" }}>
        <BackButton onClick={() => setEditRecord(null)} />
        <Typography variant="h5" fontWeight="700" sx={{ color: THEME.textDark, mb: 3 }}>Edit Issued Item</Typography>
        <Box display="grid" gap={2.5} mt={1} maxWidth="sm">
          <Typography variant="body2" sx={{ color: THEME.muted }}>
            {editRecord.studentName} — {editRecord.item}
          </Typography>
          <TextField fullWidth label="Quantity" type="number" value={editQuantity} onChange={(e) => setEditQuantity(e.target.value)} />
        </Box>
        <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
          <Button onClick={() => setEditRecord(null)} sx={{ textTransform: 'none' }}>Cancel</Button>
          <Button
            variant="contained"
            disabled={editRecordSaving}
            onClick={handleUpdateRecord}
            sx={{ backgroundColor: THEME.primary, textTransform: 'none', '&:hover': { backgroundColor: '#1e40af' } }}
          >
            {editRecordSaving ? 'Saving...' : 'Save'}
          </Button>
        </Box>
      </Box>
    )
  }

  if (openAddItem) {
    return (
      <Box sx={{ fontFamily: "'Poppins', sans-serif" }}>
        <BackButton onClick={() => { setOpenAddItem(false); setItemForm({ name: '', price: '', stockQuantity: '' }) }} />
        <Typography variant="h5" fontWeight="700" sx={{ color: THEME.textDark, mb: 3 }}>Add Item</Typography>
        <Box display="grid" gap={2.5} mt={1} maxWidth="sm">
          <TextField
            fullWidth
            label="Item name"
            placeholder="e.g. Water Bottle"
            value={itemForm.name}
            onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
          />
          <TextField
            fullWidth
            type="number"
            label="Price (Rs.)"
            value={itemForm.price}
            onChange={(e) => setItemForm({ ...itemForm, price: e.target.value })}
          />
          <TextField
            fullWidth
            type="number"
            label="Initial stock (optional)"
            placeholder="Leave blank to leave stock untracked"
            value={itemForm.stockQuantity}
            onChange={(e) => setItemForm({ ...itemForm, stockQuantity: e.target.value })}
          />
        </Box>
        <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
          <Button onClick={() => { setOpenAddItem(false); setItemForm({ name: '', price: '', stockQuantity: '' }) }} sx={{ textTransform: 'none' }}>Cancel</Button>
          <Button
            variant="contained"
            disabled={itemSaving}
            onClick={handleCreateItem}
            sx={{ backgroundColor: THEME.primary, textTransform: 'none', '&:hover': { backgroundColor: '#1e40af' } }}
          >
            {itemSaving ? 'Saving...' : 'Add Item'}
          </Button>
        </Box>
        <CenteredMessage
          open={snackbar.open}
          message={snackbar.message}
          severity={snackbar.severity}
          onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
          autoHideDuration={4000}
        />
      </Box>
    )
  }

  if (openAddPackage) {
    const baseItems = catalog.filter((c) => !c.isPackage || c.id === editPackageId)
    return (
      <Box sx={{ fontFamily: "'Poppins', sans-serif" }}>
        <BackButton onClick={() => { setOpenAddPackage(false); setEditPackageId(null); setPackageForm({ name: '', price: '', itemNames: [], stockQuantity: '' }) }} />
        <Typography variant="h5" fontWeight="700" sx={{ color: THEME.textDark, mb: 3 }}>{editPackageId ? 'Edit Package' : 'Add Package'}</Typography>
        <Box display="grid" gap={2.5} mt={1} maxWidth="sm">
          <TextField
            fullWidth
            label="Package name"
            placeholder="e.g. Sports Kit"
            value={packageForm.name}
            onChange={(e) => setPackageForm({ ...packageForm, name: e.target.value })}
          />
          <FormControl fullWidth>
            <InputLabel>Items included</InputLabel>
            <Select
              multiple
              value={packageForm.itemNames}
              onChange={(e) => setPackageForm({ ...packageForm, itemNames: e.target.value as string[] })}
              input={<OutlinedInput label="Items included" />}
              renderValue={(selected) => (selected as string[]).join(', ')}
            >
              {baseItems.map((c) => (
                <MenuItem key={c.id} value={c.name}>
                  <Checkbox checked={packageForm.itemNames.includes(c.name)} />
                  <ListItemText primary={`${c.name} (Rs. ${c.price.toLocaleString()} each)`} />
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            fullWidth
            type="number"
            label="Package price (Rs.)"
            value={packageForm.price}
            onChange={(e) => setPackageForm({ ...packageForm, price: e.target.value })}
          />
          <TextField
            fullWidth
            type="number"
            label="Initial stock (optional)"
            placeholder="Leave blank to leave stock untracked"
            value={packageForm.stockQuantity}
            onChange={(e) => setPackageForm({ ...packageForm, stockQuantity: e.target.value })}
          />
        </Box>
        <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
          <Button onClick={() => { setOpenAddPackage(false); setEditPackageId(null); setPackageForm({ name: '', price: '', itemNames: [], stockQuantity: '' }) }} sx={{ textTransform: 'none' }}>Cancel</Button>
          <Button
            variant="contained"
            disabled={packageSaving}
            onClick={handleCreatePackage}
            sx={{ backgroundColor: THEME.primary, textTransform: 'none', '&:hover': { backgroundColor: '#1e40af' } }}
          >
            {packageSaving ? 'Saving...' : editPackageId ? 'Save Changes' : 'Add Package'}
          </Button>
        </Box>
        <CenteredMessage
          open={snackbar.open}
          message={snackbar.message}
          severity={snackbar.severity}
          onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
          autoHideDuration={4000}
        />
      </Box>
    )
  }

  return (
    <Box sx={{ fontFamily: "'Poppins', sans-serif" }}>
      <Box sx={{ mb: 2, pb: 2 }}>
        <Typography variant="h5" fontWeight="700" sx={{ color: THEME.textDark, letterSpacing: '-0.02em', mb: 0.5 }}>
          Payments
        </Typography>
        <Typography variant="body2" sx={{ color: THEME.muted }}>
          Everything money-related in one place — item purchases and fee payments
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        {(
          [
            { value: 'items', label: 'Items', icon: <Inventory2 /> },
            { value: 'fees', label: 'Fees', icon: <PaymentsIcon /> },
            { value: 'payments', label: 'Payments', icon: <PointOfSale /> },
          ] as const
        ).map((t) => {
          const active = tab === t.value
          return (
            <Card
              key={t.value}
              elevation={0}
              onClick={() => setTab(t.value)}
              sx={{
                cursor: 'pointer',
                border: `1px solid ${active ? THEME.primary : THEME.primaryBorder}`,
                borderRadius: 0,
                bgcolor: active ? THEME.primaryLight : 'transparent',
                transition: 'background-color 0.15s ease',
                '&:hover': { bgcolor: THEME.primaryLight },
              }}
            >
              <CardContent sx={{ py: 1.5, px: 2.5, display: 'flex', alignItems: 'center', gap: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Box sx={{ color: THEME.primary, display: 'flex' }}>{t.icon}</Box>
                <Typography variant="subtitle2" fontWeight="600" sx={{ color: THEME.textDark }}>{t.label}</Typography>
              </CardContent>
            </Card>
          )
        })}
      </Box>

      {tab === 'fees' && <FeesManagement />}

      {tab === 'payments' && <Payments />}

      {tab === 'items' && (
      <>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 2, mb: 3, pb: 3, borderBottom: `1px solid ${THEME.primaryBorder}` }}>
        <Box>
          <Typography variant="h6" fontWeight="700" sx={{ color: THEME.textDark, letterSpacing: '-0.02em', mb: 0.5 }}>
            Items Provided to Students
          </Typography>
          <Typography variant="body2" sx={{ color: THEME.muted }}>
            Report cards, communication books, and uniform sets — students buy them anytime from their own Payments page
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Button
            variant="outlined"
            startIcon={<Inventory2 />}
            onClick={() => setOpenAddItem(true)}
            sx={{ borderRadius: 0, textTransform: 'none', fontWeight: 600 }}
          >
            Add Item
          </Button>
          <Button
            variant="outlined"
            startIcon={<PackageIcon />}
            onClick={() => setOpenAddPackage(true)}
            sx={{ borderRadius: 0, textTransform: 'none', fontWeight: 600 }}
          >
            Add Package
          </Button>
        </Box>
      </Box>

      {loading ? (
        <Box display="flex" justifyContent="center" py={6}>
          <CircularProgress sx={{ color: THEME.primary }} />
        </Box>
      ) : (
        <>
        <Card elevation={0} sx={{ border: `1px solid ${THEME.primaryBorder}`, borderRadius: 0, mb: 3 }}>
          <CardContent sx={{ p: 0 }}>
            <Box sx={{ px: 2.5, py: 2, borderBottom: `1px solid ${THEME.primaryBorder}` }}>
              <Typography variant="h6" fontWeight="600" sx={{ color: THEME.textDark }}>Packages</Typography>
            </Box>
            {catalog.filter((c) => c.isPackage).length === 0 ? (
              <Box sx={{ py: 3, textAlign: 'center' }}>
                <Typography variant="body2" sx={{ color: THEME.muted }}>No packages defined yet.</Typography>
              </Box>
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ backgroundColor: THEME.primaryLight }}>
                      <TableCell sx={{ fontWeight: 600, color: THEME.textDark }}>Package</TableCell>
                      <TableCell sx={{ fontWeight: 600, color: THEME.textDark }}>Price</TableCell>
                      <TableCell sx={{ fontWeight: 600, color: THEME.textDark }}>Includes</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600, color: THEME.textDark }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {pagedPackages.map((c) => (
                      <TableRow key={c.id} sx={{ '&:hover': { backgroundColor: THEME.primaryLight } }}>
                        <TableCell sx={{ fontWeight: 600, color: THEME.textDark }}>{c.name}</TableCell>
                        <TableCell>Rs. {c.price.toLocaleString()}</TableCell>
                        <TableCell>
                          {c.packageItems.map((n) => (
                            <Chip key={n} label={n} size="small" sx={{ mr: 0.5, mb: 0.5, borderRadius: 0, bgcolor: THEME.primaryLight, color: THEME.primary }} />
                          ))}
                        </TableCell>
                        <TableCell align="right">
                          <IconButton size="small" sx={{ color: THEME.primary }} title="Edit package" onClick={() => openEditPackage(c)}>
                            <Edit fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
            {packagesList.length > 0 && (
              <TablePagination
                component="div"
                count={packagesList.length}
                page={packagePage}
                onPageChange={handlePackageChangePage}
                rowsPerPage={packageRowsPerPage}
                onRowsPerPageChange={handlePackageChangeRowsPerPage}
                rowsPerPageOptions={[10, 25, 50]}
              />
            )}
          </CardContent>
        </Card>

        <Card elevation={0} sx={{ border: `1px solid ${THEME.primaryBorder}`, borderRadius: 0, mb: 3 }}>
          <CardContent sx={{ p: 0 }}>
            <Box sx={{ px: 2.5, py: 2, borderBottom: `1px solid ${THEME.primaryBorder}` }}>
              <Typography variant="h6" fontWeight="600" sx={{ color: THEME.textDark }}>Items</Typography>
            </Box>
            {itemsList.length === 0 ? (
              <Box sx={{ py: 3, textAlign: 'center' }}>
                <Typography variant="body2" sx={{ color: THEME.muted }}>No items defined yet.</Typography>
              </Box>
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ backgroundColor: THEME.primaryLight }}>
                      <TableCell sx={{ fontWeight: 600, color: THEME.textDark }}>Item</TableCell>
                      <TableCell sx={{ fontWeight: 600, color: THEME.textDark }}>Price</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {pagedItems.map((c) => (
                      <TableRow key={c.id} sx={{ '&:hover': { backgroundColor: THEME.primaryLight } }}>
                        <TableCell sx={{ fontWeight: 600, color: THEME.textDark }}>{c.name}</TableCell>
                        <TableCell>Rs. {c.price.toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
            {itemsList.length > 0 && (
              <TablePagination
                component="div"
                count={itemsList.length}
                page={itemsPage}
                onPageChange={handleItemsChangePage}
                rowsPerPage={itemsRowsPerPage}
                onRowsPerPageChange={handleItemsChangeRowsPerPage}
                rowsPerPageOptions={[10, 25, 50]}
              />
            )}
          </CardContent>
        </Card>

        <Card elevation={0} sx={{ border: `1px solid ${THEME.primaryBorder}`, borderRadius: 0 }}>
          <CardContent sx={{ p: 0 }}>
            <Box sx={{ px: 2.5, py: 2, borderBottom: `1px solid ${THEME.primaryBorder}` }}>
              <Typography variant="h6" fontWeight="600" sx={{ color: THEME.textDark }}>Issued Items</Typography>
            </Box>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ backgroundColor: THEME.primaryLight }}>
                    <TableCell sx={{ fontWeight: 600, color: THEME.textDark }}>Student</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: THEME.textDark }}>Item</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: THEME.textDark }}>Quantity</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: THEME.textDark }}>Amount</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: THEME.textDark }}>Issued Date</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600, color: THEME.textDark }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {records.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} align="center" sx={{ py: 4, color: THEME.muted }}>
                        No items issued yet.
                      </TableCell>
                    </TableRow>
                  )}
                  {pagedRecords.map((r) => (
                    <TableRow key={r.id} sx={{ '&:hover': { backgroundColor: THEME.primaryLight } }}>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600} sx={{ color: THEME.textDark }}>{r.studentName}</Typography>
                        <Typography variant="caption" sx={{ color: THEME.muted }}>{r.studentEmail}</Typography>
                      </TableCell>
                      <TableCell>
                        <Chip size="small" icon={<Inventory2 sx={{ fontSize: 16 }} />} label={r.item} sx={{ borderRadius: 0, bgcolor: THEME.primaryLight, color: THEME.primary }} />
                      </TableCell>
                      <TableCell>{r.quantity}</TableCell>
                      <TableCell>{r.amount > 0 ? `Rs. ${r.amount.toLocaleString()}` : 'Free'}</TableCell>
                      <TableCell>{r.issuedDate}</TableCell>
                      <TableCell align="right">
                        <IconButton
                          size="small"
                          sx={{ color: THEME.primary }}
                          title="Edit quantity"
                          onClick={() => { setEditRecord(r); setEditQuantity(String(r.quantity)) }}
                        >
                          <Edit fontSize="small" />
                        </IconButton>
                        <IconButton size="small" color="error" title="Remove" onClick={() => handleDelete(r.id)}>
                          <Delete fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            {records.length > 0 && (
              <TablePagination
                component="div"
                count={records.length}
                page={recordsPage}
                onPageChange={handleRecordsChangePage}
                rowsPerPage={recordsRowsPerPage}
                onRowsPerPageChange={handleRecordsChangeRowsPerPage}
                rowsPerPageOptions={[10, 25, 50]}
              />
            )}
          </CardContent>
        </Card>
        </>
      )}

      <CenteredMessage
        open={snackbar.open}
        message={snackbar.message}
        severity={snackbar.severity}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        autoHideDuration={4000}
      />

      <ConfirmDialog
        open={!!deleteRecordTarget}
        title="Remove item record?"
        message="This removes the issued-item record. It does not reverse any payment already collected."
        confirmLabel="Remove"
        tone="danger"
        loading={deletingRecord}
        onConfirm={confirmDeleteRecord}
        onCancel={() => setDeleteRecordTarget(null)}
      />
      </>
      )}
    </Box>
  )
}

export default ItemsManagement
