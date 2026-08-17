import { useEffect, useState } from 'react'
import { getMyChildren, type ParentChild } from './api'

/** Loads the parent's linked children and tracks which one is selected. Shared across all parent portal pages. */
export function useParentChildren() {
  const [loading, setLoading] = useState(true)
  const [children, setChildren] = useState<ParentChild[]>([])
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null)

  useEffect(() => {
    getMyChildren().then((c) => {
      setChildren(c)
      if (c.length > 0) setSelectedChildId(c[0].studentId)
      setLoading(false)
    })
  }, [])

  return { loading, children, selectedChildId, setSelectedChildId }
}
