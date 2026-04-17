import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Layout from '../components/Layout'

export default function ScoreEntry() {
  const { id } = useParams()
  const [scramble, setScramble] = useState(null)
  const [holes, setHoles] = useState([])
  const [teams, setTeams] = useState([])
  const [activeTeam, setActiveTeam] = useState(null)
  const [pin, setPin] = useState('')
  const [pinError, setPinError] = useState('')
  const [scores, setScores] = useState({})
  const [saving, setSaving] = useState({})
  const [savedHoles, setSavedHoles] = useState({})

  useEffect(() => {
    async function load() {
      const [{ data: s }, { data: h }, { data: t }] = await Promise.all([
        supabase.from('scrambles').select('*').eq('id', id).single(),
        supabase.from('holes').select('*').eq('scramble_id', id).order('hole_number'),
        supabase.from('teams').select('id, name').eq('scramble_id', id).order('name'),
      ])
      setScramble(s)
      setHoles(h || [])
      setTeams(t || [])
    }
    load()
  }, [id])

  async function verifyPin() {
    setPinError('')
    const { data } = await supabase
      .from('teams')
      .select('*')
      .eq('id', activeTeam.id)
      .eq('pin', pin.trim())
      .single()
    if (!data) {
      setPinError('Incorrect PIN. Try again.')
      return
    }
    // Load existing scores for this team
    const { data: existing } = await supabase
      .from('scores')
      .select('hole_number, strokes')
      .eq('team_id', activeTeam.id)
    const scoreMap = {}
    const savedMap = {}
    existing?.forEach(s => {
      scoreMap[s.hole_number] = s.strokes
      savedMap[s.hole_number] = true
    })
    setScores(scoreMap)
    setSavedHoles(savedMap)
    setActiveTeam(prev => ({ ...prev, verified: true }))
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
    const current = scores[holeNumber] ?? par
    const next = Math.max(1, Math.min(12, current + delta))
    setScores(prev => ({ ...prev, [holeNumber]: next }))
    saveScore(holeNumber, next)
  }

  function scoreRelPar(holeNumber) {
    const par = holes.find(h => h.hole_number === holeNumber)?.par
    const strokes = scores[holeNumber]
    if (!par || strokes === undefined) return null
    return strokes - par
  }

  function scoreLabel(rel) {
    if (rel === null) return ''
    if (rel <= -2) return 'Eagle'
    if (rel === -1) return 'Birdie'
    if (rel === 0) return 'Par'
    if (rel === 1) return 'Bogey'
    if (rel === 2) return 'Double'
    return `+${rel}`
  }

  function scoreColor(rel) {
    if (rel === null) return ''
    if (rel < 0) return 'text-under-par font-bold'
    if (rel === 0) return 'text-gray-500'
    return 'text-gray-700'
  }

  if (!scramble) return (
    <Layout>
      <div className="flex items-center justify-center h-40">
        <p className="text-gray-400">Loading...</p>
      </div>
    </Layout>
  )

  // Team selection
  if (!activeTeam) return (
    <Layout scrambleName={scramble.name}>
      <div className="max-w-md mx-auto px-4 py-6">
        <h2 className="text-masters-green text-xl font-bold mb-1">Enter Score</h2>
        <p className="text-gray-500 text-sm mb-5">Select your team to get started.</p>
        <div className="flex flex-col gap-3">
          {teams.map(team => (
            <button
              key={team.id}
              onClick={() => { setActiveTeam(team); setPin('') }}
              className="bg-white border-2 border-gray-200 rounded-lg px-4 py-4 text-left font-medium text-gray-800 hover:border-masters-green hover:text-masters-green transition-colors"
            >
              {team.name}
            </button>
          ))}
        </div>
      </div>
    </Layout>
  )

  // PIN entry
  if (!activeTeam.verified) return (
    <Layout scrambleName={scramble.name}>
      <div className="max-w-sm mx-auto px-4 py-6">
        <button
          onClick={() => setActiveTeam(null)}
          className="text-sm text-masters-green mb-4 flex items-center gap-1"
        >
          ← Back
        </button>
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 flex flex-col gap-4">
          <h2 className="text-masters-green text-xl font-bold">{activeTeam.name}</h2>
          <p className="text-gray-500 text-sm">Enter your team's 4-digit PIN to access score entry.</p>
          <input
            type="number"
            value={pin}
            onChange={(e) => setPin(e.target.value.slice(0, 2))}
            placeholder="PIN"
            className="w-full border-2 border-gray-300 rounded-lg px-4 py-4 text-3xl text-center font-bold tracking-widest focus:border-masters-green focus:outline-none"
            onKeyDown={(e) => e.key === 'Enter' && verifyPin()}
          />
          {pinError && <p className="text-under-par text-sm">{pinError}</p>}
          <button
            onClick={verifyPin}
            disabled={pin.length < 2}
            className="bg-masters-green text-white font-bold py-3 rounded-lg hover:bg-masters-darkgreen transition-colors disabled:opacity-50"
          >
            Verify PIN
          </button>
        </div>
      </div>
    </Layout>
  )

  // Score entry
  const front9 = holes.filter(h => h.hole_number <= 9)
  const back9 = holes.filter(h => h.hole_number >= 10)
  const holesGroups = numHoles => numHoles === 18 ? [front9, back9] : [front9]

  return (
    <Layout scrambleName={scramble.name}>
      <div className="max-w-lg mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-masters-green text-xl font-bold">{activeTeam.name}</h2>
            <p className="text-gray-400 text-sm">Tap +/- to enter each hole's score</p>
          </div>
          <button
            onClick={() => { setActiveTeam(null); setPin('') }}
            className="text-sm text-gray-400 hover:text-masters-green"
          >
            Switch Team
          </button>
        </div>

        {[front9, ...(scramble.num_holes === 18 ? [back9] : [])].map((group, gi) => (
          <div key={gi} className="bg-white rounded-lg shadow-md border border-gray-200 mb-4 overflow-hidden">
            <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                {scramble.num_holes === 18 ? (gi === 0 ? 'Front 9' : 'Back 9') : 'Scorecard'}
              </h3>
            </div>
            {group.map(hole => {
              const rel = scoreRelPar(hole.hole_number)
              const strokes = scores[hole.hole_number]
              const isSaved = savedHoles[hole.hole_number]
              const isSaving = saving[hole.hole_number]
              return (
                <div key={hole.hole_number} className="flex items-center px-4 py-3 border-b border-gray-100 last:border-b-0">
                  <div className="w-10 text-center">
                    <div className="text-xs text-gray-400">Hole</div>
                    <div className="font-bold text-gray-700">{hole.hole_number}</div>
                  </div>
                  <div className="w-10 text-center mx-2">
                    <div className="text-xs text-gray-400">Par</div>
                    <div className="font-medium text-gray-500">{hole.par}</div>
                  </div>
                  <div className="flex-1 flex justify-center items-center gap-4">
                    <button
                      onClick={() => adjustScore(hole.hole_number, -1)}
                      className="w-10 h-10 rounded-full bg-masters-green text-white font-bold text-xl hover:bg-masters-darkgreen transition-colors active:scale-95"
                    >
                      −
                    </button>
                    <div className="text-3xl font-bold w-10 text-center text-gray-800">
                      {strokes ?? '—'}
                    </div>
                    <button
                      onClick={() => adjustScore(hole.hole_number, 1)}
                      className="w-10 h-10 rounded-full bg-masters-green text-white font-bold text-xl hover:bg-masters-darkgreen transition-colors active:scale-95"
                    >
                      +
                    </button>
                  </div>
                  <div className="w-16 text-right">
                    {isSaving
                      ? <span className="text-xs text-gray-300">saving…</span>
                      : isSaved
                        ? <span className={`text-sm ${scoreColor(rel)}`}>{scoreLabel(rel)}</span>
                        : null
                    }
                  </div>
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </Layout>
  )
}
