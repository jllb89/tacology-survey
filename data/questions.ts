// data/questions.ts

export interface Question {
  id: string;
  text: string;
  options?: string[];
}

// Group 1: always show this
export const initialLocationQuestion: Question = {
  id: "loc-1",
  text: "Thank you for visiting us today. Which Tacology location did you visit?",
  options: ["Brickell", "Wynwood"],
};

// Group 2: mandatory, always after Group 1
export const visitingFromQuestion: Question = {
  id: "visit-from",
  text: "Where are you visiting us from?",
  options: ["I’m a local", "I work in the neighborhood", "I’m on vacations"],
};

// Group 3: mandatory, always after Group 2
export const firstVisitQuestion: Question = {
  id: "first-visit",
  text: "Is this your first visit to Tacology?",
  options: ["Yes, it’s my first time 🌮", "Nope, I’m a taco lover 🔥"],
};

// Group 4: pick one at random from these
export const locationFollowUpQuestions: Question[] = [
  {
    id: "loc-2",
    text: "How would you rate the ambiance at this venue?",
    options: ["Excellent", "Good", "Average", "Poor", "Very Poor"],
  },
  {
    id: "loc-3",
    text: "How would you rate the cleanliness of the venue?",
    options: ["Excellent", "Good", "Average", "Poor", "Very Poor"],
  },
  {
    id: "loc-4",
    text: "How comfortable were the seating arrangements?",
    options: ["Excellent", "Good", "Average", "Poor", "Very Poor"],
  },
  {
    id: "loc-5",
    text: "How would you rate the noise level?",
    options: ["Excellent", "Good", "Average", "Poor", "Very Poor"],
  },
];

export const serviceQuestions: Question[] = [
  {
    id: "serv-1",
    text: "How would you rate the friendliness of our staff?",
    options: ["Excellent", "Good", "Average", "Poor", "Very Poor"],
  },
  {
    id: "serv-2",
    text: "How would you rate the speed of your service?",
    options: ["Excellent", "Good", "Average", "Poor", "Very Poor"],
  },
  {
    id: "serv-3",
    text: "How accurate was your order?",
    options: ["Excellent", "Good", "Average", "Poor", "Very Poor"],
  },
  {
    id: "serv-4",
    text: "How would you rate the attentiveness of your server?",
    options: ["Excellent", "Good", "Average", "Poor", "Very Poor"],
  },
  {
    id: "serv-5",
    text: "How clean was your dining area/service station?",
    options: ["Excellent", "Good", "Average", "Poor", "Very Poor"],
  },
];

export const foodQuestions: Question[] = [
  {
    id: "food-1",
    text: "How would you rate the taste of your meal?",
    options: ["Excellent", "Good", "Average", "Poor", "Very Poor"],
  },
  {
    id: "food-2",
    text: "How fresh were the ingredients?",
    options: ["Excellent", "Good", "Average", "Poor", "Very Poor"],
  },
  {
    id: "food-3",
    text: "How appealing was the presentation of your dish?",
    options: ["Excellent", "Good", "Average", "Poor", "Very Poor"],
  },
  {
    id: "food-4",
    text: "How would you rate the portion size?",
    options: ["Excellent", "Good", "Average", "Poor", "Very Poor"],
  },
  {
    id: "food-5",
    text: "How would you rate value for money?",
    options: ["Excellent", "Good", "Average", "Poor", "Very Poor"],
  },
];

// Group 5: open feedback
export const openQuestion: Question = {
  id: "open",
  text: "Any additional comments or suggestions?",
};
