
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

// =====================================
// CONFIGURACIÓN DE SUPABASE
// =====================================

const SUPABASE_URL = "https://xyyrdvvoxnbwninokqeg.supabase.co";
const SUPABASE_KEY = "sb_publishable_erIZGKh9C8ML0zGFish8Jg_zdjfWK4_";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// =====================================
// ELEMENTOS
// =====================================

const loginSection = document.getElementById("login-section");
const dashboard = document.getElementById("dashboard");
const loginForm = document.getElementById("login-form");
const loginMessage = document.getElementById("login-message");
const adminContent = document.getElementById("admin-content");

// =====================================
// VERIFICAR ADMINISTRADOR
// =====================================

async function openDashboard(user) {
  if (user?.app_metadata?.role !== "admin") {
    loginMessage.textContent =
      "Esta cuenta no tiene permisos de administrador.";
    await supabase.auth.signOut();
    return;
  }

  loginSection.hidden = true;
  dashboard.hidden = false;

  renderAdminPanel();
}

// =====================================
// INICIAR SESIÓN
// =====================================

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  loginMessage.textContent = "Verificando acceso...";

  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    loginMessage.textContent = "Error: revisá tu correo y contraseña.";
    return;
  }

  await openDashboard(data.user);
});

// =====================================
// PANEL DE ADMINISTRACIÓN
// =====================================

function renderAdminPanel() {
  adminContent.innerHTML = `
    <section class="admin-section">
      <h2>Crear categoría</h2>

      <form id="category-form">
        <label>Nombre de la categoría</label>
        <input id="category-name" type="text" required
          placeholder="Ejemplo: Cuchillos">

        <label>Descripción</label>
        <input id="category-description" type="text"
          placeholder="Descripción opcional">

        <button class="main-button" type="submit">
          Crear categoría
        </button>
      </form>
    </section>

    <section class="admin-section">
      <h2>Agregar ítem</h2>

      <form id="item-form">
        <label>Nombre del ítem</label>
        <input id="item-name" type="text" required>

        <label>Descripción</label>
        <textarea id="item-description"></textarea>

        <label>Categoría</label>
        <select id="item-category" required>
          <option value="">Seleccioná una categoría</option>
        </select>

        <label>Rareza</label>
        <input id="item-rarity" type="text"
          placeholder="Común, raro, legendario...">

        <label>Valor</label>
        <input id="item-value" type="number" min="0"
          step="0.01" required>

        <label>Imagen del ítem</label>
        <input id="item-image" type="file"
          accept="image/png,image/jpeg,image/webp,image/gif">

        <button class="main-button" type="submit">
          Agregar ítem
        </button>
      </form>
    </section>

    <section class="admin-section">
      <h2>Administrar catálogo</h2>
      <div id="admin-items">Cargando ítems...</div>
    </section>

    <p id="admin-message" aria-live="polite"></p>
  `;

  document.getElementById("category-form")
    .addEventListener("submit", createCategory);

  document.getElementById("item-form")
    .addEventListener("submit", createItem);

  loadCategoryOptions();
  loadAdminItems();
}

// =====================================
// MENSAJES
// =====================================

function showMessage(message) {
  const element = document.getElementById("admin-message");
  if (element) element.textContent = message;
}

// =====================================
// CREAR CATEGORÍA
// =====================================

async function createCategory(event) {
  event.preventDefault();

  const name = document.getElementById("category-name").value.trim();
  const description =
    document.getElementById("category-description").value.trim();

  const slug = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  const { error } = await supabase
    .from("categories")
    .insert([{ name, slug, description }]);

  if (error) {
    showMessage("No se pudo crear la categoría: " + error.message);
    return;
  }

  event.target.reset();
  showMessage("¡Categoría creada correctamente!");

  await loadCategoryOptions();
}

// =====================================
// CARGAR CATEGORÍAS
// =====================================

async function loadCategoryOptions() {
  const select = document.getElementById("item-category");

  const { data, error } = await supabase
    .from("categories")
    .select("id, name")
    .eq("is_active", true)
    .order("name");

  if (error) {
    showMessage("Error al cargar categorías.");
    return;
  }

  select.replaceChildren();

  const firstOption = document.createElement("option");
  firstOption.value = "";
  firstOption.textContent = "Seleccioná una categoría";
  select.appendChild(firstOption);

  data.forEach(category => {
    const option = document.createElement("option");
    option.value = category.id;
    option.textContent = category.name;
    select.appendChild(option);
  });
}

// =====================================
// AGREGAR ÍTEM
// =====================================

async function createItem(event) {
  event.preventDefault();

  const button = event.submitter;
  button.disabled = true;
  showMessage("Guardando ítem...");

  try {
    const name = document.getElementById("item-name").value.trim();
    const description =
      document.getElementById("item-description").value.trim();
    const category_id =
      document.getElementById("item-category").value;
    const rarity =
      document.getElementById("item-rarity").value.trim();
    const value = Number(document.getElementById("item-value").value);
    const file = document.getElementById("item-image").files[0];

    if (!Number.isFinite(value) || value < 0) {
      showMessage("Ingresá un valor válido.");
      return;
    }

    let image_url = null;

    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        showMessage("La imagen no puede superar los 5 MB.");
        return;
      }

      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const filePath = `${crypto.randomUUID()}-${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from("anomalys-images")
        .upload(filePath, file);

      if (uploadError) {
        showMessage("Error al subir la imagen: " + uploadError.message);
        return;
      }

      const { data: publicData } = supabase.storage
        .from("anomalys-images")
        .getPublicUrl(filePath);

      image_url = publicData.publicUrl;
    }

    const { error } = await supabase
      .from("items")
      .insert([{
        name,
        description,
        category_id,
        rarity,
        value,
        image_url
      }]);

    if (error) {
      showMessage("No se pudo guardar el ítem: " + error.message);
      return;
    }

    event.target.reset();
    showMessage("¡Ítem agregado correctamente!");
    await loadAdminItems();

  } finally {
    button.disabled = false;
  }
}

// =====================================
// LISTAR Y ADMINISTRAR ÍTEMS
// =====================================

async function loadAdminItems() {
  const container = document.getElementById("admin-items");
  container.textContent = "Cargando ítems...";

  const { data, error } = await supabase
    .from("items")
    .select("id, name, value, is_active, categories(name)")
    .order("name");

  if (error) {
    container.textContent = "Error al cargar los ítems.";
    return;
  }

  container.replaceChildren();

  if (!data.length) {
    container.textContent = "Todavía no hay ítems registrados.";
    return;
  }

  data.forEach(item => {
    const card = document.createElement("article");
    card.className = "admin-item";

    const title = document.createElement("h3");
    title.textContent = item.name;

    const category = document.createElement("p");
    category.textContent = item.categories?.name || "Sin categoría";

    const status = document.createElement("p");
    status.textContent = item.is_active ? "Activo" : "Inactivo";

    const valueInput = document.createElement("input");
    valueInput.type = "number";
    valueInput.min = "0";
    valueInput.step = "0.01";
    valueInput.value = item.value;
    valueInput.setAttribute("aria-label", "Nuevo valor");

    const saveButton = document.createElement("button");
    saveButton.type = "button";
    saveButton.textContent = "Guardar valor";
    saveButton.className = "main-button";

    saveButton.addEventListener("click", () => {
      updateItemValue(item, valueInput.value);
    });

    const toggleButton = document.createElement("button");
    toggleButton.type = "button";
    toggleButton.textContent =
      item.is_active ? "Desactivar ítem" : "Activar ítem";

    toggleButton.addEventListener("click", () => {
      toggleItem(item);
    });

    card.append(
      title,
      category,
      status,
      valueInput,
      saveButton,
      toggleButton
    );

    container.appendChild(card);
  });
}

// =====================================
// MODIFICAR VALOR E HISTORIAL
// =====================================

async function updateItemValue(item, newValueText) {
  const newValue = Number(newValueText);

  if (!Number.isFinite(newValue) || newValue < 0) {
    showMessage("Ingresá un valor válido.");
    return;
  }

  const previousValue = Number(item.value);

  const { error } = await supabase
    .from("items")
    .update({ value: newValue })
    .eq("id", item.id);

  if (error) {
    showMessage("No se pudo actualizar el valor: " + error.message);
    return;
  }

  if (previousValue !== newValue) {
    const { error: historyError } = await supabase
      .from("value_history")
      .insert([{
        item_id: item.id,
        previous_value: previousValue,
        new_value: newValue,
        change_note: "Actualización desde el panel de administración"
      }]);

    if (historyError) {
      showMessage(
        "El valor se actualizó, pero no se pudo guardar el historial."
      );
      await loadAdminItems();
      return;
    }
  }

  showMessage("¡Valor actualizado correctamente!");
  await loadAdminItems();
}

// =====================================
// ACTIVAR O DESACTIVAR ÍTEM
// =====================================

async function toggleItem(item) {
  const newStatus = !item.is_active;

  const { error } = await supabase
    .from("items")
    .update({ is_active: newStatus })
    .eq("id", item.id);

  if (error) {
    showMessage("No se pudo modificar el estado del ítem.");
    return;
  }

  showMessage(newStatus ? "Ítem activado." : "Ítem desactivado.");
  await loadAdminItems();
}

// =====================================
// CERRAR SESIÓN
// =====================================

document.getElementById("logout-button")
  .addEventListener("click", async () => {
    await supabase.auth.signOut();
    location.reload();
  });

// =====================================
// RECUPERAR SESIÓN
// =====================================

async function checkSession() {
  const { data } = await supabase.auth.getSession();

  if (data.session) {
    await openDashboard(data.session.user);
  }
}

checkSession();
    
