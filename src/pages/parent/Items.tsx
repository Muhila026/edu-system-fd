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
  CircularProgress,
  TextField,
  TablePagination,
} from '@mui/material'
import { getChildItems, type ChildItemRecord } from '../../lib/api'
import { useParentChildren } from '../../lib/useParentChildren'
import ChildSelector from '../../components/ChildSelector'
import { usePagination } from '../../hooks/usePagination'

const THEME = {
  primary: '#1e3a8a',
  primaryLight: '#EFF6FF',
  primaryBorder: '#DBEAFE',
  muted: '#6b7280',
  textDark: '#1f2937',
}

const ParentItems: React.FC = () => {
  const { loading, children, selectedChildId, setSelectedChildId } = useParentChildren()
  const [items, setItems] = useState<ChildItemRecord[]>([])
  const [detailLoading, setDetailLoading] = useState(false)
  const [search, setSearch] = useState('')

  const filteredItems = items.filter((i) => i.item.toLowerCase().includes(search.toLowerCase()))

  const { page, rowsPerPage, pageItems: pagedItems, handleChangePage, handleChangeRowsPerPage } = usePagination(filteredItems, 10)

  useEffect(() => {
    if (!selectedChildId) return
    setDetailLoading(true)
    getChildItems(selectedChildId).then((i) => {
      setItems(i)
      setDetailLoading(false)
    })
  }, [selectedChildId])

  return (
    <Box sx={{ fontFamily: "'Poppins', sans-serif" }}>
      <Box sx={{ mb: 3, pb: 3, borderBottom: `1px solid ${THEME.primaryBorder}` }}>
        <Typography variant="h5" fontWeight="700" sx={{ color: THEME.textDark, letterSpacing: '-0.02em', mb: 0.5 }}>
          Items
        </Typography>
        <Typography variant="body2" sx={{ color: THEME.muted }}>
          Items issued to your children
        </Typography>
      </Box>

      {loading ? (
        <Box display="flex" justifyContent="center" py={6}>
          <CircularProgress sx={{ color: THEME.primary }} />
        </Box>
      ) : children.length === 0 ? (
        <Card elevation={0} sx={{ border: `1px solid ${THEME.primaryBorder}`, borderRadius: 0 }}>
          <CardContent sx={{ py: 4, textAlign: 'center' }}>
            <Typography variant="body2" sx={{ color: THEME.muted }}>
              No children are linked to your account yet. Contact the school office to have your account linked to your child's record.
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <>
          <ChildSelector children={children} selectedChildId={selectedChildId} onSelect={setSelectedChildId} />

          <Card elevation={0} sx={{ border: `1px solid ${THEME.primaryBorder}`, borderRadius: 0 }}>
            <CardContent>
              <Box mb={2}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Search items by name..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </Box>
              {detailLoading ? (
                <Box display="flex" justifyContent="center" py={4}>
                  <CircularProgress size={28} sx={{ color: THEME.primary }} />
                </Box>
              ) : (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ backgroundColor: THEME.primaryLight }}>
                        <TableCell sx={{ fontWeight: 600 }}>Item</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Quantity</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Issued Date</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredItems.length === 0 && (
                        <TableRow><TableCell colSpan={3} align="center" sx={{ py: 4, color: THEME.muted }}>No items found.</TableCell></TableRow>
                      )}
                      {pagedItems.map((i) => (
                        <TableRow key={i.id}>
                          <TableCell>{i.item}</TableCell>
                          <TableCell>{i.quantity}</TableCell>
                          <TableCell>{i.issuedDate}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
              {!detailLoading && filteredItems.length > 0 && (
                <TablePagination
                  component="div"
                  count={filteredItems.length}
                  page={page}
                  onPageChange={handleChangePage}
                  rowsPerPage={rowsPerPage}
                  onRowsPerPageChange={handleChangeRowsPerPage}
                  rowsPerPageOptions={[10, 25, 50]}
                />
              )}
            </CardContent>
          </Card>
        </>
      )}
    </Box>
  )
}

export default ParentItems
