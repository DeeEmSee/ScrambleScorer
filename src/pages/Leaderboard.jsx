import { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Layout from '../components/Layout'

function formatScore(rel) {
  if (rel === null || rel === undefined) return '—'
  if (rel === 0) return 'E'
  if (rel < 0) return String(rel)
  return `+${rel}`
}

function PositionBadge({ pos, isTied }) {
  const label = `${isTied ? 'T' : ''}${pos}`
  if (pos === 2) {
    return (
      <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center mx-auto">
        <span className="text-gray-500 font-bold text-xs">{label}</span>
      </div>
    )
  }
  if (pos === 3) {
    return (
      <div className="w-6 h-6 rounded-full flex items-center justify-center mx-auto" style={{ background: '#fef3c7', border: '1px solid #fcd34d' }}>
        <span className="font-bold text-xs" style={{ color: '#92400e' }}>{label}</span>
      </div>
    )
  }
  return <span className="text-gray-400 font-medium text-sm">{label}</span>
}

export default function Leaderboard() {
  const { id } = useParams()
  const [scramble, setScramble] = useState(null)
  const [standings, setStandings] = useState([])
  const [lastUpdated, setLastUpdated] = useState(null)
  const [messages, setMessages] = useState([])
  const [chatInput, setChatInput] = useState('')
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef(null)
  const myTeam = useState(() => {
    try { return JSON.parse(localStorage.getItem(`scramble_team_${id}`) || 'null') }
    catch { return null }
  })[0]

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
        const st = await buildStandings(id)
        setStandings(st)
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

  useEffect(() => {
    supabase.from('messages').select('*').eq('scramble_id', id)
      .order('created_at', { ascending: true }).limit(100)
      .then(({ data }) => setMessages(data || []))

    const channel = supabase.channel(`messages-${id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `scramble_id=eq.${id}` },
        payload => setMessages(prev => [...prev, payload.new]))
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [id])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function sendMessage() {
    if (!chatInput.trim() || !myTeam || sending) return
    setSending(true)
    await supabase.from('messages').insert({
      scramble_id: id, team_id: myTeam.id, team_name: myTeam.name, text: chatInput.trim(),
    })
    setChatInput('')
    setSending(false)
  }

  function getPosition(index, standingsArr) {
    if (index === 0) return 1
    const prev = standingsArr[index - 1]
    const curr = standingsArr[index]
    if (curr.scoreToPar === prev.scoreToPar) return getPosition(index - 1, standingsArr)
    return index + 1
  }

  function thruLabel(team, sc) {
    if (!sc) return ''
    if (team.holesPlayed === 0) return '—'
    if (team.holesPlayed === sc.num_holes) return 'F'
    return `${team.holesPlayed}`
  }

  if (!scramble) return (
    <Layout>
      <div className="flex items-center justify-center h-40">
        <p className="text-gray-400">Loading…</p>
      </div>
    </Layout>
  )

  const leader = standings.length > 0 && standings[0].holesPlayed > 0 ? standings[0] : null
  const tableRows = leader ? standings.slice(1) : standings
  const leadMargin = leader && standings.length > 1 && standings[1]?.holesPlayed > 0
    ? Math.abs(leader.scoreToPar - standings[1].scoreToPar)
    : null

  return (
    <Layout scrambleName={scramble.name}>
      <div className="w-full sm:max-w-2xl sm:mx-auto">

        {/* Tournament header */}
        <div className="mg-gradient px-4 pt-5 pb-0 sm:rounded-t-xl overflow-hidden">
          <div className="flex justify-center mb-2">
            <span
              className="border border-masters-gold/50 text-masters-gold text-xs px-3 py-0.5 rounded-full tracking-widest uppercase"
              style={{ fontFamily: 'Georgia, serif', background: 'rgba(207,168,76,0.1)' }}
            >
              Official Scoring
            </span>
          </div>
          <h1
            className="text-white text-2xl sm:text-3xl font-bold text-center"
            style={{ fontFamily: 'Georgia, serif', letterSpacing: '0.02em' }}
          >
            {scramble.name}
          </h1>
          <p
            className="text-masters-gold/80 text-center text-xs tracking-[0.2em] uppercase mt-0.5 mb-3"
            style={{ fontFamily: 'Georgia, serif' }}
          >
            Leaderboard
          </p>
          <div className="flex items-center justify-center gap-2 mb-4">
            <span className="w-2 h-2 bg-green-400 rounded-full" style={{ animation: 'pulse-dot 1.5s ease-in-out infinite' }} />
            <span className="text-white/50 text-xs">
              Live{lastUpdated ? ` · Updated ${lastUpdated.toLocaleTimeString()}` : ''}
            </span>
          </div>
        </div>

        {/* Standings */}
        {standings.length === 0 ? (
          <div className="mx-3 mt-3 bg-white rounded-2xl border border-gray-100 shadow-sm text-center py-16">
            <p className="text-5xl mb-3">🏌️</p>
            <p className="text-lg font-medium text-gray-600">No scores yet</p>
            <p className="text-sm text-gray-400 mt-1">Scores will appear here as teams play.</p>
          </div>
        ) : (
          <>
            {/* Hero card for leader */}
            {leader && (
              <div className="mx-3 mt-3 mb-2 bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100">
                <div style={{ background: '#006747', height: 3 }} />
                <div className="flex items-center px-4 py-4 gap-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 border border-masters-gold/30"
                    style={{ background: 'rgba(207,168,76,0.1)' }}
                  >
                    <span className="text-masters-gold font-black" style={{ fontFamily: 'Georgia, serif' }}>1</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-gray-900 font-bold text-base truncate">{leader.name}</div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {leadMargin !== null ? (
                        <>
                          <span className="text-xs text-gray-400">Leading by</span>
                          <span className="text-xs text-masters-green font-semibold">{leadMargin}</span>
                        </>
                      ) : (
                        <span className="text-xs text-gray-400">
                          {thruLabel(leader, scramble) === 'F' ? 'Finished' : `${leader.holesPlayed} holes played`}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className={`font-black text-4xl leading-none ${
                      leader.scoreToPar < 0 ? 'text-red-600'
                      : leader.scoreToPar > 0 ? 'text-blue-800'
                      : 'text-gray-700'
                    }`}>
                      {formatScore(leader.scoreToPar)}
                    </div>
                    <div className="text-gray-400 text-xs mt-0.5">thru {thruLabel(leader, scramble)}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Table card for remaining teams */}
            {tableRows.length > 0 && (
              <div className="mx-3 mb-3 bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100">
                <div className="grid grid-cols-[44px_1fr_72px_52px] px-4 py-2 border-b border-gray-50">
                  <div className="text-gray-300 text-xs font-bold text-center uppercase tracking-wide">Pos</div>
                  <div className="text-gray-300 text-xs font-bold uppercase tracking-wide">Team</div>
                  <div className="text-gray-300 text-xs font-bold text-center uppercase tracking-wide">Score</div>
                  <div className="text-gray-300 text-xs font-bold text-center uppercase tracking-wide">Thru</div>
                </div>
                {tableRows.map((team, i) => {
                  const actualIndex = leader ? i + 1 : i
                  const pos = getPosition(actualIndex, standings)
                  const isTied = team.scoreToPar !== null && standings.filter(t => t.scoreToPar === team.scoreToPar).length > 1
                  const thru = thruLabel(team, scramble)
                  const isFinished = thru === 'F'

                  return (
                    <div
                      key={team.id}
                      className={`grid grid-cols-[44px_1fr_72px_52px] items-center px-4 py-3.5 border-b border-gray-50 last:border-b-0 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}
                    >
                      <div className="text-center">
                        {team.holesPlayed > 0
                          ? <PositionBadge pos={pos} isTied={isTied} />
                          : <span className="text-gray-300 text-sm">—</span>
                        }
                      </div>
                      <div className={`font-medium text-sm truncate ${team.holesPlayed > 0 ? 'text-gray-800' : 'text-gray-400'}`}>
                        {team.name}
                      </div>
                      <div className="text-center">
                        {team.holesPlayed > 0 ? (
                          <span className={`font-bold text-xl ${
                            team.scoreToPar < 0 ? 'text-red-600'
                            : team.scoreToPar > 0 ? 'text-blue-800'
                            : 'text-gray-600'
                          }`}>
                            {formatScore(team.scoreToPar)}
                          </span>
                        ) : (
                          <span className="text-gray-300 text-xl">—</span>
                        )}
                      </div>
                      <div className="text-center">
                        <span className={`text-sm font-medium ${isFinished ? 'text-masters-green font-bold' : 'text-gray-400'}`}>
                          {thru}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}

        {/* Match Chat */}
        <div className="mx-3 mb-6 bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100">
          <div className="px-4 py-3 flex items-center gap-2" style={{ background: '#006747' }}>
            <svg className="w-3.5 h-3.5 text-masters-gold" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2 5a2 2 0 012-2h12a2 2 0 012 2v7a2 2 0 01-2 2H9l-4 4v-4H4a2 2 0 01-2-2V5z" />
            </svg>
            <span
              className="text-masters-gold font-bold text-xs uppercase tracking-widest"
              style={{ fontFamily: 'Georgia, serif' }}
            >
              Match Chat
            </span>
          </div>

          <div className="h-64 overflow-y-auto px-4 py-3 flex flex-col gap-3">
            {messages.length === 0 && (
              <p className="text-gray-400 text-sm text-center mt-8">No messages yet.</p>
            )}
            {messages.map(msg => {
              if (msg.type === 'score') {
                return (
                  <div key={msg.id} className="text-center py-0.5">
                    <span className="text-xs text-gray-400 italic bg-gray-50 px-2 py-0.5 rounded-full">
                      <span className="font-semibold text-gray-500">{msg.team_name}</span> {msg.text}
                    </span>
                  </div>
                )
              }
              const isMe = msg.team_id === myTeam?.id
              return (
                <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                  {!isMe && (
                    <span className="text-xs font-bold text-masters-green mb-0.5">{msg.team_name}</span>
                  )}
                  <div className={`rounded-2xl px-3 py-2 max-w-xs text-sm break-words ${
                    isMe
                      ? 'rounded-tr-md text-white'
                      : 'bg-gray-100 text-gray-800 rounded-tl-md'
                  }`} style={isMe ? { background: '#006747' } : {}}>
                    {msg.text}
                  </div>
                  <span className="text-xs text-gray-400 mt-0.5">
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              )
            })}
            <div ref={messagesEndRef} />
          </div>

          <div className="border-t border-gray-100 p-3 flex gap-2">
            {myTeam ? (
              <>
                <input
                  type="text"
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && sendMessage()}
                  placeholder={`Message as ${myTeam.name}…`}
                  maxLength={200}
                  className="flex-1 bg-gray-100 rounded-2xl px-4 py-2 text-sm text-gray-700 focus:outline-none border border-transparent focus:border-masters-green/20"
                />
                <button
                  onClick={sendMessage}
                  disabled={!chatInput.trim() || sending}
                  className="w-10 h-10 rounded-full text-white flex items-center justify-center flex-shrink-0 transition-colors disabled:opacity-40"
                  style={{ background: '#006747' }}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 19V5M5 12l7-7 7 7" />
                  </svg>
                </button>
              </>
            ) : (
              <p className="text-gray-400 text-sm py-1 text-center w-full">
                <Link to={`/scramble/${id}/score`} className="text-masters-green underline">
                  Select your team
                </Link>{' '}
                in Score Entry to chat
              </p>
            )}
          </div>
        </div>

      </div>
    </Layout>
  )
}
