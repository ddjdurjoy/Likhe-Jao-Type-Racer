// src/utils/BijoyEngine.js - COMPLETE BIJOY LOGIC (Kar, Conjunct, Vowel, and Ref/Reph)

// --- CHARACTER MAPPINGS ---
const bijoyMap = {
  // Single Key Mappings
  "0":"০", "1":"১", "2":"২", "3":"৩", "4":"৪", "5":"৫", "6":"৬", "7":"৭", "8":"৮", "9":"৯",
  "a":"ৃ", "A":"র্", // <-- 'A' is Ref/Reph 'র্'
  "d":"ি", "D":"ী", "s":"ু", "S":"ূ", "f":"া", "F":"অ", "g":"্", // <-- 'g' is Halant '্'
  "G":"।", "h":"ব", "H":"ভ", "j":"ক", "J":"খ", "k":"ত", "K":"থ", "l":"দ", "L":"ধ", "z":"্র", "Z":"্য",
  "x":"ও", "X":"ৗ", "c":"ে", "C":"ৈ", "v":"র", "V":"ল", "b":"ন", "B":"ণ", "n":"স", "N":"ষ",
  "m":"ম", "M":"শ", "q":"ঙ", "Q":"ং", "w":"য", "W":"য়", "e":"ড", "E":"ঢ", "r":"প", "R":"ফ",
  "t":"ট", "T":"ঠ", "y":"চ", "Y":"ছ", "u":"জ", "U":"ঝ", "i":"হ", "I":"ঞ", "o":"গ", "O":"ঘ",
  "p":"ড়", "P":"ঢ়", "&":"ঁ", "$":"৳", "`":"\u200C", "~":"\u200D", "\\":"ৎ", "|":"ঃ",

  // Two-Key Vowel Sequences (g + key) - For Standalone Vowels
  "gf":"আ", "gd":"ই", "gD":"ঈ", "gs":"উ", "gS":"ঊ", "ga":"ঋ", "gc":"এ", "gC":"ঐ", "gx":"ও", "gX":"ঔ" 
};

// --- HELPER CONSTANTS & FUNCTIONS ---
const isBanglaPreKar = (char) => ['ি', 'ৈ', 'ে'].includes(char);
const isBanglaHalant = (char) => char === '্';
const VOWEL_KEY_PREFIX = 'g'; // The trigger key for full vowels

// All Bengali consonants (used to determine if 'g' should insert a Halant or 'A' should reverse swap)
const BENGALI_CONSONANTS = ['ক', 'খ', 'গ', 'ঘ', 'ঙ', 'চ', 'ছ', 'জ', 'ঝ', 'ঞ', 'ট', 'ঠ', 'ড', 'ঢ', 'ণ', 'ত', 'থ', 'দ', 'ধ', 'ন', 'প', 'ফ', 'ব', 'ভ', 'ম', 'য', 'র', 'ল', 'শ', 'ষ', 'স', 'হ', 'ড়', 'ঢ়', 'য়', 'ৎ'];
const isBengaliConsonantUni = (char) => BENGALI_CONSONANTS.includes(char);


export class BijoyProcessor {
  constructor() {
    this.lastCharUni = ""; 
    this.lastKar = "";     
    this.vowelSequenceKey = null; // State for 'g' prefix when typing full vowels
  }

  reset() {
    this.lastCharUni = "";
    this.lastKar = "";
    this.vowelSequenceKey = null; 
  }

  handleKeystroke(key, currentText, cursorPosition) {
    let charToInsert = null;

    // --- 1. Vowel Sequence Check (Second key in sequence) ---
    if (this.vowelSequenceKey === VOWEL_KEY_PREFIX) {
        const sequence = this.vowelSequenceKey + key;
        charToInsert = bijoyMap[sequence];
        this.vowelSequenceKey = null;

        if (charToInsert) {
            const textBefore = currentText.slice(0, cursorPosition);
            const textAfter = currentText.slice(cursorPosition);
            
            let newText = textBefore + charToInsert + textAfter;
            let newCursor = cursorPosition + charToInsert.length;
            
            this.lastCharUni = charToInsert; 
            this.lastKar = ""; 
            
            return { updatedText: newText, updatedCursor: newCursor };
        }
    }
    
    // --- 2. Halant/Vowel Sequence Prefix Check (Key: 'g') ---
    if (key === VOWEL_KEY_PREFIX) {
        
        // Decide if 'g' is Halant (Conjunct mode) or Prefix (Vowel mode)
        if (isBengaliConsonantUni(this.lastCharUni)) {
            // SCENARIO A: Conjunct Mode (A consonant was typed last -> insert Halant '্')
            const halantChar = bijoyMap[key]; 
            const textBefore = currentText.slice(0, cursorPosition);
            const textAfter = currentText.slice(cursorPosition);
            
            const newText = textBefore + halantChar + textAfter;
            const newCursor = cursorPosition + halantChar.length;

            this.lastCharUni = halantChar;
            this.lastKar = "";
            this.vowelSequenceKey = null; 

            return { updatedText: newText, updatedCursor: newCursor };

        } else {
            // SCENARIO B: Full Vowel Mode (No consonant before 'g' -> wait for second key)
            this.vowelSequenceKey = key; 
            return { updatedText: currentText, updatedCursor: cursorPosition }; 
        }
    }

    // --- 3. ORIGINAL LOGIC (Single Key / Kar-Vowel Logic) ---

    charToInsert = bijoyMap[key];

    // If key not mapped, reset state and let default behavior happen
    if (!charToInsert) {
      this.reset();
      return null; 
    }

    let newText = currentText;
    let newCursor = cursorPosition;
    
    // Check if the character is Ref/Reph ('র্')
    if (charToInsert === 'র্') {
        const lastCharIndex = cursorPosition - 1;
        const lastChar = currentText.slice(lastCharIndex, cursorPosition);

        if (isBengaliConsonantUni(lastChar)) {
            // SCENARIO C: Ref/Reph Swap (Consonant + 'A'(র্) -> র্ + Consonant)
            
            // 1. Remove the last character (the consonant)
            const textBeforeConsonant = currentText.slice(0, lastCharIndex);
            const textAfter = currentText.slice(cursorPosition);
            
            // 2. Insert Ref/Reph + Consonant (Unicode order)
            const combinedChar = charToInsert + lastChar; 
            
            newText = textBeforeConsonant + combinedChar + textAfter;
            newCursor = textBeforeConsonant.length + combinedChar.length;

            this.lastCharUni = combinedChar;
            this.lastKar = "";
            this.vowelSequenceKey = null;

            return { updatedText: newText, updatedCursor: newCursor };
        }
    }

    // Handle Vowel Re-ordering (Pre-Kar swap: 'ি' + 'ক' becomes 'কি')
    if (this.lastKar && isBanglaPreKar(this.lastKar) && this.lastKar === this.lastCharUni) {
        
        const textBefore = currentText.slice(0, cursorPosition - 1); 
        const textAfter = currentText.slice(cursorPosition);
        
        // Combine: Consonant first + Pre-Kar second (Unicode order)
        charToInsert = charToInsert + this.lastKar;
        
        newText = textBefore + charToInsert + textAfter;
        newCursor = textBefore.length + charToInsert.length;
        
        this.lastKar = ""; 
    } 
    // Handle Simple Insertion
    else {
        const textBefore = currentText.slice(0, cursorPosition);
        const textAfter = currentText.slice(cursorPosition);
        
        newText = textBefore + charToInsert + textAfter;
        newCursor = cursorPosition + charToInsert.length;
    }

    // --- UPDATE STATE FOR NEXT KEYSTROKE ---
    // If this character is a Pre-Kar, remember it
    if (!isBanglaHalant(this.lastCharUni) && isBanglaPreKar(charToInsert)) {
      this.lastKar = charToInsert;
    } else {
      this.lastKar = ""; 
    }
    
    this.lastCharUni = charToInsert;
    this.vowelSequenceKey = null; 

    return {
      updatedText: newText,
      updatedCursor: newCursor
    };
  }
}