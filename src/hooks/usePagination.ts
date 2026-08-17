import { useMemo, useState } from 'react'

/** Client-side pagination for a table's already-loaded array — page/rowsPerPage state
 *  plus the current page's slice, so every table paginates the same way. Resets to
 *  page 0 automatically when the source array shrinks below the current page. */
export function usePagination<T>(items: T[], defaultRowsPerPage = 10) {
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(defaultRowsPerPage)

  const pageCount = Math.max(1, Math.ceil(items.length / rowsPerPage))
  const safePage = Math.min(page, pageCount - 1)

  const pageItems = useMemo(
    () => items.slice(safePage * rowsPerPage, safePage * rowsPerPage + rowsPerPage),
    [items, safePage, rowsPerPage]
  )

  const handleChangePage = (_: unknown, newPage: number) => setPage(newPage)
  const handleChangeRowsPerPage = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(e.target.value, 10))
    setPage(0)
  }

  return {
    page: safePage,
    rowsPerPage,
    pageItems,
    handleChangePage,
    handleChangeRowsPerPage,
  }
}
