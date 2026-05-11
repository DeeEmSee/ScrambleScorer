import { useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'

export default function ScramblePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const state = location.state

  useEffect(() => {
    if (!state) {
      navigate(`/scramble/${id}/leaderboard`, { replace: true })
    }
  }, [id, state, navigate])

  if (!state) return null

  const { teams } = state

  return (
    <div className="min-h-screen flex flex-col">
      <header className="mg-gradient shadow-lg">
        <div className="max-w-md mx-auto px-5 pt-8 pb-6 text-center">
          <div className="text-4xl mb-3">🏌️</div>
          <h1 className="text-white text-2xl font-bold" style={{ fontFamily: 'Georgia, serif' }}>
            Match Created!
          </h1>
          <p className="text-masters-gold/80 text-xs tracking-widest uppercase mt-1" style={{ fontFamily: 'Georgia, serif' }}>
            {teams.some(t => t.pin) ? 'Share team PINs below' : 'Your match is ready'}
          </p>
        </div>
      </header>

      <main className="flex-1 max-w-md mx-auto w-full px-4 py-5 flex flex-col gap-4">
        {/* Team PINs */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-50">
            <h2 className="text-gray-700 font-bold text-sm uppercase tracking-wide">
              {teams.some(t => t.pin) ? 'Team PINs — Keep Private' : 'Teams'}
            </h2>
          </div>
          <div className="p-4 flex flex-col gap-2">
            {teams.some(t => t.pin) && (
              <p className="text-gray-400 text-xs mb-1">
                Share each team's PIN privately — they need it to enter scores.
              </p>
            )}
            {teams.map((team, i) => (
              <div key={i} className="flex items-center justify-between border border-gray-100 rounded-xl px-4 py-2.5 bg-gray-50/50">
                <span className="font-semibold text-gray-800 text-sm">{team.name}</span>
                {team.pin
                  ? <span className="font-bold text-masters-green text-base tracking-widest">{team.pin}</span>
                  : <span className="text-gray-300 text-sm">No PIN</span>
                }
              </div>
            ))}
          </div>
        </div>

        {/* Navigate buttons */}
        <div className="flex flex-col gap-3">
          <button
            onClick={() => navigate(`/scramble/${id}/leaderboard`)}
            className="bg-masters-green text-white font-bold py-3 rounded-xl hover:bg-masters-darkgreen transition-colors"
          >
            View Leaderboard
          </button>
          <button
            onClick={() => navigate(`/scramble/${id}/score`)}
            className="border border-masters-green text-masters-green font-bold py-3 rounded-xl hover:bg-masters-green hover:text-white transition-colors"
          >
            Enter Scores
          </button>
        </div>
      </main>
    </div>
  )
}
