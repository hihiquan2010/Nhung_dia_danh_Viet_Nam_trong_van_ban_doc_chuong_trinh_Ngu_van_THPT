import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./supabase-config.js";
import { menuData } from "./data.js";

const SECONDS_PER_QUESTION = 15;
const POINTS_PER_ANSWER = 100;
const SPEED_BONUS_PER_SECOND = 5;
const GAME_MODES = {
  football: {
    name: "Đá bóng luân lưu",
    action: "Canh hướng bóng và thời điểm sút.",
  },
  "table-tennis": {
    name: "Bóng bàn trí nhớ",
    action: "Đỡ bóng đúng nhịp hoặc để bóng lạc đề trôi qua.",
  },
  basketball: {
    name: "Ném rổ địa danh",
    action: "Kéo bóng và thả vào chiếc rổ phù hợp.",
  },
  "wood-stack": {
    name: "Xếp gỗ tháp chữ",
    action: "Canh khối gỗ đang chạy rồi thả lên tháp.",
  },
  obstacle: {
    name: "Vượt ải trang văn",
    action: "Chạy liên tục, nhảy qua bụi tre và cúi né chim bay.",
  },
};

const modeList = document.getElementById("mode-list");
const playPanel = document.getElementById("play-panel");
const resultPanel = document.getElementById("result-panel");
const backToModesButton = document.getElementById("back-to-modes");
const restartButton = document.getElementById("restart-button");
const resultTitle = document.getElementById("result-title");
const modeLabel = document.getElementById("mode-label");
const sceneTitle = document.getElementById("scene-title");
const gameScene = document.getElementById("game-scene");
const gameControls = document.getElementById("game-controls");
const questionCount = document.getElementById("question-count");
const scoreDisplay = document.getElementById("score-display");
const progressTrack = document.querySelector(".progress-track");
const progressBar = document.getElementById("progress-bar");
const timerDisplay = document.getElementById("timer-display");
const questionText = document.getElementById("question-text");
const answerFeedback = document.getElementById("answer-feedback");
const finalScore = document.getElementById("final-score");
const resultMessage = document.getElementById("result-message");
const submissionStatus = document.getElementById("submission-status");
const authStatus = document.getElementById("auth-status");
const leaderboardMode = document.getElementById("leaderboard-mode");
const leaderboardStatus = document.getElementById("leaderboard-status");
const leaderboardList = document.getElementById("leaderboard-list");
const leaderboardSignin = document.getElementById("leaderboard-signin");

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

let supabase = null;
let currentUser = null;
let selectedMode = "football";
let questions = [];
let currentQuestionIndex = 0;
let roundNumber = 0;
let score = 0;
let remainingSeconds = SECONDS_PER_QUESTION;
let correctStreak = 0;
let timerId;
let mechanicIntervalId;
let mechanicTimeoutId;
let roundAdvanceTimeoutId;
let runnerFrameId;
let runnerDuckTimeoutId;
let runnerObstacles = [];
let runnerDistance = 0;
let tower = { left: 18, width: 64, blocks: [] };
let movingBlockLeft = 0;
let movingBlockDirection = 1;
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
  timerDisplay.textContent = String(remainingSeconds);
  timerDisplay.classList.toggle("is-urgent", remainingSeconds <= 5);
}

function stopTimer() {
  window.clearInterval(timerId);
  timerId = undefined;
}

function stopMechanics() {
  window.clearInterval(mechanicIntervalId);
  window.clearTimeout(mechanicTimeoutId);
  window.clearTimeout(roundAdvanceTimeoutId);
  window.clearTimeout(runnerDuckTimeoutId);
  window.cancelAnimationFrame(runnerFrameId);
  mechanicIntervalId = undefined;
  mechanicTimeoutId = undefined;
  roundAdvanceTimeoutId = undefined;
  runnerDuckTimeoutId = undefined;
  runnerFrameId = undefined;
  runnerObstacles.forEach(({ element }) => element.remove());
  runnerObstacles = [];
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
      finishAttempt(false, "Hết giờ! Lượt chơi kết thúc.");
    }
  }, 1000);
}

function createSceneItem(className, text) {
  const item = document.createElement("span");
  item.className = className;
  item.textContent = text;
  return item;
}

function makeButton(label, className, onClick) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = className;
  button.textContent = label;
  button.addEventListener("click", onClick);
  return button;
}

function getSceneFraction(element) {
  const sceneRect = gameScene.querySelector(".scene-visual").getBoundingClientRect();
  const itemRect = element.getBoundingClientRect();
  return (itemRect.left + itemRect.width / 2 - sceneRect.left) / sceneRect.width;
}

function getRelativeFraction(element, container) {
  const containerRect = container.getBoundingClientRect();
  const elementRect = element.getBoundingClientRect();
  return (elementRect.left + elementRect.width / 2 - containerRect.left) / containerRect.width;
}

function renderScene() {
  const scene = document.createElement("div");
  scene.className = `scene-visual scene-${selectedMode}`;
  const detail = document.createElement("p");
  detail.className = "scene-detail";
  detail.textContent = GAME_MODES[selectedMode].action;
  scene.append(detail);
  gameControls.replaceChildren();

  if (selectedMode === "football") {
    const goal = document.createElement("div");
    goal.className = "goal-frame";
    questions[currentQuestionIndex].options.forEach((place, index) => {
      const zone = createSceneItem("goal-zone", place.name);
      zone.dataset.zone = String(index);
      goal.append(zone);
    });
    goal.append(createSceneItem("goalkeeper", "🧤"));
    scene.append(goal);

    const meter = document.createElement("div");
    meter.className = "kick-meter";
    meter.append(
      createSceneItem("kick-meter-target", ""),
      createSceneItem("kick-meter-marker", ""),
    );
    scene.append(meter);

    const aimLabel = document.createElement("label");
    aimLabel.className = "game-control-label";
    aimLabel.textContent = "Hướng sút";
    const aim = document.createElement("input");
    aim.type = "range";
    aim.min = "0";
    aim.max = String(questions[currentQuestionIndex].options.length - 1);
    aim.step = "1";
    aim.value = "0";
    aim.setAttribute("aria-label", "Điều chỉnh hướng sút");
    aimLabel.append(aim);
    gameControls.append(
      aimLabel,
      makeButton("Sút bóng", "game-button", () => {
        const marker = meter.querySelector(".kick-meter-marker");
        const markerPosition = getRelativeFraction(marker, meter);
        const correctIndex = questions[currentQuestionIndex].options.findIndex(
          (place) => place.name === questions[currentQuestionIndex].correctPlace.name,
        );
        const aimedCorrectly = Number(aim.value) === correctIndex;
        const timedCorrectly = markerPosition >= 0.4 && markerPosition <= 0.6;
        finishAttempt(
          aimedCorrectly && timedCorrectly,
          aimedCorrectly && timedCorrectly
            ? "Vào lưới! Bạn canh hướng và thời điểm rất chuẩn."
            : "Cú sút chưa trúng đích. Cần chọn đúng hướng và canh kim vào vùng xanh.",
        );
      }),
    );
    aim.addEventListener("input", () => {
      goal.querySelectorAll(".goal-zone").forEach((zone, index) => {
        zone.classList.toggle("is-aimed", index === Number(aim.value));
      });
    });
    aim.dispatchEvent(new Event("input"));
  } else if (selectedMode === "table-tennis") {
    const question = questions[currentQuestionIndex];
    const ballPlace = question.options[
      Math.floor(Math.random() * question.options.length)
    ];
    const ball = createSceneItem("rally-ball", ballPlace.name);
    const belongsToWork = question.places.some(
      (place) => place.name === ballPlace.name,
    );
    scene.append(
      createSceneItem("ping-paddle", "🏓"),
      createSceneItem("ping-net", ""),
      ball,
      createSceneItem("ping-rival", "🏓"),
    );

    const handleRally = (action) => {
      const position = getSceneFraction(ball);
      if (position < 0.58) {
        answerFeedback.textContent = "Bóng chưa tới vợt — chờ thêm một nhịp.";
        return;
      }
      if (position > 0.9) {
        finishAttempt(false, "Bóng đã qua vợt mất rồi!");
        return;
      }
      const expectedAction = belongsToWork ? "hit" : "let";
      const succeeded = action === expectedAction;
      const text = belongsToWork
        ? "Đỡ bóng chính xác, địa danh này thuộc tác phẩm!"
        : "Để bóng lạc đề trôi qua — giữ được nhịp rally!";
      finishAttempt(
        succeeded,
        succeeded ? text : "Sai nhịp! Hãy nhận diện địa danh rồi quyết định đỡ hay bỏ qua.",
      );
    };

    gameControls.append(
      makeButton("Đỡ bóng · Space", "game-button", () => handleRally("hit")),
      makeButton("Bỏ qua · Enter", "game-button secondary-game-button", () =>
        handleRally("let"),
      ),
    );
    mechanicTimeoutId = window.setTimeout(
      () => finishAttempt(false, "Bóng vụt qua mất rồi!"),
      5600,
    );
  } else if (selectedMode === "basketball") {
    const question = questions[currentQuestionIndex];
    const hoops = document.createElement("div");
    hoops.className = "basket-hoops";
    question.options.forEach((place) => {
      const hoop = document.createElement("button");
      hoop.type = "button";
      hoop.className = "basket-target";
      hoop.dataset.place = place.name;
      hoop.append(
        createSceneItem("basket-ring", "◯"),
        createSceneItem("basket-label", place.name),
      );
      hoops.append(hoop);
    });
    const ball = createSceneItem("shoot-ball", "🏀");
    ball.setAttribute("role", "img");
    ball.setAttribute("aria-label", "Kéo quả bóng vào rổ");
    scene.append(hoops, ball);

    let dragging = false;
    let dragStart = null;
    let keyboardAim = 0;
    const updateKeyboardAim = () => {
      hoops.querySelectorAll(".basket-target").forEach((target, index) => {
        target.classList.toggle("is-aimed", index === keyboardAim);
      });
    };
    updateKeyboardAim();
    hoops.addEventListener("click", (event) => {
      const target = event.target.closest(".basket-target");
      if (!target || answered) return;
      finishAttempt(
        target.dataset.place === question.correctPlace.name,
        target.dataset.place === question.correctPlace.name
          ? "Bóng vào rổ! Cú ném đã đến đúng địa danh."
          : "Bóng chạm vành hoặc vào nhầm rổ.",
      );
    });
    scene.addEventListener("pointerdown", (event) => {
      if (answered || !event.target.closest(".shoot-ball")) return;
      event.preventDefault();
      dragging = true;
      dragStart = { x: event.clientX, y: event.clientY };
      ball.classList.add("is-dragging");
      ball.setPointerCapture(event.pointerId);
    });
    scene.addEventListener("pointermove", (event) => {
      if (!dragging || answered) return;
      const bounds = scene.getBoundingClientRect();
      ball.style.left = `${event.clientX - bounds.left - 24}px`;
      ball.style.top = `${event.clientY - bounds.top - 24}px`;
    });
    scene.addEventListener("pointerup", (event) => {
      if (!dragging || answered) return;
      dragging = false;
      const dragDistance = Math.hypot(
        event.clientX - dragStart.x,
        event.clientY - dragStart.y,
      );
      const target = [...hoops.querySelectorAll(".basket-target")].find((hoop) => {
        const bounds = hoop.getBoundingClientRect();
        return (
          event.clientX >= bounds.left &&
          event.clientX <= bounds.right &&
          event.clientY >= bounds.top &&
          event.clientY <= bounds.bottom
        );
      });
      if (!target) {
        finishAttempt(false, "Bóng chưa vào rổ — hãy kéo thẳng tới một chiếc rổ.");
        return;
      }
      const succeeded =
        target.dataset.place === question.correctPlace.name &&
        dragDistance >= 55;
      finishAttempt(
        succeeded,
        succeeded
          ? "Bóng vào rổ! Cú ném đã đến đúng địa danh."
          : dragDistance < 55
            ? "Cú kéo quá ngắn — đưa bóng lên rổ rồi thả."
            : "Bóng chạm vành hoặc vào nhầm rổ. Hãy thử cú ném khác.",
      );
    });

    gameControls.append(
      createSceneItem(
        "game-control-hint",
        "Kéo bóng vào rổ, hoặc dùng ← → để ngắm và Space để ném.",
      ),
    );
    scene.dataset.keyboardAim = "0";
  } else if (selectedMode === "wood-stack") {
    const field = document.createElement("div");
    field.className = "stack-field";
    const stack = document.createElement("div");
    stack.className = "stack-tower";
    tower.blocks.forEach((block, index) => {
      const placed = createSceneItem("wood-block placed-block", block.name);
      placed.style.width = `${block.width}%`;
      placed.style.left = `${block.left}%`;
      placed.style.bottom = `${index * 24}px`;
      stack.append(placed);
    });
    movingBlockLeft = 0;
    const movingBlock = createSceneItem(
      "wood-block moving-block",
      questions[currentQuestionIndex].correctPlace.name,
    );
    movingBlock.style.width = `${tower.width}%`;
    movingBlock.style.left = `${movingBlockLeft}%`;
    field.append(stack, movingBlock);
    scene.append(field);

    const moveBlock = (amount) => {
      const limit = 100 - tower.width;
      movingBlockLeft = Math.max(0, Math.min(limit, movingBlockLeft + amount));
      movingBlock.style.left = `${movingBlockLeft}%`;
    };
    const dropBlock = () => {
      const overlapStart = Math.max(tower.left, movingBlockLeft);
      const overlapEnd = Math.min(tower.left + tower.width, movingBlockLeft + tower.width);
      const overlapWidth = Math.max(0, overlapEnd - overlapStart);
      const overlapRatio = overlapWidth / tower.width;
      if (overlapRatio < 0.2) {
        field.classList.add("is-wobbling");
        finishAttempt(false, "Khối gỗ rơi khỏi tháp — thử canh khối tiếp theo.");
        return;
      }
      tower = {
        left: overlapStart,
        width: overlapWidth,
        blocks: [...tower.blocks, { left: overlapStart, width: overlapWidth, name: movingBlock.textContent }],
      };
      finishAttempt(
        true,
        `Xếp vững! ${Math.round(overlapRatio * 100)}% khối gỗ nằm trên tháp.`,
        overlapRatio,
      );
    };

    gameControls.append(
      makeButton("Thả khối · Space", "game-button", dropBlock),
      createSceneItem("game-control-hint", "Dùng phím ← → để canh vị trí."),
    );
    mechanicIntervalId = window.setInterval(() => {
      const limit = 100 - tower.width;
      movingBlockLeft += movingBlockDirection * 1.7;
      if (movingBlockLeft >= limit || movingBlockLeft <= 0) {
        movingBlockDirection *= -1;
      }
      movingBlockLeft = Math.max(0, Math.min(limit, movingBlockLeft));
      movingBlock.style.left = `${movingBlockLeft}%`;
    }, 40);
  } else {
    const course = document.createElement("div");
    course.className = "obstacle-course";
    const sign = document.createElement("p");
    sign.className = "course-sign";
    sign.textContent = `Địa danh: ${questions[currentQuestionIndex].correctPlace.name} · ${questions[currentQuestionIndex].work}`;
    const runner = document.createElement("img");
    runner.className = "course-runner";
    runner.src = "/html/minigame-runner.svg";
    runner.alt = "Nhân vật đang chạy";
    runner.draggable = false;
    course.append(runner, sign);
    scene.append(course);
    gameControls.append(
      makeButton("Nhảy · Space / ↑", "game-button", () => jumpRunner(runner)),
      makeButton(
        "Cúi né · ↓",
        "game-button secondary-game-button",
        () => duckRunner(runner),
      ),
      createSceneItem("game-control-hint", "Chạm đường chạy hoặc nhấn Space để nhảy; dùng ↓ để cúi."),
    );
    course.addEventListener("pointerdown", (event) => {
      if (event.target.closest(".course-obstacle")) return;
      jumpRunner(runner);
    });
  }

  gameScene.replaceChildren(scene);
  if (selectedMode === "obstacle") {
    startObstacleRun(
      gameScene.querySelector(".obstacle-course"),
      gameScene.querySelector(".course-runner"),
    );
  }
}

function finishAttempt(isSuccess, message, precision = 1) {
  if (answered) return;
  answered = true;
  stopTimer();
  stopMechanics();

  if (isSuccess) {
    correctStreak += 1;
    const basePoints = POINTS_PER_ANSWER + remainingSeconds * SPEED_BONUS_PER_SECOND;
    const precisionPoints = Math.round(basePoints * Math.max(0.2, Math.min(1, precision)));
    const streakBonus = selectedMode === "table-tennis" ? correctStreak * 10 : 0;
    score = Math.min(2_000_000_000, score + precisionPoints + streakBonus);
    answerFeedback.classList.remove("is-incorrect");
    answerFeedback.textContent = `+${precisionPoints + streakBonus} điểm. ${message}`;
  } else {
    correctStreak = 0;
    answerFeedback.classList.add("is-incorrect");
    answerFeedback.textContent = message;
  }

  progressTrack.setAttribute("aria-valuenow", String(currentQuestionIndex + 1));
  progressBar.style.width = `${((currentQuestionIndex + 1) / questions.length) * 100}%`;
  updateScore();
  gameScene.querySelector(".scene-visual")?.classList.add(
    isSuccess ? "is-success" : "is-miss",
  );
  gameControls.querySelectorAll("button, input").forEach((control) => {
    control.disabled = true;
  });
  gameScene.querySelectorAll("button").forEach((control) => {
    control.disabled = true;
  });
  roundAdvanceTimeoutId = window.setTimeout(() => {
    if (isSuccess) {
      advanceQuestion();
    } else {
      finishGame(message);
    }
  }, isSuccess ? 650 : 900);
}

function jumpRunner(runner) {
  if (answered || runner.classList.contains("runner-jumping")) return;
  runner.classList.remove("runner-ducking");
  window.clearTimeout(runnerDuckTimeoutId);
  runner.classList.add("runner-jumping");
  window.setTimeout(() => runner.classList.remove("runner-jumping"), 650);
}

function duckRunner(runner) {
  if (answered || runner.classList.contains("runner-jumping")) return;
  runner.classList.add("runner-ducking");
  window.clearTimeout(runnerDuckTimeoutId);
  runnerDuckTimeoutId = window.setTimeout(() => {
    runner.classList.remove("runner-ducking");
    runnerDuckTimeoutId = undefined;
  }, 520);
}

function startObstacleRun(course, runner) {
  runnerDistance = 0;
  let previousFrameTime = 0;
  let nextObstacleDistance = Math.max(360, course.clientWidth * 0.9);
  let speed = 260;

  function spawnObstacle() {
    const type =
      runnerDistance > 700 && Math.random() < 0.24
        ? "obstacle-overhead"
        : "obstacle-ground";
    const element = createSceneItem("course-obstacle", "");
    element.classList.add(type);
    element.setAttribute("aria-hidden", "true");
    element.style.left = `${course.clientWidth + 24}px`;
    course.append(element);
    runnerObstacles.push({ element, x: course.clientWidth + 24, type });
  }

  function runFrame(timestamp) {
    if (answered) return;
    if (!previousFrameTime) previousFrameTime = timestamp;
    const elapsedSeconds = Math.min((timestamp - previousFrameTime) / 1000, 0.05);
    previousFrameTime = timestamp;
    speed = Math.min(520, 260 + runnerDistance * 0.025);
    runnerDistance += speed * elapsedSeconds;
    score = Math.min(2_000_000_000, Math.floor(runnerDistance / 8));
    updateScore();

    if (runnerDistance >= nextObstacleDistance) {
      spawnObstacle();
      nextObstacleDistance =
        runnerDistance + 470 + Math.random() * 210 - Math.min(90, (speed - 260) * 0.3);
    }

    const runnerBounds = runner.getBoundingClientRect();
    const remainingObstacles = [];
    for (const obstacle of runnerObstacles) {
      obstacle.x -= speed * elapsedSeconds;
      obstacle.element.style.left = `${obstacle.x}px`;
      const bounds = obstacle.element.getBoundingClientRect();
      const horizontalOverlap =
        runnerBounds.right - 10 > bounds.left + 5 &&
        runnerBounds.left + 10 < bounds.right - 5;
      const avoided =
        (obstacle.type === "obstacle-ground" &&
          runner.classList.contains("runner-jumping")) ||
        (obstacle.type === "obstacle-overhead" &&
          runner.classList.contains("runner-ducking"));

      if (horizontalOverlap && !avoided) {
        finishGame("Bạn va phải chướng ngại vật!");
        return;
      }

      if (obstacle.x + bounds.width >= 0) {
        remainingObstacles.push(obstacle);
      } else {
        obstacle.element.remove();
      }
    }
    runnerObstacles = remainingObstacles;
    runnerFrameId = window.requestAnimationFrame(runFrame);
  }

  runner.classList.add("runner-running");
  runnerFrameId = window.requestAnimationFrame(runFrame);
}

function renderQuestion() {
  answered = false;
  const question = questions[currentQuestionIndex];
  roundNumber += 1;
  const modeName = GAME_MODES[selectedMode].name;
  const isObstacleRun = selectedMode === "obstacle";

  modeLabel.textContent = modeName;
  sceneTitle.textContent = modeName;
  questionCount.textContent = isObstacleRun
    ? `Địa danh: ${question.correctPlace.name} · ${question.work}`
    : `Lượt ${roundNumber} · Danh mục ${currentQuestionIndex + 1}/${questions.length}`;
  const prompts = {
    football: `Tác phẩm “${question.work}” gắn với một trong các vùng sút. Chỉnh hướng và sút khi kim vào vùng xanh.`,
    "table-tennis": `Đỡ bóng nếu địa danh trên bóng thuộc tác phẩm “${question.work}”; để bóng lạc đề trôi qua.`,
    basketball: `Kéo bóng vào rổ ghi một địa danh thuộc tác phẩm “${question.work}”.`,
    "wood-stack": `Canh và thả khối gỗ mang tên “${question.correctPlace.name}” để dựng tháp địa danh.`,
    obstacle: "Chạy càng xa càng tốt! Nhảy qua bụi tre, cúi né chim bay và cố lập điểm cao.",
  };
  questionText.textContent = prompts[selectedMode];
  progressTrack.hidden = isObstacleRun;
  timerDisplay.closest(".timer-row").hidden = isObstacleRun;
  progressTrack.setAttribute("aria-valuemax", String(questions.length));
  progressTrack.setAttribute("aria-valuenow", String(currentQuestionIndex));
  progressBar.style.width = `${(currentQuestionIndex / questions.length) * 100}%`;
  answerFeedback.textContent = "";
  answerFeedback.classList.remove("is-incorrect");
  renderScene();
  updateScore();
  if (!isObstacleRun) startTimer();
}

async function loadLeaderboard() {
  if (!supabase) {
    leaderboardStatus.textContent = "Bảng xếp hạng chưa khả dụng vì thiếu cấu hình kết nối.";
    return;
  }

  leaderboardStatus.textContent = "Đang tải thành tích…";
  leaderboardList.replaceChildren();
  let response;
  try {
    response = await supabase.rpc("get_minigame_leaderboard", {
      p_game_id: leaderboardMode.value,
    });
  } catch (error) {
    leaderboardStatus.textContent = "Không tải được bảng xếp hạng. Vui lòng thử lại sau.";
    console.error("Could not load minigame leaderboard:", error);
    return;
  }
  const { data, error } = response;
  if (error) {
    leaderboardStatus.textContent = "Không tải được bảng xếp hạng. Vui lòng thử lại sau.";
    console.error("Could not load minigame leaderboard:", error.message);
    return;
  }

  const entries = Array.isArray(data) ? data : [];
  leaderboardStatus.textContent = entries.length
    ? `Top ${entries.length} thành tích cao nhất`
    : "Chưa có thành tích. Hãy là người đầu tiên ghi danh!";
  entries.forEach((entry, index) => {
    const item = document.createElement("li");
    item.className = "leaderboard-row";
    const rank = document.createElement("span");
    rank.className = "leaderboard-rank";
    rank.textContent = String(index + 1);
    const name = document.createElement("span");
    name.className = "leaderboard-name";
    name.textContent = entry.display_name || "Thành viên";
    const points = document.createElement("strong");
    points.className = "leaderboard-score";
    points.textContent = `${entry.score} điểm`;
    item.append(rank, name, points);
    leaderboardList.append(item);
  });
}

async function saveScore() {
  if (!currentUser) {
    submissionStatus.textContent = "Bạn có thể chơi tiếp; hãy đăng nhập để ghi danh điểm.";
    return;
  }
  if (!supabase) {
    submissionStatus.textContent = "Không thể kết nối để lưu điểm. Vui lòng thử lại sau.";
    return;
  }

  submissionStatus.textContent = "Đang lưu thành tích…";
  let response;
  try {
    response = await supabase.rpc("submit_minigame_score", {
      p_game_id: selectedMode,
      p_score: score,
    });
  } catch (error) {
    submissionStatus.textContent = "Chưa lưu được thành tích. Vui lòng thử lại sau.";
    console.error("Could not submit minigame score:", error);
    return;
  }
  const { error } = response;
  if (error) {
    submissionStatus.textContent = "Chưa lưu được thành tích. Vui lòng thử lại sau.";
    console.error("Could not submit minigame score:", error.message);
    return;
  }
  submissionStatus.textContent = "Thành tích tốt nhất đã được ghi danh!";
  if (leaderboardMode.value === selectedMode) await loadLeaderboard();
}

function finishGame(reason) {
  stopTimer();
  stopMechanics();
  playPanel.hidden = true;
  resultPanel.hidden = false;
  resultTitle.textContent = "Lượt chơi kết thúc";
  finalScore.textContent = `${score} điểm`;
  resultMessage.textContent =
    selectedMode === "obstacle"
      ? `Bạn đã chạy được ${score} điểm. ${reason}`
      : `Bạn đã vượt qua ${Math.max(0, roundNumber - 1)} lượt. ${reason}`;
  submissionStatus.textContent = "";
  void saveScore();
}

function startGame(mode = selectedMode) {
  if (!GAME_MODES[mode]) return;
  stopTimer();
  stopMechanics();
  if (workQuestions.length === 0 || placeNames.length < 4) {
    authStatus.textContent = "Chưa đủ dữ liệu địa danh để bắt đầu minigame.";
    return;
  }

  selectedMode = mode;
  questions = shuffle(workQuestions).map(createQuestion);
  currentQuestionIndex = 0;
  roundNumber = 0;
  score = 0;
  correctStreak = 0;
  tower = { left: 18, width: 64, blocks: [] };
  movingBlockDirection = 1;
  modeList.hidden = true;
  resultPanel.hidden = true;
  playPanel.hidden = false;
  renderQuestion();
}

function advanceQuestion() {
  currentQuestionIndex += 1;
  if (currentQuestionIndex >= questions.length) {
    questions = shuffle(workQuestions).map(createQuestion);
    currentQuestionIndex = 0;
  }
  renderQuestion();
}

function updateAuthStatus() {
  authStatus.textContent = currentUser
    ? "Đã đăng nhập · điểm tốt nhất sẽ được lưu vào bảng xếp hạng."
    : "Bạn có thể chơi ngay; cần đăng nhập để ghi danh điểm.";
  leaderboardSignin.hidden = Boolean(currentUser);
}

modeList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-mode]");
  if (button) startGame(button.dataset.mode);
});

backToModesButton.addEventListener("click", () => {
  stopTimer();
  stopMechanics();
  playPanel.hidden = true;
  modeList.hidden = false;
});

restartButton.addEventListener("click", () => startGame(selectedMode));
leaderboardMode.addEventListener("change", () => void loadLeaderboard());

document.addEventListener("keydown", (event) => {
  if (playPanel.hidden || answered || event.target instanceof HTMLInputElement) return;

  if (selectedMode === "football" && ["ArrowLeft", "ArrowRight"].includes(event.key)) {
    event.preventDefault();
    const aim = gameControls.querySelector('input[type="range"]');
    const max = Number(aim.max);
    aim.value = String(
      Math.max(0, Math.min(max, Number(aim.value) + (event.key === "ArrowRight" ? 1 : -1))),
    );
    aim.dispatchEvent(new Event("input"));
  } else if (selectedMode === "table-tennis" && event.key === " ") {
    event.preventDefault();
    gameControls.querySelector("button")?.click();
  } else if (selectedMode === "table-tennis" && event.key === "Enter") {
    event.preventDefault();
    gameControls.querySelectorAll("button")[1]?.click();
  } else if (selectedMode === "basketball" && ["ArrowLeft", "ArrowRight"].includes(event.key)) {
    event.preventDefault();
    const scene = gameScene.querySelector(".scene-visual");
    const targets = [...scene.querySelectorAll(".basket-target")];
    let index = Number(scene.dataset.keyboardAim || 0);
    index = (index + (event.key === "ArrowRight" ? 1 : -1) + targets.length) % targets.length;
    scene.dataset.keyboardAim = String(index);
    targets.forEach((target, targetIndex) => {
      target.classList.toggle("is-aimed", targetIndex === index);
    });
  } else if (selectedMode === "basketball" && event.key === " ") {
    event.preventDefault();
    const scene = gameScene.querySelector(".scene-visual");
    const index = Number(scene.dataset.keyboardAim || 0);
    scene.querySelectorAll(".basket-target")[index]?.click();
  } else if (selectedMode === "wood-stack") {
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      const block = gameScene.querySelector(".moving-block");
      movingBlockLeft = Math.max(
        0,
        Math.min(
          100 - tower.width,
          movingBlockLeft + (event.key === "ArrowRight" ? 4 : -4),
        ),
      );
      block.style.left = `${movingBlockLeft}%`;
    } else if (event.key === " ") {
      event.preventDefault();
      gameControls.querySelector("button")?.click();
    }
  } else if (selectedMode === "obstacle" && [" ", "ArrowUp"].includes(event.key)) {
    event.preventDefault();
    gameControls.querySelector("button")?.click();
  } else if (selectedMode === "obstacle" && event.key === "ArrowDown") {
    event.preventDefault();
    gameControls.querySelectorAll("button")[1]?.click();
  }
});

if (SUPABASE_URL && SUPABASE_ANON_KEY) {
  supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      authStatus.textContent = "Không thể kiểm tra trạng thái đăng nhập.";
      console.error("Could not read the current session:", error.message);
    } else {
      currentUser = data.session?.user ?? null;
      updateAuthStatus();
    }
  } catch (error) {
    authStatus.textContent = "Không thể kiểm tra trạng thái đăng nhập.";
    console.error("Could not read the current session:", error);
  }

  supabase.auth.onAuthStateChange((_event, session) => {
    currentUser = session?.user ?? null;
    updateAuthStatus();
  });
  await loadLeaderboard();
} else {
  authStatus.textContent = "Đăng nhập và bảng xếp hạng sẽ khả dụng khi kết nối được cấu hình.";
  await loadLeaderboard();
}
