import { useEffect, useState } from 'react'
import { getSchoolBranding, resolveLogoSrc } from '../lib/api'

/** School name + logo, shared across the login page and every sidebar. Editable by Admin/Super Admin in Settings. */
export function useSchoolBranding() {
  const [schoolName, setSchoolName] = useState('Cloud Campus')
  const [logoSrc, setLogoSrc] = useState('/logo.png')

  useEffect(() => {
    let active = true
    getSchoolBranding().then((branding) => {
      if (!active) return
      setSchoolName(branding.schoolName)
      setLogoSrc(resolveLogoSrc(branding.logoUrl))
    })
    return () => {
      active = false
    }
  }, [])

  return { schoolName, logoSrc }
}
