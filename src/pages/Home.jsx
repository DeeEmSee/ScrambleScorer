import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Home() {
  const navigate = useNavigate()
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function joinScramble(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { data, error: err } = await supabase
      .from('scrambles')
      .select('id')
      .eq('code', code.toUpperCase().trim())
      .single()
    setLoading(false)
    if (err || !data) {
      setError('Scramble not found. Check the code and try again.')
      return
    }
    navigate(`/scramble/${data.id}/leaderboard`)
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
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
          <form onSubmit={joinScramble} className="p-5 flex flex-col gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1 font-medium">
                Enter your scramble code
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="e.g. AB12CD"
                maxLength={6}
                className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 text-2xl text-center font-bold tracking-widest uppercase focus:border-masters-green focus:outline-none"
              />
            </div>
            {error && <p className="text-under-par text-sm">{error}</p>}
            <button
              type="submit"
              disabled={!code.trim() || loading}
              className="bg-masters-green text-white font-bold py-3 rounded-lg hover:bg-masters-darkgreen transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Searching...' : 'Join Scramble'}
            </button>
          </form>
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
