import React from 'react';
import { useBijoyTyping } from './hooks/useBijoyTyping'; // Check your path

const RaceInput = () => {
  // Initialize the hook
  const { value, handleKeyDown, handleChange } = useBijoyTyping("");

  // Calculate WPM or other game logic here based on 'value'
  // const wpm = calculateWPM(value); 

  return (
    <div className="race-container" style={{ padding: '20px' }}>
      <h2>Nitro Type Clone (Bijoy Mode)</h2>
      
      <input 
        type="text"
        className="race-input"
        
        // BIND THESE TWO EVENTS
        value={value}
        onKeyDown={handleKeyDown} 
        onChange={handleChange}
        
        placeholder="Type using Bijoy layout..."
        style={{ 
            fontSize: '24px', 
            padding: '10px', 
            width: '100%',
            fontFamily: 'Kalpurush, Arial, sans-serif' // Ensure you have a Bangla font
        }}
      />
      
      <p>Debug Output: {value}</p>
    </div>
  );
};

export default RaceInput;