'use client'

import { useState } from 'react'
import { Plane, Music, Waves, Mountain, Wrench, Baby, ArrowUp, Dumbbell, Book, Map, Briefcase, Camera, Telescope, PawPrint, Bot, Bike } from 'lucide-react'
import { Navbar } from '@/components/layout'
import './PersonalGoals.css'

interface Goal {
  id: number
  text: string
  icon: React.ReactNode
  completed: boolean
}

const personalGoals: Goal[] = [
  { id: 1, text: 'Travel to the US', icon: <Plane size={18} />, completed: true },
  { id: 2, text: 'Learn to play the piano', icon: <Music size={18} />, completed: false },
  { id: 3, text: 'Learn to breathe properly while swimming', icon: <Waves size={18} />, completed: false },
  { id: 4, text: 'Learn rock climbing', icon: <Mountain size={18} />, completed: false },
  { id: 5, text: 'Ride Himalayan bike in mountains', icon: <Bike size={18} />, completed: false },
  { id: 6, text: 'Build a home-bot for managing contacts', icon: <Wrench size={18} />, completed: true },
  { id: 7, text: 'Make CASE (my mini-bot) water plants', icon: <Bot size={18} />, completed: false },
  { id: 8, text: 'Have a child', icon: <Baby size={18} />, completed: false },
  { id: 9, text: 'Learn to do a handstand', icon: <ArrowUp size={18} />, completed: false },
  { id: 10, text: 'Be able to do at least 10 pull-ups', icon: <Dumbbell size={18} />, completed: false },
  { id: 11, text: 'Create a structured open work log', icon: <Book size={18} />, completed: false },
  { id: 12, text: 'Contribute to at least one OpenStreetMap project', icon: <Map size={18} />, completed: false },
  { id: 13, text: 'Travel solo to Europe', icon: <Briefcase size={18} />, completed: false },
  { id: 14, text: 'Learn astrophotography', icon: <Camera size={18} />, completed: false },
  { id: 15, text: 'Organize structured astronomy sessions', icon: <Telescope size={18} />, completed: false },
  { id: 16, text: 'Trek with Tars', icon: <PawPrint size={18} />, completed: false },
]

export default function PersonalGoalsPage() {
  const [currentPage, setCurrentPage] = useState(1)
  const goalsPerPage = 10

  const totalPages = Math.ceil(personalGoals.length / goalsPerPage)
  const indexOfLastGoal = currentPage * goalsPerPage
  const indexOfFirstGoal = indexOfLastGoal - goalsPerPage
  const currentGoals = personalGoals.slice(indexOfFirstGoal, indexOfLastGoal)

  const doneCount = personalGoals.filter(g => g.completed).length

  return (
    <div className="rv rv-page rv-goals">
      <Navbar />
      <div className="rv-pageWrap">
        <div className="rv-pageCol">
          <div className="rv-pageHead">
            <div>
              <div className="rv-label rv-kicker">Goals &middot; <b>{doneCount}/{personalGoals.length} done</b></div>
              <h1 className="rv-pageTitle">Personal Goals</h1>
            </div>
            {totalPages > 1 && (
              <div className="rv-pageNums" role="group" aria-label="Pages">
                {Array.from({ length: totalPages }, (_, index) => (
                  <button
                    key={index + 1}
                    className={currentPage === index + 1 ? 'on' : ''}
                    aria-pressed={currentPage === index + 1}
                    onClick={() => setCurrentPage(index + 1)}
                  >
                    {index + 1}
                  </button>
                ))}
              </div>
            )}
          </div>
          <hr className="rv-titleRule" />

          <ul className="rv-goalList">
            {currentGoals.map((goal) => (
              <li key={goal.id} className={`rv-goal${goal.completed ? ' done' : ''}`}>
                <span className="rv-goalIcon" aria-hidden="true">{goal.icon}</span>
                <span className="rv-goalText">{goal.text}</span>
                {goal.completed && (
                  <span className="rv-goalDone" aria-label="Done">
                    <svg viewBox="0 0 16 16" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3.5 8.5l3 3 6-7" /></svg>
                    Done
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
