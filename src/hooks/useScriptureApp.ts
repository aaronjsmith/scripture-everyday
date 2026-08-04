import { useEffect, useMemo, useRef, useState } from 'react'
import {
  buildCfmVersePool,
  loadCfmCurrentLesson,
  loadCfmLessons,
  parseCitationsFromText,
  resolveCurrentCfmLesson,
  type CfmLesson,
  type CfmVerseRef,
} from '../lib/cfm'
import {
  fetchMe,
  fetchRemoteProgress,
  logoutCloud,
  mergeProgress,
  pushProgress,
  type CloudUser,
  type SyncStatus,
} from '../lib/cloud'
import { findVerseNeighbors, pickNextVerse, volumeProgress } from '../lib/rotation'
import {
  exportNotesJson,
  exportNotesMarkdown,
  exportNotesRtf,
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

  const [cfmLesson, setCfmLesson] = useState<CfmLesson | null>(null)
  const [cfmPool, setCfmPool] = useState<Verse[]>([])
  const [cfmPoolReady, setCfmPoolReady] = useState(false)
  const [cfmStatus, setCfmStatus] = useState<
    'idle' | 'loading' | 'ready' | 'empty' | 'unavailable'
  >('idle')

  const [cloudUser, setCloudUser] = useState<CloudUser | null>(null)
  const [cloudConfigured, setCloudConfigured] = useState(false)
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('local-only')
  const [syncError, setSyncError] = useState<string | null>(null)

  const currentRef = useRef<Verse | null>(null)
  const noteDraftRef = useRef(noteDraft)
  const tagDraftRef = useRef(tagDraft)
  const stateRef = useRef(state)
  const versesRef = useRef(verses)
  const cfmPoolRef = useRef(cfmPool)
  const startedRef = useRef(false)
  const cloudReadyRef = useRef(false)
  const skipNextPushRef = useRef(false)

  currentRef.current = current
  noteDraftRef.current = noteDraft
  tagDraftRef.current = tagDraft
  stateRef.current = state
  versesRef.current = verses
  cfmPoolRef.current = cfmPool

  const markedSet = useMemo(
    () => new Set(state.markedVerseIds),
    [state.markedVerseIds],
  )

  const activePool = state.cfmMode && cfmPool.length > 0 ? cfmPool : verses

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
    if (!verses.length) return
    let cancelled = false
    setCfmStatus('loading')

    ;(async () => {
      const lessons = await loadCfmLessons()
      if (cancelled) return

      // Live /current is source of truth for "this week"; index supplies hrefs.
      const currentPayload = await loadCfmCurrentLesson()
      if (cancelled) return

      const lesson = resolveCurrentCfmLesson(lessons, currentPayload)
      if (!lesson) {
        setCfmLesson(null)
        setCfmPool([])
        setCfmPoolReady(true)
        setCfmStatus('unavailable')
        return
      }

      let connected: CfmVerseRef[] = []
      if (currentPayload?.contentText) {
        connected = parseCitationsFromText(currentPayload.contentText)
      }

      // Pool is ONLY this week's primary blocks + citations from that lesson.
      const { pool } = buildCfmVersePool(verses, lesson, connected)
      setCfmLesson(lesson)
      setCfmPool(pool)
      setCfmPoolReady(true)
      setCfmStatus(pool.length ? 'ready' : 'empty')
    })()

    return () => {
      cancelled = true
    }
  }, [verses])

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
      { verseOrder: fromState.verseOrder },
    )
    if (!picked) return
    showVerse(picked.verse, picked.nextRotationIndex)
  }

  function poolForMode(cfmMode: boolean): Verse[] {
    if (cfmMode && cfmPoolRef.current.length > 0) return cfmPoolRef.current
    return versesRef.current
  }

  useEffect(() => {
    if (!verses.length || startedRef.current) return
    // Wait for CFM pool resolution when starting in CFM mode
    if (stateRef.current.cfmMode && !cfmPoolReady) return
    startedRef.current = true
    pickAndShow(stateRef.current, poolForMode(stateRef.current.cfmMode))
    // intentionally once after verses (+ optional CFM pool) load
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [verses, cfmPoolReady])

  // If CFM mode was turned on before the pool finished loading, enter the pool once ready.
  useEffect(() => {
    if (!state.cfmMode || !cfmPoolReady || !cfmPool.length) return
    if (!startedRef.current) return
    const cur = currentRef.current
    if (cur && cfmPool.some((v) => v.id === cur.id)) return
    pickAndShow(stateRef.current, cfmPool)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.cfmMode, cfmPoolReady, cfmPool])

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

    const pool = poolForMode(working.cfmMode)
    const picked = pickNextVerse(
      pool,
      new Set(working.markedVerseIds),
      working.rotationIndex,
      { verseOrder: working.verseOrder },
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

  function setCfmMode(enabled: boolean) {
    const next: PersistedState = {
      ...stateRef.current,
      cfmMode: enabled,
    }
    setState(next)

    if (enabled && cfmPoolRef.current.length === 0) {
      // Keep current verse; pool unavailable / empty
      return
    }

    pickAndShow(next, poolForMode(enabled))
  }

  function setVerseOrder(enabled: boolean) {
    const next: PersistedState = {
      ...stateRef.current,
      verseOrder: enabled,
    }
    setState(next)
    pickAndShow(next, poolForMode(next.cfmMode))
  }

  function setVerseContext(enabled: boolean) {
    setState((prev) => ({ ...prev, verseContext: enabled }))
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
    pickAndShow(next, poolForMode(next.cfmMode))
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
    const progressVerses = state.cfmMode && cfmPool.length > 0 ? cfmPool : verses
    for (const volume of VOLUME_ORDER) {
      map[volume] = volumeProgress(progressVerses, markedSet, volume)
    }
    return map
  }, [verses, cfmPool, state.cfmMode, markedSet])

  const cfmPoolStats = useMemo(() => {
    if (!cfmPool.length) return { total: 0, marked: 0 }
    let marked = 0
    for (const v of cfmPool) {
      if (markedSet.has(v.id)) marked += 1
    }
    return { total: cfmPool.length, marked }
  }, [cfmPool, markedSet])

  const neighbors = useMemo(() => {
    if (!current || !state.verseContext || !verses.length) {
      return { prev: null, next: null }
    }
    return findVerseNeighbors(verses, current)
  }, [current, state.verseContext, verses])

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
    cfmLesson,
    cfmStatus,
    cfmPoolStats,
    neighbors,
    setCfmMode,
    setVerseOrder,
    setVerseContext,
    activePoolSize: activePool.length,
    exportJson: () => exportNotesJson(state.notes),
    exportMarkdown: () => exportNotesMarkdown(state.notes),
    exportRtf: () => exportNotesRtf(state.notes),
  }
}
