import { HashRouter, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Setup from './pages/Setup'
import ScramblePage from './pages/ScramblePage'
import ScoreEntry from './pages/ScoreEntry'
import Leaderboard from './pages/Leaderboard'
import AllScores from './pages/AllScores'

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/setup" element={<Setup />} />
        <Route path="/scramble/:id" element={<ScramblePage />} />
        <Route path="/scramble/:id/score" element={<ScoreEntry />} />
        <Route path="/scramble/:id/leaderboard" element={<Leaderboard />} />
        <Route path="/scramble/:id/scores" element={<AllScores />} />
      </Routes>
    </HashRouter>
  )
}
