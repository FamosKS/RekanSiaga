import { useEffect, useRef, useState, useSyncExternalStore, type Dispatch, type SetStateAction } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { clearDraft, draftExists, draftRevision, readDraft, recoveryRevision, subscribeDrafts, writeDraft } from './draftVault'
export function useDraftState<T>(namespace: string, initial: T): [T, Dispatch<SetStateAction<T>>, () => void, boolean] {
  const { user } = useAuth()
  const key = `${user?.id ?? 'public'}:${namespace}`
  const [fallback] = useState(initial)
  useSyncExternalStore(subscribeDrafts, draftRevision, draftRevision)
  const value = readDraft(key, fallback)
  const setValue: Dispatch<SetStateAction<T>> = next => writeDraft(key, typeof next === 'function' ? (next as (previous: T) => T)(readDraft(key, fallback)) : next)
  return [value, setValue, () => clearDraft(key), draftExists(key)]
}
export function useDraftRecovery(restore: () => void) {
  const revision = useSyncExternalStore(subscribeDrafts, recoveryRevision, recoveryRevision)
  const callback = useRef(restore)
  useEffect(() => { callback.current = restore }, [restore])
  useEffect(() => { if (revision) callback.current() }, [revision])
}
