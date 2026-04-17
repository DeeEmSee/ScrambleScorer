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

  const { code, teams } = state

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-masters-green py-6 text-center shadow-lg">
        <div className="text-4xl mb-1">🏌️</div>
        <h1 className="text-masters-gold text-2xl font-bold">Scramble Created!</h1>
      </header>

      <main className="flex-1 max-w-md mx-auto w-full px-4 py-6 flex flex-col gap-6">
        {/* Share Code */}
        <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
          <div className="bg-masters-green px-5 py-3">
            <h2 className="text-masters-gold font-bold">Share This Code</h2>
          </div>
          <div className="p-5 text-center">
            <p className="text-gray-500 text-sm mb-3">
              Share this code with all players so they can join:
            </p>
            <div className="text-5xl font-bold tracking-widest text-masters-green bg-masters-cream rounded-xl py-4 px-6 inline-block border-2 border-masters-green">
              {code}
            </div>
          </div>
        </div>

        {/* Team PINs */}
        <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
          <div className="bg-masters-gold px-5 py-3">
            <h2 className="text-white font-bold">Team PINs — Keep Private!</h2>
          </div>
          <div className="p-5 flex flex-col gap-2">
            <p className="text-gray-500 text-xs mb-2">
              Share each team's PIN privately — they need it to enter scores.
            </p>
            {teams.map((team, i) => (
              <div key={i} className="flex items-center justify-between border border-gray-200 rounded-lg px-4 py-2">
                <span className="font-medium text-gray-800">{team.name}</span>
                <span className="font-bold text-masters-green text-lg tracking-widest">{team.pin}</span>
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

      <footer className="bg-masters-green text-center py-3">
        <p className="text-masters-gold text-xs tracking-widest uppercase">ScrambleScorer</p>
      </footer>
    </div>
  )
}
