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


/**
 * Formatea un número como precio en USD.
 * @method formatPrice
 * @param {number} amount - Monto a formatear.
 * @return {string} Precio formateado.
 */
const formatPrice = (amount) =>
    new Intl.NumberFormat("en-US", {style: "currency", currency: "USD"}).format(
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
 * Valida rango de fechas y que no sean del pasado.
 * - Check-in >= hoy
 * - Check-out > Check-in
 * @method validateDates
 * @param {HTMLInputElement} inEl
 * @param {HTMLInputElement} outEl
 * @return {boolean}
 */
const validateDates = (inEl, outEl) => {
    const inDate = parseISODate(inEl.value);
    const outDate = parseISODate(outEl.value);
    if (!inDate || !outDate) return false;

    // hoy a las 00:00
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (inDate < today) {
        showErrorAndClear(inEl, "La fecha de Check-in no puede ser anterior a hoy.");
        return false;
    }
    if (outDate < today) {
        showErrorAndClear(outEl, "La fecha de Check-out no puede ser anterior a hoy.");
        return false;
    }
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
 * @return {{inSpan:(Element|null), outSpan:(Element|null), totalSpan:(Element|null), warn:(Element|null), note:(Element|null)}}
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
    const PRICES = {std: 200, sup: 300, fam: 400}; // USD por noche
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
    input.dispatchEvent(new Event("input", {bubbles: true}));
};

document.addEventListener("click", (e) => {
    const btn = e.target.closest('[data-action="inc"],[data-action="dec"]');
    if (!btn) return;
    const name = btn.getAttribute("data-target");
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

    const inDate  = parseISODate(inEl.value);
    const outDate = parseISODate(outEl.value);
    const nights  = calcNights(inDate, outDate);

    const stdQty = validateRoomQty(document.querySelector('input[name="std_qty"]'));
    const supQty = validateRoomQty(document.querySelector('input[name="sup_qty"]'));
    const famQty = validateRoomQty(document.querySelector('input[name="fam_qty"]'));

    if (inSpan)  inSpan.textContent  = inDate  ? inEl.value  : "—";
    if (outSpan) outSpan.textContent = outDate ? outEl.value : "—";

    const listEl = document.getElementById("summary-items");

    if (listEl) {
        const items = [];
        if (stdQty > 0) items.push({ id: "std", text: pluralize(stdQty, "Standard Room") });
        if (supQty > 0) items.push({ id: "sup", text: pluralize(supQty, "Superior Room") });
        if (famQty > 0) items.push({ id: "fam", text: pluralize(famQty, "Family Room") });

        if (note) note.textContent = "";

        listEl.innerHTML = items.map(it => `
      <li data-room="${it.id}">
        <span>${it.text}${nights > 0 ? `, ${pluralize(nights, "night")}` : ""}</span>
        <button type="button" class="line-remove" data-remove-room="${it.id}" aria-label="Remove">×</button>
      </li>
    `).join("");

        // ocultar aviso si hay items
        if (warn instanceof HTMLElement) {
            const hasItems = items.length > 0;
            warn.hidden = hasItems;
            warn.setAttribute("aria-hidden", hasItems ? "true" : "false");
        }
    } else {
        // modo etiqueta compacta
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

        // ocultar aviso si hay label
        if (warn instanceof HTMLElement) {
            const hasLabel = !!label && label.trim().length > 0;
            warn.hidden = hasLabel;
            warn.setAttribute("aria-hidden", hasLabel ? "true" : "false");
        }
    }

    const total = computeTotal({ std: stdQty, sup: supQty, fam: famQty }, nights);
    if (totalSpan) totalSpan.textContent = formatPrice(total);

    // bind para quitar ítems una sola vez
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
            input.dispatchEvent(new Event("input", { bubbles: true }));
        });
        ul.dataset.bound = "1";
    };
    bindListRemove();
};

document.querySelector(".resumen")?.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-remove-room]");
    if (!btn) return;

    const id = btn.dataset.removeRoom;            // "std" | "sup" | "fam"
    const nameById = {std: "std_qty", sup: "sup_qty", fam: "fam_qty"};
    const input = document.querySelector(`input[name="${nameById[id]}"]`);
    if (!input) return;

    input.value = "0";
    input.dispatchEvent(new Event("input", {bubbles: true}));
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

    // solo al presionar Search se filtran las habitaciones
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

    ["change", "input"].forEach((ev) => {
        inEl?.addEventListener(ev, () => updateSummary(inEl, outEl));
        outEl?.addEventListener(ev, () => updateSummary(inEl, outEl));
    });

    document
        .querySelectorAll('input[name="std_qty"], input[name="sup_qty"], input[name="fam_qty"]')
        .forEach((el) => {
            ["change", "input"].forEach((ev) =>
                el.addEventListener(ev, () => updateSummary(inEl, outEl))
            );
        });
    form.addEventListener("submit", handleSubmit);

    restoreFromCheckout();
    updateSummary(inEl, outEl);
};

document.addEventListener("DOMContentLoaded", initBooking);
document
    .querySelectorAll('input[name="std_qty"], input[name="sup_qty"], input[name="fam_qty"]')
    .forEach((el) => {
        el.readOnly = true;
    });

const restoreFromCheckout = () => {
    let data;
    try {
        data = JSON.parse(localStorage.getItem("sb_checkout") || "null");
    } catch {
        data = null;
    }
    if (!data) return;

    const inEl = document.getElementById("checkin");
    const outEl = document.getElementById("checkout");
    if (inEl) inEl.value = data.checkin || "";
    if (outEl) outEl.value = data.checkout || "";

    const map = {std: "std_qty", sup: "sup_qty", fam: "fam_qty"};
    (data.rooms || []).forEach(r => {
        const name = map[r.id];
        const input = document.querySelector(`input[name="${name}"]`);
        if (input) {
            input.value = String(r.qty || 0);
            input.dispatchEvent(new Event("input", {bubbles: true}));
        }
    });

    const guestsSel = document.getElementById("guests");
    if (guestsSel) guestsSel.value = "all";

    updateSummary(inEl, outEl);
};

/* ========= Modal reutilizable (inyecta si falta) ========= */
const ensureModal = () => {
    if (document.getElementById('app-modal')) return;
    const overlay = document.createElement('div');
    overlay.id = 'app-modal';
    overlay.className = 'modal-backdrop';
    overlay.setAttribute('aria-hidden', 'true');
    overlay.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <button class="modal-close" aria-label="Close">×</button>
      <h3 id="modal-title">Error</h3>
      <div id="modal-msg"></div>
      <div class="modal-actions">
        <button id="modal-ok" class="btn-continue" type="button">OK</button>
      </div>
    </div>`;
    document.body.appendChild(overlay);

    // listeners básicos
    overlay.addEventListener('click', (e) => {
        if (e.target.id === 'app-modal') hideModal();
    });
    overlay.querySelector('.modal-close').addEventListener('click', hideModal);
    overlay.querySelector('#modal-ok').addEventListener('click', hideModal);
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') hideModal();
    });
};

const showModal = (message, title = 'Error') => {
    ensureModal();
    const overlay = document.getElementById('app-modal');
    const titleEl = document.getElementById('modal-title');
    const msgEl = document.getElementById('modal-msg');

    titleEl.textContent = title;
    msgEl.innerHTML = Array.isArray(message)
        ? `<ul class="modal-list">${message.map(m => `<li>${m}</li>`).join('')}</ul>`
        : String(message);

    overlay.style.display = 'grid';
    overlay.removeAttribute('aria-hidden');
    document.body.style.overflow = 'hidden';
};

const hideModal = () => {
    const overlay = document.getElementById('app-modal');
    if (!overlay) return;
    overlay.style.display = 'none';
    overlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
};


document.getElementById("modal-ok")?.addEventListener("click", hideModal);
document.querySelector("#app-modal .modal-close")?.addEventListener("click", hideModal);
document.getElementById("app-modal")?.addEventListener("click", (e) => {
    if (e.target.id === "app-modal") hideModal(); // click fuera
});
document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") hideModal();
});

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
    el?.addEventListener?.("input", clearErr, {once: true});
    showModal(message, "Error");
};

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

/** abre y cierra modal de detalles */
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

/** crea slides con imágenes */
const buildSlides = (imgs = []) => {
    const slider = document.getElementById("room-slider");
    const dots = document.getElementById("room-dots");
    if (!slider || !dots) return;

    slider.querySelectorAll(".room-slide").forEach(el => el.remove());
    dots.innerHTML = "";

    const sources = imgs.length ? imgs : [];

    sources.forEach((src, i) => {
        const wrap = document.createElement("div");
        wrap.className = "room-slide" + (i === 0 ? " active" : "");
        wrap.innerHTML = `<img src="${src}" alt="" loading="lazy">`;
        slider.appendChild(wrap);

        const dot = document.createElement("button");
        dot.className = i === 0 ? "active" : "";
        dot.dataset.index = String(i);
        dots.appendChild(dot);
    });

    let idx = 0;
    const update = (n) => {
        idx = (n + sources.length) % sources.length;
        slider.querySelectorAll(".room-slide").forEach((s, i) => s.classList.toggle("active", i === idx));
        dots.querySelectorAll("button").forEach((d, i) => d.classList.toggle("active", i === idx));
    };

    slider.querySelector(".nav-prev")?.addEventListener("click", () => sources.length && update(idx - 1), {once: false});
    slider.querySelector(".nav-next")?.addEventListener("click", () => sources.length && update(idx + 1), {once: false});
    document.getElementById("room-dots")?.addEventListener("click", (e) => {
        const b = e.target.closest("button");
        if (!b) return;
        update(Number(b.dataset.index));
    }, {once: false});
};

/**
 * Abre “More details” con datos y fotos de la tarjeta.
 * Usa data-room="std|sup|fam". Si no está, intenta inferir por el título.
 * @param {HTMLElement} trigger - Botón/Link clickeado
 */
const openRoomDetails = (trigger) => {

    let key = trigger?.dataset?.room;
    if (!key) {
        const title = trigger.closest(".room-card")?.querySelector("h3, .room-title")?.textContent || "";
        if (/standard/i.test(title)) key = "std";
        else if (/superior/i.test(title)) key = "sup";
        else key = "fam";
    }
    const data = ROOMS_DB[key];

    document.getElementById("room-title").textContent = data.title;
    document.getElementById("room-capacity").textContent = data.capacity;
    document.getElementById("room-size").textContent = data.size;
    const desc = document.getElementById("room-desc");
    desc.textContent = data.desc;
    desc.classList.add("line-clamp");

    const ul = document.getElementById("room-amenities");
    ul.innerHTML = data.amenities.map(a => `<li>${a}</li>`).join("");

    const cardImg = trigger.closest(".room-card")?.querySelector("img")?.src;
    const imgs = cardImg ? [cardImg] : [];
    buildSlides(imgs);

    openRoomModal();
};


document.querySelector("#room-modal .room-close")?.addEventListener("click", closeRoomModal);
document.getElementById("room-modal")?.addEventListener("click", (e) => {
    if (e.target.id === "room-modal") closeRoomModal(); // click fuera
});
document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeRoomModal();
});

document.addEventListener("click", (e) => {
    const btn = e.target.closest('[data-action="room-details"]');
    if (!btn) return;
    e.preventDefault();
    openRoomDetails(btn);
});


/* Payment */


const buildCheckoutData = () => {
    const checkin = document.getElementById("checkin")?.value || "";
    const checkout = document.getElementById("checkout")?.value || "";

    const inDate = parseISODate(checkin);
    const outDate = parseISODate(checkout);
    const nights = calcNights(inDate, outDate);

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
            ...(qty.std ? [{id: "std", name: "Standard Room", qty: qty.std, price: 200}] : []),
            ...(qty.sup ? [{id: "sup", name: "Superior Room", qty: qty.sup, price: 300}] : []),
            ...(qty.fam ? [{id: "fam", name: "Family Suite", qty: qty.fam, price: 400}] : []),
        ],
        totalRooms,
        total
    };
};

document.querySelector(".btn-continue")?.addEventListener("click", () => {
    const data = buildCheckoutData();

    const inDate = parseISODate(data.checkin);
    const outDate = parseISODate(data.checkout);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (!inDate || !outDate) {
        showModal("Completá Check-in y Check-out.", "Error");
        return;
    }
    if (inDate < today) {
        showModal("La fecha de Check-in no puede ser anterior a hoy.", "Error");
        return;
    }
    if (outDate < today) {
        showModal("La fecha de Check-out no puede ser anterior a hoy.", "Error");
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

// contact formulario

/**
 * Inserta/actualiza el mensaje de error bajo el campo y marca estilos.
 * @method setError
 * @param {HTMLElement} el - input/textarea a validar
 * @param {string} msg - mensaje de error ("" para limpiar)
 */
const setError = (el, msg) => {
    // Contenedor .field es el padre directo en tu HTML
    const field = el.closest('.field') || el.parentElement;
    let help = field.querySelector('.field-error');
    if (!help) {
        help = document.createElement('p');
        help.className = 'field-error';
        field.appendChild(help);
    }
    help.textContent = msg;
    el.classList.toggle('input-error', Boolean(msg));
    el.setAttribute('aria-invalid', msg ? 'true' : 'false');
};

/**
 * Valida nombres/apellidos: requerido, min 2, solo letras y espacios.
 * @method validateName
 * @param {string} v
 * @returns {string}
 */
const validateName = (v) => {
    const s = (v || '').trim();
    if (!s) return 'Campo obligatorio.';
    if (s.length < 2) return 'Mínimo 2 caracteres.';
    if (!/^[\p{L} ]+$/u.test(s)) return 'Usá solo letras y espacios.';
    return '';
};

/**
 * Valida email con patrón razonable.
 * @method validateEmail
 * @param {string} v
 * @returns {string}
 */
const validateEmail = (v) => {
    const s = (v || '').trim();
    if (!s) return 'Campo obligatorio.';
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    if (!re.test(s)) return 'Ingresá un email válido.';
    return '';
};

/**
 * Teléfono: opcional. Si se completa, 7–12 dígitos (ignora espacios/guiones).
 * @method validatePhone
 * @param {string} v
 * @returns {string}
 */
const validatePhone = (v) => {
    const digits = (v || '').replace(/\D/g, '');
    if (!digits) return '';
    if (digits.length < 7 || digits.length > 12) return 'Teléfono inválido (7–12 dígitos).';
    return '';
};

/**
 * Mensaje: opcional en tu HTML, pero validamos longitud si escribe.
 * Si querés hacerlo obligatorio, descomentá la primer validación.
 * @method validateMessage
 * @param {string} v
 * @returns {string}
 */
const validateMessage = (v) => {
    const s = (v || '').trim();
    // if (!s) return 'Campo obligatorio.';
    if (s.length > 500) return 'Máximo 500 caracteres.';
    return '';
};

/**
 * Valida un campo según su id y pinta el error si corresponde.
 * @method validateField
 * @param {HTMLElement} el
 * @returns {boolean} true si pasa
 */
const validateField = (el) => {
    const {id, value} = el;
    let msg = '';
    if (id === 'fname' || id === 'lname') msg = validateName(value);
    else if (id === 'email') msg = validateEmail(value);
    else if (id === 'phone') msg = validatePhone(value);
    else if (id === 'message') msg = validateMessage(value);
    setError(el, msg);
    return !msg;
};

/**
 * Valida el formulario completo.
 * @method validateContactForm
 * @returns {boolean}
 */
const validateContactForm = () => {
    const els = [
        document.getElementById('fname'),
        document.getElementById('lname'),
        document.getElementById('email'),
        document.getElementById('phone'),
        document.getElementById('message'),
    ].filter(Boolean);

    const results = els.map(validateField);
    if (results.includes(false)) {
        const firstError = els.find(e => e.classList.contains('input-error'));
        firstError?.focus();
        return false;
    }
    return true;
};

/* ====== Eventos: feedback en tiempo real + Submit ====== */
document.addEventListener('DOMContentLoaded', () => {
    const form = document.querySelector('form.contact-form');
    if (!form) return;

    const ids = ['fname', 'lname', 'email', 'phone', 'message'];
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        el.addEventListener('blur', () => validateField(el));
        el.addEventListener('input', () => {
            // Limpia mientras escribe si había error
            if (el.classList.contains('input-error')) validateField(el);
        });
    });

    form.addEventListener('submit', (e) => {
        e.preventDefault();                     // nunca recarga ni envía
        const valido = validateContactForm();   // pinta errores debajo de cada campo

        if (!valido) {
            showModal('Por favor completá de manera correcta los campos obligatorios.', 'Error');
            return;
        }

        showModal('¡Gracias! Tu mensaje fue enviado.', 'Message sent');
        form.reset();
        ['fname', 'lname', 'email', 'phone', 'message'].forEach(id => {
            const el = document.getElementById(id);
            if (el) setError(el, '');
        });
    });

});

/* ======================= PAYMENT ======================= */
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('pay-form');
    if (!form) return; // no estamos en payment.html

    // ---- pintar resumen desde localStorage (igual que tu inline) ----
    const money = n => new Intl.NumberFormat("en-US", {style: "currency", currency: "USD"}).format(n || 0);
    const data = (() => {
        try {
            return JSON.parse(localStorage.getItem("sb_checkout") || "{}");
        } catch {
            return {};
        }
    })();

    const sumIn = document.getElementById('sum-in');
    const sumOut = document.getElementById('sum-out');
    const sumNights = document.getElementById('sum-nights');
    const sumRooms = document.getElementById('sum-rooms');
    const sumTotal = document.getElementById('sum-total');

    if (!data || !data.total || !data.rooms || !data.rooms.length) {
        window.location.replace('booking.html');
        return;
    }
    sumIn.textContent = data.checkin;
    sumOut.textContent = data.checkout;
    sumNights.textContent = data.nights;
    sumTotal.textContent = money(data.total);
    sumRooms.innerHTML = data.rooms.map(r => `
    <div class="sum-row">
      <span>${r.qty} ${r.name}${r.qty > 1 ? 's' : ''}</span>
      <strong>${money(r.qty * r.price * data.nights)}</strong>
    </div>
  `).join('');

    // ------------- validación (reutiliza setError + showModal) -------------
    const setErr = (el, msg) => (typeof setError === 'function' ? setError(el, msg) : (el.title = msg));
    const onlyDigits = s => (s || '').replace(/\D/g, '');

    const validateName = v => {
        const s = (v || '').trim();
        if (!s) return 'This field is required.';
        if (s.length < 2) return 'Minimum 2 characters.';
        if (!/^[\p{L} ]+$/u.test(s)) return 'Letters and spaces only.';
        return '';
    };
    const validateEmail = v => {
        const s = (v || '').trim();
        if (!s) return 'Email is required.';
        return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s) ? '' : 'Enter a valid email.';
    };
    const luhn = num => {
        let sum = 0, dbl = false;
        for (let i = num.length - 1; i >= 0; i--) {
            let d = +num[i];
            if (dbl) {
                d *= 2;
                if (d > 9) d -= 9;
            }
            sum += d;
            dbl = !dbl;
        }
        return sum % 10 === 0;
    };
    const validateCard = v => {
        const d = (v || '').replace(/\D/g, '');
        if (!d) return 'Card number is required.';
        if (d.length !== 16) return 'Card number must be 16 digits.';
        return luhn(d) ? '' : 'Invalid card number.';  // ← usa luhn
    };
    const validateNameOnCard = v => {
        const s = (v || '').trim();
        if (!s) return 'Name on card is required.';
        if (s.length < 2) return 'Please enter full name.';
        return '';
    };
    const validateExp = v => {
        const s = (v || '').trim();
        if (!s) return 'Expiry is required.';
        const m = /^(\d{2})\s*\/\s*(\d{2})$/.exec(s);
        if (!m) return 'Use MM/YY.';
        let [, mm, yy] = m;
        mm = +mm;
        yy = +yy;
        if (mm < 1 || mm > 12) return 'Invalid month.';
        const fullYear = 2000 + yy;
        const expDate = new Date(fullYear, mm); // primer día del mes siguiente
        const now = new Date();
        if (expDate <= new Date(now.getFullYear(), now.getMonth() + 1, 1)) return 'Card is expired.';
        return '';
    };
    const validateCVV = v => {
        const d = onlyDigits(v);
        if (!d) return 'CVV is required.';
        if (d.length < 3 || d.length > 4) return 'CVV must be 3–4 digits.';
        return '';
    };
    const validatePhone = v => {
        const d = onlyDigits(v);
        if (!d) return ''; // opcional
        if (d.length < 7 || d.length > 12) return 'Phone must be 7–12 digits.';
        return '';
    };
    const validateZip = v => {
        const s = (v || '').trim();
        if (!s) return ''; // opcional
        if (!/^[A-Za-z0-9\- ]{3,10}$/.test(s)) return 'ZIP/Postal code is invalid.';
        return '';
    };

    const validateField = el => {
        const {id, value} = el;
        let msg = '';
        switch (id) {
            case 'fname':
            case 'lname':
                msg = validateName(value);
                break;
            case 'email':
                msg = validateEmail(value);
                break;
            case 'phone':
                msg = validatePhone(value);
                break;
            case 'card':
                msg = validateCard(value);
                break;
            case 'nameoncard':
                msg = validateNameOnCard(value);
                break;
            case 'exp':
                msg = validateExp(value);
                break;
            case 'cvv':
                msg = validateCVV(value);
                break;
            case 'zip':
                msg = validateZip(value);
                break;
            // country/address: opcionales por ahora
        }
        setErr(el, msg);
        return !msg;
    };

    const ids = ['fname', 'lname', 'email', 'phone', 'card', 'nameoncard', 'exp', 'cvv', 'address', 'country', 'zip'];

    // feedback inmediato
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        el.addEventListener('blur', () => validateField(el));
        el.addEventListener('input', () => {
            if (el.classList.contains('input-error')) validateField(el);
        });
    });

    // submit con MODAL (reutilizado)
    form.addEventListener('submit', (e) => {
        e.preventDefault();

        const requiredOk = ['fname', 'lname', 'email', 'card', 'nameoncard', 'exp', 'cvv']
            .map(id => validateField(document.getElementById(id)))
            .every(Boolean);

        // validar opcionales con formato si están completos
        ['phone', 'zip'].forEach(id => {
            const el = document.getElementById(id);
            if (el && el.value) validateField(el);
        });

        if (!requiredOk) {
            showModal('Please complete all required fields.', 'Error');
            const firstError = ids
                .map(id => document.getElementById(id))
                .find(el => el && el.classList.contains('input-error'));
            firstError?.focus();
            return;
        }

        // Éxito (demo)
        showModal('Payment successful! A confirmation email has been sent.', 'Payment');
        localStorage.removeItem('sb_checkout');
        form.reset();
        ids.forEach(id => {
            const el = document.getElementById(id);
            if (el) setErr(el, '');
        });
    });
});

// --- Mascara para #card: límite y grupos de 4 ---
// --- Mascara para #card: 16 dígitos y grupos de 4 ---
const cardEl = document.getElementById('card');
if (cardEl) {
    // 16 dígitos → 3 espacios → longitud total 19
    cardEl.setAttribute('maxlength', '19');

    const formatCard = (digits) => digits.replace(/(\d{4})(?=\d)/g, '$1 ').trim();

    const handleCardInput = (e) => {
        const el = e.target;
        const prev = el.value;
        const caretPrev = el.selectionStart ?? prev.length;

        // dígitos a la izquierda del caret (para reubicarlo luego)
        const digitsLeft = prev.slice(0, caretPrev).replace(/\D/g, '').length;

        // solo dígitos, cap a 16
        const digits = prev.replace(/\D/g, '').slice(0, 16);
        const next = formatCard(digits);

        el.value = next;

        // reubicar caret manteniendo “cantidad de dígitos previos”
        let caret = 0, count = 0;
        while (count < digitsLeft && caret < next.length) {
            if (/\d/.test(next[caret])) count++;
            caret++;
        }
        el.setSelectionRange(caret, caret);
    };

    cardEl.addEventListener('input', handleCardInput);
    cardEl.addEventListener('blur', handleCardInput);
}
