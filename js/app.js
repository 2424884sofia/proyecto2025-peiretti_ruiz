/**
 * ============================
 * Santorini Blue - Booking JS
 * ============================
 * Archivo externo con validaciones y cálculo de reserva.
 * - Usa funciones flecha
 * - Incluye JSDoc
 * - Sin funciones innecesarias
 * - Maneja errores con alert() y blanqueo de campos
 */

const ROOMS = {
  std: { name: "Standard Room", price: 200, max: 1 },
  sup: { name: "Superior Room", price: 300, max: 2 },
  fam: { name: "Family Suite", price: 400, max: 5 },
};

/**
 * Formatea un número como precio en USD.
 * @method formatPrice
 * @param {number} amount - Monto a formatear.
 * @return {string} Precio formateado.
 */
const formatPrice = (amount) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    Number(amount) || 0
  );


/**
 * Parsea una fecha (yyyy-mm-dd) a Date.
 * @method parseISODate
 * @param {string} value - Valor ISO (input type="date").
 * @return {Date|null} Objeto Date o null si inválida.
 */
const parseISODate = (value) => {
  if (!value) return null;
  const d = new Date(value + "T00:00:00");
  return isNaN(d.getTime()) ? null : d;
};

/**
 * Calcula la cantidad de noches entre dos fechas (checkin < checkout).
 * @method calcNights
 * @param {Date} checkIn - Fecha de ingreso.
 * @param {Date} checkOut - Fecha de egreso.
 * @return {number} Cantidad de noches (>=0).
 */
const calcNights = (checkIn, checkOut) => {
  if (!checkIn || !checkOut) return 0;
  const ms = checkOut - checkIn;
  return ms > 0 ? Math.ceil(ms / (1000 * 60 * 60 * 24)) : 0;
};

/**
 * Valida rango de fechas. Si es incorrecto, alerta y blanquea el campo problemático.
 * @method validateDates
 * @param {HTMLInputElement} inEl - Input check-in.
 * @param {HTMLInputElement} outEl - Input check-out.
 * @return {boolean} true si es válido; false si no.
 */
const validateDates = (inEl, outEl) => {
  const inDate = parseISODate(inEl.value);
  const outDate = parseISODate(outEl.value);

  if (!inDate || !outDate) return false;

  if (outDate <= inDate) {
    showErrorAndClear(outEl, "La fecha de Check-out debe ser posterior al Check-in.");
    return false;
  }
  return true;
};

/**
 * Valida un input numérico (0–9) y limpia si es inválido.
 * @method validateRoomQty
 * @param {HTMLInputElement} input - Input numérico de cantidad.
 * @return {number} Cantidad válida (0–9) o 0 si se limpió.
 */
const validateRoomQty = (input) => {
  const raw = input?.value?.trim?.() ?? "";
  if (!raw) return 0;
  const num = Number(raw);

  if (
    Number.isNaN(num) ||
    !Number.isInteger(num) ||
    num < Number(input.min ?? 0) ||
    num > Number(input.max ?? 9)
  ) {
    showErrorAndClear(input, "Cantidad inválida (debe ser un entero entre 0 y 9).");
    return 0;
  }
  return num;
};

/**
 * Obtiene referencias seguras a elementos del resumen.
 * @method getSummaryRefs
 * @return {{inSpan:HTMLElement|null, outSpan:HTMLElement|null, totalSpan:HTMLElement|null, warn:HTMLElement|null, note:HTMLElement|null}}
 */
const getSummaryRefs = () => {
  const mutedSpans = document.querySelectorAll(".resumen-line .muted");
  const totalSpan = document.querySelector(".resumen-total span:last-child");
  const warn = document.querySelector(".resumen-warn");
  const note = document.querySelector(".resumen-note");
  return {
    inSpan: mutedSpans[0] || null,
    outSpan: mutedSpans[1] || null,
    totalSpan: totalSpan || null,
    warn,
    note,
  };
};

/**
 * Calcula el total en base a noches y cantidades por tipo de habitación.
 * @method computeTotal
 * @param {{std:number,sup:number,fam:number}} qty - Cantidades por tipo.
 * @param {number} nights - Cantidad de noches.
 * @return {number} Total.
 */
const computeTotal = (qty, nights) => {
  const PRICES = { std: 200, sup: 300, fam: 400 }; // USD por noche
  const sub =
    qty.std * PRICES.std + qty.sup * PRICES.sup + qty.fam * PRICES.fam;
  return sub * (nights || 0);
};

/**
 * Devuelve "1 singular" o "N plural".
 * @method pluralize
 * @param {number} n
 * @param {string} singular
 * @param {string} [plural=singular + "s"]
 * @returns {string}
 */
const pluralize = (n, singular, plural = singular + "s") =>
  n === 1 ? `1 ${singular}` : `${n} ${plural}`;


/**
 * Devuelve el texto de tipos + cantidades elegidas.
 * Solo muestra si hay al menos 1 habitación seleccionada.
 * @returns {string|null}
 */
const currentRoomsWithQty = () => {
  const qStd = Number(document.querySelector('input[name="std_qty"]')?.value || 0);
  const qSup = Number(document.querySelector('input[name="sup_qty"]')?.value || 0);
  const qFam = Number(document.querySelector('input[name="fam_qty"]')?.value || 0);

  const parts = [];
  if (qStd > 0) parts.push(pluralize(qStd, "Standard Room"));
  if (qSup > 0) parts.push(pluralize(qSup, "Superior Room"));
  if (qFam > 0) parts.push(pluralize(qFam, "Family Room"));

  return parts.length ? parts.join(" + ") : null; // sin fallback al select
};


/**
 * Incrementa/decrementa un input de cantidad por name.
 * @method stepQty
 * @param {string} qtyName - name del input (ej: "std_qty").
 * @param {number} delta - +1 o -1.
 * @return {void}
 */
const stepQty = (qtyName, delta) => {
  const input = document.querySelector(`input[name="${qtyName}"]`);
  if (!input) return;
  const min = Number(input.min ?? 0);
  const max = Number(input.max ?? 9);
  let val = Number(input.value || 0) + delta;
  if (val < min) val = min;
  if (val > max) val = max;
  input.value = String(val);
  // Disparar actualización
  input.dispatchEvent(new Event("input", { bubbles: true }));
};

// Delegación: escuchar clicks en cualquier botón – / +
document.addEventListener("click", (e) => {
  const btn = e.target.closest('[data-action="inc"],[data-action="dec"]');
  if (!btn) return;
  const name = btn.getAttribute("data-target"); // ej: "std_qty"
  if (!name) return;
  stepQty(name, btn.dataset.action === "inc" ? 1 : -1);
});


/**
 * Actualiza el resumen (fechas, items con cantidades, total).
 * - Muestra cada tipo de habitación en un renglón con una ✖ para borrar.
 * - No toca tu lógica de precios ni validaciones.
 * @method updateSummary
 * @param {HTMLInputElement} inEl
 * @param {HTMLInputElement} outEl
 * @return {void}
 */
const updateSummary = (inEl, outEl) => {
  const { inSpan, outSpan, totalSpan, warn, note } = getSummaryRefs();

  // Fechas y noches
  const inDate = parseISODate(inEl.value);
  const outDate = parseISODate(outEl.value);
  const nights = calcNights(inDate, outDate);

  // Cantidades por tipo
  const stdQty = validateRoomQty(document.querySelector('input[name="std_qty"]'));
  const supQty = validateRoomQty(document.querySelector('input[name="sup_qty"]'));
  const famQty = validateRoomQty(document.querySelector('input[name="fam_qty"]'));

  // -------- Fechas en el resumen
  if (inSpan)  inSpan.textContent  = inDate ? inEl.value  : "—";
  if (outSpan) outSpan.textContent = outDate ? outEl.value : "—";

  // -------- Lista de líneas con ✖
  const listEl = document.getElementById("summary-items"); // <ul id="summary-items">
  if (listEl) {
    const items = [];
    if (stdQty > 0) items.push({ id: "std", text: pluralize(stdQty, "Standard Room") });
    if (supQty > 0) items.push({ id: "sup", text: pluralize(supQty, "Superior Room") });
    if (famQty > 0) items.push({ id: "fam", text: pluralize(famQty, "Family Room") });

    // oculto/limpio el <p> viejo si lo usabas para el texto corrido
    if (note) note.textContent = "";

    listEl.innerHTML = items.map(it => `
      <li data-room="${it.id}">
        <span>${it.text}${nights > 0 ? `, ${pluralize(nights, "night")}` : ""}</span>
        <button type="button" class="line-remove" data-remove-room="${it.id}" aria-label="Remove">×</button>
      </li>
    `).join("");

    // Warning “Please add rooms”
    if (warn) warn.style.display = items.length > 0 ? "none" : "";
  } else {
    // Fallback: si no existe el <ul>, mantené tu texto original
    const label = (() => {
      const parts = [];
      if (stdQty > 0) parts.push(pluralize(stdQty, "Standard Room"));
      if (supQty > 0) parts.push(pluralize(supQty, "Superior Room"));
      if (famQty > 0) parts.push(pluralize(famQty, "Family Room"));
      return parts.length ? parts.join(" + ") : "";
    })();
    if (note) {
      if (label && nights > 0) note.textContent = `${label}, ${pluralize(nights, "night")}`;
      else note.textContent = label || "";
    }
    if (warn) warn.style.display = label ? "none" : "";
  }

  // -------- Total
  const total = computeTotal({ std: stdQty, sup: supQty, fam: famQty }, nights);
  if (totalSpan) totalSpan.textContent = formatPrice(total);

  // -------- Delegación para eliminar (se ata una sola vez)
  const bindListRemove = () => {
    const ul = document.getElementById("summary-items");
    if (!ul || ul.dataset.bound) return;
    ul.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-remove-room]");
      if (!btn) return;
      const id = btn.dataset.removeRoom; // "std" | "sup" | "fam"
      const nameById = { std: "std_qty", sup: "sup_qty", fam: "fam_qty" };
      const input = document.querySelector(`input[name="${nameById[id]}"]`);
      if (!input) return;
      input.value = "0";
      input.dispatchEvent(new Event("input", { bubbles: true })); // dispara este mismo updateSummary
    });
    ul.dataset.bound = "1";
  };
  bindListRemove();
};


document.querySelector(".resumen")?.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-remove-room]");
  if (!btn) return;

  const id = btn.dataset.removeRoom;            // "std" | "sup" | "fam"
  const nameById = { std: "std_qty", sup: "sup_qty", fam: "fam_qty" };
  const input = document.querySelector(`input[name="${nameById[id]}"]`);
  if (!input) return;

  input.value = "0";
  input.dispatchEvent(new Event("input", { bubbles: true })); // dispara tu updateSummary
});


/**
 * Muestra/oculta tarjetas por nombre del input de cantidad
 * y resetea valor cuando se oculta.
 * @method setVisibilityByQtyName
 * @param {"std_qty"|"sup_qty"|"fam_qty"} qtyName - name del input.
 * @param {boolean} visible - true para mostrar, false para ocultar.
 * @return {void}
 */
const setVisibilityByQtyName = (qtyName, visible) => {
  const input = document.querySelector(`input[name="${qtyName}"]`);
  const card = input?.closest(".room-card");

  if (card) card.style.display = visible ? "" : "none";

  // ⚠️ No tocar el valor cuando se oculta; así NO se borra del resumen.
  // Podés deshabilitarlo para evitar foco/edición mientras está oculto:
  if (input) input.disabled = !visible;
};

/**
 * Filtra las habitaciones visibles según el value del select #guests.
 * Values: "all" | "1" | "2" | "3-5"
 *  - 1  -> Standard
 *  - 2  -> Superior
 *  - 3-5-> Family
 *  - all-> Todas
 * @method filterRoomsByGuests
 * @return {void}
 */
const filterRoomsByGuests = () => {
  const sel = document.getElementById("guests");
  if (!sel) return;

  const val = sel.value; // "all" | "1" | "2" | "3-5"
  let only = "all";
  if (val === "1") only = "std";
  else if (val === "2") only = "sup";
  else if (val === "3-5") only = "fam";

  setVisibilityByQtyName("std_qty", only === "all" || only === "std");
  setVisibilityByQtyName("sup_qty", only === "all" || only === "sup");
  setVisibilityByQtyName("fam_qty", only === "all" || only === "fam");
};


/**
 * Maneja el envío del formulario: valida y actualiza el resumen.
 * @method handleSubmit
 * @param {SubmitEvent} e - Evento submit.
 * @return {void}
 */
const handleSubmit = (e) => {
  e.preventDefault();
  const inEl = document.getElementById("checkin");
  const outEl = document.getElementById("checkout");

  if (!inEl.value || !outEl.value) {
    showErrorAndClear(outEl, "Completá Check-in y Check-out.");
    return;
  }
  if (!validateDates(inEl, outEl)) return;

  // ✅ solo al presionar Search se filtran las habitaciones
  filterRoomsByGuests();
  updateSummary(inEl, outEl);
};

/**
 * Inicializa listeners para inputs y formulario.
 * @method initBooking
 * @return {void}
 */
const initBooking = () => {
  const form = document.querySelector(".book-form");
  if (!form) return;

  const inEl = document.getElementById("checkin");
  const outEl = document.getElementById("checkout");

  // Reaccionar a cambios para recalcular en vivo (fechas)
  ["change", "input"].forEach((ev) => {
    inEl?.addEventListener(ev, () => updateSummary(inEl, outEl));
    outEl?.addEventListener(ev, () => updateSummary(inEl, outEl));
  });

  // Cantidades por tipo (std/sup/fam)
  document
    .querySelectorAll('input[name="std_qty"], input[name="sup_qty"], input[name="fam_qty"]')
    .forEach((el) => {
      ["change", "input"].forEach((ev) =>
        el.addEventListener(ev, () => updateSummary(inEl, outEl))
      );
    });

  // Importante: NO filtramos al cambiar el select;
  // solo al hacer Search dentro de handleSubmit.

  // Envío (Search)
  form.addEventListener("submit", handleSubmit);

  // Restaurar si venimos de payment y pintar el resumen inicial
  restoreFromCheckout();
  updateSummary(inEl, outEl);
};

// Iniciar cuando el documento esté listo 
document.addEventListener("DOMContentLoaded", initBooking);
document
  .querySelectorAll('input[name="std_qty"], input[name="sup_qty"], input[name="fam_qty"]')
  .forEach((el) => { el.readOnly = true; });


// Restaura booking desde el payload guardado en payment (sb_checkout)
const restoreFromCheckout = () => {
  let data;
  try { data = JSON.parse(localStorage.getItem("sb_checkout") || "null"); }
  catch { data = null; }
  if (!data) return;

  // Fechas
  const inEl  = document.getElementById("checkin");
  const outEl = document.getElementById("checkout");
  if (inEl)  inEl.value  = data.checkin || "";
  if (outEl) outEl.value = data.checkout || "";

  // Cantidades por tipo
  const map = { std: "std_qty", sup: "sup_qty", fam: "fam_qty" };
  (data.rooms || []).forEach(r => {
    const name = map[r.id];
    const input = document.querySelector(`input[name="${name}"]`);
    if (input) {
      input.value = String(r.qty || 0);
      // disparo para que tu lógica recalcule todo
      input.dispatchEvent(new Event("input", { bubbles: true }));
    }
  });

  // Si querés mostrar todas las rooms al volver:
  const guestsSel = document.getElementById("guests");
  if (guestsSel) guestsSel.value = "all";

  // Pintar resumen con lo restaurado
  updateSummary(inEl, outEl);
};


/**
 * Abre el modal con título y mensaje(s).
 * @method showModal
 * @param {string|string[]} message - Texto o array de textos.
 * @param {string} [title="Error"] - Título del modal.
 * @returns {void}
 */
const showModal = (message, title = "Error") => {
  const overlay = document.getElementById("app-modal");
  const titleEl = document.getElementById("modal-title");
  const msgEl   = document.getElementById("modal-msg");
  const okBtn   = document.getElementById("modal-ok");
  if (!overlay || !titleEl || !msgEl || !okBtn) {
    // Fallback si no existe el HTML del modal
    alert(Array.isArray(message) ? message.join("\n") : message);
    return;
  }

  titleEl.textContent = title;
  if (Array.isArray(message)) {
    msgEl.innerHTML = `<ul class="modal-list">${message.map(m=>`<li>${m}</li>`).join("")}</ul>`;
  } else {
    msgEl.textContent = message;
  }

  overlay.style.display = "grid";
  overlay.removeAttribute("aria-hidden");
  document.body.style.overflow = "hidden";
  okBtn.focus();
};

/** Cierra el modal y restaura scroll/foco. */
const hideModal = () => {
  const overlay = document.getElementById("app-modal");
  if (!overlay) return;
  overlay.style.display = "none";
  overlay.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
};

// Cierres rápidos
document.getElementById("modal-ok")?.addEventListener("click", hideModal);
document.querySelector("#app-modal .modal-close")?.addEventListener("click", hideModal);
document.getElementById("app-modal")?.addEventListener("click", (e) => {
  if (e.target.id === "app-modal") hideModal(); // click fuera
});
document.addEventListener("keydown", (e) => { if (e.key === "Escape") hideModal(); });

/**
 * Muestra un mensaje de error en modal y blanquea un input.
 * @method showErrorAndClear
 * @param {HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement} el
 * @param {string|string[]} message
 * @return {void}
 */
const showErrorAndClear = (el, message) => {
  if (el && "value" in el) el.value = "";
  el?.focus?.();
  el?.classList?.add("is-error");
  const clearErr = () => el?.classList?.remove("is-error");
  el?.addEventListener?.("input", clearErr, { once: true });
  showModal(message, "Error");
};

/** Info estática por tipo de habitación */
const ROOMS_DB = {
  std: {
    title: "Standard Room",
    capacity: "1 adult max",
    size: "30 m²",
    desc: "Cozy room with a serene vibe and soft natural light. Perfect for solo travelers looking for quiet mornings and a comfy bed.",
    amenities: [
      "Double bed",
      "Private balcony (partial sea view)",
      "Air conditioning",
      "Smart TV 43”",
      "Mini-fridge",
      "Nespresso coffee machine",
      "In-room safe",
      "Free toiletries"
    ],
  },
  sup: {
    title: "Superior Room",
    capacity: "2 adults max",
    size: "30 m²",
    desc: "Bright superior room with full sea view and a small lounge area. Ideal for couples who want space and sunlight.",
    amenities: [
      "King bed or twin",
      "Full sea-view balcony",
      "Lounge area",
      "Air conditioning",
      "Smart TV 50”",
      "Rain shower",
      "Bathrobe & slippers",
      "USB-C bedside chargers"
    ],
  },
  fam: {
    title: "Family Suite",
    capacity: "Up to 5 guests",
    size: "45 m²",
    desc: "Spacious family suite featuring a living area and kitchenette. Great for families or small groups.",
    amenities: [
      "Two rooms + living area",
      "Kitchenette with microwave",
      "Dining table",
      "Two bathrooms",
      "Terrace with pergola",
      "Smart TV 55”",
      "Crib on request",
      "Blackout curtains"
    ],
  },
};

/** Abre/cierra modal de detalles */
const openRoomModal = () => {
  const o = document.getElementById("room-modal");
  if (!o) return;
  o.style.display = "grid";
  o.removeAttribute("aria-hidden");
  document.body.style.overflow = "hidden";
};
const closeRoomModal = () => {
  const o = document.getElementById("room-modal");
  if (!o) return;
  o.style.display = "none";
  o.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
};

/** Crea slides con 1+ imágenes */
const buildSlides = (imgs=[]) => {
  const slider = document.getElementById("room-slider");
  const dots   = document.getElementById("room-dots");
  if (!slider || !dots) return;

  slider.querySelectorAll(".room-slide").forEach(el=>el.remove());
  dots.innerHTML = "";

  const sources = imgs.length ? imgs : []; // si no hay, quedará vacío (mostrará fondo gris)

  sources.forEach((src, i) => {
    const wrap = document.createElement("div");
    wrap.className = "room-slide" + (i===0 ? " active" : "");
    wrap.innerHTML = `<img src="${src}" alt="" loading="lazy">`;
    slider.appendChild(wrap);

    const dot = document.createElement("button");
    dot.className = i===0 ? "active" : "";
    dot.dataset.index = String(i);
    dots.appendChild(dot);
  });

  // Navegación
  let idx = 0;
  const update = (n) => {
    idx = (n + sources.length) % sources.length;
    slider.querySelectorAll(".room-slide").forEach((s,i)=>s.classList.toggle("active", i===idx));
    dots.querySelectorAll("button").forEach((d,i)=>d.classList.toggle("active", i===idx));
  };

  slider.querySelector(".nav-prev")?.addEventListener("click", () => sources.length && update(idx-1), { once:false });
  slider.querySelector(".nav-next")?.addEventListener("click", () => sources.length && update(idx+1), { once:false });
  document.getElementById("room-dots")?.addEventListener("click", (e)=>{
    const b = e.target.closest("button"); if(!b) return;
    update(Number(b.dataset.index));
  }, { once:false });
};

/**
 * Abre “More details” con datos y fotos de la tarjeta.
 * Usa data-room="std|sup|fam". Si no está, intenta inferir por el título.
 * @param {HTMLElement} trigger - Botón/Link clickeado
 */
const openRoomDetails = (trigger) => {
  // 1) Identificar tipo
  let key = trigger?.dataset?.room;
  if (!key) {
    const title = trigger.closest(".room-card")?.querySelector("h3, .room-title")?.textContent || "";
    if (/standard/i.test(title)) key = "std";
    else if (/superior/i.test(title)) key = "sup";
    else key = "fam";
  }
  const data = ROOMS_DB[key];

  // 2) Texto
  document.getElementById("room-title").textContent    = data.title;
  document.getElementById("room-capacity").textContent = data.capacity;
  document.getElementById("room-size").textContent     = data.size;
  const desc = document.getElementById("room-desc");
  desc.textContent = data.desc;
  desc.classList.add("line-clamp");

  // 3) Amenities
  const ul = document.getElementById("room-amenities");
  ul.innerHTML = data.amenities.map(a=>`<li>${a}</li>`).join("");

  // 4) Fotos: toma la imagen de la card como mínimo
  const cardImg = trigger.closest(".room-card")?.querySelector("img")?.src;
  const imgs = cardImg ? [cardImg] : [];
  buildSlides(imgs);

  // 5) Mostrar
  openRoomModal();
};

/* Eventos del modal */
document.querySelector("#room-modal .room-close")?.addEventListener("click", closeRoomModal);
document.getElementById("room-modal")?.addEventListener("click", (e) => {
  if (e.target.id === "room-modal") closeRoomModal(); // click fuera
});
document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeRoomModal(); });

/* Delegación global para los botones de More details */
document.addEventListener("click", (e) => {
  const btn = e.target.closest('[data-action="room-details"]');
  if (!btn) return;
  e.preventDefault();
  openRoomDetails(btn);
});


/* Payment */
// === Continue → guardar resumen y navegar a payment.html ===
const getQty = (name) => Number(document.querySelector(`input[name="${name}"]`)?.value || 0);

const buildCheckoutData = () => {
  const checkin  = document.getElementById("checkin")?.value || "";
  const checkout = document.getElementById("checkout")?.value || "";

  const inDate  = parseISODate(checkin);
  const outDate = parseISODate(checkout);
  const nights  = calcNights(inDate, outDate);

  const qty = {
    std: validateRoomQty(document.querySelector('input[name="std_qty"]')),
    sup: validateRoomQty(document.querySelector('input[name="sup_qty"]')),
    fam: validateRoomQty(document.querySelector('input[name="fam_qty"]')),
  };
  const totalRooms = qty.std + qty.sup + qty.fam;
  const total = computeTotal(qty, nights);

  return {
    checkin, checkout, nights,
    rooms: [
      ...(qty.std ? [{ id:"std", name:"Standard Room", qty:qty.std, price:200 }] : []),
      ...(qty.sup ? [{ id:"sup", name:"Superior Room", qty:qty.sup, price:300 }] : []),
      ...(qty.fam ? [{ id:"fam", name:"Family Suite",  qty:qty.fam, price:400 }] : []),
    ],
    totalRooms,
    total
  };
};

document.querySelector(".btn-continue")?.addEventListener("click", () => {
  const data = buildCheckoutData();

  if (!data.checkin || !data.checkout) {
    showModal("Completá Check-in y Check-out.", "Error");
    return;
  }
  if (data.nights <= 0) {
    showModal("La fecha de Check-out debe ser posterior al Check-in.", "Error");
    return;
  }
  if (data.totalRooms === 0) {
    showModal("Please add rooms.", "Error");
    return;
  }

  localStorage.setItem("sb_checkout", JSON.stringify(data));
  window.location.href = "payment.html";
});
