const form = document.getElementById("item-form");
const formTitle = document.getElementById("form-title");
const submitButton = document.getElementById("submit-button");
const cancelEditButton = document.getElementById("cancel-edit");

const pages = document.querySelectorAll(".page");
const navButtons = document.querySelectorAll(".bottom-nav button");
const filterButtons = document.querySelectorAll(".filter");

const homeList = document.getElementById("home-list");
const scheduleList = document.getElementById("schedule-list");
const logList = document.getElementById("log-list");

const calendarTitle = document.getElementById("calendar-title");
const calendarGrid = document.getElementById("calendar-grid");
const prevMonthButton = document.getElementById("prev-month");
const nextMonthButton = document.getElementById("next-month");

let items = JSON.parse(localStorage.getItem("cultureItems")) || [];
let currentCalendarDate = new Date();
let currentFilter = "all";
let editingId = null;

const categoryLabels = {
  movie: "映画",
  anime: "アニメ",
  drama: "ドラマ",
  book: "小説",
  museum: "美術館"
};

navButtons.forEach(button => {
  button.addEventListener("click", () => {
    showPage(button.dataset.page);
  });
});

filterButtons.forEach(button => {
  button.addEventListener("click", () => {
    currentFilter = button.dataset.category;

    filterButtons.forEach(btn => {
      btn.classList.toggle("active", btn === button);
    });

    render();
  });
});

prevMonthButton.addEventListener("click", () => {
  currentCalendarDate.setMonth(currentCalendarDate.getMonth() - 1);
  renderCalendar();
});

nextMonthButton.addEventListener("click", () => {
  currentCalendarDate.setMonth(currentCalendarDate.getMonth() + 1);
  renderCalendar();
});

form.addEventListener("submit", event => {
  event.preventDefault();

  const itemData = {
    title: document.getElementById("title").value,
    category: document.getElementById("category").value,
    plannedDate: document.getElementById("plannedDate").value,
    endDate: document.getElementById("endDate").value,
    memo: document.getElementById("memo").value,
    rating: document.getElementById("rating").value,
    review: document.getElementById("review").value
  };

  if (editingId) {
    items = items.map(item => {
      if (item.id === editingId) {
        return {
          ...item,
          ...itemData
        };
      }
      return item;
    });
  } else {
    items.push({
      id: Date.now(),
      ...itemData,
      status: "planned",
      completedDate: ""
    });
  }

  saveItems();
  resetForm();
  render();
  showPage("schedule");
});

cancelEditButton.addEventListener("click", () => {
  resetForm();
});

function saveItems() {
  localStorage.setItem("cultureItems", JSON.stringify(items));
}

function showPage(pageName) {
  pages.forEach(page => {
    page.classList.toggle("active", page.id === pageName);
  });
}

function resetForm() {
  editingId = null;
  form.reset();
  formTitle.textContent = "追加する";
  submitButton.textContent = "追加する";
  cancelEditButton.style.display = "none";
}

function render() {
  homeList.innerHTML = "";
  scheduleList.innerHTML = "";
  logList.innerHTML = "";

  const plannedItems = items
    .filter(item => item.status !== "done")
    .sort((a, b) => (a.plannedDate || "9999").localeCompare(b.plannedDate || "9999"));

  const filteredPlannedItems =
    currentFilter === "all"
      ? plannedItems
      : plannedItems.filter(item => item.category === currentFilter);

  const doneItems = items
    .filter(item => item.status === "done")
    .sort((a, b) => (b.completedDate || "").localeCompare(a.completedDate || ""));

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const oneWeekLater = new Date(today);
  oneWeekLater.setDate(today.getDate() + 7);

  const weeklyItems = plannedItems.filter(item => {
    if (!item.plannedDate) return false;

    const date = parseDate(item.plannedDate);
    return date >= today && date <= oneWeekLater;
  });

  renderList(homeList, weeklyItems, true);
  renderList(scheduleList, filteredPlannedItems, true);
  renderList(logList, doneItems, false);
  renderCalendar();

  if (weeklyItems.length === 0) {
    homeList.innerHTML = `<p class="empty">今週の予定はまだありません。</p>`;
  }

  if (filteredPlannedItems.length === 0) {
    scheduleList.innerHTML = `<p class="empty">このカテゴリの予定はまだありません。</p>`;
  }

  if (doneItems.length === 0) {
    logList.innerHTML = `<p class="empty">完了ログはまだありません。</p>`;
  }
}

function renderList(container, list, showActions) {
  list.forEach(item => {
    const card = document.createElement("article");
    card.className = "card";

    card.innerHTML = `
      <div class="card-top">
        <div>
          <p class="card-title">${escapeHtml(item.title)}</p>
          <p class="card-meta">
            ${categoryLabels[item.category] || ""}
            ${item.plannedDate ? `｜予定日 ${formatDate(item.plannedDate)}` : ""}
            ${item.endDate ? `｜期限 ${formatDate(item.endDate)}` : ""}
            ${item.completedDate ? `｜完了 ${formatDate(item.completedDate)}` : ""}
          </p>
        </div>
      </div>

      ${item.memo ? `<p class="card-memo">${escapeHtml(item.memo)}</p>` : ""}
      ${item.rating ? `<p class="card-rating">${"★".repeat(Number(item.rating))}</p>` : ""}
      ${item.review ? `<p class="card-review">${escapeHtml(item.review)}</p>` : ""}

      ${
        showActions
          ? `
          <div class="card-actions">
            <button onclick="completeItem(${item.id})">完了</button>
            <button onclick="editItem(${item.id})">編集</button>
            <button class="delete" onclick="deleteItem(${item.id})">削除</button>
          </div>
          `
          : `
          <div class="card-actions">
            <button onclick="restoreItem(${item.id})">予定に戻す</button>
            <button onclick="editItem(${item.id})">編集</button>
            <button class="delete" onclick="deleteItem(${item.id})">削除</button>
          </div>
          `
      }
    `;

    container.appendChild(card);
  });
}

function renderCalendar() {
  calendarGrid.innerHTML = "";

  const year = currentCalendarDate.getFullYear();
  const month = currentCalendarDate.getMonth();

  calendarTitle.textContent = `${year}年 ${month + 1}月`;

  const firstDay = new Date(year, month, 1);
  const lastDate = new Date(year, month + 1, 0).getDate();
  const startDay = firstDay.getDay();

  for (let i = 0; i < startDay; i++) {
    const emptyCell = document.createElement("div");
    emptyCell.className = "calendar-day empty";
    calendarGrid.appendChild(emptyCell);
  }

  for (let date = 1; date <= lastDate; date++) {
    const dateString = `${year}-${String(month + 1).padStart(2, "0")}-${String(date).padStart(2, "0")}`;

    const dayItems = items.filter(item =>
      item.status !== "done" && item.plannedDate === dateString
    );

    const dayCell = document.createElement("div");
    dayCell.className = "calendar-day";

    dayCell.innerHTML = `
      <div class="calendar-date">${date}</div>
      ${dayItems.map(item => `
        <div class="calendar-item">${escapeHtml(item.title)}</div>
      `).join("")}
    `;

    calendarGrid.appendChild(dayCell);
  }
}

function completeItem(id) {
  items = items.map(item => {
    if (item.id === id) {
      return {
        ...item,
        status: "done",
        completedDate: new Date().toISOString().slice(0, 10)
      };
    }
    return item;
  });

  saveItems();
  render();
}

function restoreItem(id) {
  items = items.map(item => {
    if (item.id === id) {
      return {
        ...item,
        status: "planned",
        completedDate: ""
      };
    }
    return item;
  });

  saveItems();
  render();
}

function editItem(id) {
  const item = items.find(item => item.id === id);
  if (!item) return;

  editingId = id;

  document.getElementById("title").value = item.title || "";
  document.getElementById("category").value = item.category || "movie";
  document.getElementById("plannedDate").value = item.plannedDate || "";
  document.getElementById("endDate").value = item.endDate || "";
  document.getElementById("memo").value = item.memo || "";
  document.getElementById("rating").value = item.rating || "";
  document.getElementById("review").value = item.review || "";

  formTitle.textContent = "編集する";
  submitButton.textContent = "保存する";
  cancelEditButton.style.display = "block";

  showPage("add");
}

function deleteItem(id) {
  items = items.filter(item => item.id !== id);
  saveItems();
  render();
}

function formatDate(dateString) {
  const date = parseDate(dateString);
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

function parseDate(dateString) {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, char => {
    return {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    }[char];
  });
}

resetForm();
render();