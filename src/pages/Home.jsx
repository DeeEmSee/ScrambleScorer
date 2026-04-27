import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

function formatDate(dateStr) {
  if (!dateStr) return ''
  const [year, month, day] = dateStr.split('-')
  const d = new Date(year, month - 1, day)
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
}

export default function Home() {
  const navigate = useNavigate()
  const [scrambles, setScrambles] = useState([])
  const [selected, setSelected] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('scrambles')
        .select('id, name, date, num_holes')
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })
      setScrambles(data || [])
      setLoading(false)
    }
    load()
  }, [])

  function join() {
    if (selected) navigate(`/scramble/${selected}/leaderboard`)
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-md mx-auto px-4 py-5 text-center">
          <div className="text-4xl mb-1">⛳</div>
          <h1 className="text-masters-green text-3xl font-bold tracking-wide">ScrambleScorer</h1>
          <p className="text-gray-400 text-xs mt-1 tracking-widest uppercase">Live Golf Match Scoring</p>
        </div>
      </header>

      <main className="flex-1 max-w-md mx-auto w-full px-4 py-8 flex flex-col gap-6">
        {/* Join a scramble */}
        <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
          <div className="px-5 pt-4 pb-2 border-b border-gray-100">
            <h2 className="text-gray-800 font-bold text-base">Join a Match</h2>
          </div>
          <div className="p-5 flex flex-col gap-4">
            {loading ? (
              <p className="text-gray-400 text-sm text-center py-2">Loading matches...</p>
            ) : scrambles.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-2">No matches yet. Create one below.</p>
            ) : (
              <select
                value={selected}
                onChange={(e) => setSelected(e.target.value)}
                className="w-full border-2 border-gray-200 rounded-lg px-4 py-3 text-gray-800 focus:border-masters-green focus:outline-none bg-white"
              >
                <option value="">Select a match...</option>
                {scrambles.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name} — {formatDate(s.date)}
                  </option>
                ))}
              </select>
            )}
            <button
              onClick={join}
              disabled={!selected}
              className="bg-masters-green text-white font-bold py-3 rounded-lg hover:bg-masters-darkgreen transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Join Match
            </button>
          </div>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-4">
          <div className="flex-1 border-t border-gray-200" />
          <span className="text-gray-300 text-sm">or</span>
          <div className="flex-1 border-t border-gray-200" />
        </div>

        {/* Organizer */}
        <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
          <div className="px-5 pt-4 pb-2 border-b border-gray-100">
            <h2 className="text-gray-800 font-bold text-base">Organizer</h2>
          </div>
          <div className="p-5">
            <p className="text-gray-500 text-sm mb-4">
              Set up a new match, enter hole pars, and create teams.
            </p>
            <button
              onClick={() => navigate('/setup')}
              className="w-full bg-masters-green text-white font-bold py-3 rounded-lg hover:bg-masters-darkgreen transition-colors"
            >
              Create New Match
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
