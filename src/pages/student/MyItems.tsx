import React, { useEffect, useState } from 'react'
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
  Chip,
  CircularProgress,
  TablePagination,
} from '@mui/material'
import { Inventory2 } from '@mui/icons-material'
import { getInventoryItems, type InventoryItemOption } from '../../lib/api'
import { usePagination } from '../../hooks/usePagination'

const THEME = {
  primary: '#1e3a8a',
  primaryLight: '#EFF6FF',
  primaryBorder: '#DBEAFE',
  muted: '#6b7280',
  textDark: '#1f2937',
}

const MyItems: React.FC = () => {
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState<InventoryItemOption[]>([])

  const { page, rowsPerPage, pageItems: pagedItems, handleChangePage, handleChangeRowsPerPage } = usePagination(items, 10)

  useEffect(() => {
    setLoading(true)
    getInventoryItems()
      .then(setItems)
      .finally(() => setLoading(false))
  }, [])

  return (
    <Box sx={{ fontFamily: "'Poppins', sans-serif" }}>
      <Box sx={{ mb: 3, pb: 3, borderBottom: `1px solid ${THEME.primaryBorder}` }}>
        <Typography variant="h5" fontWeight="700" sx={{ color: THEME.textDark, letterSpacing: '-0.02em', mb: 0.5 }}>
          Payment Details
        </Typography>
        <Typography variant="body2" sx={{ color: THEME.muted }}>
          Items and packages available, with the price fixed by the school
        </Typography>
      </Box>

      <Card elevation={0} sx={{ border: `1px solid ${THEME.primaryBorder}`, borderRadius: 0 }}>
        <CardContent sx={{ p: 0 }}>
          <Box sx={{ px: 2.5, py: 2, borderBottom: `1px solid ${THEME.primaryBorder}`, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Inventory2 sx={{ color: THEME.primary, fontSize: 20 }} />
            <Typography variant="h6" fontWeight="600" sx={{ color: THEME.textDark }}>
              Items &amp; Packages
            </Typography>
          </Box>
          {loading ? (
            <Box display="flex" justifyContent="center" py={6}>
              <CircularProgress sx={{ color: THEME.primary }} />
            </Box>
          ) : items.length === 0 ? (
            <Box sx={{ py: 4, textAlign: 'center' }}>
              <Typography variant="body2" sx={{ color: THEME.muted }}>No items have been set up yet.</Typography>
            </Box>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ backgroundColor: THEME.primaryLight }}>
                    <TableCell sx={{ fontWeight: 600, color: THEME.textDark }}>Item</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: THEME.textDark }}>Type</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: THEME.textDark }}>Includes</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: THEME.textDark }}>Price</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {pagedItems.map((item) => (
                    <TableRow key={item.id} sx={{ '&:hover': { backgroundColor: THEME.primaryLight } }}>
                      <TableCell sx={{ fontWeight: 600, color: THEME.textDark }}>{item.name}</TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={item.isPackage ? 'Package' : 'Item'}
                          sx={{
                            borderRadius: 0,
                            bgcolor: item.isPackage ? THEME.primaryLight : '#f3f4f6',
                            color: item.isPackage ? THEME.primary : THEME.muted,
                          }}
                        />
                      </TableCell>
                      <TableCell sx={{ color: THEME.muted }}>
                        {item.isPackage && item.packageItems.length > 0 ? item.packageItems.join(', ') : '—'}
                      </TableCell>
                      <TableCell sx={{ fontWeight: 600, color: THEME.textDark }}>Rs. {item.price.toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
          {items.length > 0 && (
            <TablePagination
              component="div"
              count={items.length}
              page={page}
              onPageChange={handleChangePage}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              rowsPerPageOptions={[10, 25, 50]}
            />
          )}
        </CardContent>
      </Card>
    </Box>
  )
}

export default MyItems
