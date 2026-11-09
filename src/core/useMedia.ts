import { useEffect, useState } from 'react'

export function useMedia(query: string) {
  const [m, setM] = useState(() => typeof matchMedia !== 'undefined' && matchMedia(query).matches)
  useEffect(() => {
    const mq = matchMedia(query)
    const f = () => setM(mq.matches)
    mq.addEventListener('change', f); f()
    return () => mq.removeEventListener('change', f)
  }, [query])
  return m
}
