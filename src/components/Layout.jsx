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
      <header className="mg-gradient shadow-lg">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex items-center justify-between h-14">
            <Link
              to="/"
              className="flex items-center gap-2 text-masters-gold font-bold text-lg tracking-wide"
              style={{ fontFamily: 'Georgia, serif' }}
            >
              <span>⛳</span>
              <span className="hidden sm:inline">ScrambleScorer</span>
            </Link>
            {scrambleName && (
              <span className="text-white/60 text-sm font-medium truncate max-w-[150px] sm:max-w-xs">
                {scrambleName}
              </span>
            )}
          </div>
        </div>
        {id && (
          <div className="max-w-4xl mx-auto px-4 border-t border-white/10">
            <nav className="flex">
              {tabs(id).map(({ to, label }) => {
                const active = location.pathname === to
                return (
                  <Link
                    key={to}
                    to={to}
                    className={`flex-1 text-center py-3 text-sm font-semibold border-b-2 transition-colors ${
                      active
                        ? 'border-masters-gold text-masters-gold'
                        : 'border-transparent text-white/50 hover:text-white hover:border-white/30'
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
