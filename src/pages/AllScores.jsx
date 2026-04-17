import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Layout from '../components/Layout'

function scoreStyle(strokes, par) {
  if (!strokes || !par) return 'bg-white text-gray-400'
  const rel = strokes - par
  if (rel <= -2) return 'bg-blue-100 text-blue-800 font-bold'
  if (rel === -1) return 'bg-red-100 text-under-par font-bold'
  if (rel === 0) return 'bg-white text-gray-700'
  if (rel === 1) return 'bg-gray-100 text-gray-600'
  return 'bg-gray-200 text-gray-600'
}

export default function AllScores() {
  const { id } = useParams()
  const [scramble, setScramble] = useState(null)
  const [holes, setHoles] = useState([])
  const [teams, setTeams] = useState([])
  const [scoreMap, setScoreMap] = useState({})

  async function load() {
    const [{ data: s }, { data: h }, { data: t }, { data: sc }] = await Promise.all([
      supabase.from('scrambles').select('*').eq('id', id).single(),
      supabase.from('holes').select('*').eq('scramble_id', id).order('hole_number'),
      supabase.from('teams').select('*').eq('scramble_id', id).order('name'),
      supabase.from('scores').select('team_id, hole_number, strokes'),
    ])
    setScramble(s)
    setHoles(h || [])
    setTeams(t || [])
    const map = {}
    sc?.forEach(s => {
      if (!map[s.team_id]) map[s.team_id] = {}
      map[s.team_id][s.hole_number] = s.strokes
    })
    setScoreMap(map)
  }

  useEffect(() => {
    load()
    const channel = supabase
      .channel(`all-scores-${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'scores' }, load)
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [id])

  if (!scramble) return (
    <Layout>
      <div className="flex items-center justify-center h-40">
        <p className="text-gray-400">Loading...</p>
      </div>
    </Layout>
  )

  const front9 = holes.filter(h => h.hole_number <= 9)
  const back9 = holes.filter(h => h.hole_number >= 10)
  const frontPar = front9.reduce((a, h) => a + h.par, 0)
  const backPar = back9.reduce((a, h) => a + h.par, 0)
  const totalPar = frontPar + backPar

  function teamTotal(teamId, group) {
    return group.reduce((a, h) => {
      const s = scoreMap[teamId]?.[h.hole_number]
      return s ? a + s : a
    }, 0)
  }

  function teamTotalPar(teamId) {
    const played = holes.filter(h => scoreMap[teamId]?.[h.hole_number])
    const strokes = played.reduce((a, h) => a + scoreMap[teamId][h.hole_number], 0)
    const par = played.reduce((a, h) => a + h.par, 0)
    return { strokes, par, rel: strokes - par }
  }

  function formatRel(rel, played) {
    if (played === 0) return '—'
    if (rel === 0) return 'E'
    if (rel < 0) return String(rel)
    return `+${rel}`
  }

  return (
    <Layout scrambleName={scramble.name}>
      <div className="py-6 px-2">
        <h2 className="text-masters-green text-xl font-bold mb-4 px-2">{scramble.name} — All Scorecards</h2>

        {teams.map(team => {
          const teamScores = scoreMap[team.id] || {}
          const holesPlayed = Object.keys(teamScores).length
          const { strokes: totalStrokes, par: playedPar, rel } = teamTotalPar(team.id)

          return (
            <div key={team.id} className="bg-white rounded-lg shadow-md border border-gray-200 mb-5 overflow-hidden">
              {/* Team header */}
              <div className="bg-masters-green px-4 py-3 flex items-center justify-between">
                <h3 className="text-white font-bold text-base">{team.name}</h3>
                <div className="text-right">
                  {holesPlayed > 0 ? (
                    <>
                      <span className={`font-bold text-lg ${rel < 0 ? 'text-yellow-300' : 'text-white'}`}>
                        {formatRel(rel, holesPlayed)}
                      </span>
                      <span className="text-masters-gold text-xs ml-2">
                        ({totalStrokes} strokes · Thru {holesPlayed === scramble.num_holes ? 'F' : holesPlayed})
                      </span>
                    </>
                  ) : (
                    <span className="text-masters-gold text-sm">No scores yet</span>
                  )}
                </div>
              </div>

              {/* Scorecard table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="text-left px-3 py-2 text-gray-500 font-medium w-16">Hole</th>
                      {front9.map(h => (
                        <th key={h.hole_number} className="text-center px-1 py-2 text-gray-500 font-medium w-8">{h.hole_number}</th>
                      ))}
                      <th className="text-center px-2 py-2 text-gray-500 font-bold w-10 bg-gray-100">OUT</th>
                      {back9.map(h => (
                        <th key={h.hole_number} className="text-center px-1 py-2 text-gray-500 font-medium w-8">{h.hole_number}</th>
                      ))}
                      {back9.length > 0 && (
                        <th className="text-center px-2 py-2 text-gray-500 font-bold w-10 bg-gray-100">IN</th>
                      )}
                      <th className="text-center px-2 py-2 text-gray-600 font-bold w-12 bg-gray-100">TOT</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Par row */}
                    <tr className="border-t border-gray-100">
                      <td className="px-3 py-2 text-xs font-bold text-gray-400 uppercase">Par</td>
                      {front9.map(h => (
                        <td key={h.hole_number} className="text-center px-1 py-2 text-gray-400 text-xs">{h.par}</td>
                      ))}
                      <td className="text-center px-2 py-2 text-gray-500 font-bold text-xs bg-gray-50">{frontPar}</td>
                      {back9.map(h => (
                        <td key={h.hole_number} className="text-center px-1 py-2 text-gray-400 text-xs">{h.par}</td>
                      ))}
                      {back9.length > 0 && (
                        <td className="text-center px-2 py-2 text-gray-500 font-bold text-xs bg-gray-50">{backPar}</td>
                      )}
                      <td className="text-center px-2 py-2 text-gray-600 font-bold text-xs bg-gray-50">{totalPar}</td>
                    </tr>
                    {/* Score row */}
                    <tr className="border-t border-gray-100">
                      <td className="px-3 py-2 text-xs font-bold text-masters-green uppercase">Score</td>
                      {front9.map(h => {
                        const s = teamScores[h.hole_number]
                        return (
                          <td key={h.hole_number} className={`text-center px-1 py-2 text-xs ${scoreStyle(s, h.par)}`}>
                            {s ?? '—'}
                          </td>
                        )
                      })}
                      <td className="text-center px-2 py-2 font-bold text-xs bg-gray-50">
                        {teamTotal(team.id, front9) || '—'}
                      </td>
                      {back9.map(h => {
                        const s = teamScores[h.hole_number]
                        return (
                          <td key={h.hole_number} className={`text-center px-1 py-2 text-xs ${scoreStyle(s, h.par)}`}>
                            {s ?? '—'}
                          </td>
                        )
                      })}
                      {back9.length > 0 && (
                        <td className="text-center px-2 py-2 font-bold text-xs bg-gray-50">
                          {teamTotal(team.id, back9) || '—'}
                        </td>
                      )}
                      <td className="text-center px-2 py-2 font-bold text-xs bg-gray-50">
                        {totalStrokes || '—'}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Legend */}
              <div className="flex gap-4 px-3 py-2 bg-gray-50 border-t border-gray-100 text-xs text-gray-400">
                <span><span className="inline-block w-3 h-3 rounded-sm bg-blue-100 mr-1"></span>Eagle</span>
                <span><span className="inline-block w-3 h-3 rounded-sm bg-red-100 mr-1"></span>Birdie</span>
                <span><span className="inline-block w-3 h-3 rounded-sm bg-gray-100 mr-1"></span>Bogey</span>
              </div>
            </div>
          )
        })}
      </div>
    </Layout>
  )
}
