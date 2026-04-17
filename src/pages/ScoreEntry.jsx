import { useState, useEffect, useRef } from 'react'

function ScoreBadge({ strokes, rel }) {
  if (strokes === undefined || rel === null) {
    return (
      <div className="w-14 h-14 flex items-center justify-center">
        <span className="text-3xl font-bold text-gray-300">—</span>
      </div>
    )
  }

  const num = <span className="text-2xl font-bold text-gray-900">{strokes}</span>

  if (rel <= -2) {
    return (
      <div className="w-14 h-14 rounded-full border-2 border-red-600 flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-2 border-red-600 flex items-center justify-center">{num}</div>
      </div>
    )
  }
  if (rel === -1) {
    return (
      <div className="w-12 h-12 rounded-full border-2 border-red-600 flex items-center justify-center">{num}</div>
    )
  }
  if (rel === 0) {
    return <div className="w-12 h-12 flex items-center justify-center">{num}</div>
  }
  if (rel === 1) {
    return (
      <div className="w-12 h-12 border-2 border-blue-800 flex items-center justify-center">{num}</div>
    )
  }
  return (
    <div className="w-14 h-14 border-2 border-blue-800 flex items-center justify-center">
      <div className="w-10 h-10 border-2 border-blue-800 flex items-center justify-center">{num}</div>
    </div>
  )
}
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Layout from '../components/Layout'

export default function ScoreEntry() {
  const { id } = useParams()
  const [scramble, setScramble] = useState(null)
  const [holes, setHoles] = useState([])
  const [teams, setTeams] = useState([])
  const [activeTeam, setActiveTeam] = useState(null)
  const [scores, setScores] = useState({})
  const [saving, setSaving] = useState({})
  const [savedHoles, setSavedHoles] = useState({})
  const scoreLogTimeouts = useRef({})

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

  function scoreLabel(rel) {
    if (rel === null) return ''
    if (rel <= -3) return 'Albatross'
    if (rel === -2) return 'Eagle'
    if (rel === -1) return 'Birdie'
    if (rel === 0) return 'Par'
    if (rel === 1) return 'Bogey'
    if (rel === 2) return 'Double Bogey'
    if (rel === 3) return 'Triple Bogey'
    return `+${rel}`
  }

  function scoreColor(rel) {
    if (rel === null) return ''
    if (rel < 0) return 'text-red-600 font-bold'
    if (rel === 0) return 'text-gray-900 font-bold'
    return 'text-blue-800 font-bold'
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
              onClick={() => selectTeam(team)}
              className="bg-white border-2 border-gray-200 rounded-lg px-4 py-4 text-left font-medium text-gray-800 hover:border-masters-green hover:text-masters-green transition-colors"
            >
              {team.name}
            </button>
          ))}
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
            onClick={() => setActiveTeam(null)}
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
                    <ScoreBadge strokes={strokes} rel={rel} />
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
