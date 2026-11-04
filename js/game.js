import { menuData } from "./data.js";

const QUESTION_COUNT = 10;
const SECONDS_PER_QUESTION = 15;
const POINTS_PER_ANSWER = 100;
const SPEED_BONUS_PER_SECOND = 5;
const BEST_SCORE_KEY = "dauChanVanHoc.game.bestScore";
const LETTERS = ["A", "B", "C", "D"];

const introPanel = document.getElementById("intro-panel");
const quizPanel = document.getElementById("quiz-panel");
const resultPanel = document.getElementById("result-panel");
const startButton = document.getElementById("start-button");
const restartButton = document.getElementById("restart-button");
const nextButton = document.getElementById("next-button");
const questionCount = document.getElementById("question-count");
const scoreDisplay = document.getElementById("score-display");
const progressTrack = document.querySelector(".progress-track");
const progressBar = document.getElementById("progress-bar");
const timerDisplay = document.getElementById("timer-display");
const questionText = document.getElementById("question-text");
const answerList = document.getElementById("answer-list");
const answerFeedback = document.getElementById("answer-feedback");
const finalScore = document.getElementById("final-score");
const resultMessage = document.getElementById("result-message");
const bestScoreDisplay = document.getElementById("best-score");

const placeNames = [
  ...new Set(
    menuData.flatMap((grade) =>
      grade.works.flatMap((work) => work.places.map((place) => place.name)),
    ),
  ),
];

const workQuestions = menuData.flatMap((grade) =>
  grade.works
    .filter((work) => work.places.length > 0)
    .map((work) => ({
      grade: grade.grade,
      work: work.name,
      places: [...new Map(work.places.map((place) => [place.name, place])).values()],
    })),
);

let questions = [];
let currentQuestionIndex = 0;
let score = 0;
let remainingSeconds = SECONDS_PER_QUESTION;
let timerId;
let answered = false;

function shuffle(items) {
  const shuffledItems = [...items];
  for (let index = shuffledItems.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffledItems[index], shuffledItems[swapIndex]] = [
      shuffledItems[swapIndex],
      shuffledItems[index],
    ];
  }
  return shuffledItems;
}

function createQuestion(workEntry) {
  const correctPlace =
    workEntry.places[Math.floor(Math.random() * workEntry.places.length)];
  const distractors = shuffle(
    placeNames.filter(
      (name) => !workEntry.places.some((place) => place.name === name),
    ),
  ).slice(0, 3);

  return {
    ...workEntry,
    correctPlace,
    options: shuffle([
      correctPlace,
      ...distractors.map((name) => ({ name })),
    ]),
  };
}

function updateScore() {
  scoreDisplay.textContent = `Điểm: ${score}`;
}

function updateTimer() {
  timerDisplay.textContent = remainingSeconds;
  timerDisplay.classList.toggle("is-urgent", remainingSeconds <= 5);
}

function stopTimer() {
  window.clearInterval(timerId);
  timerId = undefined;
}

function startTimer() {
  stopTimer();
  remainingSeconds = SECONDS_PER_QUESTION;
  updateTimer();

  timerId = window.setInterval(() => {
    remainingSeconds -= 1;
    updateTimer();
    if (remainingSeconds <= 0) {
      stopTimer();
      chooseAnswer(null);
    }
  }, 1000);
}

function renderQuestion() {
  answered = false;
  const question = questions[currentQuestionIndex];
  const questionNumber = currentQuestionIndex + 1;

  questionCount.textContent = `Câu ${questionNumber} / ${questions.length}`;
  questionText.textContent = `Trong danh mục ${question.grade}, địa danh nào gắn với tác phẩm “${question.work}”?`;
  progressTrack.setAttribute("aria-valuenow", questionNumber - 1);
  progressBar.style.width = `${(questionNumber - 1) / questions.length * 100}%`;
  answerFeedback.textContent = "";
  answerFeedback.classList.remove("is-incorrect");
  nextButton.hidden = true;
  answerList.replaceChildren();

  question.options.forEach((place, index) => {
    const option = document.createElement("button");
    option.type = "button";
    option.className = "answer-option";
    option.dataset.place = place.name;

    const letter = document.createElement("span");
    letter.className = "answer-letter";
    letter.setAttribute("aria-hidden", "true");
    letter.textContent = LETTERS[index];

    const label = document.createElement("span");
    label.textContent = place.name;

    option.append(letter, label);
    option.addEventListener("click", () => chooseAnswer(place));
    answerList.append(option);
  });

  updateScore();
  startTimer();
}

function chooseAnswer(selectedPlace) {
  if (answered) return;
  answered = true;
  stopTimer();

  const question = questions[currentQuestionIndex];
  const isCorrect = selectedPlace?.name === question.correctPlace.name;

  answerList.querySelectorAll(".answer-option").forEach((option) => {
    option.disabled = true;
    if (option.dataset.place === question.correctPlace.name) {
      option.classList.add("is-correct");
    } else if (option.dataset.place === selectedPlace?.name) {
      option.classList.add("is-incorrect");
    }
  });

  if (isCorrect) {
    score += POINTS_PER_ANSWER + remainingSeconds * SPEED_BONUS_PER_SECOND;
    answerFeedback.textContent = `Chính xác! +${POINTS_PER_ANSWER + remainingSeconds * SPEED_BONUS_PER_SECOND} điểm.`;
    answerFeedback.classList.remove("is-incorrect");
  } else {
    const timeoutMessage = selectedPlace ? "Chưa chính xác." : "Hết giờ!";
    answerFeedback.textContent = `${timeoutMessage} Đáp án: ${question.correctPlace.name}.`;
    answerFeedback.classList.add("is-incorrect");
  }

  progressTrack.setAttribute("aria-valuenow", currentQuestionIndex + 1);
  progressBar.style.width = `${(currentQuestionIndex + 1) / questions.length * 100}%`;
  updateScore();
  nextButton.hidden = false;
  nextButton.focus();
}

function readBestScore() {
  try {
    const storedValue = window.localStorage.getItem(BEST_SCORE_KEY);
    if (storedValue === null) return -1;
    const storedScore = Number(storedValue);
    return Number.isFinite(storedScore) && storedScore >= 0 ? storedScore : -1;
  } catch {
    bestScoreDisplay.textContent = "Trình duyệt hiện không cho phép lưu kỷ lục trên thiết bị này.";
    return null;
  }
}

function saveBestScore(bestScore) {
  try {
    window.localStorage.setItem(BEST_SCORE_KEY, String(bestScore));
    return true;
  } catch {
    bestScoreDisplay.textContent = "Không thể lưu kỷ lục trên thiết bị này.";
    return false;
  }
}

function showResults() {
  stopTimer();
  quizPanel.hidden = true;
  resultPanel.hidden = false;
  finalScore.textContent = `${score} điểm`;
  resultMessage.textContent =
    score >= 1200
      ? "Tuyệt vời! Bạn thật sự am hiểu những miền đất trong trang văn."
      : score >= 800
        ? "Rất tốt! Bạn đã có vốn hiểu biết đáng nể về các địa danh."
        : "Cùng khám phá thêm các địa danh trên website rồi thử sức lần nữa nhé!";

  const previousBest = readBestScore();
  if (previousBest === null) return;

  if (previousBest < 0 || score > previousBest) {
    if (saveBestScore(score)) {
      bestScoreDisplay.textContent = "Kỷ lục mới trên thiết bị này!";
    }
  } else {
    bestScoreDisplay.textContent = `Kỷ lục trên thiết bị này: ${previousBest} điểm.`;
  }
}

function startGame() {
  if (workQuestions.length < QUESTION_COUNT || placeNames.length < 4) {
    questionText.textContent =
      "Chưa đủ dữ liệu địa danh để bắt đầu minigame. Vui lòng thử lại sau.";
    introPanel.hidden = false;
    quizPanel.hidden = true;
    resultPanel.hidden = true;
    return;
  }

  questions = shuffle(workQuestions)
    .slice(0, QUESTION_COUNT)
    .map(createQuestion);
  currentQuestionIndex = 0;
  score = 0;
  introPanel.hidden = true;
  resultPanel.hidden = true;
  quizPanel.hidden = false;
  renderQuestion();
}

function advanceQuestion() {
  currentQuestionIndex += 1;
  if (currentQuestionIndex >= questions.length) {
    showResults();
    return;
  }
  renderQuestion();
}

startButton.addEventListener("click", startGame);
restartButton.addEventListener("click", startGame);
nextButton.addEventListener("click", advanceQuestion);

document.addEventListener("keydown", (event) => {
  if (quizPanel.hidden || answered || !/^[1-4]$/.test(event.key)) return;
  const option = answerList.querySelectorAll(".answer-option")[Number(event.key) - 1];
  option?.click();
});
