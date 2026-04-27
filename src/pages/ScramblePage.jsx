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
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-md mx-auto px-4 py-4 flex items-center gap-3">
          <span className="text-2xl">🏌️</span>
          <h1 className="text-masters-green text-lg font-bold">Match Created!</h1>
        </div>
      </header>

      <main className="flex-1 max-w-md mx-auto w-full px-4 py-6 flex flex-col gap-6">
        {/* Team PINs */}
        <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
          <div className="px-5 pt-4 pb-2 border-b border-gray-100">
            <h2 className="text-gray-800 font-bold text-base">Team PINs — Keep Private!</h2>
          </div>
          <div className="p-5 flex flex-col gap-2">
            {teams.some(t => t.pin) ? (
              <p className="text-gray-500 text-xs mb-2">
                Share each team's PIN privately — they need it to enter scores.
              </p>
            ) : (
              <p className="text-gray-500 text-xs mb-2">
                PINs are not required for this match.
              </p>
            )}
            {teams.map((team, i) => (
              <div key={i} className="flex items-center justify-between border border-gray-200 rounded-lg px-4 py-2">
                <span className="font-medium text-gray-800">{team.name}</span>
                {team.pin
                  ? <span className="font-bold text-masters-green text-lg tracking-widest">{team.pin}</span>
                  : <span className="text-gray-300 font-medium">N/A</span>
                }
              </div>
            ))}
          </div>
        </div>

        {/* Navigate buttons */}
        <div className="flex flex-col gap-3">
          <button
            onClick={() => navigate(`/scramble/${id}/leaderboard`)}
            className="bg-masters-green text-white font-bold py-3 rounded-lg hover:bg-masters-darkgreen transition-colors"
          >
            View Leaderboard
          </button>
          <button
            onClick={() => navigate(`/scramble/${id}/score`)}
            className="border-2 border-masters-green text-masters-green font-bold py-3 rounded-lg hover:bg-masters-green hover:text-white transition-colors"
          >
            Enter Scores
          </button>
        </div>
      </main>

    </div>
  )
}
