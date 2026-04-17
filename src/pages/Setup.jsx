import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const GOLF_API_KEY = import.meta.env.VITE_GOLF_API_KEY

async function searchCourses(query) {
  const res = await fetch(
    `https://api.golfcourseapi.com/v1/search?search_query=${encodeURIComponent(query)}`,
    { headers: { Authorization: `Key ${GOLF_API_KEY}` } }
  )
  if (!res.ok) return []
  const data = await res.json()
  return data.courses ?? []
}

const generatePin = () => String(Math.floor(10 + Math.random() * 90))
const generateCode = () => Math.random().toString(36).substr(2, 6).toUpperCase()

const defaultPins = ['11', '22', '33', '44', '55', '66', '77', '88']
const defaultTeam = (index) => ({ name: '', pin: defaultPins[index] ?? generatePin() })

export default function Setup() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [scrambleName, setScrambleName] = useState('')
  const [scrambleDate, setScrambleDate] = useState(new Date().toISOString().split('T')[0])
  const [numHoles, setNumHoles] = useState(18)
  const [pars, setPars] = useState(Array(18).fill(4))
  const [teams, setTeams] = useState([0, 1, 2, 3].map(defaultTeam))

  const [courseQuery, setCourseQuery] = useState('')
  const [courseResults, setCourseResults] = useState([])
  const [courseSearching, setCourseSearching] = useState(false)
  const [selectedCourse, setSelectedCourse] = useState(null)
  const [showDropdown, setShowDropdown] = useState(false)
  const searchTimeout = useRef(null)
  const dropdownRef = useRef(null)

  useEffect(() => {
    if (courseQuery.length < 3) { setCourseResults([]); setShowDropdown(false); return }
    clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(async () => {
      setCourseSearching(true)
      const results = await searchCourses(courseQuery)
      setCourseResults(results)
      setShowDropdown(results.length > 0)
      setCourseSearching(false)
    }, 400)
    return () => clearTimeout(searchTimeout.current)
  }, [courseQuery])

  useEffect(() => {
    function handleClick(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setShowDropdown(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function applyCourse(course) {
    const teeBox = course.tees?.male?.[0] ?? course.tees?.female?.[0]
    if (!teeBox?.holes?.length) return
    const holes = teeBox.holes
    const n = holes.length === 9 ? 9 : 18
    setNumHoles(n)
    setPars(holes.slice(0, n).map(h => Math.max(3, Math.min(5, h.par))))
    setSelectedCourse(course)
    setShowDropdown(false)
  }

  function handleNumHoles(n) {
    setNumHoles(n)
    setPars(Array(n).fill(4))
  }

  function setPar(index, value) {
    const val = Math.max(3, Math.min(5, Number(value) || 4))
    setPars(prev => prev.map((p, i) => (i === index ? val : p)))
  }

  function addTeam() {
    setTeams(prev => [...prev, defaultTeam(prev.length)])
  }

  function removeTeam(i) {
    setTeams(prev => prev.filter((_, idx) => idx !== i))
  }

  function updateTeam(i, field, value) {
    setTeams(prev => prev.map((t, idx) => idx === i ? { ...t, [field]: value } : t))
  }

  function regeneratePin(i) {
    updateTeam(i, 'pin', generatePin())
  }

  async function createScramble() {
    setError('')
    if (teams.some(t => !t.name.trim())) {
      setError('All teams must have a name.')
      return
    }
    setSaving(true)
    const code = generateCode()

    const { data: scramble, error: e1 } = await supabase
      .from('scrambles')
      .insert({ code, name: scrambleName.trim(), num_holes: numHoles, date: scrambleDate })
      .select()
      .single()

    if (e1) { setSaving(false); setError('Failed to create scramble. Try again.'); return }

    const holesData = pars.map((par, i) => ({ scramble_id: scramble.id, hole_number: i + 1, par }))
    const { error: e2 } = await supabase.from('holes').insert(holesData)
    if (e2) { setSaving(false); setError('Failed to save holes.'); return }

    const teamsData = teams.map(t => ({ scramble_id: scramble.id, name: t.name.trim(), pin: t.pin }))
    const { error: e3 } = await supabase.from('teams').insert(teamsData)
    if (e3) { setSaving(false); setError('Failed to save teams.'); return }

    setSaving(false)
    navigate(`/scramble/${scramble.id}`, { state: { code, teams: teams.map(t => ({ name: t.name, pin: t.pin })) } })
  }

  const totalPar = pars.reduce((a, b) => a + b, 0)
  const frontPar = pars.slice(0, 9).reduce((a, b) => a + b, 0)
  const backPar = numHoles === 18 ? pars.slice(9).reduce((a, b) => a + b, 0) : 0

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-masters-green py-5 text-center shadow-lg">
        <h1 className="text-masters-gold text-2xl font-bold tracking-wide">New Scramble Setup</h1>
        <div className="flex justify-center gap-2 mt-3">
          {[1, 2, 3].map(s => (
            <div key={s} className={`w-8 h-1 rounded-full ${step >= s ? 'bg-masters-gold' : 'bg-masters-darkgreen'}`} />
          ))}
        </div>
      </header>

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-6">
        {/* Step 1: Scramble Details */}
        {step === 1 && (
          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 flex flex-col gap-5">
            <h2 className="text-masters-green text-xl font-bold">Step 1: Scramble Details</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Scramble Name</label>
              <input
                type="text"
                value={scrambleName}
                onChange={(e) => setScrambleName(e.target.value)}
                placeholder="e.g. Spring Classic 2025"
                className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 focus:border-masters-green focus:outline-none"
              />
            </div>

            <div className="relative" ref={dropdownRef}>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Golf Course <span className="text-gray-400 font-normal">(optional — auto-fills hole pars)</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={courseQuery}
                  onChange={(e) => { setCourseQuery(e.target.value); setSelectedCourse(null) }}
                  onFocus={() => courseResults.length > 0 && setShowDropdown(true)}
                  placeholder="Search by course or club name..."
                  className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 focus:border-masters-green focus:outline-none pr-10"
                />
                {courseSearching && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">⏳</span>
                )}
                {selectedCourse && !courseSearching && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-masters-green text-sm">✓</span>
                )}
              </div>
              {showDropdown && (
                <ul className="absolute z-10 w-full bg-white border-2 border-masters-green rounded-lg shadow-lg mt-1 max-h-60 overflow-auto">
                  {courseResults.map(course => (
                    <li
                      key={course.id}
                      onMouseDown={() => applyCourse(course)}
                      className="px-4 py-3 hover:bg-masters-cream cursor-pointer border-b border-gray-100 last:border-b-0"
                    >
                      <div className="font-medium text-masters-green text-sm">{course.club_name}</div>
                      {course.course_name !== course.club_name && (
                        <div className="text-xs text-gray-500">{course.course_name}</div>
                      )}
                      {course.location && (
                        <div className="text-xs text-gray-400">{[course.location.city, course.location.state].filter(Boolean).join(', ')}</div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              {selectedCourse && (
                <p className="text-xs text-masters-green mt-1">
                  Pars loaded from {selectedCourse.club_name} — you can still edit them in the next step.
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input
                type="date"
                value={scrambleDate}
                onChange={(e) => setScrambleDate(e.target.value)}
                className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 focus:border-masters-green focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Number of Holes</label>
              <div className="flex gap-3">
                {[9, 18].map(n => (
                  <button
                    key={n}
                    onClick={() => handleNumHoles(n)}
                    className={`flex-1 py-3 rounded-lg font-bold border-2 transition-colors ${numHoles === n
                      ? 'bg-masters-green text-white border-masters-green'
                      : 'bg-white text-masters-green border-masters-green hover:bg-masters-green hover:text-white'}`}
                  >
                    {n} Holes
                  </button>
                ))}
              </div>
            </div>
            <button
              onClick={() => setStep(2)}
              disabled={!scrambleName.trim()}
              className="bg-masters-green text-white font-bold py-3 rounded-lg hover:bg-masters-darkgreen transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {selectedCourse ? 'Next: Review Hole Pars →' : 'Next: Enter Hole Pars →'}
            </button>
          </div>
        )}

        {/* Step 2: Hole Pars */}
        {step === 2 && (
          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 flex flex-col gap-5">
            <h2 className="text-masters-green text-xl font-bold">Step 2: Hole Pars</h2>
            <p className="text-gray-500 text-sm">Set the par for each hole (3, 4, or 5).</p>

            {/* Front 9 */}
            <div>
              <h3 className="text-sm font-bold text-gray-600 uppercase tracking-wide mb-2">Front 9</h3>
              <div className="grid grid-cols-9 gap-1 text-center mb-1">
                {pars.slice(0, 9).map((_, i) => (
                  <div key={i} className="text-xs text-gray-400">{i + 1}</div>
                ))}
              </div>
              <div className="grid grid-cols-9 gap-1">
                {pars.slice(0, 9).map((p, i) => (
                  <input
                    key={i}
                    type="number"
                    value={p}
                    onChange={(e) => setPar(i, e.target.value)}
                    min={3} max={5}
                    className="w-full text-center border-2 border-gray-300 rounded py-2 font-bold text-masters-green focus:border-masters-green focus:outline-none"
                  />
                ))}
              </div>
              <div className="text-right text-sm text-gray-500 mt-1">OUT: <strong>{frontPar}</strong></div>
            </div>

            {/* Back 9 */}
            {numHoles === 18 && (
              <div>
                <h3 className="text-sm font-bold text-gray-600 uppercase tracking-wide mb-2">Back 9</h3>
                <div className="grid grid-cols-9 gap-1 text-center mb-1">
                  {pars.slice(9).map((_, i) => (
                    <div key={i} className="text-xs text-gray-400">{i + 10}</div>
                  ))}
                </div>
                <div className="grid grid-cols-9 gap-1">
                  {pars.slice(9).map((p, i) => (
                    <input
                      key={i + 9}
                      type="number"
                      value={p}
                      onChange={(e) => setPar(i + 9, e.target.value)}
                      min={3} max={5}
                      className="w-full text-center border-2 border-gray-300 rounded py-2 font-bold text-masters-green focus:border-masters-green focus:outline-none"
                    />
                  ))}
                </div>
                <div className="text-right text-sm text-gray-500 mt-1">IN: <strong>{backPar}</strong></div>
              </div>
            )}

            <div className="bg-masters-cream rounded-lg px-4 py-3 text-center">
              <span className="text-gray-600">Total Par: </span>
              <strong className="text-masters-green text-xl">{totalPar}</strong>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="flex-1 border-2 border-masters-green text-masters-green font-bold py-3 rounded-lg hover:bg-masters-green hover:text-white transition-colors"
              >
                ← Back
              </button>
              <button
                onClick={() => setStep(3)}
                className="flex-2 flex-grow bg-masters-green text-white font-bold py-3 rounded-lg hover:bg-masters-darkgreen transition-colors"
              >
                Next: Add Teams →
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Teams */}
        {step === 3 && (
          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 flex flex-col gap-5">
            <h2 className="text-masters-green text-xl font-bold">Step 3: Teams & PINs</h2>
            <p className="text-gray-500 text-sm">
              Each team gets a 4-digit PIN. Share the PIN privately with each team — they'll use it to enter scores.
            </p>

            <div className="flex flex-col gap-3">
              {teams.map((team, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-sm font-bold text-gray-400 w-6">{i + 1}</span>
                  <input
                    type="text"
                    value={team.name}
                    onChange={(e) => updateTeam(i, 'name', e.target.value)}
                    placeholder={`Team ${i + 1} name`}
                    className="flex-1 border-2 border-gray-300 rounded-lg px-3 py-2 focus:border-masters-green focus:outline-none"
                  />
                  <div className="flex items-center border-2 border-gray-300 rounded-lg overflow-hidden">
                    <span className="px-2 text-xs text-gray-400 bg-gray-50 border-r border-gray-300 py-2">PIN</span>
                    <input
                      type="text"
                      value={team.pin}
                      onChange={(e) => updateTeam(i, 'pin', e.target.value.replace(/\D/g, '').slice(0, 2))}
                      maxLength={4}
                      className="w-14 text-center font-bold py-2 focus:outline-none text-masters-green"
                    />
                    <button
                      onClick={() => regeneratePin(i)}
                      className="px-2 text-gray-400 hover:text-masters-green bg-gray-50 border-l border-gray-300 py-2 text-sm"
                      title="Regenerate PIN"
                    >
                      ↺
                    </button>
                  </div>
                  {teams.length > 2 && (
                    <button
                      onClick={() => removeTeam(i)}
                      className="text-gray-300 hover:text-under-par text-lg leading-none"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>

            <button
              onClick={addTeam}
              className="border-2 border-dashed border-masters-green text-masters-green font-medium py-2 rounded-lg hover:bg-masters-cream transition-colors"
            >
              + Add Team
            </button>

            {error && <p className="text-under-par text-sm">{error}</p>}

            <div className="flex gap-3">
              <button
                onClick={() => setStep(2)}
                className="flex-1 border-2 border-masters-green text-masters-green font-bold py-3 rounded-lg hover:bg-masters-green hover:text-white transition-colors"
              >
                ← Back
              </button>
              <button
                onClick={createScramble}
                disabled={saving}
                className="flex-grow bg-masters-gold text-white font-bold py-3 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {saving ? 'Creating...' : '🏌️ Create Scramble'}
              </button>
            </div>
          </div>
        )}
      </main>

      <footer className="bg-masters-green text-center py-3">
        <p className="text-masters-gold text-xs tracking-widest uppercase">ScrambleScorer</p>
      </footer>
    </div>
  )
}
