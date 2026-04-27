import { Link, useParams, useLocation } from 'react-router-dom'

const tabs = (id) => [
  { to: `/scramble/${id}/leaderboard`, label: 'Leaderboard' },
  { to: `/scramble/${id}/score`, label: 'Enter Score' },
  { to: `/scramble/${id}/scores`, label: 'All Scores' },
]

export default function Layout({ children, scrambleName }) {
  const { id } = useParams()
  const location = useLocation()

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex items-center justify-between h-14">
            <Link to="/" className="flex items-center gap-2 text-masters-green font-bold text-lg tracking-wide">
              <span>⛳</span>
              <span className="hidden sm:inline">ScrambleScorer</span>
            </Link>
            {scrambleName && (
              <span className="text-gray-400 text-sm font-medium truncate max-w-[150px] sm:max-w-xs">
                {scrambleName}
              </span>
            )}
          </div>
        </div>
        {id && (
          <div className="max-w-4xl mx-auto px-4">
            <nav className="flex">
              {tabs(id).map(({ to, label }) => {
                const active = location.pathname === to
                return (
                  <Link
                    key={to}
                    to={to}
                    className={`px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${
                      active
                        ? 'border-masters-green text-masters-green'
                        : 'border-transparent text-gray-400 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    {label}
                  </Link>
                )
              })}
            </nav>
          </div>
        )}
      </header>
      <main className="flex-1">
        {children}
      </main>
    </div>
  )
}
