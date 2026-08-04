import { useEffect, useMemo, useRef, useState } from 'react'
import {
  fetchMe,
  fetchRemoteProgress,
  logoutCloud,
  mergeProgress,
  pushProgress,
  type CloudUser,
  type SyncStatus,
} from '../lib/cloud'
import { pickNextVerse, volumeProgress } from '../lib/rotation'
import {
  exportNotesJson,
  exportNotesMarkdown,
  loadState,
  saveState,
} from '../lib/storage'
import type {
  AppStats,
  PersistedState,
  Verse,
  VerseNote,
  VersesPayload,
  VolumeId,
} from '../lib/types'
import { VOLUME_ORDER, emptyStats } from '../lib/types'

function applyNoteToState(
  prev: PersistedState,
  verse: Verse,
  text: string,
  tags: string[],
): PersistedState {
  const existing = prev.notes[verse.id]
  const now = new Date().toISOString()
  const notes = { ...prev.notes }

  if (!text.trim() && tags.length === 0) {
    delete notes[verse.id]
  } else {
    const note: VerseNote = {
      verseId: verse.id,
      reference: verse.reference,
      volume: verse.volume,
      text,
      tags,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    }
    notes[verse.id] = note
  }

  const noteValues = Object.values(notes)
  const stats: AppStats = {
    ...prev.stats,
    notesWritten: noteValues.filter((n) => n.text.trim()).length,
    uniqueTagged: noteValues.filter((n) => n.tags.length > 0).length,
  }

  return { ...prev, notes, stats }
}

export function useScriptureApp() {
  const [verses, setVerses] = useState<Verse[]>([])
  const [counts, setCounts] = useState<VersesPayload['counts'] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [state, setState] = useState<PersistedState>(() => loadState())
  const [current, setCurrent] = useState<Verse | null>(null)
  const [noteDraft, setNoteDraft] = useState('')
  const [tagDraft, setTagDraft] = useState<string[]>([])
  const [saveFlash, setSaveFlash] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)

  const [cloudUser, setCloudUser] = useState<CloudUser | null>(null)
  const [cloudConfigured, setCloudConfigured] = useState(false)
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('local-only')
  const [syncError, setSyncError] = useState<string | null>(null)

  const currentRef = useRef<Verse | null>(null)
  const noteDraftRef = useRef(noteDraft)
  const tagDraftRef = useRef(tagDraft)
  const stateRef = useRef(state)
  const startedRef = useRef(false)
  const cloudReadyRef = useRef(false)
  const skipNextPushRef = useRef(false)

  currentRef.current = current
  noteDraftRef.current = noteDraft
  tagDraftRef.current = tagDraft
  stateRef.current = state

  const markedSet = useMemo(
    () => new Set(state.markedVerseIds),
    [state.markedVerseIds],
  )

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/data/verses.json')
        if (!res.ok) throw new Error(`Could not load verses (${res.status})`)
        const data = (await res.json()) as VersesPayload
        if (cancelled) return
        setVerses(data.verses)
        setCounts(data.counts)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load verses')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const me = await fetchMe()
        if (cancelled) return
        setCloudConfigured(me.configured)
        setCloudUser(me.user)

        if (!me.user) {
          setSyncStatus('local-only')
          cloudReadyRef.current = true
          return
        }

        setSyncStatus('syncing')
        const remote = await fetchRemoteProgress()
        if (cancelled) return
        const merged = mergeProgress(stateRef.current, remote)
        skipNextPushRef.current = true
        setState(merged)
        saveState(merged)
        await pushProgress(merged)
        if (cancelled) return
        setSyncStatus('synced')
        setSyncError(null)
      } catch (err) {
        if (cancelled) return
        setSyncStatus('error')
        setSyncError(err instanceof Error ? err.message : 'Cloud sync failed')
      } finally {
        cloudReadyRef.current = true
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    saveState(state)
  }, [state])

  useEffect(() => {
    if (!cloudUser || !cloudReadyRef.current) return
    if (skipNextPushRef.current) {
      skipNextPushRef.current = false
      return
    }

    setSyncStatus('syncing')
    const handle = window.setTimeout(() => {
      void (async () => {
        try {
          await pushProgress(state)
          setSyncStatus('synced')
          setSyncError(null)
        } catch (err) {
          setSyncStatus('error')
          setSyncError(err instanceof Error ? err.message : 'Cloud sync failed')
        }
      })()
    }, 700)

    return () => window.clearTimeout(handle)
  }, [state, cloudUser])

  function showVerse(verse: Verse, nextRotationIndex: number) {
    const existing = stateRef.current.notes[verse.id]
    setCurrent(verse)
    setNoteDraft(existing?.text ?? '')
    setTagDraft(existing?.tags ?? [])
    setState((prev) => ({ ...prev, rotationIndex: nextRotationIndex }))
  }

  function pickAndShow(fromState: PersistedState, verseList: Verse[]) {
    const picked = pickNextVerse(
      verseList,
      new Set(fromState.markedVerseIds),
      fromState.rotationIndex,
    )
    if (!picked) return
    showVerse(picked.verse, picked.nextRotationIndex)
  }

  useEffect(() => {
    if (!verses.length || startedRef.current) return
    startedRef.current = true
    pickAndShow(stateRef.current, verses)
    // intentionally once after verses load
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [verses])

  function advance() {
    const verse = currentRef.current
    let working = stateRef.current

    if (verse) {
      working = applyNoteToState(
        working,
        verse,
        noteDraftRef.current,
        tagDraftRef.current,
      )

      if (!working.markedVerseIds.includes(verse.id)) {
        const byVolume = { ...working.stats.byVolume }
        byVolume[verse.volume] = (byVolume[verse.volume] ?? 0) + 1
        working = {
          ...working,
          markedVerseIds: [...working.markedVerseIds, verse.id],
          stats: {
            ...working.stats,
            totalShown: working.stats.totalShown + 1,
            byVolume,
            lastShownAt: new Date().toISOString(),
          },
        }
      }
    }

    const picked = pickNextVerse(
      verses,
      new Set(working.markedVerseIds),
      working.rotationIndex,
    )
    if (!picked) {
      setState(working)
      return
    }

    const existing = working.notes[picked.verse.id]
    setCurrent(picked.verse)
    setNoteDraft(existing?.text ?? '')
    setTagDraft(existing?.tags ?? [])
    setState({
      ...working,
      rotationIndex: picked.nextRotationIndex,
    })
  }

  function openVerse(verseId: string) {
    const verse = verses.find((v) => v.id === verseId)
    if (!verse) return
    const existing = stateRef.current.notes[verse.id]
    setCurrent(verse)
    setNoteDraft(existing?.text ?? '')
    setTagDraft(existing?.tags ?? [])
  }

  function saveNote() {
    const verse = currentRef.current
    if (!verse) return
    setState((prev) =>
      applyNoteToState(prev, verse, noteDraftRef.current, tagDraftRef.current),
    )
    setSaveFlash(true)
    window.setTimeout(() => setSaveFlash(false), 1200)
  }

  function toggleTag(tag: string) {
    setTagDraft((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    )
  }

  function resetProgress() {
    if (
      !window.confirm(
        'Reset marked verses and statistics? Your notes will be kept.',
      )
    ) {
      return
    }

    const next: PersistedState = {
      ...stateRef.current,
      markedVerseIds: [],
      rotationIndex: 0,
      stats: {
        ...emptyStats(),
        notesWritten: Object.values(stateRef.current.notes).filter((n) =>
          n.text.trim(),
        ).length,
        uniqueTagged: Object.values(stateRef.current.notes).filter(
          (n) => n.tags.length > 0,
        ).length,
      },
    }
    setState(next)
    pickAndShow(next, verses)
  }

  async function disconnectCloud() {
    try {
      await logoutCloud()
    } catch {
      // still clear local auth UI
    }
    setCloudUser(null)
    setSyncStatus('local-only')
    setSyncError(null)
  }

  const progress = useMemo(() => {
    const map = {} as Record<VolumeId, { marked: number; total: number }>
    for (const volume of VOLUME_ORDER) {
      map[volume] = volumeProgress(verses, markedSet, volume)
    }
    return map
  }, [verses, markedSet])

  return {
    verses,
    counts,
    loading,
    error,
    state,
    current,
    noteDraft,
    setNoteDraft,
    tagDraft,
    toggleTag,
    saveFlash,
    progress,
    advance,
    saveNote,
    resetProgress,
    openVerse,
    historyOpen,
    setHistoryOpen,
    cloudUser,
    cloudConfigured,
    syncStatus,
    syncError,
    disconnectCloud,
    exportJson: () => exportNotesJson(state.notes),
    exportMarkdown: () => exportNotesMarkdown(state.notes),
  }
}
