import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const GOLF_API_KEY = import.meta.env.VITE_GOLF_API_KEY

const API_HEADERS = { Authorization: `Key ${GOLF_API_KEY}` }

async function searchCourses(query) {
  const res = await fetch(
    `https://api.golfcourseapi.com/v1/search?search_query=${encodeURIComponent(query)}`,
    { headers: API_HEADERS }
  )
  if (!res.ok) return []
  const data = await res.json()
  return data.courses ?? []
}

async function fetchCourse(id) {
  const res = await fetch(`https://api.golfcourseapi.com/v1/courses/${id}`, { headers: API_HEADERS })
  if (!res.ok) return null
  const data = await res.json()
  return data.course ?? data
}

function pickTeeBox(tees) {
  const male = tees?.male ?? []
  const pool = male.length ? male : (tees?.female ?? [])
  if (!pool.length) return null
  const blue = pool.find(t => t.tee_name?.toLowerCase() === 'blue')
  if (blue) return blue
  return pool.reduce((best, t) => (t.total_yards > best.total_yards ? t : best), pool[0])
}

const generatePin = () => String(Math.floor(1000 + Math.random() * 9000))
const generateCode = () => Math.random().toString(36).substr(2, 6).toUpperCase()

const defaultPins = ['1111', '2222', '3333', '4444', '5555', '6666', '7777', '8888']
const defaultTeam = (index) => ({ name: '', pin: defaultPins[index] ?? generatePin() })

export default function Setup() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [scrambleName, setScrambleName] = useState('')
  const [scrambleDate, setScrambleDate] = useState(new Date().toISOString().split('T')[0])
  const [holeMode, setHoleMode] = useState('18') // '18', 'front9', 'back9'
  const [pars, setPars] = useState(Array(18).fill(4))
  const [teams, setTeams] = useState([0, 1, 2, 3].map(defaultTeam))
  const [requirePins, setRequirePins] = useState(false)
  const [courseHoles, setCourseHoles] = useState(null)

  const numHoles = holeMode === '18' ? 18 : 9
  const startingHole = holeMode === 'back9' ? 10 : 1

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

  function parsForMode(holes, mode) {
    const slice = mode === 'back9' ? holes.slice(9, 18) : mode === '18' ? holes.slice(0, 18) : holes.slice(0, 9)
    return slice.map(h => Math.max(3, Math.min(5, h.par)))
  }

  async function applyCourse(course) {
    setShowDropdown(false)
    setCourseSearching(true)
    try {
      const full = await fetchCourse(course.id)
      if (!full) throw new Error('No course data returned')
      const teeBox = pickTeeBox(full.tees)
      if (!teeBox?.holes?.length) throw new Error('No hole data for this course')
      setCourseHoles(teeBox.holes)
      setPars(parsForMode(teeBox.holes, holeMode))
      setSelectedCourse({ ...course, _tee: teeBox.tee_name })
    } catch (err) {
      setError(`Could not load course data: ${err.message}`)
    } finally {
      setCourseSearching(false)
    }
  }

  function handleHoleMode(mode) {
    setHoleMode(mode)
    if (courseHoles) {
      setPars(parsForMode(courseHoles, mode))
    } else {
      setPars(Array(mode === '18' ? 18 : 9).fill(4))
    }
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

    const holesData = pars.map((par, i) => ({ scramble_id: scramble.id, hole_number: startingHole + i, par }))
    const { error: e2 } = await supabase.from('holes').insert(holesData)
    if (e2) { setSaving(false); setError('Failed to save holes.'); return }

    const teamsData = teams.map(t => ({ scramble_id: scramble.id, name: t.name.trim(), pin: requirePins ? t.pin : null }))
    const { error: e3 } = await supabase.from('teams').insert(teamsData)
    if (e3) { setSaving(false); setError('Failed to save teams.'); return }

    setSaving(false)
    navigate(`/scramble/${scramble.id}`, { state: { code, teams: teams.map(t => ({ name: t.name, pin: requirePins ? t.pin : null })) } })
  }

  const totalPar = pars.reduce((a, b) => a + b, 0)

  return (
    <div className="min-h-screen flex flex-col">
      <header className="mg-gradient shadow-lg">
        <div className="max-w-md mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={() => step > 1 ? setStep(step - 1) : navigate('/')}
            className="text-white/70 hover:text-white text-sm font-medium transition-colors"
          >
            ← Back
          </button>
          <span className="text-white font-bold text-sm tracking-wide" style={{ fontFamily: 'Georgia, serif' }}>
            Create New Match
          </span>
          <div className="flex gap-1.5">
            {[1, 2, 3].map(s => (
              <div key={s} className={`h-1.5 w-5 rounded-full transition-all ${step >= s ? 'bg-masters-gold' : 'bg-white/30'}`} />
            ))}
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-md mx-auto w-full px-4 py-5">
        {/* Step 1: Match Details */}
        {step === 1 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex flex-col gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Match Name</label>
              <input
                type="text"
                value={scrambleName}
                onChange={(e) => setScrambleName(e.target.value)}
                placeholder="e.g. Spring Classic 2025"
                className="w-full border border-gray-200 bg-gray-50 rounded-xl px-4 py-3 focus:border-masters-green focus:outline-none text-sm"
              />
            </div>

            <div className="relative" ref={dropdownRef}>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Golf Course <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={courseQuery}
                  onChange={(e) => { setCourseQuery(e.target.value); setSelectedCourse(null); setError('') }}
                  onFocus={() => courseResults.length > 0 && setShowDropdown(true)}
                  placeholder="Search by course or club name..."
                  className="w-full border border-gray-200 bg-gray-50 rounded-xl px-4 py-3 focus:border-masters-green focus:outline-none pr-10 text-sm"
                />
                {courseSearching && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">⏳</span>
                )}
                {selectedCourse && !courseSearching && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-masters-green text-sm">✓</span>
                )}
              </div>
              {showDropdown && (
                <ul className="absolute z-10 w-full bg-white border border-masters-green rounded-xl shadow-lg mt-1 max-h-60 overflow-auto">
                  {courseResults.map(course => (
                    <li
                      key={course.id}
                      onClick={() => applyCourse(course)}
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
                  Pars loaded from {selectedCourse.club_name} ({selectedCourse._tee} tees) — edit in next step.
                </p>
              )}
              {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Date</label>
              <input
                type="date"
                value={scrambleDate}
                onChange={(e) => setScrambleDate(e.target.value)}
                className="w-full border border-gray-200 bg-gray-50 rounded-xl px-4 py-3 focus:border-masters-green focus:outline-none text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Holes</label>
              <div className="flex gap-2">
                {[['18', '18 Holes'], ['front9', 'Front 9'], ['back9', 'Back 9']].map(([mode, label]) => (
                  <button
                    key={mode}
                    onClick={() => handleHoleMode(mode)}
                    className={`flex-1 py-2.5 rounded-xl font-bold text-sm border transition-colors ${holeMode === mode
                      ? 'bg-masters-green text-white border-masters-green'
                      : 'bg-white text-masters-green border-gray-200 hover:border-masters-green'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => setStep(2)}
              disabled={!scrambleName.trim()}
              className="bg-masters-green text-white font-bold py-3 rounded-xl hover:bg-masters-darkgreen transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-1"
            >
              {selectedCourse ? 'Next: Review Hole Pars →' : 'Next: Enter Hole Pars →'}
            </button>
          </div>
        )}

        {/* Step 2: Hole Pars */}
        {step === 2 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex flex-col gap-4">
            <p className="text-gray-500 text-sm">Set the par for each hole (3, 4, or 5).</p>

            {holeMode === '18' ? (
              <>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-bold text-gray-700" style={{ fontFamily: 'Georgia, serif' }}>Front 9</h3>
                    <span className="text-gray-400 text-xs">Out: <strong className="text-gray-600">{pars.slice(0,9).reduce((a,b)=>a+b,0)}</strong></span>
                  </div>
                  <div className="overflow-x-auto">
                    <div className="grid grid-cols-9 gap-1 text-center mb-1 min-w-[270px]">
                      {pars.slice(0, 9).map((_, i) => <div key={i} className="text-xs text-gray-400">{i + 1}</div>)}
                    </div>
                    <div className="grid grid-cols-9 gap-1 min-w-[270px]">
                      {pars.slice(0, 9).map((p, i) => (
                        <input key={i} type="number" value={p} onChange={(e) => setPar(i, e.target.value)}
                          min={3} max={5} className="w-full text-center border border-gray-200 bg-gray-50 rounded-lg py-2 font-bold text-masters-green focus:border-masters-green focus:outline-none text-sm" />
                      ))}
                    </div>
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-bold text-gray-700" style={{ fontFamily: 'Georgia, serif' }}>Back 9</h3>
                    <span className="text-gray-400 text-xs">In: <strong className="text-gray-600">{pars.slice(9).reduce((a,b)=>a+b,0)}</strong></span>
                  </div>
                  <div className="overflow-x-auto">
                    <div className="grid grid-cols-9 gap-1 text-center mb-1 min-w-[270px]">
                      {pars.slice(9).map((_, i) => <div key={i} className="text-xs text-gray-400">{i + 10}</div>)}
                    </div>
                    <div className="grid grid-cols-9 gap-1 min-w-[270px]">
                      {pars.slice(9).map((p, i) => (
                        <input key={i+9} type="number" value={p} onChange={(e) => setPar(i+9, e.target.value)}
                          min={3} max={5} className="w-full text-center border border-gray-200 bg-gray-50 rounded-lg py-2 font-bold text-masters-green focus:border-masters-green focus:outline-none text-sm" />
                      ))}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div>
                <h3 className="text-sm font-bold text-gray-700 mb-2" style={{ fontFamily: 'Georgia, serif' }}>
                  {holeMode === 'back9' ? 'Back 9' : 'Front 9'}
                </h3>
                <div className="overflow-x-auto">
                  <div className="grid grid-cols-9 gap-1 text-center mb-1 min-w-[270px]">
                    {pars.map((_, i) => <div key={i} className="text-xs text-gray-400">{startingHole + i}</div>)}
                  </div>
                  <div className="grid grid-cols-9 gap-1 min-w-[270px]">
                    {pars.map((p, i) => (
                      <input key={i} type="number" value={p} onChange={(e) => setPar(i, e.target.value)}
                        min={3} max={5} className="w-full text-center border border-gray-200 bg-gray-50 rounded-lg py-2 font-bold text-masters-green focus:border-masters-green focus:outline-none text-sm" />
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="bg-gray-50 rounded-xl px-4 py-3 flex items-center justify-between border border-gray-100">
              <span className="text-gray-500 text-sm">Total Par</span>
              <strong className="text-masters-green text-xl">{totalPar}</strong>
            </div>

            <button
              onClick={() => setStep(3)}
              className="bg-masters-green text-white font-bold py-3 rounded-xl hover:bg-masters-darkgreen transition-colors"
            >
              Next: Add Teams →
            </button>
          </div>
        )}

        {/* Step 3: Teams */}
        {step === 3 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex flex-col gap-4">
            <p className="text-gray-500 text-sm">
              Enter team names. Optionally require a 4-digit PIN — share it privately so each team can enter scores.
            </p>

            <label className="flex items-center gap-3 cursor-pointer select-none">
              <div
                onClick={() => setRequirePins(v => !v)}
                className={`w-11 h-6 rounded-full transition-colors flex-shrink-0 flex items-center px-0.5 ${requirePins ? 'bg-masters-green' : 'bg-gray-300'}`}
              >
                <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${requirePins ? 'translate-x-5' : 'translate-x-0'}`} />
              </div>
              <span className="text-sm font-medium text-gray-700">Require team PINs</span>
            </label>

            <div className="flex flex-col gap-2">
              {teams.map((team, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-sm font-bold text-gray-400 w-5 flex-shrink-0">{i + 1}</span>
                  <input
                    type="text"
                    value={team.name}
                    onChange={(e) => updateTeam(i, 'name', e.target.value)}
                    placeholder={`Team ${i + 1} name`}
                    className="flex-1 border border-gray-200 bg-gray-50 rounded-xl px-3 py-2.5 focus:border-masters-green focus:outline-none text-sm"
                  />
                  {requirePins ? (
                    <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden bg-gray-50">
                      <span className="px-2 text-xs text-gray-400 border-r border-gray-200 py-2.5">PIN</span>
                      <input
                        type="text"
                        value={team.pin}
                        onChange={(e) => updateTeam(i, 'pin', e.target.value.replace(/\D/g, '').slice(0, 4))}
                        maxLength={4}
                        className="w-14 text-center font-bold py-2.5 focus:outline-none text-masters-green bg-transparent text-sm"
                      />
                      <button
                        onClick={() => regeneratePin(i)}
                        className="px-2 text-gray-400 hover:text-masters-green border-l border-gray-200 py-2.5 text-sm"
                        title="Regenerate PIN"
                      >
                        ↺
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center border border-gray-100 rounded-xl overflow-hidden bg-gray-50">
                      <span className="px-2 text-xs text-gray-300 border-r border-gray-100 py-2.5">PIN</span>
                      <span className="w-14 text-center text-gray-300 font-medium py-2.5 text-sm">N/A</span>
                    </div>
                  )}
                  {teams.length > 2 && (
                    <button
                      onClick={() => removeTeam(i)}
                      className="text-gray-300 hover:text-under-par text-lg leading-none flex-shrink-0"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>

            <button
              onClick={addTeam}
              className="border border-dashed border-masters-green text-masters-green font-medium py-2.5 rounded-xl hover:bg-masters-cream transition-colors text-sm"
            >
              + Add Team
            </button>

            {error && <p className="text-under-par text-sm">{error}</p>}

            <button
              onClick={createScramble}
              disabled={saving}
              className="bg-masters-green text-white font-bold py-3 rounded-xl hover:bg-masters-darkgreen transition-colors disabled:opacity-50 mt-1"
            >
              {saving ? 'Creating...' : '🏌️ Create Match'}
            </button>
          </div>
        )}
      </main>
    </div>
  )
}
