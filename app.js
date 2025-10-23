/** Simple SPA Router (hash-based) **/
const routes = {};
function route(path, render) {
  routes[path] = render;
}
function go(path) {
  location.hash = path;
}
function startRouter() {
  window.addEventListener("hashchange", render);
  if (!location.hash) location.hash = "/";
  render();
}
function el(html) {
  const t = document.createElement("template");
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}
function $(sel, root = document) {
  return root.querySelector(sel);
}

/** In-Memory Storage (بديل localStorage) **/
const MemoryDB = {
  data: {},
  get(key, fallback) {
    return this.data[key] !== undefined ? this.data[key] : fallback;
  },
  set(key, val) {
    this.data[key] = val;
  },
};

// Default user profile
function initProfile() {
  const u = MemoryDB.get("user", null);
  if (!u) {
    MemoryDB.set("user", {
      uid: "u1",
      name: "لاعب",
      level: 1,
      xp: 0,
      gamesPlayed: 0,
      unlocked: { simulation: true, multiplayer: true },
    });
  }
}

function gainXP(points) {
  const u = MemoryDB.get("user", {});
  u.xp = (u.xp || 0) + points;
  u.gamesPlayed = (u.gamesPlayed || 0) + 1;
  // Simple level up: every 50 xp
  const newLevel = Math.floor(u.xp / 50) + 1;
  u.level = newLevel;
  MemoryDB.set("user", u);
}

async function loadQuestions(stageId = "stage1") {
  const res = await fetch("questions.json");
  const data = await res.json();
  return data[stageId] || [];
}

/** Character Animation Helper **/
function createCharacterAvatar(signEmoji = "👋", message = "مرحباً! أنا هنا لمساعدتك 👋") {
  return `
    <div class="avatar">
      <img 
        src="https://i.postimg.cc/3RQM0b65/20251021-0019-image.png" 
        alt="شخصية لغة الإشارة"
        class="character-img"
      />
      ${signEmoji ? `<div class="character-sign">${signEmoji}</div>` : ""}
      <div class="character-message">${message}</div>
    </div>
  `;
}

/** Views **/
function layout(children, activeTab = "home") {
  const container = el(`<div class="container">
    <div class="card">
      <div class="header">
        <div class="brand">
          <div class="brand-badge">إ</div>
          <div>
            <h1 class="h1">لعبة لغة الإشارة</h1>
            <p class="p">نسخة تجريبية للعرض الأكاديمي</p>
          </div>
        </div>
        <button class="btn row" onclick="go('/profile')">بروفايل</button>
      </div>
      <div style="height:12px"></div>
      ${children}
    </div>
    <div style="height:12px"></div>
    <nav class="navbar">
      <a href="#/home" class="${activeTab === "home" ? "active" : ""}">الرئيسية</a>
      <a href="#/quiz" class="${activeTab === "quiz" ? "active" : ""}">الأسئلة</a>
      <a href="#/simulation" class="${activeTab === "simulation" ? "active" : ""}">المحاكاة</a>
      <a href="#/multiplayer" class="${activeTab === "multiplayer" ? "active" : ""}">جماعي</a>
      <a href="#/community" class="${activeTab === "community" ? "active" : ""}">مجتمع</a>
    </nav>
  </div>`);
  return container;
}

// Welcome Screen
routes["/"] = () => {
  const view = el(`<div class="container">
    <div class="card" style="text-align:center">
      <div class="brand" style="justify-content:center;margin-bottom:12px">
        <div class="brand-badge" style="width:64px;height:64px;font-size:22px;">إ</div>
        <div>
          <h1 class="h1">أهلاً بك</h1>
          <p class="p">ابدأ التعلم باللعب ✨</p>
        </div>
      </div>
      ${createCharacterAvatar("👋", "مرحباً! دعنا نبدأ رحلة التعلم 🌟")}
      <div style="height:12px"></div>
      <button class="btn" onclick="go('/home')">ابدأ الآن</button>
    </div>
  </div>`);
  $("#app").replaceChildren(view);
};

// Home Page
routes["/home"] = () => {
  const u = MemoryDB.get("user", {});
  const content = `
  <h2 class="h2">القسم الرئيسي</h2>
  <div class="grid">
    <div class="tile" onclick="go('/quiz')">
      <div class="badge">جديد</div>
      <h3>تحدي الأسئلة</h3>
      <p class="p">أسئلة متعددة الخيارات مع مؤقت وتلميح</p>
    </div>
    <div class="tile" onclick="go('/simulation')">
      <div class="badge">مرحلة واحدة</div>
      <h3>المحاكاة</h3>
      <p class="p">تجربة عملية لإشارة مع شخصية</p>
    </div>
    <div class="tile" onclick="go('/multiplayer')">
      <div class="badge">مرحلة واحدة</div>
      <h3>اللعب الجماعي</h3>
      <p class="p">واجهة تجريبية لغرفة مبسطة</p>
    </div>
    <div class="tile" onclick="go('/community')">
      <div class="badge">تجريبي</div>
      <h3>المجتمع</h3>
      <p class="p">شات تفاعلي مبسّط</p>
    </div>
  </div>
  <div class="footer">
    <div>المستوى: <b>${u.level || 1}</b></div>
    <div>الخبرة: <b>${u.xp || 0}</b></div>
    <div>ألعاب: <b>${u.gamesPlayed || 0}</b></div>
  </div>`;
  $("#app").replaceChildren(layout(content, "home"));
};

// Quiz View
routes["/quiz"] = async () => {
  const qs = await loadQuestions("stage1");
  let index = 0;
  let score = 0;
  let locked = false;
  let timePerQ = 20;
  let timeLeft = timePerQ;
  let timerId = null;

  function renderQ() {
    const q = qs[index];
    if (!q) {
      gainXP(score);
      const u = MemoryDB.get("user", {});
      const done = el(`<div class="container">
        <div class="card" style="text-align:center">
          ${createCharacterAvatar("🎉", "أحسنت! لقد أنهيت التحدي 🌟")}
          <div style="height:12px"></div>
          <h2 class="h2">النتيجة النهائية</h2>
          <p class="p">لقد حصلت على</p>
          <div class="h1" style="color:var(--primary);font-size:48px;margin:10px 0">${score} نقطة</div>
          <div style="background:#fff4df;padding:12px;border-radius:12px;margin:10px 0">
            <div style="margin-bottom:6px">المستوى الحالي: <b>${u.level}</b></div>
            <div>إجمالي الخبرة: <b>${u.xp}</b> XP</div>
          </div>
          <button class="btn" onclick="go('/home')">عودة للرئيسية</button>
        </div>
      </div>`);
      $("#app").replaceChildren(done);
      return;
    }

    const choices = q.choices
      .map((c, i) => `<button class="choice" data-i="${i}">${c}</button>`)
      .join("");
    const view = layout(
      `
      <div class="row" style="justify-content:space-between">
        <div class="badge">سؤال ${index + 1} من ${qs.length}</div>
        <div class="timer">⏱ ${timeLeft}s</div>
      </div>
      ${createCharacterAvatar(q.signImage || "🤔", "راقب الإشارة جيداً!")}
      <h2 class="h2">${q.text}</h2>
      <div class="grid">
        ${choices}
      </div>
      <div class="row" style="margin-top:10px">
        ${q.hint ? `<button id="hintBtn" class="btn secondary">💡 تلميح</button>` : ""}
        <button id="skipBtn" class="btn secondary">⏭ تخطي</button>
      </div>
      ${q.hint ? `<div id="hintBox" class="hint" style="display:none;margin-top:8px">${q.hint}</div>` : ""}
    `,
      "quiz"
    );

    $("#app").replaceChildren(view);

    // Events
    $("#hintBtn")?.addEventListener("click", () => {
      const box = $("#hintBox");
      if (box) box.style.display = box.style.display === "none" ? "block" : "none";
    });
    $("#skipBtn").addEventListener("click", () => nextQ());

    document.querySelectorAll(".choice").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        if (locked) return;
        locked = true;
        const i = Number(e.currentTarget.getAttribute("data-i"));
        const correct = i === q.correctIndex;
        if (correct) {
          score += 10;
          e.currentTarget.classList.add("correct");
        } else {
          e.currentTarget.classList.add("wrong");
        }
        setTimeout(() => nextQ(), 1000);
      });
    });

    // Timer
    clearInterval(timerId);
    timeLeft = timePerQ;
    timerId = setInterval(() => {
      timeLeft--;
      const t = document.querySelector(".timer");
      if (t) t.textContent = `⏱ ${timeLeft}s`;
      if (timeLeft <= 0) {
        clearInterval(timerId);
        nextQ();
      }
    }, 1000);
  }

  function nextQ() {
    index++;
    locked = false;
    renderQ();
  }
  renderQ();
};

// Simulation (one stage open)
routes["/simulation"] = () => {
  const lockedStages = [
    { title: "مرحلة 2", locked: true },
    { title: "مرحلة 3", locked: true },
  ];
  const open = { title: "مرحلة 1", locked: false };

  const content = `
    <h2 class="h2">المحاكاة - مرحلة واحدة مفتوحة</h2>
    ${createCharacterAvatar("✋", "اختر الإشارة الصحيحة!")}
    <div style="height:10px"></div>
    <button class="btn" onclick="alert('تفاعل بسيط للمحاكاة: اختر الإشارة الصحيحة من الخيارات')">ابدأ المحاكاة</button>
    <div style="height:16px"></div>
    <div class="grid">
      <div class="tile">${open.title} <div class="small">✅ مفتوحة</div></div>
      ${lockedStages
        .map(
          (s) =>
            `<div class="tile locked">${s.title} <div class="small">🔒 مقفلة</div></div>`
        )
        .join("")}
    </div>
  `;
  $("#app").replaceChildren(layout(content, "simulation"));
};

// Multiplayer (one room stage open - mock)
routes["/multiplayer"] = () => {
  const roomId = "room-1";
  const room = MemoryDB.get(`room:${roomId}`, {
    players: ["أنت", "ضيف"],
    turn: "أنت",
    createdAt: Date.now(),
  });
  MemoryDB.set(`room:${roomId}`, room);

  const content = `
    <h2 class="h2">اللعب الجماعي - غرفة تجريبية</h2>
    <div class="card" style="background:#fffaf2;border:1px solid #ffe1b5">
      <div class="row"><b>👥 اللاعبون:</b> ${room.players.join(" ، ")}</div>
      <div class="p">الدور الحالي: <b>${room.turn}</b></div>
      <div style="height:6px"></div>
      <button class="btn" onclick="alert('سؤال جماعي تجريبي! 🎮')">🎯 بدء السؤال</button>
    </div>
  `;
  $("#app").replaceChildren(layout(content, "multiplayer"));
};

// Profile
routes["/profile"] = () => {
  const u = MemoryDB.get("user", {});
  const content = `
    <h2 class="h2">الملف الشخصي</h2>
    <div class="grid">
      <div class="tile"><div class="p">الاسم</div><div class="h2">${u.name || "لاعب"}</div></div>
      <div class="tile"><div class="p">المستوى</div><div class="h2">${u.level || 1}</div></div>
      <div class="tile"><div class="p">الخبرة</div><div class="h2">${u.xp || 0}</div></div>
      <div class="tile"><div class="p">عدد الألعاب</div><div class="h2">${u.gamesPlayed || 0}</div></div>
    </div>
    <div style="height:10px"></div>
    <button class="btn secondary" onclick="if(confirm('هل تريد حقاً إعادة ضبط كل البيانات؟')) { location.reload(); }">🔄 إعادة ضبط البيانات</button>