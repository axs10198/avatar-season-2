(function () {
  const screens = new Map(
    Array.from(document.querySelectorAll("[data-screen]")).map((screen) => [
      screen.dataset.screen,
      screen,
    ]),
  );

  const config = window.AVATAR_QUEST_CONFIG || {};
  const submissionUrl = config.googleAppsScriptUrl || "";
  const submissionToken = config.submissionToken || "";
  const calendarEventLink = config.calendarEventLink || "";
  const calendarEventDurationMinutes = config.calendarEventDurationMinutes || 120;
  const hasSubmissionEndpoint = submissionUrl && !submissionUrl.includes("PASTE_YOUR");
  const judgingImages = [
    "images/me/judging-1 (1).jpeg",
    "images/me/judging-1 (2).jpeg",
  ];

  const days = {
    saturday: {
      label: "Saturday, July 4",
      madridDate: "2026-07-04",
      validStart: 13,
      validEnd: 18,
      element: "Earth Kingdom",
    },
    sunday: {
      label: "Sunday, July 5",
      madridDate: "2026-07-05",
      validStart: 13,
      validEnd: 18,
      element: "Water Tribe",
    },
  };

  const hourOptions = Array.from({ length: 13 }, (_, index) => index + 10);
  const state = {
    accepted: null,
    dayKey: null,
    hour: null,
    valid: false,
    reaction: "",
    submitted: false,
  };

  const timeGrid = document.getElementById("timeGrid");
  const dayLabel = document.getElementById("dayLabel");
  const reactionCard = document.getElementById("reactionCard");
  const reactionText = document.getElementById("reactionText");
  const finalDetails = document.getElementById("finalDetails");
  const calendarActions = document.getElementById("calendarActions");
  const googleCalendarLink = document.getElementById("googleCalendarLink");
  const downloadCalendar = document.getElementById("downloadCalendar");
  const submitStatus = document.getElementById("submitStatus");
  const mapHint = document.getElementById("mapHint");
  const judgingCaption = document.getElementById("judgingCaption");
  const judgingMedia = document.getElementById("judgingMedia");
  const judgingImage = document.getElementById("judgingImage");
  const judgingFallback = document.getElementById("judgingFallback");
  const rejectionVideo = document.getElementById("rejectionVideo");
  const introVideo = document.getElementById("introVideo");
  const introPlayButton = document.getElementById("introPlayButton");
  const typedQuestion = document.getElementById("typedQuestion");
  const introChoices = document.getElementById("introChoices");
  const introQuestion = "My Favorite Guapo, will you watch Avatar season 2 with me this weekend?";
  let introTypingStarted = false;
  let introPlayAttempting = false;

  function showScreen(name) {
    screens.forEach((screen, screenName) => {
      screen.classList.toggle("is-hidden", screenName !== name);
    });
    if (name === "rejection" && rejectionVideo) {
      rejectionVideo.muted = false;
      rejectionVideo.volume = 1;
      rejectionVideo.currentTime = 0;
      rejectionVideo.play().catch(() => {});
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function formatHour(hour) {
    const suffix = hour >= 12 ? "PM" : "AM";
    const hour12 = hour % 12 || 12;
    return `${hour12}:00 ${suffix}`;
  }

  function shanghaiHour(madridHour) {
    return (madridHour + 6) % 24;
  }

  function formatShanghai(hour) {
    if (hour === 0) return "12:00 AM";
    return formatHour(hour);
  }

  function pad(value) {
    return String(value).padStart(2, "0");
  }

  function formatCalendarDate(date) {
    return [
      date.getUTCFullYear(),
      pad(date.getUTCMonth() + 1),
      pad(date.getUTCDate()),
      "T",
      pad(date.getUTCHours()),
      pad(date.getUTCMinutes()),
      "00Z",
    ].join("");
  }

  function selectedCalendarWindow() {
    const day = days[state.dayKey];
    const [year, month, date] = day.madridDate.split("-").map(Number);
    const start = new Date(Date.UTC(year, month - 1, date, state.hour - 2, 0, 0));
    const end = new Date(start.getTime() + calendarEventDurationMinutes * 60 * 1000);
    return { day, start, end };
  }

  function calendarDescription() {
    const day = days[state.dayKey];
    const lines = [
      "Avatar season 2 watch time.",
      `${day.label}, ${formatHour(state.hour)} Madrid / ${formatShanghai(shanghaiHour(state.hour))} Shanghai`,
    ];

    if (calendarEventLink) {
      lines.push(`Link: ${calendarEventLink}`);
    }

    return lines.join("\n");
  }

  function calendarTitle() {
    return "Avatar Season 2";
  }

  function updateCalendarLinks() {
    if (state.hour == null || !state.dayKey) return;

    const { start, end } = selectedCalendarWindow();
    const dates = `${formatCalendarDate(start)}/${formatCalendarDate(end)}`;
    const params = new URLSearchParams({
      action: "TEMPLATE",
      text: calendarTitle(),
      dates,
      details: calendarDescription(),
    });

    if (calendarEventLink) {
      params.set("location", calendarEventLink);
    }

    googleCalendarLink.href = `https://calendar.google.com/calendar/render?${params.toString()}`;
  }

  function downloadCalendarFile() {
    if (state.hour == null || !state.dayKey) return;

    const { start, end } = selectedCalendarWindow();
    const ics = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Avatar Season 2 Quest//EN",
      "BEGIN:VEVENT",
      `UID:avatar-season-2-${Date.now()}@avatar-quest`,
      `DTSTAMP:${formatCalendarDate(new Date())}`,
      `DTSTART:${formatCalendarDate(start)}`,
      `DTEND:${formatCalendarDate(end)}`,
      `SUMMARY:${calendarTitle()}`,
      `DESCRIPTION:${calendarDescription().replace(/\n/g, "\\n")}`,
      calendarEventLink ? `LOCATION:${calendarEventLink}` : "",
      "END:VEVENT",
      "END:VCALENDAR",
    ].filter(Boolean).join("\r\n");

    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "avatar-season-2.ics";
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function pickJudgingImage() {
    const nextImage = judgingImages[Math.floor(Math.random() * judgingImages.length)];
    const label = nextImage
      .replace("images/me/", "me-")
      .replace(/\.(jpg|jpeg|png|webp)$/i, "");

    return { nextImage, label };
  }

  function setReactionImage(image, fallback, imageChoice) {
    if (!image || !fallback) return;

    image.removeAttribute("data-missing");
    image.dataset.asset = imageChoice.label;
    image.src = imageChoice.nextImage;
    fallback.textContent = `[${imageChoice.label}]`;
  }

  function shuffleJudgingImage() {
    const imageChoice = pickJudgingImage();
    setReactionImage(judgingImage, judgingFallback, imageChoice);
  }

  function typeIntroQuestion() {
    if (introTypingStarted) return;
    introTypingStarted = true;
    document.querySelector("[data-screen='intro']")?.classList.add("video-done");
    introVideo.pause();
    typedQuestion.textContent = "";

    let index = 0;
    const intervalId = window.setInterval(() => {
      typedQuestion.textContent += introQuestion[index];
      index += 1;

      if (index >= introQuestion.length) {
        window.clearInterval(intervalId);
        introChoices.classList.remove("is-hidden");
      }
    }, 55);
  }

  function classifyHour(day, hour) {
    if (hour < day.validStart) {
      return {
        valid: false,
        type: "too-early",
        reaction: "Javi. I admire the confidence, but I will be spiritually unavailable.",
      };
    }

    if (hour > day.validEnd) {
      return {
        valid: false,
        type: "too-late",
        reaction: "At that hour I will be in the Spirit World, also known as asleep.",
      };
    }

    return {
      valid: true,
      type: "approved",
      reaction: "Good choice.",
    };
  }

  function renderTimes() {
    const day = days[state.dayKey];
    dayLabel.textContent = `${day.element}: ${day.label} in Madrid time`;
    timeGrid.innerHTML = "";
    reactionCard.className = "reaction-card";
    judgingCaption.classList.remove("is-hidden");
    judgingMedia.classList.remove("is-hidden");
    reactionText.textContent = "";

    hourOptions.forEach((hour) => {
      const judgment = classifyHour(day, hour);
      const button = document.createElement("button");
      button.className = `time-button ${judgment.valid ? "valid" : "invalid"}`;
      button.type = "button";
      button.textContent = formatHour(hour);
      button.addEventListener("click", (event) => selectTime(hour, event));
      timeGrid.append(button);
    });
  }

  function selectTime(hour, event) {
    const day = days[state.dayKey];
    const judgment = classifyHour(day, hour);
    state.hour = hour;
    state.valid = judgment.valid;
    state.reaction = judgment.reaction;
    reactionText.textContent = judgment.reaction;
    reactionCard.className = `reaction-card ${judgment.valid ? "is-approved" : "is-warning"}`;
    createSparks(event.clientX, event.clientY, judgment.valid ? 18 : 8);

    if (!judgment.valid) {
      judgingCaption.classList.add("is-hidden");
      judgingMedia.classList.add("is-hidden");
      sendSubmission("invalid_time");
      return;
    }

    finalDetails.textContent = [
      `${day.label}, ${formatHour(hour)} Madrid`,
      `${formatShanghai(shanghaiHour(hour))} Shanghai`,
    ].join(" / ");
    updateCalendarLinks();
    calendarActions.classList.add("is-hidden");
    submitStatus.textContent = "";
    setTimeout(() => showScreen("final"), 450);
  }

  function createSparks(x, y, count) {
    const template = document.getElementById("sparkTemplate");
    for (let index = 0; index < count; index += 1) {
      const spark = template.content.firstElementChild.cloneNode(true);
      spark.style.left = `${x + (Math.random() - 0.5) * 80}px`;
      spark.style.top = `${y + (Math.random() - 0.5) * 50}px`;
      spark.style.background = index % 3 === 0 ? "#56a6b7" : index % 3 === 1 ? "#d65a30" : "#e5c66b";
      document.body.append(spark);
      window.setTimeout(() => spark.remove(), 950);
    }
  }

  async function sendSubmission(eventName) {
    if (!hasSubmissionEndpoint) {
      return { ok: false, skipped: true };
    }

    const day = state.dayKey ? days[state.dayKey] : null;
    const payload = {
      token: submissionToken,
      eventName,
      accepted: state.accepted,
      day: day?.label || "",
      element: day?.element || "",
      madridDate: day?.madridDate || "",
      madridTime: state.hour == null ? "" : formatHour(state.hour),
      shanghaiTime: state.hour == null ? "" : formatShanghai(shanghaiHour(state.hour)),
      valid: state.valid,
      reaction: state.reaction,
      note: "",
      pageUrl: window.location.href,
      userAgent: navigator.userAgent,
    };

    const response = await fetch(submissionUrl, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload),
    });

    return { ok: true, response };
  }

  function markMissingMedia() {
    document.querySelectorAll("[data-asset]").forEach((media) => {
      media.addEventListener("error", () => {
        media.dataset.missing = "true";
      });

      if (media.tagName === "IMG" && media.complete && media.naturalWidth === 0) {
        media.dataset.missing = "true";
      }
    });
  }

  document.addEventListener("click", (event) => {
    const goButton = event.target.closest("[data-go]");
    if (goButton) {
      showScreen(goButton.dataset.go);
      return;
    }

    const choiceButton = event.target.closest("[data-choice]");
    if (choiceButton) {
      state.accepted = choiceButton.dataset.choice === "yes";
      state.reaction = state.accepted ? "Yes" : "No";
      if (state.accepted) {
        showScreen("map");
      } else {
        state.valid = false;
        sendSubmission("rejection");
        showScreen("rejection");
      }
      return;
    }

    const dayButton = event.target.closest("[data-day]");
    if (dayButton) {
      shuffleJudgingImage();
      state.dayKey = dayButton.dataset.day;
      state.hour = null;
      state.valid = false;
      mapHint.textContent = "It's all Madrid time.";
      renderTimes();
      showScreen("time");
      return;
    }

    const decoyButton = event.target.closest("[data-decoy]");
    if (decoyButton) {
      shuffleJudgingImage();
      state.reaction = decoyButton.dataset.decoy === "fire"
        ? "Why Would you do that ? you win you win.."
        : "Next season ..";
      state.valid = false;
      mapHint.textContent = state.reaction;
      sendSubmission("decoy_choice");
    }
  });

  document.getElementById("submitScroll").addEventListener("click", async () => {
    submitStatus.textContent = hasSubmissionEndpoint ? "Submitting..." : "";
    try {
      await sendSubmission("final_submission");
      state.submitted = true;
      submitStatus.textContent = hasSubmissionEndpoint ? "Submitted." : "";
      updateCalendarLinks();
      calendarActions.classList.remove("is-hidden");
    } catch (error) {
      submitStatus.textContent = "";
    }
  });

  downloadCalendar.addEventListener("click", downloadCalendarFile);

  introVideo.addEventListener("ended", typeIntroQuestion);
  introVideo.addEventListener("error", typeIntroQuestion);
  introVideo.addEventListener("play", () => {
    introPlayButton.classList.add("is-hidden");
    introPlayAttempting = false;
  });
  introPlayButton.addEventListener("click", async () => {
    if (introPlayAttempting) return;
    introPlayAttempting = true;
    introPlayButton.disabled = true;
    introVideo.muted = false;
    introVideo.volume = 1;
    introVideo.controls = true;
    introPlayButton.classList.add("is-hidden");
    introVideo.play().catch(() => {
      introPlayAttempting = false;
      introPlayButton.disabled = false;
      introPlayButton.classList.remove("is-hidden");
    });
  });

  markMissingMedia();
  shuffleJudgingImage();
  showScreen("intro");
  if (new URLSearchParams(window.location.search).get("skipIntro") === "1") {
    typeIntroQuestion();
  } else {
    introVideo.muted = false;
    introVideo.volume = 1;
    window.setTimeout(() => {
      if (introVideo.paused && !introTypingStarted) {
        introVideo.controls = false;
        introPlayButton.classList.remove("is-hidden");
      }
    }, 900);
  }
})();
