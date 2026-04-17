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
      <header className="bg-masters-green py-10 text-center shadow-lg">
        <div className="text-6xl mb-3">⛳</div>
        <h1 className="text-masters-gold text-4xl sm:text-5xl font-bold tracking-wide">
          ScrambleScorer
        </h1>
        <p className="text-white text-sm mt-2 tracking-widest uppercase opacity-80">
          Live Golf Scramble Scoring
        </p>
      </header>

      <main className="flex-1 max-w-md mx-auto w-full px-4 py-10 flex flex-col gap-8">
        {/* Join a scramble */}
        <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
          <div className="bg-masters-green px-5 py-3">
            <h2 className="text-masters-gold font-bold text-lg">Join a Scramble</h2>
          </div>
          <div className="p-5 flex flex-col gap-4">
            {loading ? (
              <p className="text-gray-400 text-sm text-center py-2">Loading scrambles...</p>
            ) : scrambles.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-2">No scrambles yet. Create one below.</p>
            ) : (
              <select
                value={selected}
                onChange={(e) => setSelected(e.target.value)}
                className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 text-gray-800 focus:border-masters-green focus:outline-none bg-white"
              >
                <option value="">Select a scramble...</option>
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
              Join Scramble
            </button>
          </div>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-4">
          <div className="flex-1 border-t border-gray-300" />
          <span className="text-gray-400 text-sm">or</span>
          <div className="flex-1 border-t border-gray-300" />
        </div>

        {/* Organizer */}
        <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
          <div className="bg-masters-gold px-5 py-3">
            <h2 className="text-white font-bold text-lg">Organizer</h2>
          </div>
          <div className="p-5">
            <p className="text-gray-600 text-sm mb-4">
              Set up a new scramble, enter hole pars, and create teams with PINs.
            </p>
            <button
              onClick={() => navigate('/setup')}
              className="w-full bg-masters-gold text-white font-bold py-3 rounded-lg hover:opacity-90 transition-opacity"
            >
              Create New Scramble
            </button>
          </div>
        </div>
      </main>

      <footer className="bg-masters-green text-center py-3">
        <p className="text-masters-gold text-xs tracking-widest uppercase">ScrambleScorer</p>
      </footer>
    </div>
  )
}
