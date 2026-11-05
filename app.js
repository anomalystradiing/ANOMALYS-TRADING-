
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

// =====================================
// CONFIGURACIÓN DE SUPABASE
// =====================================

const SUPABASE_URL = "https://xyyrdvvoxnbwninokqeg.supabase.co";
const SUPABASE_KEY = "sb_publishable_erIZGKh9C8ML0zGFish8Jg_zdjfWK4_";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// =====================================
// ELEMENTOS DE LA PÁGINA
// =====================================

const categoriesContainer = document.getElementById("categories");
const itemsContainer = document.getElementById("items");
const historyContainer = document.getElementById("history");

let selectedCategory = "all";

// =====================================
// CARGAR CATEGORÍAS
// =====================================

async function loadCategories() {
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .eq("is_active", true)
    .order("name");

  if (error) {
    console.error("Error al cargar categorías:", error.message);
    categoriesContainer.textContent = "No se pudieron cargar las categorías.";
    return;
  }

  categoriesContainer.replaceChildren();

  const allButton = document.createElement("button");
  allButton.textContent = "Todos";
  allButton.className = "category-button active";
  allButton.addEventListener("click", () => {
    selectedCategory = "all";
    loadCategories();
    loadItems();
  });
  categoriesContainer.appendChild(allButton);

  data.forEach(category => {
    const button = document.createElement("button");
    button.textContent = category.name;
    button.className = "category-button";

    if (selectedCategory === category.id) {
      button.classList.add("active");
    }

    button.addEventListener("click", () => {
      selectedCategory = category.id;
      loadCategories();
      loadItems();
    });

    categoriesContainer.appendChild(button);
  });

  if (selectedCategory === "all") {
    allButton.classList.add("active");
  }
}

// =====================================
// CARGAR ÍTEMS
// =====================================

async function loadItems() {
  let query = supabase
    .from("items")
    .select("*, categories(name)")
    .eq("is_active", true)
    .order("name");

  if (selectedCategory !== "all") {
    query = query.eq("category_id", selectedCategory);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error al cargar ítems:", error.message);
    itemsContainer.textContent = "No se pudieron cargar los ítems.";
    return;
  }

  itemsContainer.replaceChildren();

  if (!data.length) {
    itemsContainer.textContent = "Todavía no hay ítems disponibles.";
    return;
  }

  data.forEach(item => {
    const card = document.createElement("article");
    card.className = "item-card";

    if (item.image_url) {
      const image = document.createElement("img");
      image.src = item.image_url;
      image.alt = item.name;
      image.className = "item-image";
      image.loading = "lazy";
      card.appendChild(image);
    }

    const name = document.createElement("h3");
    name.textContent = item.name;

    const category = document.createElement("p");
    category.textContent = item.categories?.name || "Sin categoría";

    const rarity = document.createElement("p");
    rarity.textContent = item.rarity || "Sin rareza";

    const value = document.createElement("p");
    value.textContent = `Valor: ${item.value ?? 0}`;

    card.append(name, category, rarity, value);
    itemsContainer.appendChild(card);
  });
}

// =====================================
// HISTORIAL DE VALORES
// =====================================

async function loadHistory() {
  const { data, error } = await supabase
    .from("value_history")
    .select("*, items(name)")
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    console.error("Error al cargar historial:", error.message);
    historyContainer.textContent = "No se pudo cargar el historial.";
    return;
  }

  historyContainer.replaceChildren();

  if (!data.length) {
    historyContainer.textContent = "Todavía no hay cambios registrados.";
    return;
  }

  data.forEach(change => {
    const entry = document.createElement("div");
    entry.className = "history-entry";

    const name = document.createElement("h3");
    name.textContent = change.items?.name || "Ítem";

    const values = document.createElement("p");
    values.textContent =
      `${change.previous_value} → ${change.new_value}`;

    const date = document.createElement("small");
    date.textContent = new Date(change.created_at).toLocaleString("es-AR");

    entry.append(name, values, date);
    historyContainer.appendChild(entry);
  });
}

// =====================================
// INICIAR PÁGINA
// =====================================

async function initializePage() {
  await loadCategories();
  await loadItems();
  await loadHistory();
}

initializePage();
                            
