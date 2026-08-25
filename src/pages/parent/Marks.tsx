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
import { getChildMarks, type ChildMarksRecord } from '../../lib/api'
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

const ParentMarks: React.FC = () => {
  const { loading, children, selectedChildId, setSelectedChildId } = useParentChildren()
  const [marks, setMarks] = useState<ChildMarksRecord[]>([])
  const [detailLoading, setDetailLoading] = useState(false)
  const [search, setSearch] = useState('')

  const filteredMarks = marks.filter((m) =>
    `${m.subject} ${m.examType}`.toLowerCase().includes(search.toLowerCase())
  )

  const { page, rowsPerPage, pageItems: pagedMarks, handleChangePage, handleChangeRowsPerPage } = usePagination(filteredMarks, 10)

  useEffect(() => {
    if (!selectedChildId) return
    setDetailLoading(true)
    getChildMarks(selectedChildId).then((m) => {
      setMarks(m)
      setDetailLoading(false)
    })
  }, [selectedChildId])

  return (
    <Box sx={{ fontFamily: "'Poppins', sans-serif" }}>
      <Box sx={{ mb: 3, pb: 3, borderBottom: `1px solid ${THEME.primaryBorder}` }}>
        <Typography variant="h5" fontWeight="700" sx={{ color: THEME.textDark, letterSpacing: '-0.02em', mb: 0.5 }}>
          Marks
        </Typography>
        <Typography variant="body2" sx={{ color: THEME.muted }}>
          Your children's marks
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
                  placeholder="Search marks by subject or exam type..."
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
                        <TableCell sx={{ fontWeight: 600 }}>Subject</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Exam Type</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Marks</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Note</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredMarks.length === 0 && (
                        <TableRow><TableCell colSpan={4} align="center" sx={{ py: 4, color: THEME.muted }}>No marks found.</TableCell></TableRow>
                      )}
                      {pagedMarks.map((m) => (
                        <TableRow key={m.id}>
                          <TableCell>{m.subject}</TableCell>
                          <TableCell>{m.examType}</TableCell>
                          <TableCell>{m.marks}</TableCell>
                          <TableCell sx={{ color: THEME.muted }}>{m.note || '—'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
              {!detailLoading && filteredMarks.length > 0 && (
                <TablePagination
                  component="div"
                  count={filteredMarks.length}
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

export default ParentMarks
