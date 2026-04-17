import { Link, useParams, useLocation } from 'react-router-dom'

export default function Layout({ children, scrambleName }) {
  const { id } = useParams()
  const location = useLocation()

  const isActive = (path) => location.pathname === path
    ? 'bg-masters-darkgreen text-masters-gold'
    : 'text-white hover:bg-masters-darkgreen hover:text-masters-gold transition-colors'

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-masters-green shadow-lg">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex items-center justify-between py-3">
            <Link to="/" className="flex items-center gap-2 text-masters-gold font-bold text-lg tracking-wide">
              <span className="text-2xl">⛳</span>
              <span className="hidden sm:inline">ScrambleScorer</span>
            </Link>
            {scrambleName && (
              <span className="text-white text-sm font-medium truncate max-w-[140px] sm:max-w-xs text-center">
                {scrambleName}
              </span>
            )}
          </div>
          {id && (
            <nav className="flex border-t border-masters-darkgreen">
              <Link
                to={`/scramble/${id}/leaderboard`}
                className={`flex-1 text-center py-2 text-sm font-medium ${isActive(`/scramble/${id}/leaderboard`)}`}
              >
                Leaderboard
              </Link>
              <Link
                to={`/scramble/${id}/score`}
                className={`flex-1 text-center py-2 text-sm font-medium ${isActive(`/scramble/${id}/score`)}`}
              >
                Enter Score
              </Link>
              <Link
                to={`/scramble/${id}/scores`}
                className={`flex-1 text-center py-2 text-sm font-medium ${isActive(`/scramble/${id}/scores`)}`}
              >
                All Scores
              </Link>
            </nav>
          )}
        </div>
      </header>
      <main className="flex-1">
        {children}
      </main>
      <footer className="bg-masters-green text-center py-3">
        <p className="text-masters-gold text-xs tracking-widest uppercase">ScrambleScorer</p>
      </footer>
    </div>
  )
}
