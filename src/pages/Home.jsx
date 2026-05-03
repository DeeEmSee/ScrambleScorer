import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

function formatDate(dateStr) {
  if (!dateStr) return ''
  const [year, month, day] = dateStr.split('-')
  const d = new Date(year, month - 1, day)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
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
      <header className="mg-gradient shadow-lg">
        <div className="max-w-md mx-auto px-5 pt-10 pb-6">
          <div className="flex items-center gap-3">
            <span className="text-3xl">⛳</span>
            <div>
              <h1
                className="text-white text-2xl font-bold leading-tight"
                style={{ fontFamily: 'Georgia, serif' }}
              >
                ScrambleScorer
              </h1>
              <p
                className="text-masters-gold/80 text-xs tracking-widest uppercase mt-0.5"
                style={{ fontFamily: 'Georgia, serif' }}
              >
                Live Scramble Scoring
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-md mx-auto w-full px-3 py-4 flex flex-col gap-3">
        {/* Join card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h2 className="text-gray-900 font-bold text-base mb-3">Join a Match</h2>
          {loading ? (
            <p className="text-gray-400 text-sm text-center py-2">Loading matches…</p>
          ) : scrambles.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-2">No matches yet. Create one below.</p>
          ) : (
            <select
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              className="w-full border border-gray-200 bg-gray-50 rounded-xl px-4 py-3 text-gray-700 text-sm focus:border-masters-green focus:outline-none appearance-none font-medium"
            >
              <option value="">Select a match…</option>
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
            className="mt-3 w-full bg-masters-green text-white font-bold py-3 rounded-xl text-sm shadow-sm transition-colors hover:bg-masters-darkgreen disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Join Match →
          </button>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3 px-1">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-gray-400 text-sm">or</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        {/* Create */}
        <button
          onClick={() => navigate('/setup')}
          className="w-full bg-white text-gray-600 font-bold py-4 rounded-2xl text-sm border-2 border-dashed border-gray-200 flex items-center justify-center gap-2 hover:border-masters-green hover:text-masters-green transition-colors shadow-sm"
        >
          <span className="text-masters-gold text-xl leading-none">+</span> Create New Match
        </button>

        {/* Recent matches */}
        {!loading && scrambles.length > 0 && (
          <div className="mt-1">
            <p className="text-gray-400 text-xs uppercase tracking-wider font-bold mb-2 px-1">Recent Matches</p>
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
              {scrambles.slice(0, 5).map((s, i, arr) => (
                <button
                  key={s.id}
                  onClick={() => navigate(`/scramble/${s.id}/leaderboard`)}
                  className={`w-full flex items-center px-4 py-3.5 gap-3 text-left hover:bg-gray-50 transition-colors ${i < arr.length - 1 ? 'border-b border-gray-50' : ''}`}
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(0,103,71,0.08)' }}
                  >
                    <span className="text-sm">🏌️</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-gray-800 font-semibold text-sm truncate">{s.name}</div>
                    <div className="text-gray-400 text-xs">{formatDate(s.date)} · {s.num_holes} holes</div>
                  </div>
                  <span className="text-xs font-bold text-masters-green flex-shrink-0">View →</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
