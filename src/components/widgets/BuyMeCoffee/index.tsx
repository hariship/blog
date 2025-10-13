import React, { useState } from 'react';
import { useSounds } from '../../../contexts/SoundContext';
import { BiCoffeeTogo, BiDollar, BiCalendar, BiChat, BiGlobe } from 'react-icons/bi';
import ThemeToggle from '../../common/ThemeToggle';
import './BuyMeCoffee.css';

type ViewMode = 'menu' | 'payment' | 'calendar';

const BuyMeCoffee: React.FC = () => {
  const [showModal, setShowModal] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('menu');
  const { playButtonSound } = useSounds();

  const handleOpenModal = () => {
    playButtonSound();
    setShowModal(true);
    setViewMode('menu');
  };

  const handleCloseModal = () => {
    playButtonSound();
    setShowModal(false);
    setViewMode('menu');
  };

  const handleViewChange = (mode: ViewMode) => {
    playButtonSound();
    setViewMode(mode);
  };

  const handleScheduleChat = () => {
    playButtonSound();
    // Google Calendar event creation URL
    const title = encodeURIComponent('Coffee Chat with Hari');
    const details = encodeURIComponent('Virtual coffee chat to discuss ideas, collaborate, or have a friendly conversation.\n\nMeeting link will be shared via email: mailtoharipriyas@gmail.com');
    const duration = '30'; // 30 minutes

    // Google Calendar URL format
    const calendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${details}&add=mailtoharipriyas@gmail.com`;

    window.open(calendarUrl, '_blank');
  };

  return (
    <>
      <button
        onClick={handleOpenModal}
        className="buy-me-coffee-button"
        title="Coffee with Hari"
      >
        <BiCoffeeTogo className="coffee-icon" />
      </button>

      {showModal && (
        <div className="coffee-modal-overlay" onClick={handleCloseModal}>
          <div className="coffee-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="coffee-modal-header-controls">
              <ThemeToggle />
              <button className="coffee-modal-close" onClick={handleCloseModal}>
                ✕
              </button>
            </div>

            {viewMode === 'menu' && (
              <div className="coffee-menu">
                <div className="coffee-menu-header">
                  <BiCoffeeTogo className="coffee-menu-icon" />
                  <h3 className="coffee-modal-title">Coffee with Hari</h3>
                  <p className="coffee-modal-description">
                    Support me or let's have a chat!
                  </p>
                </div>

                <div className="coffee-options">
                  <button
                    className="coffee-option-card"
                    onClick={() => handleViewChange('payment')}
                  >
                    <h4 className="coffee-option-title">
                      <BiDollar className="coffee-option-icon-inline" /> Buy me a coffee
                    </h4>
                    <p className="coffee-option-description">
                      Support my work with a small donation
                    </p>
                    <div className="coffee-option-arrow">→</div>
                  </button>

                  <button
                    className="coffee-option-card"
                    onClick={() => handleViewChange('calendar')}
                  >
                    <h4 className="coffee-option-title">
                      <BiCalendar className="coffee-option-icon-inline" /> Have a chat
                    </h4>
                    <p className="coffee-option-description">
                      Let's grab a virtual coffee and talk
                    </p>
                    <div className="coffee-option-arrow">→</div>
                  </button>
                </div>
              </div>
            )}

            {viewMode === 'payment' && (
              <div className="coffee-payment-view">
                <button
                  className="coffee-back-button"
                  onClick={() => handleViewChange('menu')}
                >
                  ← Back
                </button>
                <h3 className="coffee-modal-title">Buy me a coffee</h3>
                <p className="coffee-modal-description">
                  Scan the QR code to support me
                </p>
                <div className="coffee-qr-container">
                  <img
                    src="/coffee-qr.png"
                    alt="Payment QR Code"
                    className="coffee-qr-image"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      const fallback = document.getElementById('coffee-fallback');
                      if (fallback) fallback.style.display = 'block';
                    }}
                  />
                  <div id="coffee-fallback" className="coffee-fallback">
                    <p>QR code not available yet</p>
                    <p className="coffee-fallback-text">Add your payment QR code as <code>/public/coffee-qr.png</code></p>
                  </div>
                </div>
                <p className="coffee-scan-text">Thank you for your support! 💛</p>
              </div>
            )}

            {viewMode === 'calendar' && (
              <div className="coffee-calendar-view">
                <button
                  className="coffee-back-button"
                  onClick={() => handleViewChange('menu')}
                >
                  ← Back
                </button>
                <BiCalendar className="coffee-calendar-icon" />
                <h3 className="coffee-modal-title">Schedule a Coffee Chat</h3>
                <p className="coffee-modal-description">
                  <BiChat className="coffee-desc-icon" /> Virtual meeting · <BiGlobe className="coffee-desc-icon" /> Your preferred time
                </p>
                <button
                  className="coffee-schedule-button"
                  onClick={handleScheduleChat}
                >
                  <BiCalendar />
                  <span>Add to Google Calendar</span>
                </button>
                <p className="coffee-email-hint">
                  mailtoharipriyas@gmail.com
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default BuyMeCoffee;
