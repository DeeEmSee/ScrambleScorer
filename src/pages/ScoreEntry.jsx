import { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Layout from '../components/Layout'

function ScoreBadge({ strokes, rel }) {
  if (strokes === undefined || rel === null) {
    return (
      <div className="w-10 h-10 rounded-full border-2 border-dashed border-gray-200 flex items-center justify-center">
        <span className="text-gray-300 font-bold">—</span>
      </div>
    )
  }

  if (rel <= -2) {
    // Eagle / albatross: gold double-border circle
    return (
      <div
        className="w-11 h-11 rounded-full border-4 flex items-center justify-center"
        style={{ borderColor: '#CFA84C', background: '#fffbeb' }}
      >
        <span className="font-black text-lg" style={{ color: '#92400e' }}>{strokes}</span>
      </div>
    )
  }
  if (rel === -1) {
    // Birdie: red filled circle
    return (
      <div className="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center shadow">
        <span className="font-black text-lg text-white">{strokes}</span>
      </div>
    )
  }
  if (rel === 0) {
    // Par: dark rounded square
    return (
      <div className="w-10 h-10 rounded-lg flex items-center justify-center shadow-sm" style={{ background: '#374151' }}>
        <span className="font-black text-lg text-white">{strokes}</span>
      </div>
    )
  }
  if (rel === 1) {
    // Bogey: blue bordered square
    return (
      <div className="w-10 h-10 rounded-lg flex items-center justify-center shadow-sm" style={{ background: '#1e3a5f', border: '2px solid #1e4a7f' }}>
        <span className="font-black text-lg text-white">{strokes}</span>
      </div>
    )
  }
  // Double bogey+
  return (
    <div className="w-10 h-10 rounded-lg flex items-center justify-center shadow-sm" style={{ background: '#1e2a45', border: '2px solid #2d3a60' }}>
      <span className="font-black text-base text-white/80">{strokes}</span>
    </div>
  )
}

export default function ScoreEntry() {
  const { id } = useParams()
  const [scramble, setScramble] = useState(null)
  const [holes, setHoles] = useState([])
  const [teams, setTeams] = useState([])
  const [activeTeam, setActiveTeam] = useState(null)
  const [pendingTeam, setPendingTeam] = useState(null)
  const [pinInput, setPinInput] = useState('')
  const [pinError, setPinError] = useState(false)
  const [scores, setScores] = useState({})
  const [saving, setSaving] = useState({})
  const [savedHoles, setSavedHoles] = useState({})
  const scoreLogTimeouts = useRef({})

  useEffect(() => {
    async function load() {
      const [{ data: s }, { data: h }, { data: t }] = await Promise.all([
        supabase.from('scrambles').select('*').eq('id', id).single(),
        supabase.from('holes').select('*').eq('scramble_id', id).order('hole_number'),
        supabase.from('teams').select('id, name, pin').eq('scramble_id', id).order('name'),
      ])
      setScramble(s)
      setHoles(h || [])
      setTeams(t || [])

      const saved = JSON.parse(localStorage.getItem(`scramble_team_${id}`) || 'null')
      if (saved && t) {
        const match = t.find(team => team.id === saved.id)
        if (match) {
          const { data: existing } = await supabase.from('scores').select('hole_number, strokes').eq('team_id', match.id)
          const scoreMap = {}, savedMap = {}
          existing?.forEach(s => { scoreMap[s.hole_number] = s.strokes; savedMap[s.hole_number] = true })
          setScores(scoreMap)
          setSavedHoles(savedMap)
          setActiveTeam(match)
        }
      }
    }
    load()
  }, [id])

  function openPinPrompt(team) {
    if (!team.pin) { selectTeam(team); return }
    setPendingTeam(team)
    setPinInput('')
    setPinError(false)
  }

  async function confirmPin() {
    if (pinInput !== pendingTeam.pin) {
      setPinError(true)
      return
    }
    await selectTeam(pendingTeam)
    setPendingTeam(null)
  }

  async function selectTeam(team) {
    const { data: existing } = await supabase
      .from('scores')
      .select('hole_number, strokes')
      .eq('team_id', team.id)
    const scoreMap = {}
    const savedMap = {}
    existing?.forEach(s => {
      scoreMap[s.hole_number] = s.strokes
      savedMap[s.hole_number] = true
    })
    setScores(scoreMap)
    setSavedHoles(savedMap)
    setActiveTeam(team)
    localStorage.setItem(`scramble_team_${id}`, JSON.stringify({ id: team.id, name: team.name }))
  }

  async function saveScore(holeNumber, strokes) {
    setSaving(prev => ({ ...prev, [holeNumber]: true }))
    await supabase.from('scores').upsert(
      { team_id: activeTeam.id, hole_number: holeNumber, strokes },
      { onConflict: 'team_id,hole_number' }
    )
    setSavedHoles(prev => ({ ...prev, [holeNumber]: true }))
    setSaving(prev => ({ ...prev, [holeNumber]: false }))
  }

  function adjustScore(holeNumber, delta) {
    const par = holes.find(h => h.hole_number === holeNumber)?.par || 4
    const isFirst = scores[holeNumber] === undefined
    const next = isFirst ? par : Math.max(1, Math.min(12, scores[holeNumber] + delta))
    setScores(prev => ({ ...prev, [holeNumber]: next }))
    saveScore(holeNumber, next)
    clearTimeout(scoreLogTimeouts.current[holeNumber])
    scoreLogTimeouts.current[holeNumber] = setTimeout(() => logScoreToChat(holeNumber, next, par), 2000)
  }

  async function logScoreToChat(holeNumber, strokes, par) {
    if (!activeTeam) return
    const rel = strokes - par
    const articles = { '-3': 'an albatross', '-2': 'an eagle', '-1': 'a birdie', '0': 'par', '1': 'a bogey', '2': 'a double bogey', '3': 'a triple bogey' }
    const label = articles[String(rel)] ?? `+${rel}`
    const text = rel === 0 ? `made par on hole ${holeNumber}` : `made ${label} on hole ${holeNumber}`
    await supabase.from('messages').insert({
      scramble_id: id, team_id: activeTeam.id, team_name: activeTeam.name, text, type: 'score',
    })
  }

  function scoreRelPar(holeNumber) {
    const par = holes.find(h => h.hole_number === holeNumber)?.par
    const strokes = scores[holeNumber]
    if (!par || strokes === undefined) return null
    return strokes - par
  }

  if (!scramble) return (
    <Layout>
      <div className="flex items-center justify-center h-40">
        <p className="text-gray-400">Loading…</p>
      </div>
    </Layout>
  )

  // Team selection screen
  if (!activeTeam) return (
    <Layout scrambleName={scramble.name}>
      <div className="max-w-md mx-auto px-3 py-5">
        <h2 className="text-gray-900 font-bold text-lg mb-1">Enter Score</h2>
        <p className="text-gray-500 text-sm mb-4">Select your team to get started.</p>
        <div className="flex flex-col gap-2">
          {teams.map(team => (
            <button
              key={team.id}
              onClick={() => openPinPrompt(team)}
              className="bg-white border border-gray-200 rounded-2xl px-4 py-4 text-left font-semibold text-gray-800 hover:border-masters-green hover:text-masters-green transition-colors shadow-sm"
            >
              {team.name}
            </button>
          ))}
        </div>
      </div>

      {pendingTeam && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
            <h3 className="text-gray-900 font-bold text-lg mb-1">{pendingTeam.name}</h3>
            <p className="text-gray-500 text-sm mb-4">Enter your 4-digit PIN to continue.</p>
            <input
              type="number"
              inputMode="numeric"
              maxLength={4}
              value={pinInput}
              onChange={e => { setPinInput(e.target.value.slice(0, 4)); setPinError(false) }}
              onKeyDown={e => e.key === 'Enter' && confirmPin()}
              className={`w-full border-2 rounded-xl px-4 py-3 text-center text-2xl font-bold tracking-widest focus:outline-none ${
                pinError ? 'border-red-400 text-red-600' : 'border-gray-200 focus:border-masters-green'
              }`}
              autoFocus
            />
            {pinError && <p className="text-red-500 text-sm mt-2 text-center">Incorrect PIN. Try again.</p>}
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setPendingTeam(null)}
                className="flex-1 border border-gray-200 rounded-xl py-2.5 text-gray-500 font-medium hover:border-gray-400 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmPin}
                className="flex-1 bg-masters-green text-white rounded-xl py-2.5 font-bold hover:bg-masters-darkgreen transition-colors"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )

  // Score entry screen
  const front9 = holes.filter(h => h.hole_number <= 9)
  const back9 = holes.filter(h => h.hole_number >= 10)

  const scoredHoles = holes.filter(h => scores[h.hole_number] !== undefined)
  const totalStrokes = scoredHoles.reduce((a, h) => a + scores[h.hole_number], 0)
  const totalPar = scoredHoles.reduce((a, h) => a + h.par, 0)
  const scoreToPar = scoredHoles.length > 0 ? totalStrokes - totalPar : null
  const scoreDisplay = scoreToPar === null ? null : scoreToPar === 0 ? 'E' : scoreToPar > 0 ? `+${scoreToPar}` : String(scoreToPar)

  return (
    <Layout scrambleName={scramble.name}>
      {/* Team banner */}
      <div className="mg-gradient px-4 py-4">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <div
            className="w-11 h-11 rounded-full flex items-center justify-center border border-masters-gold/40 flex-shrink-0"
            style={{ background: 'rgba(207,168,76,0.15)' }}
          >
            <span className="text-masters-gold font-black text-lg" style={{ fontFamily: 'Georgia, serif' }}>
              {activeTeam.name[0].toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-white font-bold text-base truncate">{activeTeam.name}</div>
            <div className="text-white/50 text-xs truncate">{scramble.name}</div>
          </div>
          {scoreDisplay !== null && (
            <div
              className="rounded-xl px-3 py-2 text-right border border-white/20 flex-shrink-0"
              style={{ background: 'rgba(255,255,255,0.1)' }}
            >
              <div className={`font-black text-2xl leading-none ${
                scoreToPar < 0 ? 'text-red-300' : scoreToPar > 0 ? 'text-blue-300' : 'text-white'
              }`}>
                {scoreDisplay}
              </div>
              <div className="text-white/40 text-xs">to par</div>
            </div>
          )}
          <button
            onClick={() => setActiveTeam(null)}
            className="text-white/50 hover:text-white text-xs font-medium transition-colors flex-shrink-0"
          >
            Switch
          </button>
        </div>
      </div>

      {/* Hole groups */}
      <div className="max-w-lg mx-auto px-3 py-4 flex flex-col gap-3">
        {[front9, ...(scramble.num_holes === 18 ? [back9] : [])].map((group, gi) => {
          const groupPar = group.reduce((a, h) => a + h.par, 0)
          const groupScored = group.filter(h => scores[h.hole_number] !== undefined)
          const groupStrokes = groupScored.reduce((a, h) => a + scores[h.hole_number], 0)
          const label = scramble.num_holes === 18 ? (gi === 0 ? 'Front 9' : 'Back 9') : 'Scorecard'

          return (
            <div key={gi}>
              <div className="flex items-center justify-between px-1 mb-1.5">
                <span className="text-gray-700 font-bold text-sm" style={{ fontFamily: 'Georgia, serif' }}>
                  {label}
                </span>
                {groupScored.length > 0 && (
                  <span className="text-gray-400 text-xs">
                    Out: {groupStrokes} · Par {groupPar}
                  </span>
                )}
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                {group.map((hole, hi) => {
                  const rel = scoreRelPar(hole.hole_number)
                  const strokes = scores[hole.hole_number]
                  const isEmpty = strokes === undefined
                  const isSaving = saving[hole.hole_number]

                  return (
                    <div
                      key={hole.hole_number}
                      className={`flex items-center px-4 py-3.5 gap-3 ${hi < group.length - 1 ? 'border-b border-gray-50' : ''} ${hi % 2 === 1 ? 'bg-gray-50/50' : 'bg-white'}`}
                    >
                      <div className="flex-1 min-w-0">
                        <span className="text-gray-700 font-semibold text-sm">Hole {hole.hole_number}</span>
                        <span className="ml-1.5 text-gray-300 text-xs">· Par {hole.par}</span>
                        {isSaving && <span className="ml-2 text-xs text-gray-300">saving…</span>}
                      </div>
                      <div className="flex items-center gap-2.5">
                        <button
                          onClick={() => adjustScore(hole.hole_number, -1)}
                          disabled={isEmpty}
                          className="w-9 h-9 bg-gray-100 rounded-xl font-bold text-lg text-gray-500 flex items-center justify-center hover:bg-gray-200 transition-colors disabled:opacity-30 active:scale-95"
                        >
                          −
                        </button>
                        <ScoreBadge strokes={strokes} rel={rel} />
                        <button
                          onClick={() => adjustScore(hole.hole_number, 1)}
                          className={`w-9 h-9 rounded-xl font-bold text-lg flex items-center justify-center transition-colors active:scale-95 ${
                            isEmpty
                              ? 'border border-masters-green/20 text-masters-green hover:bg-masters-green/10'
                              : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                          }`}
                          style={isEmpty ? { background: 'rgba(0,103,71,0.06)' } : {}}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </Layout>
  )
}
