import React, { useState } from "react";
import { Plane, Music, Waves, Mountain, Wrench, Baby, ArrowUp, Dumbbell, Book, Map, Briefcase, Camera, Telescope, PawPrint, Bot, Bike } from "lucide-react";
import "./PersonalGoals.css";
import { Goal } from '../../../types';

const personalGoals: Goal[] = [
  { id: 1, text: "Travel to the US", icon: <Plane size={20} />, completed: true },
  { id: 2, text: "Learn to play the piano", icon: <Music size={20} />, completed: false },
  { id: 3, text: "Learn to breathe properly while swimming", icon: <Waves size={20} />, completed: false },
  { id: 4, text: "Learn rock climbing", icon: <Mountain size={20} />, completed: false },
  { id: 5, text: "Ride Himalayan bike in mountains", icon: <Bike size={20} />, completed: false },
  { id: 6, text: "Build a home-bot for managing contacts", icon: <Wrench size={20} />, completed: true },
  { id: 7, text: "Make CASE (my mini-bot) water plants", icon: <Bot size={20} />, completed: false },
  { id: 8, text: "Have a child", icon: <Baby size={20} />, completed: false },
  { id: 9, text: "Learn to do a handstand", icon: <ArrowUp size={20} />, completed: false },
  { id: 10, text: "Be able to do at least 10 pull-ups", icon: <Dumbbell size={20} />, completed: false },
  { id: 11, text: "Create a structured open work log", icon: <Book size={20} />, completed: false },
  { id: 12, text: "Contribute to at least one OpenStreetMap project", icon: <Map size={20} />, completed: false },
  { id: 13, text: "Travel solo to Europe", icon: <Briefcase size={20} />, completed: false },
  { id: 14, text: "Learn astrophotography", icon: <Camera size={20} />, completed: false },
  { id: 15, text: "Organize structured astronomy sessions", icon: <Telescope size={20} />, completed: false },
  { id: 16, text: "Trek with Tars", icon: <PawPrint size={20} />, completed: false },
];

const PersonalGoals: React.FC = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const goalsPerPage = 10;

  const totalPages = Math.ceil(personalGoals.length / goalsPerPage);
  const indexOfLastGoal = currentPage * goalsPerPage;
  const indexOfFirstGoal = indexOfLastGoal - goalsPerPage;
  const currentGoals = personalGoals.slice(indexOfFirstGoal, indexOfLastGoal);

  return (
    <div className="container">
      <div className="header">
        <h2 className="title">Personal Goals</h2>
        <div className="pagination">
          {Array.from({ length: totalPages }, (_, index) => (
            <button
              key={index + 1}
              className={`page-button ${currentPage === index + 1 ? "active" : ""}`}
              onClick={() => setCurrentPage(index + 1)}
            >
              {index + 1}
            </button>
          ))}
        </div>
      </div>

      {currentGoals.map((goal) => (
        <div key={goal.id} className="post-card">
          <span className={`goal-text ${goal.completed ? "completed" : ""}`}>
            {goal.icon} {goal.text}
          </span>
          {goal.completed && <span className="checkmark">✔️</span>}
        </div>
      ))}
    </div>
  );
};

export default PersonalGoals;