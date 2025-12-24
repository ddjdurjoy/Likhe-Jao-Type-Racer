export type TextCategory = "story" | "biography" | "news" | "article" | "poem";

// NOTE: Keep these fairly short for now. We can expand later or load from server.
// Texts should be plain Unicode and may include punctuation.
export const englishTexts: Record<TextCategory, string[]> = {
  story: [
    "Once upon a time, a young student in Dhaka decided to practice typing every day. With patience and focus, speed became a habit.",
    "The rain started softly, then turned into a steady rhythm on the roof. Inside the room, the keyboard clicked like a metronome.",
    "On a quiet morning, she opened her laptop, took a deep breath, and began to type without looking at the keys.",
    "He missed a few letters at first, but he kept going. The screen did not judge, and practice did not stop.",
    "A small café near the river became his study place. Between sips of tea, he wrote sentences again and again.",
    "The power went out, so they practiced offline. When the lights returned, their fingers felt faster than before.",
    "She learned to type like she learned to ride a bicycle: slowly at first, then smoothly, without fear.",
    "In the evening, the city noise faded. Only the fan and the keyboard remained, steady and calm.",
    "He challenged his friends to improve together. Every week, they compared progress and celebrated small wins.",
    "A new paragraph appeared, and with it a new rhythm. The goal was not perfection, but consistency.",
  ],
  biography: [
    "Kazi Nazrul Islam was a Bengali poet, writer, and musician. His works inspired people with themes of freedom, humanity, and resistance.",
    "Begum Rokeya was a pioneer of women's education in Bengal. She wrote essays and stories that challenged social barriers.",
    "Rabindranath Tagore was a poet, composer, and thinker. His writing shaped culture across Bengal and beyond.",
    "Sheikh Mujibur Rahman is remembered as a key leader in Bangladesh's history. His speeches and actions inspired a nation.",
    "Michael Madhusudan Dutt introduced new styles to Bengali poetry. His creative work influenced generations of writers.",
    "Satyajit Ray was a filmmaker and writer known for careful storytelling. His work is celebrated around the world.",
    "Humayun Ahmed wrote popular novels and screenplays. Many readers began reading regularly because of his simple style.",
    "Jagdish Chandra Bose was a scientist and educator. His experiments showed curiosity, patience, and discipline.",
    "Maryam Mirzakhani inspired students by showing that deep thinking can be beautiful. Her journey reminds us to persist.",
    "Nelson Mandela spent years in prison but never gave up on justice. His life teaches courage and forgiveness.",
  ],
  news: [
    "The city authorities announced new traffic measures today to reduce congestion during peak hours. Commuters are advised to plan ahead.",
    "Meteorologists said the weather will remain warm with scattered showers in several districts. Farmers welcomed the possibility of rain.",
    "A new bridge opened this morning, shortening travel time for thousands of people. Officials said safety checks were completed.",
    "Local schools started a reading campaign to improve literacy. Teachers reported strong participation from students.",
    "Health experts reminded citizens to drink enough water during hot days. Hospitals have increased emergency preparedness.",
    "A technology fair showcased student projects, from small robots to mobile apps. Visitors praised the creativity.",
    "Authorities announced changes to bus routes to improve service. Passengers are asked to check updated schedules.",
    "A clean-up drive was held near the canal to reduce plastic waste. Volunteers said the community response was encouraging.",
    "Sports fans gathered downtown to celebrate a historic win. Police said the event remained peaceful.",
    "Market prices remained stable this week, according to traders. Consumers said they hope the trend continues.",
  ],
  article: [
    "Good typing is not only about speed; it is about rhythm, accuracy, and comfort. Keep your wrists relaxed and your eyes on the text.",
    "To build consistency, practice for short sessions every day. Track progress, rest when tired, and increase difficulty gradually.",
    "A comfortable posture matters. Sit upright, keep your shoulders relaxed, and position the keyboard so your hands feel natural.",
    "Accuracy comes before speed. Slow down, reduce mistakes, and speed will follow as your muscle memory improves.",
    "Use all fingers and avoid hunting for keys. Touch typing reduces stress and makes long sessions easier.",
    "Take breaks. A short pause prevents fatigue and helps you return with better focus.",
    "Practice with real sentences. Natural language teaches punctuation, spacing, and rhythm better than isolated words.",
    "Consistency means repeating good form. Even five minutes daily can beat one long session per week.",
    "If you make errors, do not panic. Stay calm, keep the flow, and let the results guide your next session.",
    "Set a small goal: one improvement at a time. Measure progress by accuracy, comfort, and steady speed.",
  ],
  poem: [
    "I carry quiet strength in every line, and in every pause I learn to breathe again.",
    "Let the words flow like rivers wide, and let the mind stay calm inside.",
    "A gentle rhythm, key by key, turns scattered thoughts to harmony.",
    "In the space between mistakes, I find the courage to continue.",
    "Night is silent, screens are bright; practice turns the dark to light.",
    "Hold the pace, keep it true, let patience guide what you can do.",
    "A sentence ends, another starts; steady hands and steady hearts.",
    "Like rain on leaves, the clicks repeat; a calm routine, a quiet beat.",
    "When words arrive, do not rush; let accuracy lead the push.",
    "Today I type, tomorrow more; each line opens one more door.",
  ],
};

export const banglaTexts: Record<TextCategory, string[]> = {
  story: [
    "একদিন ঢাকার এক শিক্ষার্থী ঠিক করল, প্রতিদিন নিয়ম করে টাইপিং অনুশীলন করবে। ধৈর্য আর মনোযোগে ধীরে ধীরে গতি বেড়ে গেল।",
    "বাইরে বৃষ্টি পড়ছিল টুপটাপ করে। ঘরের ভেতরে কিবোর্ডের শব্দ যেন তাল মিলিয়ে চলছিল।",
    "সকালের নরম আলোতে সে কিবোর্ডের সামনে বসে পড়ল। আজ লক্ষ্য একটাই—নির্ভুলভাবে টাইপ করা।",
    "প্রথমে হাত কাঁপছিল, কিন্তু কয়েক মিনিট পর ছন্দ তৈরি হলো। ভুল কমতে শুরু করল।",
    "ছোট্ট একটা লক্ষ্য লিখে রাখল: আজ ৯৮% একুরেসি। তারপর আবার চেষ্টা।",
    "বন্ধুদের সাথে প্রতিযোগিতা নয়, সহযোগিতা—এটাই ছিল তাদের নিয়ম। সবাই মিলে নিয়মিত অনুশীলন করত।",
    "ক্লাস শেষে বাসায় ফিরে সে কয়েকটা অনুচ্ছেদ টাইপ করল। প্রতিদিনের মতোই ধীরে ধীরে উন্নতি।",
    "কখনো বিদ্যুৎ চলে গেলে মোবাইলের আলোতে অনুশীলন করত। অভ্যাসই শক্তি।",
    "কিছুদিন পর সে বুঝল, গতি নিজে থেকেই আসে; আগে চাই স্বচ্ছন্দ আর ছন্দ।",
    "নতুন অনুচ্ছেদ, নতুন শব্দ, নতুন অনুভূতি—এভাবেই তার টাইপিং যাত্রা চলতে লাগল।",
  ],
  biography: [
    "কাজী নজরুল ইসলাম ছিলেন বাংলা সাহিত্যের বিদ্রোহী কবি। তাঁর লেখায় স্বাধীনতা, মানবতা ও প্রতিবাদের শক্তি ফুটে উঠেছে।",
    "বেগম রোকেয়া নারীশিক্ষার অগ্রদূত ছিলেন। তাঁর লেখা সমাজের নানা বাধা ভাঙতে মানুষকে সাহস দিয়েছে।",
    "রবীন্দ্রনাথ ঠাকুর ছিলেন কবি, গীতিকার ও চিন্তাবিদ। তাঁর সাহিত্য ও সঙ্গীত বাংলা সংস্কৃতিকে সমৃদ্ধ করেছে।",
    "বঙ্গবন্ধু শেখ মুজিবুর রহমান বাংলাদেশের ইতিহাসে গুরুত্বপূর্ণ নেতা। তাঁর নেতৃত্ব ও ভাষণ মানুষকে অনুপ্রাণিত করেছে।",
    "মাইকেল মধুসূদন দত্ত বাংলা কবিতায় নতুন ধারার সূচনা করেন। তাঁর সৃষ্টিশীলতা আজও আলোচিত।",
    "সত্যজিৎ রায় ছিলেন গল্পকার ও চলচ্চিত্র নির্মাতা। তাঁর কাজ বিশ্বজুড়ে প্রশংসিত।",
    "হুমায়ূন আহমেদ সহজ ভাষায় গল্প বলতেন। অনেক পাঠক নিয়মিত বই পড়া শুরু করেন তাঁর লেখার কারণে।",
    "আচার্য জগদীশচন্দ্র বসু ছিলেন বিজ্ঞানী ও শিক্ষক। তাঁর গবেষণা নিষ্ঠা ও কৌতূহলের উদাহরণ।",
    "লালন ফকিরের গান ও দর্শন মানবতা ও সাম্যের কথা বলে। তাঁর ভাবধারা আজও মানুষকে স্পর্শ করে।",
    "ইশ্বরচন্দ্র বিদ্যাসাগর শিক্ষা ও সমাজ সংস্কারে বড় ভূমিকা রাখেন। তাঁর কাজ সমাজকে বদলাতে সাহায্য করেছে।",
  ],
  news: [
    "আজ শহর কর্তৃপক্ষ যানজট কমাতে নতুন কিছু ব্যবস্থা ঘোষণা করেছে। যাত্রীদের আগেভাগে পরিকল্পনা করে বের হতে বলা হয়েছে।",
    "আবহাওয়াবিদরা জানিয়েছেন, কিছু এলাকায় বিক্ষিপ্ত বৃষ্টি হতে পারে। কৃষকেরা বৃষ্টির সম্ভাবনায় আশাবাদী।",
    "নতুন একটি সেতু আজ উদ্বোধন করা হয়েছে। এতে অনেক মানুষের যাতায়াত সময় কমবে বলে আশা করা হচ্ছে।",
    "স্কুলগুলোতে পাঠাভ্যাস বাড়াতে নতুন কর্মসূচি শুরু হয়েছে। শিক্ষকরা বলছেন, শিক্ষার্থীরা উৎসাহ দেখাচ্ছে।",
    "চিকিৎসকেরা গরমে বেশি পানি পান করার পরামর্শ দিয়েছেন। হাসপাতালে জরুরি প্রস্তুতি বাড়ানো হয়েছে।",
    "প্রযুক্তি মেলায় শিক্ষার্থীদের নানা উদ্ভাবন প্রদর্শিত হয়েছে। দর্শনার্থীরা তাদের সৃজনশীলতা দেখে মুগ্ধ।",
    "বাস রুটে কিছু পরিবর্তন আনা হয়েছে যাতে সেবা উন্নত হয়। যাত্রীদের আপডেটেড সময়সূচি দেখতে বলা হয়েছে।",
    "নদীর পাড়ে প্লাস্টিক বর্জ্য কমাতে পরিচ্ছন্নতা অভিযান হয়েছে। স্বেচ্ছাসেবীরা অংশ নিয়েছেন।",
    "খেলার মাঠে দর্শকেরা একটি ঐতিহাসিক জয় উদযাপন করেছে। আয়োজকেরা বলছেন, পরিবেশ ছিল শান্তিপূর্ণ।",
    "বাজারে কিছু পণ্যের দাম স্থিতিশীল রয়েছে বলে ব্যবসায়ীরা জানিয়েছেন। ক্রেতারা সন্তুষ্টি প্রকাশ করেছেন।",
  ],
  article: [
    "ভালো টাইপিং শুধু গতি নয়; ছন্দ, নির্ভুলতা আর স্বাচ্ছন্দ্যও গুরুত্বপূর্ণ। হাত ঢিলেঢালা রাখুন এবং লেখায় মন দিন।",
    "নিয়মিত ছোট সেশনে অনুশীলন করলে উন্নতি দ্রুত হয়। বিশ্রাম নিন, অগ্রগতি লক্ষ্য করুন, ধাপে ধাপে কঠিন করুন।",
    "সঠিক ভঙ্গিতে বসুন। কাঁধ ঢিলে রাখুন, হাত আর কবজি স্বাভাবিক অবস্থায় রাখুন।",
    "একুরেসি আগে, গতি পরে। ধীরে টাইপ করুন, ভুল কমান, গতি নিজে থেকেই বাড়বে।",
    "সব আঙুল ব্যবহার করুন। কিবোর্ডে খুঁজে টাইপ করলে দীর্ঘসময় ধরে গতি স্থির থাকে না।",
    "কিছুক্ষণ পর পর বিরতি নিন। এতে ক্লান্তি কমে এবং মনোযোগ ফিরে আসে।",
    "শুধু শব্দ নয়, পূর্ণ বাক্য অনুশীলন করুন। এতে বিরামচিহ্ন ও স্পেসিংয়ের ছন্দ তৈরি হয়।",
    "প্রতিদিন অল্প সময় হলেও অনুশীলন করুন। নিয়মিত অভ্যাসই সবচেয়ে বড় শক্তি।",
    "ভুল হলে আতঙ্কিত হবেন না। ধৈর্য ধরে ধারাবাহিকতা বজায় রাখুন।",
    "একটি ছোট লক্ষ্য ঠিক করুন—আজ ১% উন্নতি। ধাপে ধাপে এগোলেই বড় পরিবর্তন আসে।",
  ],
  poem: [
    "শব্দেরা আসে নীরবে নীরবে, আঙুলের ছোঁয়ায় জেগে ওঠে স্বপ্ন।",
    "মনে রাখো, ধৈর্যের আলোয়, প্রতিটি ভুলও হয় নতুন পথ।",
    "ক্লিকের ছন্দে বয়ে যায় সময়, নতুন বাক্য জাগে মনের কোণায়।",
    "যতই ভুল হোক, থেমো না তুমি, ধীরে ধীরে জিতবে তোমারই গতি।",
    "রাতের নীরবতায় স্ক্রিনের আলো, অনুশীলনে তৈরি হয় নিজের ভালো।",
    "একটি লাইন শেষ, আরেকটি শুরু, স্থির হাতে এগিয়ে যাও দূর।",
    "বৃষ্টির মতো পড়ে কিবোর্ডের শব্দ, তাতেই জেগে ওঠে শেখার প্রবন্ধ।",
    "অল্প অল্প করে গড়ে ওঠে অভ্যাস, ধৈর্যের শেষে আসে সাফল্যের আশ্বাস।",
    "শব্দের নদী বয়ে যায় ধীরে, মনটা থাকুক শান্তির নীড়ে।",
    "আজ একটু বেশি, কাল আরোও, অনুশীলনে খুলবে নতুন সব দ্বার।",
  ],
};

type TextItem = { category: TextCategory; text: string };

type BagState = {
  bag: TextItem[];
  index: number;
};

const bagByLanguage: Record<"en" | "bn", BagState> = {
  en: { bag: [], index: 0 },
  bn: { bag: [], index: 0 },
};

function shuffle<T>(arr: T[]) {
  // Fisher–Yates
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function buildPool(language: "en" | "bn"): TextItem[] {
  const src = language === "en" ? englishTexts : banglaTexts;
  const items: TextItem[] = [];
  (Object.keys(src) as TextCategory[]).forEach((category) => {
    for (const text of src[category]) {
      items.push({ category, text });
    }
  });
  return items;
}

/**
 * Returns the next text from a shuffled pool.
 * Ensures we don't repeat the same few texts too frequently.
 */
export function getNextText(language: "en" | "bn"): { category: TextCategory; text: string } {
  const state = bagByLanguage[language];
  if (!state.bag.length || state.index >= state.bag.length) {
    state.bag = shuffle(buildPool(language));
    state.index = 0;
  }
  const item = state.bag[state.index++]!;
  return item;
}

// Backwards compatible helper (if needed elsewhere)
export function getRandomText(language: "en" | "bn", category: TextCategory): string {
  const src = language === "en" ? englishTexts : banglaTexts;
  const list = src[category];
  const i = Math.floor(Math.random() * list.length);
  return list[i] || "";
}
