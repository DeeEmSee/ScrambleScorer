import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Layout from '../components/Layout'

function formatScore(rel) {
  if (rel === null || rel === undefined) return '—'
  if (rel === 0) return 'E'
  if (rel < 0) return String(rel)
  return `+${rel}`
}

export default function Leaderboard() {
  const { id } = useParams()
  const [scramble, setScramble] = useState(null)
  const [standings, setStandings] = useState([])
  const [lastUpdated, setLastUpdated] = useState(null)

  async function buildStandings(scrambleId) {
    const [{ data: holes }, { data: teams }, { data: scores }] = await Promise.all([
      supabase.from('holes').select('hole_number, par').eq('scramble_id', scrambleId),
      supabase.from('teams').select('id, name').eq('scramble_id', scrambleId),
      supabase.from('scores').select('team_id, hole_number, strokes'),
    ])
    if (!holes || !teams) return []

    const parMap = {}
    holes.forEach(h => (parMap[h.hole_number] = h.par))

    const teamScores = (teams || []).map(team => {
      const teamScoreList = (scores || []).filter(s => s.team_id === team.id)
      const holesPlayed = teamScoreList.length
      const totalStrokes = teamScoreList.reduce((a, s) => a + s.strokes, 0)
      const totalPar = teamScoreList.reduce((a, s) => a + (parMap[s.hole_number] || 0), 0)
      const scoreToPar = holesPlayed > 0 ? totalStrokes - totalPar : null
      return { ...team, holesPlayed, totalStrokes, scoreToPar }
    })

    teamScores.sort((a, b) => {
      if (a.scoreToPar === null && b.scoreToPar === null) return 0
      if (a.scoreToPar === null) return 1
      if (b.scoreToPar === null) return -1
      if (a.scoreToPar !== b.scoreToPar) return a.scoreToPar - b.scoreToPar
      return b.holesPlayed - a.holesPlayed
    })

    return teamScores
  }

  useEffect(() => {
    async function load() {
      const { data: s } = await supabase.from('scrambles').select('*').eq('id', id).single()
      setScramble(s)
      if (s) {
        const standings = await buildStandings(id)
        setStandings(standings)
        setLastUpdated(new Date())
      }
    }
    load()

    const channel = supabase
      .channel(`scores-${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'scores' }, async () => {
        const updated = await buildStandings(id)
        setStandings(updated)
        setLastUpdated(new Date())
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [id])

  const totalPar = scramble ? null : null

  function getPosition(index, standings) {
    if (index === 0) return 1
    const prev = standings[index - 1]
    const curr = standings[index]
    if (curr.scoreToPar === prev.scoreToPar) return getPosition(index - 1, standings)
    return index + 1
  }

  function thruLabel(team, scramble) {
    if (!scramble) return ''
    if (team.holesPlayed === 0) return '—'
    if (team.holesPlayed === scramble.num_holes) return 'F'
    return `${team.holesPlayed}`
  }

  if (!scramble) return (
    <Layout>
      <div className="flex items-center justify-center h-40">
        <p className="text-gray-400">Loading...</p>
      </div>
    </Layout>
  )

  return (
    <Layout scrambleName={scramble.name}>
      <div className="max-w-2xl mx-auto px-0 sm:px-4 py-6">
        {/* Tournament Header — Masters Style */}
        <div className="bg-masters-green mx-0 sm:rounded-t-lg overflow-hidden shadow-lg">
          <div className="text-center py-5 px-4">
            <p className="text-masters-gold text-xs tracking-widest uppercase mb-1">Official</p>
            <h1 className="text-white text-2xl sm:text-3xl font-bold tracking-wide">{scramble.name}</h1>
            <p className="text-masters-gold text-sm mt-1 tracking-widest uppercase">Leaderboard</p>
          </div>
          {/* Column headers */}
          <div className="grid grid-cols-[40px_1fr_80px_60px] bg-masters-darkgreen px-4 py-2 text-xs text-masters-gold uppercase tracking-widest font-bold">
            <div className="text-center">Pos</div>
            <div>Team</div>
            <div className="text-center">Score</div>
            <div className="text-center">Thru</div>
          </div>
        </div>

        {/* Standings */}
        <div className="bg-white shadow-lg sm:rounded-b-lg overflow-hidden border border-gray-200 border-t-0">
          {standings.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <p className="text-4xl mb-3">🏌️</p>
              <p className="font-medium">No scores yet</p>
              <p className="text-sm mt-1">Scores will appear here as teams play.</p>
            </div>
          ) : (
            standings.map((team, i) => {
              const pos = getPosition(i, standings)
              const isTied = i > 0 && standings[i - 1].scoreToPar === team.scoreToPar
              const isLeader = pos === 1 && team.holesPlayed > 0
              const thru = thruLabel(team, scramble)
              const isFinished = thru === 'F'

              return (
                <div
                  key={team.id}
                  className={`grid grid-cols-[40px_1fr_80px_60px] items-center px-4 py-3 border-b border-gray-100 last:border-b-0 ${isLeader ? 'bg-yellow-50' : i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                >
                  {/* Position */}
                  <div className="text-center">
                    {team.holesPlayed > 0 ? (
                      <span className={`font-bold text-sm ${isLeader ? 'text-masters-gold' : 'text-gray-500'}`}>
                        {isTied ? 'T' : ''}{pos}
                      </span>
                    ) : (
                      <span className="text-gray-300 text-sm">—</span>
                    )}
                  </div>

                  {/* Team name */}
                  <div className={`font-medium ${isLeader ? 'text-masters-green font-bold' : 'text-gray-800'}`}>
                    {team.name}
                    {isFinished && <span className="ml-2 text-xs text-gray-400">✓</span>}
                  </div>

                  {/* Score to par */}
                  <div className="text-center">
                    {team.holesPlayed > 0 ? (
                      <span className={`font-bold text-lg ${
                        team.scoreToPar < 0
                          ? 'text-under-par'
                          : team.scoreToPar === 0
                          ? 'text-gray-700'
                          : 'text-gray-700'
                      }`}>
                        {formatScore(team.scoreToPar)}
                      </span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </div>

                  {/* Thru */}
                  <div className="text-center">
                    <span className={`text-sm font-medium ${isFinished ? 'text-masters-green font-bold' : 'text-gray-500'}`}>
                      {thru}
                    </span>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {lastUpdated && (
          <p className="text-center text-xs text-gray-400 mt-3">
            Live · Updated {lastUpdated.toLocaleTimeString()}
          </p>
        )}
      </div>
    </Layout>
  )
}
