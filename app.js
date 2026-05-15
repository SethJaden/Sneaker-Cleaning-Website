const STORAGE_KEYS = {
  theme: "chacen-theme",
  role: "chacen-role",
  userEmail: "chacen-user-email",
  appointments: "chacen-appointments",
  users: "chacen-users",
  showcase: "chacen-showcase",
};

const ADMIN_PASSWORD = "chacen-admin";

const STATUS_COLORS = {
  Pending: "#7b7b88",
  Confirmed: "#276ef1",
  "In Progress": "#c46800",
  Completed: "#1f9d50",
};

const state = {
  role: localStorage.getItem(STORAGE_KEYS.role) || null,
  userEmail: localStorage.getItem(STORAGE_KEYS.userEmail) || "",
  appointments: readAppointments(),
  users: readUsers(),
  showcase: readShowcase(),
};

const themeToggle = document.getElementById("themeToggle");
const themeIcon = document.getElementById("themeIcon");
const adminLoginBtn = document.getElementById("adminLoginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const userAuthSection = document.getElementById("userAuthSection");
const customerSection = document.getElementById("customerSection");
const adminSection = document.getElementById("adminSection");
const heroBookNowBtn = document.getElementById("heroBookNowBtn");
const userAuthForm = document.getElementById("userAuthForm");
const authMessage = document.getElementById("authMessage");
const bookingForm = document.getElementById("bookingForm");
const formMessage = document.getElementById("formMessage");
const customerAppointments = document.getElementById("customerAppointments");
const adminAppointments = document.getElementById("adminAppointments");
const adminUsersList = document.getElementById("adminUsersList");
const analyticsGrid = document.getElementById("analyticsGrid");
const showcaseGrid = document.getElementById("showcaseGrid");
const adminShowcaseCurrent = document.getElementById("adminShowcaseCurrent");
const showcaseForm = document.getElementById("showcaseForm");
const showcaseMessage = document.getElementById("showcaseMessage");
const successToast = document.getElementById("successToast");
const toastIcon = document.getElementById("toastIcon");
const toastText = document.getElementById("toastText");
const template = document.getElementById("appointmentTemplate");
const slides = Array.from(document.querySelectorAll(".slide"));
const slideDots = document.getElementById("slideDots");

let activeSlideIndex = 0;
let slideIntervalId = null;

themeToggle.addEventListener("click", toggleTheme);
heroBookNowBtn.addEventListener("click", showCustomerBooking);
adminLoginBtn.addEventListener("click", () => enterRole("admin"));
logoutBtn.addEventListener("click", logout);
userAuthForm.addEventListener("submit", handleUserAuth);
bookingForm.addEventListener("submit", handleBookingSubmit);
showcaseForm.addEventListener("submit", handleShowcaseSubmit);

boot();

function boot() {
  const savedTheme = localStorage.getItem(STORAGE_KEYS.theme) || "light";
  document.documentElement.setAttribute("data-theme", savedTheme);
  updateThemeIcon(savedTheme);
  renderShowcase();
  setupSlideshow();
  updateView();
}

function toggleTheme() {
  const current = document.documentElement.getAttribute("data-theme");
  const nextTheme = current === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", nextTheme);
  localStorage.setItem(STORAGE_KEYS.theme, nextTheme);
  updateThemeIcon(nextTheme);
}

function updateThemeIcon(theme) {
  themeIcon.textContent = theme === "dark" ? "☀️" : "🌙";
}

function enterRole(role) {
  if (role === "admin") {
    const password = prompt("Enter admin password:");
    if (password !== ADMIN_PASSWORD) {
      alert("Incorrect admin password.");
      return;
    }
  }

  state.role = role;
  localStorage.setItem(STORAGE_KEYS.role, role);

  updateView();
}

function showCustomerBooking() {
  if (!state.userEmail) {
    state.role = "guest";
    localStorage.setItem(STORAGE_KEYS.role, state.role);
    updateView();
    showToast("info", "Sign in to continue with your booking.");
    userAuthSection.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }

  state.role = "customer";
  localStorage.setItem(STORAGE_KEYS.role, state.role);
  bookingForm.customerEmail.value = state.userEmail;
  updateView();
  customerSection.scrollIntoView({ behavior: "smooth", block: "start" });
}

function logout() {
  state.role = null;
  state.userEmail = "";
  localStorage.removeItem(STORAGE_KEYS.role);
  localStorage.removeItem(STORAGE_KEYS.userEmail);
  formMessage.textContent = "";
  updateView();
}

function updateView() {
  const isCustomer = state.role === "customer";
  const isAdmin = state.role === "admin";
  const isGuest = state.role === "guest";

  userAuthSection.classList.toggle("hidden", !isGuest);
  customerSection.classList.toggle("hidden", !isCustomer);
  adminSection.classList.toggle("hidden", !isAdmin);
  logoutBtn.classList.toggle("hidden", !state.role);
  adminLoginBtn.classList.toggle("hidden", isAdmin);
  heroBookNowBtn.classList.toggle("hidden", isAdmin);
  formMessage.textContent = "";

  if (isCustomer) {
    bookingForm.customerEmail.value = state.userEmail;
    renderCustomerAppointments();
  } else if (isAdmin) {
    renderAdminUsers();
    renderAnalytics();
    renderAdminAppointments();
    renderShowcase();
    renderAdminShowcaseCurrent();
  }
}

function handleUserAuth(event) {
  event.preventDefault();
  const data = new FormData(userAuthForm);
  const name = String(data.get("authName")).trim();
  const email = String(data.get("authEmail")).trim().toLowerCase();
  const password = String(data.get("authPassword"));
  const action = String(data.get("authAction"));

  if (!name || !email || !password) {
    setMessage(authMessage, "Please complete all sign in fields.", "error");
    return;
  }

  const existingUser = state.users.find((user) => user.email === email);

  if (action === "register") {
    if (existingUser) {
      setMessage(authMessage, "User already exists. Please sign in.", "error");
      return;
    }
    state.users.push({ name, email, password });
    saveUsers();
  } else {
    if (!existingUser || existingUser.password !== password) {
      setMessage(authMessage, "Invalid sign in credentials.", "error");
      return;
    }
  }

  state.userEmail = email;
  localStorage.setItem(STORAGE_KEYS.userEmail, email);
  state.role = "customer";
  localStorage.setItem(STORAGE_KEYS.role, state.role);
  setMessage(authMessage, "Signed in successfully. You can now book appointments.", "success");
  bookingForm.customerEmail.value = email;
  bookingForm.customerName.value = existingUser ? existingUser.name : name;
  updateView();
  showToast("success", "Welcome back! Booking is ready.");
  customerSection.scrollIntoView({ behavior: "smooth", block: "start" });
}

async function handleBookingSubmit(event) {
  event.preventDefault();
  setMessage(formMessage, "Saving appointment...", "success");
  bookingForm.classList.add("feedback-pulse");
  window.setTimeout(() => bookingForm.classList.remove("feedback-pulse"), 850);

  const formData = new FormData(bookingForm);
  const file = formData.get("designImage");
  const designImage = file && file.size > 0 ? await toBase64(file) : "";
  const customerEmail = String(formData.get("customerEmail")).trim().toLowerCase();

  const appointment = {
    id: bookingForm.dataset.editId || `apt-${Date.now()}`,
    customerName: String(formData.get("customerName")).trim(),
    customerEmail,
    customerPhone: String(formData.get("customerPhone")).trim(),
    appointmentDate: String(formData.get("appointmentDate")),
    appointmentTime: String(formData.get("appointmentTime")),
    sneakerType: String(formData.get("sneakerType")).trim(),
    cleaningPackage: String(formData.get("cleaningPackage")),
    designDetails: String(formData.get("designDetails")).trim(),
    designImage,
    status: "Pending",
    createdAt: new Date().toISOString(),
  };

  if (bookingForm.dataset.editId) {
    const current = state.appointments.find((item) => item.id === bookingForm.dataset.editId);
    appointment.status = current ? current.status : "Pending";
    appointment.createdAt = current ? current.createdAt : appointment.createdAt;
    appointment.designImage = designImage || (current ? current.designImage : "");
    state.appointments = state.appointments.map((item) =>
      item.id === bookingForm.dataset.editId ? appointment : item
    );
    setMessage(formMessage, "Appointment updated successfully.", "success");
    delete bookingForm.dataset.editId;
    bookingForm.querySelector('button[type="submit"]').textContent = "Submit Appointment";
    showToast("success", "Your appointment changes were saved.");
  } else {
    state.appointments.unshift(appointment);
    setMessage(formMessage, "Appointment submitted successfully.", "success");
    animateBookingSuccess("Appointment booked successfully!");
  }

  saveAppointments();

  state.userEmail = customerEmail;
  localStorage.setItem(STORAGE_KEYS.userEmail, state.userEmail);

  bookingForm.reset();
  document.getElementById("customerEmail").value = customerEmail;
  renderCustomerAppointments();
}

function renderCustomerAppointments() {
  const items = state.appointments.filter(
    (appointment) => appointment.customerEmail === state.userEmail
  );
  renderAppointments(customerAppointments, items, false);
}

function renderAdminAppointments() {
  renderAppointments(adminAppointments, state.appointments, true);
}

function renderAdminUsers() {
  adminUsersList.innerHTML = "";

  if (!state.users.length) {
    const empty = document.createElement("p");
    empty.className = "meta";
    empty.textContent = "No signed up users yet.";
    adminUsersList.appendChild(empty);
    return;
  }

  state.users.forEach((user) => {
    const row = document.createElement("article");
    row.className = "user-row";
    row.innerHTML = `<strong>${user.name}</strong><span>${user.email}</span>`;
    adminUsersList.appendChild(row);
  });
}

function renderAnalytics() {
  const totalAppointments = state.appointments.length;
  const completed = state.appointments.filter((item) => item.status === "Completed").length;
  const inProgress = state.appointments.filter((item) => item.status === "In Progress").length;
  const pending = state.appointments.filter((item) => item.status === "Pending").length;
  const completionRate = totalAppointments
    ? `${Math.round((completed / totalAppointments) * 100)}%`
    : "0%";

  const packagePoints = {
    "Basic Clean": 45,
    "Deep Clean": 80,
    Restoration: 120,
  };
  const estimatedRevenue = state.appointments.reduce(
    (sum, item) => sum + (packagePoints[item.cleaningPackage] || 0),
    0
  );

  analyticsGrid.innerHTML = "";
  const cards = [
    ["Total Users", state.users.length],
    ["Total Appointments", totalAppointments],
    ["Pending", pending],
    ["In Progress", inProgress],
    ["Completed", completed],
    ["Completion Rate", completionRate],
    ["Est. Revenue", `$${estimatedRevenue}`],
  ];

  cards.forEach(([label, value]) => {
    const item = document.createElement("article");
    item.className = "analytics-item";
    item.innerHTML = `<h3>${label}</h3><p>${value}</p>`;
    analyticsGrid.appendChild(item);
  });
}

function renderAppointments(container, items, adminMode) {
  container.innerHTML = "";

  if (!items.length) {
    const empty = document.createElement("p");
    empty.textContent = "No appointments yet.";
    empty.className = "meta";
    container.appendChild(empty);
    return;
  }

  items.forEach((appointment) => {
    const node = template.content.firstElementChild.cloneNode(true);
    const title = node.querySelector("h3");
    const statusBadge = node.querySelector(".status-badge");
    const meta = node.querySelector(".meta");
    const details = node.querySelector(".details");
    const design = node.querySelector(".design");
    const imageWrap = node.querySelector(".image-wrap");
    const adminControls = node.querySelector(".admin-controls");
    const userControls = node.querySelector(".user-controls");
    const editBtn = node.querySelector(".edit-btn");
    const statusSelect = node.querySelector(".status-select");

    title.textContent = `${appointment.customerName} (${appointment.cleaningPackage})`;
    statusBadge.textContent = appointment.status;
    statusBadge.style.background = STATUS_COLORS[appointment.status] || "#7b7b88";
    meta.textContent = `${appointment.appointmentDate} at ${appointment.appointmentTime} | ${appointment.customerEmail} | ${appointment.customerPhone}`;
    details.textContent = `Sneaker: ${appointment.sneakerType}`;
    design.textContent = appointment.designDetails
      ? `Design request: ${appointment.designDetails}`
      : "No custom design request.";

    if (appointment.designImage) {
      const img = document.createElement("img");
      img.src = appointment.designImage;
      img.alt = "Design reference";
      img.className = "design-image";
      imageWrap.appendChild(img);
    }

    if (adminMode) {
      adminControls.classList.remove("hidden");
      statusSelect.value = appointment.status;
      statusSelect.addEventListener("change", () => {
        updateAppointmentStatus(appointment.id, statusSelect.value);
      });
    } else {
      userControls.classList.remove("hidden");
      editBtn.addEventListener("click", () => startEditAppointment(appointment.id));
    }

    container.appendChild(node);
  });
}

function updateAppointmentStatus(appointmentId, status) {
  state.appointments = state.appointments.map((appointment) =>
    appointment.id === appointmentId ? { ...appointment, status } : appointment
  );
  saveAppointments();
  renderAdminAppointments();
}

function startEditAppointment(appointmentId) {
  const appointment = state.appointments.find((item) => item.id === appointmentId);
  if (!appointment) return;

  bookingForm.customerName.value = appointment.customerName;
  bookingForm.customerEmail.value = appointment.customerEmail;
  bookingForm.customerPhone.value = appointment.customerPhone;
  bookingForm.appointmentDate.value = appointment.appointmentDate;
  bookingForm.appointmentTime.value = appointment.appointmentTime;
  bookingForm.sneakerType.value = appointment.sneakerType;
  bookingForm.cleaningPackage.value = appointment.cleaningPackage;
  bookingForm.designDetails.value = appointment.designDetails;
  bookingForm.dataset.editId = appointment.id;
  bookingForm.querySelector('button[type="submit"]').textContent = "Save Changes";
  setMessage(formMessage, "Editing mode enabled. Update fields and save.", "success");
  customerSection.scrollIntoView({ behavior: "smooth", block: "start" });
}

function readAppointments() {
  const raw = localStorage.getItem(STORAGE_KEYS.appointments);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveAppointments() {
  localStorage.setItem(STORAGE_KEYS.appointments, JSON.stringify(state.appointments));
}

function readUsers() {
  const raw = localStorage.getItem(STORAGE_KEYS.users);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveUsers() {
  localStorage.setItem(STORAGE_KEYS.users, JSON.stringify(state.users));
}

function readShowcase() {
  const fallback = [
    {
      title: "Nike Air Max Refresh",
      before:
        "https://images.unsplash.com/photo-1460353581641-37baddab0fa2?auto=format&fit=crop&w=900&q=80",
      after:
        "https://images.unsplash.com/photo-1512374382149-233c42b6a83b?auto=format&fit=crop&w=900&q=80",
    },
    {
      title: "Jordan Deep Clean",
      before:
        "https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?auto=format&fit=crop&w=900&q=80",
      after:
        "https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?auto=format&fit=crop&w=900&q=80",
    },
    {
      title: "Custom Paint Revival",
      before:
        "https://images.unsplash.com/photo-1584735175315-9d5df23be620?auto=format&fit=crop&w=900&q=80",
      after:
        "https://images.unsplash.com/photo-1556906781-9a412961c28c?auto=format&fit=crop&w=900&q=80",
    },
  ];
  const raw = localStorage.getItem(STORAGE_KEYS.showcase);
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length < 3) return fallback;
    return parsed;
  } catch {
    return fallback;
  }
}

function saveShowcase() {
  localStorage.setItem(STORAGE_KEYS.showcase, JSON.stringify(state.showcase));
}

function toBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Image upload failed."));
    reader.readAsDataURL(file);
  });
}

async function handleShowcaseSubmit(event) {
  event.preventDefault();
  const data = new FormData(showcaseForm);
  const slot = Number(data.get("showcaseSlot"));
  const title = String(data.get("showcaseTitle")).trim();
  const beforeFile = data.get("showcaseBeforeImage");
  const afterFile = data.get("showcaseAfterImage");

  const current = state.showcase[slot] || { title: "", before: "", after: "" };
  const before = beforeFile && beforeFile.size > 0 ? await toBase64(beforeFile) : current.before;
  const after = afterFile && afterFile.size > 0 ? await toBase64(afterFile) : current.after;

  if (!before || !after || !title) {
    setMessage(showcaseMessage, "Add title and both images for this slot.", "error");
    return;
  }

  state.showcase[slot] = { title, before, after };
  saveShowcase();
  showcaseForm.reset();
  setMessage(showcaseMessage, "Showcase updated and synced to homepage.", "success");
  showToast("success", "Homepage showcase updated.");
  renderShowcase();
  renderAdminShowcaseCurrent();
}

function renderShowcase() {
  showcaseGrid.innerHTML = "";
  state.showcase.forEach((item) => {
    const card = document.createElement("article");
    card.className = "placeholder-item";
    card.innerHTML = `
      <h3>${item.title}</h3>
      <div class="showcase-compare">
        <figure class="showcase-photo">
          <img src="${item.before}" alt="${item.title} before cleaning" />
          <figcaption>Before</figcaption>
        </figure>
        <figure class="showcase-photo">
          <img src="${item.after}" alt="${item.title} after cleaning" />
          <figcaption>After</figcaption>
        </figure>
      </div>
    `;
    showcaseGrid.appendChild(card);
  });
}

function renderAdminShowcaseCurrent() {
  adminShowcaseCurrent.innerHTML = "";

  state.showcase.forEach((item, index) => {
    const card = document.createElement("article");
    card.className = "placeholder-item";
    card.innerHTML = `
      <h3>Slot ${index + 1}: ${item.title}</h3>
      <div class="showcase-compare">
        <figure class="showcase-photo">
          <img src="${item.before}" alt="Current before image for ${item.title}" />
          <figcaption>Current Before</figcaption>
        </figure>
        <figure class="showcase-photo">
          <img src="${item.after}" alt="Current after image for ${item.title}" />
          <figcaption>Current After</figcaption>
        </figure>
      </div>
    `;
    adminShowcaseCurrent.appendChild(card);
  });
}

function animateBookingSuccess(message) {
  showToast("success", message);
}

function showToast(type, message) {
  successToast.classList.remove("hidden", "error", "info");
  if (type === "error") successToast.classList.add("error");
  if (type === "info") successToast.classList.add("info");
  toastIcon.textContent = type === "error" ? "!" : type === "info" ? "i" : "✓";
  toastText.textContent = message;
  successToast.classList.add("show");

  window.setTimeout(() => {
    successToast.classList.remove("show");
    successToast.classList.add("hidden");
  }, 2400);
}

function setMessage(element, text, tone) {
  element.textContent = text;
  element.classList.remove("error", "success");
  if (tone === "error") element.classList.add("error");
  if (tone === "success") element.classList.add("success");
}

function setupSlideshow() {
  if (!slides.length || !slideDots) return;

  slideDots.innerHTML = "";
  slides.forEach((_, index) => {
    const dot = document.createElement("button");
    dot.className = "slide-dot";
    dot.type = "button";
    dot.setAttribute("aria-label", `Show slide ${index + 1}`);
    dot.addEventListener("click", () => setActiveSlide(index));
    slideDots.appendChild(dot);
  });

  setActiveSlide(0);
  slideIntervalId = window.setInterval(() => {
    const next = (activeSlideIndex + 1) % slides.length;
    setActiveSlide(next);
  }, 3500);
}

function setActiveSlide(index) {
  activeSlideIndex = index;
  slides.forEach((slide, i) => slide.classList.toggle("active", i === index));

  const dots = Array.from(slideDots.querySelectorAll(".slide-dot"));
  dots.forEach((dot, i) => dot.classList.toggle("active", i === index));
}
