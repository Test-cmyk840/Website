import React, { useState } from 'react';
import './Lookbook.css';

// Import your exact image files
import look1 from './lookbook/Blue lake.webp';
import look2 from './lookbook/Endless knot.webp';
import look3 from './lookbook/IMG_7582.webp';
import look4 from './lookbook/gurash.webp';
import look5 from './lookbook/torquoise.webp';

// Add them to the slideshow array in the order you want them to appear
const IMAGES = [look1, look2, look3, look4, look5];

export default function Lookbook({ onClose }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev === IMAGES.length - 1 ? 0 : prev + 1));
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev === 0 ? IMAGES.length - 1 : prev - 1));
  };

  return (
    <div className="lookbook-overlay" onClick={onClose}>
      <div className="lookbook-container" onClick={(e) => e.stopPropagation()}>
        
        <button className="lookbook-close" onClick={onClose}>✕</button>

        <div className="lookbook-slideshow">
          <button className="lookbook-arrow left" onClick={prevSlide}>←</button>
          
          <img 
            src={IMAGES[currentIndex]} 
            alt={`Lookbook ${currentIndex + 1}`} 
            className="lookbook-image"
          />
          
          <button className="lookbook-arrow right" onClick={nextSlide}>→</button>
        </div>

        <div className="lookbook-dots">
          {IMAGES.map((_, index) => (
            <span 
              key={index} 
              className={`dot ${index === currentIndex ? 'active' : ''}`}
              onClick={() => setCurrentIndex(index)}
            />
          ))}
        </div>

      </div>
    </div>
  );
}
