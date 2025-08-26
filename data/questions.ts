// data/questions.ts

export interface Question {
  id: string;
  text: string;
  options?: string[];
}

// Group 1: always shown
export const initialLocationQuestion: Question = {
  id: "loc-1",
  text: "🎉 Thank you for visiting us today! Which Tacology location did you visit?",
  options: ["Brickell 🌇", "Wynwood 🎨"],
};

// Group 2: mandatory, always after Group 1
export const visitingFromQuestion: Question = {
  id: "visit-from",
  text: "📍 Where are you visiting us from?",
  options: ["I’m a local 🏠", "I work in the neighborhood 🏢", "I’m on vacations 🏖️"],
};

// Group 2.5: mandatory, always after Group 2
export const hearAboutQuestion: Question = {
  id: "hear-about",
  text: "📣 How did you hear about Tacology?",
  options: [
    "Walking around the mall 🚶‍♂️",
    "Social media 📱",
    "A friend recommended it 🗣️",
    "Just stumbled upon it 👀",
  ],
};

// Group 3: mandatory, always after Group 2.5
export const firstVisitQuestion: Question = {
  id: "first-visit",
  text: "❓ Is this your first visit to Tacology?",
  options: ["Yes, it’s my first time 🌮", "Nope, I’m a taco lover 🔥"],
};

// Group 4: random pick from these (venue follow-ups)
export const locationFollowUpQuestions: Question[] = [
  { id: "loc-2", text: "✨ How would you rate the ambiance at this venue?", options: ["Excellent","Good","Average","Poor","Very Poor"] },
  { id: "loc-3", text: "🧼 How would you rate the cleanliness of the venue?", options: ["Excellent","Good","Average","Poor","Very Poor"] },
  { id: "loc-4", text: "💺 How comfortable were the seating arrangements?", options: ["Excellent","Good","Average","Poor","Very Poor"] },
  { id: "loc-5", text: "🔊 How would you rate the noise level?", options: ["Excellent","Good","Average","Poor","Very Poor"] },
];

// Group 5: random pick from these (service)
export const serviceQuestions: Question[] = [
  { id: "serv-1", text: "😊 How friendly was our staff?", options: ["Excellent","Good","Average","Poor","Very Poor"] },
  { id: "serv-2", text: "⏱️ How speedy was your service?", options: ["Excellent","Good","Average","Poor","Very Poor"] },
  { id: "serv-3", text: "🎯 How accurate was your order?", options: ["Excellent","Good","Average","Poor","Very Poor"] },
  { id: "serv-4", text: "👀 How attentive was your server?", options: ["Excellent","Good","Average","Poor","Very Poor"] },
  { id: "serv-5", text: "🧹 How clean was your dining area?", options: ["Excellent","Good","Average","Poor","Very Poor"] },
];

// Group 6: random pick from these (food)
export const foodQuestions: Question[] = [
  { id: "food-1", text: "😋 How would you rate the taste of your meal?", options: ["Excellent","Good","Average","Poor","Very Poor"] },
  { id: "food-2", text: "🥗 How fresh were the ingredients?", options: ["Excellent","Good","Average","Poor","Very Poor"] },
  { id: "food-3", text: "🎨 How appealing was the presentation of your dish?", options: ["Excellent","Good","Average","Poor","Very Poor"] },
  { id: "food-4", text: "🍽️ How would you rate the portion size?", options: ["Excellent","Good","Average","Poor","Very Poor"] },
  { id: "food-5", text: "💰 How would you rate the value for money?", options: ["Excellent","Good","Average","Poor","Very Poor"] },
];

// 🎉 Group 7: random pick from these (salsa feedback)
export const salsaQuestions: Question[] = [
  {
    id: "salsa-like",
    text: "🌶️ What did you love most about our salsas?",
    options: ["Flavor 😍", "Spiciness 🔥", "Freshness 🌿", "Variety 🌈", "Presentation 🎨"],
  },
  {
    id: "salsa-improve",
    text: "🛠️ What could we improve about our salsas?",
    options: ["Flavor 😋", "Spiciness 🌶️", "Freshness 🥬", "Variety 🎉", "Presentation 🖌️"],
  },
];

// Group 8: random pick from these (brand-value)
export const brandValueQuestions: Question[] = [
  { id: "brand-1", text: "🎉 How would you describe Tacology’s overall vibe?", options: ["Vibrant","Laid-back","Trendy","Family-friendly","Adventurous"] },
  { id: "brand-2", text: "💡 What word comes to mind when you think of our brand?", options: ["Bold","Authentic","Fun","Fresh","Creative"] },
  { id: "brand-3", text: "🌴 How well do we represent Miami’s culture?", options: ["Perfectly","Very well","Somewhat","Not really","Not at all"] },
];

// Group 9: recommendation (always before open feedback)
export const recommendQuestion: Question = {
  id: "recommend",
  text: "👍 Would you come back and recommend us to friends & family?",
  options: ["Absolutely","Probably","Not sure","Probably not","Never"],
};

// Group 10: open feedback
export const openQuestion: Question = {
  id: "open",
  text: "✍️ Any additional comments or suggestions?",
};
