const config = window.APP_CONFIG;
const Amplify = window.aws_amplify;
const Auth = Amplify.Auth;

Auth.configure({
  region: config.region,
  userPoolId: config.userPoolId,
  userPoolWebClientId: config.userPoolWebClientId,
});

const els = {
  authView: document.querySelector("#authView"),
  appView: document.querySelector("#appView"),
  loginTab: document.querySelector("#loginTab"),
  signupTab: document.querySelector("#signupTab"),
  loginForm: document.querySelector("#loginForm"),
  signupForm: document.querySelector("#signupForm"),
  confirmForm: document.querySelector("#confirmForm"),
  userBar: document.querySelector("#userBar"),
  userName: document.querySelector("#userName"),
  logoutButton: document.querySelector("#logoutButton"),
  bookForm: document.querySelector("#bookForm"),
  formTitle: document.querySelector("#formTitle"),
  cancelEditButton: document.querySelector("#cancelEditButton"),
  refreshButton: document.querySelector("#refreshButton"),
  searchInput: document.querySelector("#searchInput"),
  genreFilter: document.querySelector("#genreFilter"),
  totalBooksStat: document.querySelector("#totalBooksStat"),
  finishedBooksStat: document.querySelector("#finishedBooksStat"),
  averageProgressStat: document.querySelector("#averageProgressStat"),
  bookList: document.querySelector("#bookList"),
  toast: document.querySelector("#toast"),
};

let pendingSignupEmail = "";
let allBooks = [];

const showToast = (message) => {
  els.toast.textContent = message;
  els.toast.classList.remove("hidden");
  window.setTimeout(() => els.toast.classList.add("hidden"), 3600);
};

const showAuth = () => {
  els.authView.classList.remove("hidden");
  els.appView.classList.add("hidden");
  els.userBar.classList.add("hidden");
  els.userName.textContent = "Usuario";
  allBooks = [];
  renderLibrary();
};

const showApp = async () => {
  const user = await Auth.currentAuthenticatedUser();
  const attributes = user.attributes || {};
  const fullName = [attributes.given_name, attributes.family_name].filter(Boolean).join(" ");

  els.userName.textContent = fullName || attributes.email || user.username || "Usuario";
  els.authView.classList.add("hidden");
  els.appView.classList.remove("hidden");
  els.userBar.classList.remove("hidden");
  await loadBooks();
};

const setAuthTab = (tab) => {
  const isLogin = tab === "login";
  els.loginTab.classList.toggle("active", isLogin);
  els.signupTab.classList.toggle("active", !isLogin);
  els.loginForm.classList.toggle("hidden", !isLogin);
  els.signupForm.classList.toggle("hidden", isLogin);
  els.confirmForm.classList.add("hidden");
};

const getToken = async () => {
  const session = await Auth.currentSession();
  return session.getIdToken().getJwtToken();
};

const apiFetch = async (path, options = {}) => {
  const token = await getToken();
  const response = await fetch(`${config.apiUrl}${path}`, {
    ...options,
    headers: {
      "content-type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "Solicitud rechazada.");
  return data;
};

const resetBookForm = () => {
  els.bookForm.reset();
  els.bookForm.bookId.value = "";
  els.bookForm.pagesRead.value = 0;
  els.formTitle.textContent = "Agregar libro";
  els.cancelEditButton.classList.add("hidden");
};

const escapeHtml = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const getProgress = (book) => {
  if (!book.totalPages) return 0;
  return Math.min(100, Math.round((book.pagesRead / book.totalPages) * 100));
};

const getFilteredBooks = () => {
  const search = els.searchInput.value.trim().toLowerCase();
  const genre = els.genreFilter.value;

  return allBooks.filter((book) => {
    const matchesSearch =
      !search ||
      String(book.title).toLowerCase().includes(search) ||
      String(book.author).toLowerCase().includes(search);
    const matchesGenre = genre === "all" || book.genre === genre;
    return matchesSearch && matchesGenre;
  });
};

const renderStats = () => {
  const total = allBooks.length;
  const finished = allBooks.filter((book) => Number(book.pagesRead) >= Number(book.totalPages)).length;
  const average = total
    ? Math.round(allBooks.reduce((sum, book) => sum + getProgress(book), 0) / total)
    : 0;

  els.totalBooksStat.textContent = total;
  els.finishedBooksStat.textContent = finished;
  els.averageProgressStat.textContent = `${average}%`;
};

const renderGenreOptions = () => {
  const selected = els.genreFilter.value;
  const genres = [...new Set(allBooks.map((book) => book.genre).filter(Boolean))].sort();

  els.genreFilter.innerHTML = [
    `<option value="all">Todos los generos</option>`,
    ...genres.map((genre) => `<option value="${escapeHtml(genre)}">${escapeHtml(genre)}</option>`),
  ].join("");

  els.genreFilter.value = genres.includes(selected) ? selected : "all";
};

const renderBooks = (books) => {
  if (!allBooks.length) {
    els.bookList.innerHTML = `<div class="empty">Todavia no tienes libros registrados.</div>`;
    return;
  }

  if (!books.length) {
    els.bookList.innerHTML = `<div class="empty">No hay libros que coincidan con los filtros.</div>`;
    return;
  }

  els.bookList.innerHTML = books
    .map((book) => {
      const percent = getProgress(book);
      const title = escapeHtml(book.title);
      const author = escapeHtml(book.author);
      const genre = escapeHtml(book.genre);
      return `
        <article class="book-card">
          <div>
            <h3>${title}</h3>
            <p>${author} &middot; ${genre}</p>
          </div>
          <div>
            <p>${book.pagesRead} de ${book.totalPages} paginas</p>
            <div class="progress" aria-label="Progreso ${percent}%">
              <span style="width: ${percent}%"></span>
            </div>
          </div>
          <strong>${percent}% completado</strong>
          <div class="card-actions">
            <button class="ghost" type="button" data-action="edit" data-book-id="${book.bookId}">Editar</button>
            <button class="danger" type="button" data-action="delete" data-book-id="${book.bookId}">Eliminar</button>
          </div>
        </article>
      `;
    })
    .join("");
};

const renderLibrary = () => {
  renderStats();
  renderGenreOptions();
  renderBooks(getFilteredBooks());
};

const loadBooks = async () => {
  allBooks = await apiFetch("/books");
  renderLibrary();
};

els.loginTab.addEventListener("click", () => setAuthTab("login"));
els.signupTab.addEventListener("click", () => setAuthTab("signup"));

els.loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;

  try {
    await Auth.signIn(form.email.value.trim(), form.password.value);
    form.reset();
    await showApp();
    showToast("Sesion iniciada.");
  } catch (error) {
    showToast(error.message || "No se pudo iniciar sesion.");
  }
});

els.signupForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  pendingSignupEmail = form.email.value.trim();

  try {
    await Auth.signUp({
      username: pendingSignupEmail,
      password: form.password.value,
      attributes: {
        email: pendingSignupEmail,
        given_name: form.name.value.trim(),
        family_name: form.lastname.value.trim(),
      },
    });
    form.reset();
    els.signupForm.classList.add("hidden");
    els.confirmForm.classList.remove("hidden");
    showToast("Revisa tu correo para confirmar la cuenta.");
  } catch (error) {
    showToast(error.message || "No se pudo crear la cuenta.");
  }
});

els.confirmForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;

  try {
    await Auth.confirmSignUp(pendingSignupEmail, form.code.value.trim());
    form.reset();
    setAuthTab("login");
    showToast("Cuenta confirmada. Ya puedes ingresar.");
  } catch (error) {
    showToast(error.message || "No se pudo confirmar la cuenta.");
  }
});

els.logoutButton.addEventListener("click", async () => {
  await Auth.signOut();
  resetBookForm();
  showAuth();
  showToast("Sesion cerrada.");
});

els.bookForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const payload = {
    title: form.title.value.trim(),
    author: form.author.value.trim(),
    genre: form.genre.value,
    totalPages: Number(form.totalPages.value),
    pagesRead: Number(form.pagesRead.value || 0),
  };

  try {
    const bookId = form.bookId.value;
    if (bookId) {
      await apiFetch(`/books/${encodeURIComponent(bookId)}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      showToast("Libro actualizado.");
    } else {
      await apiFetch("/books", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      showToast("Libro agregado.");
    }
    resetBookForm();
    await loadBooks();
  } catch (error) {
    showToast(error.message || "No se pudo guardar el libro.");
  }
});

els.bookList.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;

  const bookId = button.dataset.bookId;
  const action = button.dataset.action;

  try {
    if (action === "delete") {
      const book = allBooks.find((item) => item.bookId === bookId);
      const title = book?.title || "este libro";
      const confirmed = window.confirm(`Deseas eliminar "${title}"? Esta accion no se puede deshacer.`);
      if (!confirmed) return;

      await apiFetch(`/books/${encodeURIComponent(bookId)}`, { method: "DELETE" });
      await loadBooks();
      showToast("Libro eliminado.");
      return;
    }

    const book = await apiFetch(`/books/${encodeURIComponent(bookId)}`);
    els.bookForm.bookId.value = book.bookId;
    els.bookForm.title.value = book.title;
    els.bookForm.author.value = book.author;
    els.bookForm.genre.value = book.genre;
    els.bookForm.totalPages.value = book.totalPages;
    els.bookForm.pagesRead.value = book.pagesRead;
    els.formTitle.textContent = "Editar libro";
    els.cancelEditButton.classList.remove("hidden");
    window.scrollTo({ top: 0, behavior: "smooth" });
  } catch (error) {
    showToast(error.message || "No se pudo completar la accion.");
  }
});

els.cancelEditButton.addEventListener("click", resetBookForm);
els.refreshButton.addEventListener("click", loadBooks);
els.searchInput.addEventListener("input", renderLibrary);
els.genreFilter.addEventListener("change", renderLibrary);

Auth.currentAuthenticatedUser()
  .then(showApp)
  .catch(showAuth);
