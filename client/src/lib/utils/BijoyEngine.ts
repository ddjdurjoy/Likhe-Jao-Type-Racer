const bijoyMap: Record<string, string> = {
  "0": "০", "1": "১", "2": "২", "3": "৩", "4": "৪", "5": "৫", "6": "৬", "7": "৭", "8": "৮", "9": "৯",
  "a": "ৃ", "A": "র্",
  "d": "ি", "D": "ী", "s": "ু", "S": "ূ", "f": "া", "F": "অ", "g": "্",
  "G": "।", "h": "ব", "H": "ভ", "j": "ক", "J": "খ", "k": "ত", "K": "থ", "l": "দ", "L": "ধ", "z": "্র", "Z": "্য",
  "x": "ও", "X": "ৗ", "c": "ে", "C": "ৈ", "v": "র", "V": "ল", "b": "ন", "B": "ণ", "n": "স", "N": "ষ",
  "m": "ম", "M": "শ", "q": "ঙ", "Q": "ং", "w": "য", "W": "য়", "e": "ড", "E": "ঢ", "r": "প", "R": "ফ",
  "t": "ট", "T": "ঠ", "y": "চ", "Y": "ছ", "u": "জ", "U": "ঝ", "i": "হ", "I": "ঞ", "o": "গ", "O": "ঘ",
  "p": "ড়", "P": "ঢ়", "&": "ঁ", "$": "৳", "`": "\u200C", "~": "\u200D", "\\": "ৎ", "|": "ঃ",
  "gf": "আ", "gd": "ই", "gD": "ঈ", "gs": "উ", "gS": "ঊ", "ga": "ঋ", "gc": "এ", "gC": "ঐ", "gx": "ও", "gX": "ঔ"
};

const isBanglaPreKar = (char: string): boolean => ["ি", "ৈ", "ে"].includes(char);
const isBanglaHalant = (char: string): boolean => char === "্";
const VOWEL_KEY_PREFIX = "g";

const BENGALI_CONSONANTS = [
  "ক", "খ", "গ", "ঘ", "ঙ", "চ", "ছ", "জ", "ঝ", "ঞ", "ট", "ঠ", "ড", "ঢ", "ণ",
  "ত", "থ", "দ", "ধ", "ন", "প", "ফ", "ব", "ভ", "ম", "য", "র", "ল", "শ", "ষ",
  "স", "হ", "ড়", "ঢ়", "য়", "ৎ"
];

const isBengaliConsonantUni = (char: string): boolean => BENGALI_CONSONANTS.includes(char);

interface ProcessResult {
  updatedText: string;
  updatedCursor: number;
}

export class BijoyProcessor {
  private lastCharUni: string = "";
  private lastKar: string = "";
  private vowelSequenceKey: string | null = null;

  reset(): void {
    this.lastCharUni = "";
    this.lastKar = "";
    this.vowelSequenceKey = null;
  }

  handleKeystroke(key: string, currentText: string, cursorPosition: number): ProcessResult | null {
    let charToInsert: string | undefined;

    if (this.vowelSequenceKey === VOWEL_KEY_PREFIX) {
      const sequence = this.vowelSequenceKey + key;
      charToInsert = bijoyMap[sequence];
      this.vowelSequenceKey = null;

      if (charToInsert) {
        const textBefore = currentText.slice(0, cursorPosition);
        const textAfter = currentText.slice(cursorPosition);

        const newText = textBefore + charToInsert + textAfter;
        const newCursor = cursorPosition + charToInsert.length;

        this.lastCharUni = charToInsert;
        this.lastKar = "";

        return { updatedText: newText, updatedCursor: newCursor };
      }
    }

    if (key === VOWEL_KEY_PREFIX) {
      if (isBengaliConsonantUni(this.lastCharUni)) {
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
        this.vowelSequenceKey = key;
        return { updatedText: currentText, updatedCursor: cursorPosition };
      }
    }

    charToInsert = bijoyMap[key];

    if (!charToInsert) {
      this.reset();
      return null;
    }

    let newText = currentText;
    let newCursor = cursorPosition;

    if (charToInsert === "র্") {
      const lastCharIndex = cursorPosition - 1;
      const lastChar = currentText.slice(lastCharIndex, cursorPosition);

      if (isBengaliConsonantUni(lastChar)) {
        const textBeforeConsonant = currentText.slice(0, lastCharIndex);
        const textAfter = currentText.slice(cursorPosition);

        const combinedChar = charToInsert + lastChar;

        newText = textBeforeConsonant + combinedChar + textAfter;
        newCursor = textBeforeConsonant.length + combinedChar.length;

        this.lastCharUni = combinedChar;
        this.lastKar = "";
        this.vowelSequenceKey = null;

        return { updatedText: newText, updatedCursor: newCursor };
      }
    }

    if (this.lastKar && isBanglaPreKar(this.lastKar) && this.lastKar === this.lastCharUni) {
      const textBefore = currentText.slice(0, cursorPosition - 1);
      const textAfter = currentText.slice(cursorPosition);

      charToInsert = charToInsert + this.lastKar;

      newText = textBefore + charToInsert + textAfter;
      newCursor = textBefore.length + charToInsert.length;

      this.lastKar = "";
    } else {
      const textBefore = currentText.slice(0, cursorPosition);
      const textAfter = currentText.slice(cursorPosition);

      newText = textBefore + charToInsert + textAfter;
      newCursor = cursorPosition + charToInsert.length;
    }

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

export const bijoyProcessor = new BijoyProcessor();
