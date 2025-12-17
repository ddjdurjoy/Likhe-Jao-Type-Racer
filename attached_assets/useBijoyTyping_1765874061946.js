// src/hooks/useBijoyTyping.js
import { useState, useRef } from 'react';
import { BijoyProcessor } from '../utils/BijoyEngine'; // Adjust path if needed

export const useBijoyTyping = (initialValue = "") => {
  const [value, setValue] = useState(initialValue);
  // We use useRef so the processor persists between renders without causing re-renders itself
  const processor = useRef(new BijoyProcessor());

  const handleKeyDown = (e) => {
    const key = e.key;

    // 1. Handle Reset Keys (Space, Enter, Backspace)
    // We must reset the "Pre-Kar" memory if the user deletes or spaces out.
    if (key === 'Backspace' || key === ' ' || key === 'Enter') {
      processor.current.reset();
      return; // Allow default behavior
    }

    // 2. Ignore non-character keys (Control, Alt, Arrows, etc.)
    if (key.length > 1 || e.ctrlKey || e.altKey || e.metaKey) return;

    // 3. Pass data to the Engine
    const cursorStart = e.target.selectionStart;
    const result = processor.current.handleKeystroke(key, value, cursorStart);

    // 4. Apply the result
    if (result) {
      e.preventDefault(); // STOP the English letter from appearing
      setValue(result.updatedText);
      
      // We must manually move the cursor to the correct position
      // We use setTimeout(0) to ensure this runs after React updates the DOM value
      setTimeout(() => {
        if(e.target) {
            e.target.selectionStart = result.updatedCursor;
            e.target.selectionEnd = result.updatedCursor;
        }
      }, 0);
    }
  };

  // Standard change handler for things like pasting text
  const handleChange = (e) => {
    setValue(e.target.value);
  };

  return {
    value,
    setValue,
    handleKeyDown,
    handleChange
  };
};