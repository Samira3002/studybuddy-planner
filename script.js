
"use strict";

const STORAGE_KEY = "studybuddy_assignments_v1";

const form = document.getElementById("assignmentForm");
const titleInput = document.getElementById("title");
const subjectInput = document.getElementById("subject");
const dueDateInput = document.getElementById("dueDate");
const priorityInput = document.getElementById("priority");
const formError = document.getElementById("formError");
const statusFilter = document.getElementById("statusFilter");
const assignmentList = document.getElementById("assignmentList");

let assignments = loadAssignments();

function localDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function createId() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function loadAssignments() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (saved !== null) {
      const parsed = JSON.parse(saved);

      if (!Array.isArray(parsed)) {
        return [];
      }

      return parsed.filter(task =>
        task &&
        typeof task.id === "string" &&
        typeof task.title === "string" &&
        typeof task.subject === "string" &&
        typeof task.dueDate === "string" &&
        ["Low", "Medium", "High"].includes(task.priority) &&
        typeof task.completed === "boolean"
      );
    }

    // Example tasks are added only on first use.
    return [
      {
        id: createId(),
        title: "Finish Java assignment",
        subject: "Programming",
        dueDate: localDateString(new Date(Date.now() + 2 * 86400000)),
        priority: "High",
        completed: false
      },
      {
        id: createId(),
        title: "Review lecture notes",
        subject: "Mathematics",
        dueDate: localDateString(new Date(Date.now() + 4 * 86400000)),
        priority: "Medium",
        completed: false
      },
      {
        id: createId(),
        title: "Read course chapter",
        subject: "Web Development",
        dueDate: localDateString(new Date(Date.now() + 7 * 86400000)),
        priority: "Low",
        completed: true
      }
    ];
  } catch (error) {
    console.error("Could not load saved assignments:", error);
    return [];
  }
}

function saveAssignments() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(assignments));
    return true;
  } catch (error) {
    console.error("Could not save assignments:", error);
    formError.textContent =
      "Could not save your tasks. Check your browser storage settings.";
    return false;
  }
}

function formatDate(dateString) {
  const parts = dateString.split("-").map(Number);

  if (parts.length !== 3 || parts.some(Number.isNaN)) {
    return "Invalid date";
  }

  const date = new Date(parts[0], parts[1] - 1, parts[2]);

  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric"
  }).format(date);
}

function getDateStatus(task) {
  if (task.completed) {
    return { text: "Completed", className: "status-done" };
  }

  const today = localDateString();

  if (task.dueDate < today) {
    return { text: "Overdue", className: "status-overdue" };
  }

  const due = new Date(`${task.dueDate}T00:00:00`);
  const todayDate = new Date(`${today}T00:00:00`);
  const daysLeft = Math.round((due - todayDate) / 86400000);

  if (daysLeft === 0) {
    return { text: "Due today", className: "status-soon" };
  }

  if (daysLeft <= 2) {
    return { text: "Due soon", className: "status-soon" };
  }

  return null;
}

function createElement(tag, className, text) {
  const element = document.createElement(tag);

  if (className) {
    element.className = className;
  }

  if (text !== undefined) {
    element.textContent = text;
  }

  return element;
}

function renderAssignments() {
  const total = assignments.length;
  const completed = assignments.filter(task => task.completed).length;
  const pending = total - completed;
  const overdue = assignments.filter(task =>
    !task.completed && task.dueDate < localDateString()
  ).length;

  document.getElementById("totalCount").textContent = total;
  document.getElementById("pendingCount").textContent = pending;
  document.getElementById("completedCount").textContent = completed;
  document.getElementById("overdueCount").textContent = overdue;

  const progress = total === 0 ? 0 : Math.round((completed / total) * 100);

  document.getElementById("progressText").textContent = `${progress}%`;
  document.getElementById("progressBar").style.width = `${progress}%`;

  const filter = statusFilter.value;

  const visibleTasks = assignments
    .filter(task => {
      if (filter === "Pending") return !task.completed;
      if (filter === "Completed") return task.completed;
      return true;
    })
    .sort((a, b) => {
      if (a.completed !== b.completed) {
        return Number(a.completed) - Number(b.completed);
      }

      return a.dueDate.localeCompare(b.dueDate);
    });

  assignmentList.replaceChildren();

  if (visibleTasks.length === 0) {
    const empty = createElement("div", "empty-state");
    empty.append(
      createElement("div", "empty-icon", "📝"),
      createElement(
        "h3",
        "",
        filter === "Completed"
          ? "No completed assignments yet"
          : filter === "Pending"
            ? "You're all caught up!"
            : "Your study space is ready"
      ),
      createElement(
        "p",
        "",
        filter === "Completed"
          ? "Completed tasks will appear here."
          : filter === "Pending"
            ? "There are no pending tasks to show."
            : "Add an assignment to start organizing your work."
      )
    );

    assignmentList.append(empty);
    return;
  }

  visibleTasks.forEach(task => {
    const card = createElement(
      "article",
      `assignment${task.completed ? " done" : ""}`
    );

    const checkbox = createElement("input", "task-check");
    checkbox.type = "checkbox";
    checkbox.checked = task.completed;
    checkbox.setAttribute(
      "aria-label",
      `Mark ${task.title} as ${task.completed ? "pending" : "completed"}`
    );

    checkbox.addEventListener("change", () => {
      const target = assignments.find(item => item.id === task.id);

      if (!target) return;

      target.completed = checkbox.checked;
      saveAssignments();
      renderAssignments();
    });

    const main = createElement("div", "task-main");
    const taskTitle = createElement("h3", "task-title", task.title);
    const taskSubject = createElement("p", "task-subject", task.subject);
    const meta = createElement("div", "task-meta");

    const priorityClass = task.priority.toLowerCase();
    const priority = createElement(
      "span",
      `priority priority-${priorityClass}`,
      `${task.priority} priority`
    );

    const date = createElement("span", "task-date", formatDate(task.dueDate));

    meta.append(priority, date);

    const dateStatus = getDateStatus(task);

    if (dateStatus) {
      meta.append(
        createElement("span", `status-tag ${dateStatus.className}`, dateStatus.text)
      );
    }

    main.append(taskTitle, taskSubject, meta);

    const deleteButton = createElement("button", "delete-button", "×");
    deleteButton.type = "button";
    deleteButton.setAttribute("aria-label", `Delete ${task.title}`);
    deleteButton.title = "Delete assignment";

    deleteButton.addEventListener("click", () => {
      const shouldDelete = window.confirm(
        `Delete "${task.title}"? This cannot be undone.`
      );

      if (!shouldDelete) return;

      assignments = assignments.filter(item => item.id !== task.id);
      saveAssignments();
      renderAssignments();
    });

    card.append(checkbox, main, deleteButton);
    assignmentList.append(card);
  });
}

form.addEventListener("submit", event => {
  event.preventDefault();
  formError.textContent = "";

  const title = titleInput.value.trim();
  const subject = subjectInput.value.trim();
  const dueDate = dueDateInput.value;
  const priority = priorityInput.value;

  if (!title || !subject || !dueDate) {
    formError.textContent = "Please fill in all fields.";
    return;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
    formError.textContent = "Please enter a valid due date.";
    return;
  }

  const parsedDate = new Date(`${dueDate}T00:00:00`);

  if (
    Number.isNaN(parsedDate.getTime()) ||
    localDateString(parsedDate) !== dueDate
  ) {
    formError.textContent = "Please enter a valid calendar date.";
    return;
  }

  if (!["Low", "Medium", "High"].includes(priority)) {
    formError.textContent = "Please select a valid priority.";
    return;
  }

  assignments.push({
    id: createId(),
    title,
    subject,
    dueDate,
    priority,
    completed: false
  });

  saveAssignments();
  form.reset();
  priorityInput.value = "Medium";
  formError.textContent = "";
  renderAssignments();
  titleInput.focus();
});

statusFilter.addEventListener("change", renderAssignments);

// Do not overwrite existing saved assignments.
if (!localStorage.getItem(STORAGE_KEY)) {
  saveAssignments();
}

renderAssignments();
