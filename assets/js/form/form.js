/* ============================================
   FORM.JS — Logique du formulaire de recensement
   ============================================ */

const TOTAL_STEPS = 6;
const MAX_CHILDREN = 12;
const WEB3FORMS_KEY = "42f261f7-14f9-46fa-9f55-4f6c3f406519";

/* ---------- Données de remplissage ---------- */
const DATA = {
  eglises: [
    "Ficgayo", "Niangon", "Gesco", "Cocody-Bingerville", "Andokoi",
    "Treichville", "Ebenezer", "Akoupe", "Yamoussoukro", "Dimbokro",
    "Bouaflé", "Gagnoa", "Lakota", "Soubré", "Danané", "Agboville",
    "Daloa 1", "Daloa 2", "Daloa 3", "Accra", "Maroc", "Italie",
    "France", "Londres", "USA", "Autres",
  ],
  nationalites: [
    "Ivoirienne", "Française", "Sénégalaise", "Malienne", "Burkinabè",
    "Guinéenne", "Béninoise", "Togolaise", "Nigériane", "Ghanéenne",
    "Camerounaise", "Congolaise (RDC)", "Congolaise (Brazzaville)",
    "Tchadienne", "Gabonaise", "Marocaine", "Algérienne", "Tunisienne",
    "Autre",
  ],
  indicatifs: [
    { code: "+225", label: "+225 (Côte d'Ivoire)" },
    { code: "+221", label: "+221 (Sénégal)" },
    { code: "+223", label: "+223 (Mali)" },
    { code: "+226", label: "+226 (Burkina Faso)" },
    { code: "+224", label: "+224 (Guinée)" },
    { code: "+229", label: "+229 (Bénin)" },
    { code: "+228", label: "+228 (Togo)" },
    { code: "+234", label: "+234 (Nigeria)" },
    { code: "+233", label: "+233 (Ghana)" },
    { code: "+237", label: "+237 (Cameroun)" },
    { code: "+243", label: "+243 (RD Congo)" },
    { code: "+242", label: "+242 (Congo)" },
    { code: "+235", label: "+235 (Tchad)" },
    { code: "+241", label: "+241 (Gabon)" },
    { code: "+212", label: "+212 (Maroc)" },
    { code: "+213", label: "+213 (Algérie)" },
    { code: "+216", label: "+216 (Tunisie)" },
    { code: "+33", label: "+33 (France)" },
    { code: "+32", label: "+32 (Belgique)" },
    { code: "+1", label: "+1 (USA/Canada)" },
  ],
  pays: [
    "Côte d'Ivoire", "Sénégal", "Mali", "Burkina Faso", "Guinée",
    "Bénin", "Togo", "Nigeria", "Ghana", "Cameroun", "RD Congo",
    "Congo", "Tchad", "Gabon", "Maroc", "Algérie", "Tunisie",
    "France", "Belgique", "Canada", "États-Unis", "Autre",
  ],
};

/* ---------- État global ---------- */
const state = {
  currentStep: 1,
  children: [],
  childSeq: 0,
  turnstileToken: null,
  submitting: false,
};

/* ---------- Raccourcis DOM ---------- */
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

const form = $("#form-recensement");
const steps = $$(".step");
const stepsNav = $("#steps-nav");
const btnPrev = $("#btn-precedent");
const btnNext = $("#btn-suivant");
const btnSubmit = $("#btn-envoyer");
const progressEl = $("#progress");
const progressLabel = $("#progress-label");
const errorSummary = $("#error-summary");
const errorList = $("#error-summary-list");
const recapEl = $("#recap");
const submitStatus = $("#submit-status");

/* ---------- Pointeur renderChildren ---------- */
let renderChildren = () => {};
let turnstileRendered = false;

/* ============================================
   INITIALISATION
   ============================================ */
document.addEventListener("DOMContentLoaded", () => {
  fillSelects();
  bindNavigation();
  bindConditionalFields();
  bindChildren();
  bindPhoneFormatting();
  bindMinorDetection();
  bindSubmit();
  initTurnstile();
  setSubmissionId();
  goToStep(1);
});

/* ---------- Remplissage des listes dynamiques ---------- */
function fillSelects() {
  $$("select[data-fill]").forEach((sel) => {
    const source = sel.dataset.fill;
    const items = DATA[source] || [];
    const first = sel.querySelector("option");
    sel.innerHTML = "";
    if (first) sel.appendChild(first);

    items.forEach((item) => {
      const opt = document.createElement("option");
      if (typeof item === "string") {
        opt.value = item;
        opt.textContent = item;
      } else {
        opt.value = item.code;
        opt.textContent = item.label;
      }
      sel.appendChild(opt);
    });
  });

  $$('select[data-fill="indicatifs"]').forEach((sel) => {
    if (!sel.value) sel.value = "+225";
  });
}

/* ---------- Identifiant unique de soumission ---------- */
function setSubmissionId() {
  const field = $("#submission_id");
  if (!field) return;
  const id =
    (crypto.randomUUID && crypto.randomUUID()) ||
    "sub-" + Date.now() + "-" + Math.random().toString(36).slice(2, 10);
  field.value = id;
}

/* ============================================
   NAVIGATION ENTRE ÉTAPES
   ============================================ */
function bindNavigation() {
  btnNext.addEventListener("click", () => {
    if (validateStep(state.currentStep)) {
      goToStep(state.currentStep + 1);
    }
  });

  btnPrev.addEventListener("click", () => {
    goToStep(state.currentStep - 1);
  });

  stepsNav.addEventListener("click", (e) => {
    const item = e.target.closest("[data-step-nav]");
    if (!item) return;
    const target = Number(item.dataset.stepNav);
    if (target < state.currentStep) goToStep(target);
  });

  form.addEventListener("keydown", (e) => {
    if (
      e.key === "Enter" &&
      e.target.tagName !== "TEXTAREA" &&
      state.currentStep < TOTAL_STEPS
    ) {
      e.preventDefault();
      if (validateStep(state.currentStep)) goToStep(state.currentStep + 1);
    }
  });
}

function goToStep(n) {
  if (n < 1 || n > TOTAL_STEPS) return;
  state.currentStep = n;

  steps.forEach((s) => {
    s.hidden = Number(s.dataset.step) !== n;
  });

  $$("[data-step-nav]").forEach((item) => {
    const stepNum = Number(item.dataset.stepNav);
    item.classList.toggle("is-current", stepNum === n);
    item.classList.toggle("is-done", stepNum < n);
    if (stepNum === n) item.setAttribute("aria-current", "step");
    else item.removeAttribute("aria-current");
  });

  progressEl.value = n;
  progressEl.textContent = `Étape ${n} sur ${TOTAL_STEPS}`;
  const label =
    stepsNav.querySelector(`[data-step-nav="${n}"]`)?.textContent || "";
  progressLabel.textContent = `Étape ${n} sur ${TOTAL_STEPS} : ${label}`;

  btnPrev.hidden = n === 1;
  btnNext.hidden = n === TOTAL_STEPS;
  btnSubmit.hidden = n !== TOTAL_STEPS;

  if (n === TOTAL_STEPS) buildRecap();

  const title = $(`#step${n}-title`);
  if (title) {
    title.focus({ preventScroll: true });
    title.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  hideErrors();
}

/* ============================================
   VALIDATION
   ============================================ */
function validateStep(stepNum) {
  clearFieldErrors();
  hideErrors();

  const section = $(`[data-step="${stepNum}"]`);
  if (!section) return true;

  const invalid = [];

  $$("input, select, textarea", section).forEach((el) => {
    if (el.disabled || el.closest(".hp")) return;
    if (el.type === "hidden") return;
    if (el.type === "radio") return;

    if (el.required && !isFilled(el)) {
      invalid.push({ el, message: "Ce champ est obligatoire." });
      return;
    }
    if (isFilled(el) && !isValidFormat(el)) {
      invalid.push({ el, message: getFormatMessage(el) });
    }
  });

  $$("fieldset", section).forEach((fs) => {
    const radios = $$('input[type="radio"]', fs);
    if (!radios.length) return;
    const required = radios.some((r) => r.required);
    if (required && !radios.some((r) => r.checked)) {
      invalid.push({
        el: radios[0],
        group: fs,
        message: "Veuillez faire un choix.",
      });
    }
  });

  if (stepNum === 4) {
    state.children.forEach((child) => {
      ["nom", "prenoms", "date_naissance", "niveau_scolaire"].forEach(
        (field) => {
          if (!child[field] || !String(child[field]).trim()) {
            const card = $(`[data-child-id="${child.id}"]`);
            const input = card?.querySelector(`[data-field="${field}"]`);
            if (input) {
              invalid.push({ el: input, message: "Ce champ est obligatoire." });
            }
          }
        },
      );
      if (child.date_naissance) {
        const d = new Date(child.date_naissance);
        if (isNaN(d.getTime()) || d > new Date()) {
          const card = $(`[data-child-id="${child.id}"]`);
          const input = card?.querySelector('[data-field="date_naissance"]');
          if (input) {
            invalid.push({
              el: input,
              message: "Date de naissance invalide.",
            });
          }
        }
      }
    });
  }

  if (invalid.length) {
    showErrors(invalid);
    return false;
  }

  return true;
}

function isFilled(el) {
  if (el.type === "checkbox") return el.checked;
  return String(el.value || "").trim() !== "";
}

function isValidFormat(el) {
  if (el.type === "email") {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(el.value.trim());
  }
  if (el.type === "tel") {
    return /^[0-9\s.()-]{4,20}$/.test(el.value.trim());
  }
  if (el.type === "date") {
    const d = new Date(el.value);
    if (isNaN(d.getTime())) return false;
    const now = new Date();

    if (["date_naissance", "date_bapteme", "date_arrivee"].includes(el.name)) {
      if (d > now) return false;
      if (d.getFullYear() < 1900) return false;
    }

    if (["date_bapteme", "date_arrivee"].includes(el.name)) {
      const birthVal = form.elements["date_naissance"]?.value;
      if (birthVal) {
        const birth = new Date(birthVal);
        if (!isNaN(birth.getTime()) && d < birth) return false;
      }
    }

    if (el.name === "date_bapteme") {
      const arriveeVal = form.elements["date_arrivee"]?.value;
      if (arriveeVal) {
        const arrivee = new Date(arriveeVal);
        if (!isNaN(arrivee.getTime()) && d < arrivee) return false;
      }
    }

    return true;
  }
  return true;
}

function getFormatMessage(el) {
  if (el.type === "email") return "Adresse e-mail invalide.";
  if (el.type === "tel") return "Numéro de téléphone invalide.";
  if (el.type === "date") {
    if (["date_bapteme", "date_arrivee", "date_naissance"].includes(el.name)) {
      const d = new Date(el.value);
      if (d > new Date()) return "La date ne peut pas être dans le futur.";
      const birthVal = form.elements["date_naissance"]?.value;
      if (birthVal && el.name !== "date_naissance") {
        const birth = new Date(birthVal);
        if (!isNaN(birth.getTime()) && d < birth) {
          return "La date doit être postérieure à votre naissance.";
        }
      }
      if (el.name === "date_bapteme") {
        const arriveeVal = form.elements["date_arrivee"]?.value;
        if (arriveeVal) {
          const arrivee = new Date(arriveeVal);
          if (!isNaN(arrivee.getTime()) && d < arrivee) {
            return "Le baptême ne peut pas précéder votre arrivée dans le mouvement.";
          }
        }
      }
    }
    return "Date invalide.";
  }
  return "Valeur invalide.";
}

/* ---------- Affichage des erreurs ---------- */
function clearFieldErrors() {
  $$(".field-error").forEach((e) => e.remove());
  $$('[aria-invalid="true"]').forEach((el) =>
    el.removeAttribute("aria-invalid"),
  );
}

function showErrors(errors) {
  errorList.innerHTML = "";
  errors.forEach((err, i) => {
    const el = err.el;

    if (el && el.tagName !== "FIELDSET") {
      el.setAttribute("aria-invalid", "true");
    }
    if (err.group) {
      err.group.setAttribute("aria-invalid", "true");
    }

    if (el && el.type !== "radio") {
      const msg = document.createElement("span");
      msg.className = "field-error";
      msg.id = `err-${el.id || "field"}-${i}`;
      msg.textContent = err.message;
      el.insertAdjacentElement("afterend", msg);
      if (!el.getAttribute("aria-describedby")?.includes(msg.id)) {
        el.setAttribute(
          "aria-describedby",
          ((el.getAttribute("aria-describedby") || "") + " " + msg.id).trim(),
        );
      }
    }

    const li = document.createElement("li");
    const a = document.createElement("a");
    a.href = "#";
    a.textContent = err.message + " " + getFieldLabel(el);
    a.addEventListener("click", (ev) => {
      ev.preventDefault();
      (err.group || el)?.focus();
      (err.group || el)?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    });
    li.appendChild(a);
    errorList.appendChild(li);
  });

  errorSummary.hidden = false;
  errorSummary.focus();
}

function hideErrors() {
  errorSummary.hidden = true;
  errorList.innerHTML = "";
}

function getFieldLabel(el) {
  if (!el) return "";
  const id = el.id;
  if (id) {
    const label = document.querySelector(`label[for="${id}"]`);
    if (label) return `— ${label.textContent.replace("*", "").trim()}`;
  }
  if (el.type === "radio") {
    const fs = el.closest("fieldset");
    const legend = fs?.querySelector("legend");
    if (legend) return `— ${legend.textContent.replace("*", "").trim()}`;
  }
  return "";
}

/* ============================================
   CHAMPS CONDITIONNELS
   ============================================ */
function bindConditionalFields() {
  const waCheck = $("#whatsapp_identique");
  const waBlock = $("#bloc-whatsapp");
  const waInput = $("#whatsapp");
  waCheck?.addEventListener("change", () => {
    const same = waCheck.checked;
    waBlock.hidden = same;
    waInput.required = !same;
    if (same) waInput.value = "";
  });

  const sitRadios = $$('input[name="situation_professionnelle"]');
  const sitAutre = $("#bloc-situation-autre");
  const sitAutreInput = $("#situation_professionnelle_autre");
  sitRadios.forEach((r) =>
    r.addEventListener("change", () => {
      const isAutre = r.checked && r.value === "autre";
      sitAutre.hidden = !isAutre;
      sitAutreInput.required = isAutre;
      if (!isAutre) sitAutreInput.value = "";
    }),
  );

  const matRadios = $$('input[name="situation_matrimoniale"]');
  const blocConjoint = $("#bloc-conjoint");
  const conjointNom = $("#conjoint_nom");
  const conjointPrenoms = $("#conjoint_prenoms");
  matRadios.forEach((r) =>
    r.addEventListener("change", () => {
      const isUnion = r.checked && ["marie", "en_union"].includes(r.value);
      blocConjoint.hidden = !isUnion;
      [conjointNom, conjointPrenoms].forEach((inp) => {
        if (inp) inp.required = isUnion;
      });
      if (!isUnion) {
        [conjointNom, conjointPrenoms].forEach((inp) => {
          if (inp) inp.value = "";
        });
      }
    }),
  );

  const conjMembreRadios = $$('input[name="conjoint_membre"]');
  const blocConjointEglise = $("#bloc-conjoint-eglise");
  const conjointEglise = $("#conjoint_eglise");
  conjMembreRadios.forEach((r) =>
    r.addEventListener("change", () => {
      const isNon = r.checked && r.value === "non";
      blocConjointEglise.hidden = !isNon;
      if (conjointEglise) conjointEglise.required = isNon;
      if (!isNon && conjointEglise) conjointEglise.value = "";
    }),
  );

  const enfantsRadios = $$('input[name="a_enfants"]');
  const blocEnfants = $("#bloc-enfants");
  enfantsRadios.forEach((r) =>
    r.addEventListener("change", () => {
      const isOui = r.checked && r.value === "oui";
      blocEnfants.hidden = !isOui;
      if (!isOui) {
        state.children = [];
        renderChildren();
      }
    }),
  );

  const tutelleRadios = $$('input[name="sous_tutelle"]');
  const blocTutelle = $("#bloc-tutelle");
  const lienTuteur = $("#lien_tuteur");
  tutelleRadios.forEach((r) =>
    r.addEventListener("change", () => {
      const isOui = r.checked && r.value === "oui";
      blocTutelle.hidden = !isOui;
      if (lienTuteur) lienTuteur.required = isOui;
      if (!isOui) {
        if (lienTuteur) lienTuteur.value = "";
        $("#bloc-lien-autre").hidden = true;
      }
    }),
  );

  lienTuteur?.addEventListener("change", () => {
    const isAutre = lienTuteur.value === "autre";
    const bloc = $("#bloc-lien-autre");
    const input = $("#lien_tuteur_autre");
    bloc.hidden = !isAutre;
    if (input) input.required = isAutre;
    if (!isAutre && input) input.value = "";
  });

  const egliseSelect = $("#eglise");
  const blocEgliseAutre = $("#bloc-eglise-autre");
  const egliseAutreInput = $("#eglise_autre");
  egliseSelect?.addEventListener("change", () => {
    const isAutre = egliseSelect.value === "Autres";
    blocEgliseAutre.hidden = !isAutre;
    if (egliseAutreInput) egliseAutreInput.required = isAutre;
    if (!isAutre && egliseAutreInput) egliseAutreInput.value = "";
  });

  const baptiseRadios = $$('input[name="baptise"]');
  const blocDateBapteme = $("#bloc-date-bapteme");
  baptiseRadios.forEach((r) =>
    r.addEventListener("change", () => {
      const isOui = r.checked && r.value === "oui";
      blocDateBapteme.hidden = !isOui;
      if (!isOui) $("#date_bapteme").value = "";
    }),
  );
}

/* ---------- Détection mineur ---------- */
function bindMinorDetection() {
  const dateInput = $("#date_naissance");
  const infoMineur = $("#info-mineur");
  const blocMineur = $("#bloc-mineur");
  const responsableNom = $("#responsable_nom_complet");
  const responsableTel = $("#responsable_telephone");
  const consentement = $("#consentement_parental");

  const update = () => {
    if (!dateInput.value) return;
    const age = computeAge(dateInput.value);
    const isMinor = age !== null && age < 18;

    if (infoMineur) infoMineur.hidden = !isMinor;
    if (blocMineur) blocMineur.hidden = !isMinor;

    if (responsableNom) responsableNom.required = isMinor;
    if (responsableTel) responsableTel.required = isMinor;
    if (consentement) consentement.required = isMinor;

    if (!isMinor) {
      if (responsableNom) responsableNom.value = "";
      if (responsableTel) responsableTel.value = "";
      if (consentement) consentement.checked = false;
    }
  };

  dateInput?.addEventListener("change", update);
  dateInput?.addEventListener("input", update);
}

function computeAge(dateStr) {
  if (!dateStr) return null;
  const birth = new Date(dateStr);
  if (isNaN(birth.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
  return age;
}

/* ============================================
   ENFANTS
   ============================================ */
function bindChildren() {
  const btnAdd = $("#btn-ajouter-enfant");
  const tpl = $("#tpl-enfant");
  const list = $("#liste-enfants");
  const counter = $("#enfants-compteur");

  btnAdd?.addEventListener("click", () => {
    if (state.children.length >= MAX_CHILDREN) return;
    state.childSeq += 1;
    const child = {
      id: `child-${state.childSeq}`,
      nom: "",
      prenoms: "",
      date_naissance: "",
      niveau_scolaire: "",
    };
    state.children.push(child);
    renderChildren();
    const card = list.querySelector(`[data-child-id="${child.id}"]`);
    card?.querySelector('[data-field="nom"]')?.focus();
  });

  list?.addEventListener("input", (e) => {
    const input = e.target.closest("[data-field]");
    if (!input) return;
    const card = input.closest("[data-child-id]");
    if (!card) return;
    const child = state.children.find((c) => c.id === card.dataset.childId);
    if (!child) return;
    child[input.dataset.field] = input.value;
  });

  list?.addEventListener("change", (e) => {
    const input = e.target.closest("[data-field]");
    if (!input) return;
    const card = input.closest("[data-child-id]");
    if (!card) return;
    const child = state.children.find((c) => c.id === card.dataset.childId);
    if (!child) return;
    child[input.dataset.field] = input.value;
  });

  list?.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-remove-child]");
    if (!btn) return;
    const card = btn.closest("[data-child-id]");
    if (!card) return;
    state.children = state.children.filter(
      (c) => c.id !== card.dataset.childId,
    );
    renderChildren();
  });

  renderChildren = function () {
    if (!list) return;
    list.innerHTML = "";

    state.children.forEach((child, idx) => {
      const node = tpl.content.firstElementChild.cloneNode(true);
      node.dataset.childId = child.id;

      const titleSpan = node.querySelector("[data-child-index]");
      if (titleSpan) titleSpan.textContent = String(idx + 1);

      node.querySelectorAll("[data-field]").forEach((input) => {
        const field = input.dataset.field;
        const id = `${child.id}-${field}`;
        input.id = id;
        input.name = `enfants[${idx}][${field}]`;
        input.value = child[field] || "";
        const label = node.querySelector(`[data-label-for="${field}"]`);
        if (label) label.setAttribute("for", id);
      });

      list.appendChild(node);
    });

    if (counter) {
      counter.textContent = `${state.children.length} enfant${state.children.length > 1 ? "s" : ""} sur ${MAX_CHILDREN} maximum`;
    }
    if (btnAdd) btnAdd.disabled = state.children.length >= MAX_CHILDREN;
  };

  window.__renderChildren = renderChildren;
}

/* ============================================
   FORMATAGE TÉLÉPHONE
   ============================================ */
function bindPhoneFormatting() {
  $$('input[type="tel"]').forEach((input) => {
    input.addEventListener("input", () => {
      let v = input.value.replace(/[^\d\s+().-]/g, "");
      if (v.replace(/\D/g, "").length > 4) {
        const digits = v.replace(/\D/g, "");
        v = digits.replace(/(\d{2})(?=\d)/g, "$1 ").trim();
      }
      input.value = v;
    });
  });
}

/* ============================================
   RÉCAPITULATIF
   ============================================ */
function buildRecap() {
  if (!recapEl) return;

  const sections = [
    {
      title: "Identité",
      fields: [
        ["Nom", val("nom")],
        ["Prénoms", val("prenoms")],
        ["Sexe", labelRadio("sexe")],
        ["Date de naissance", formatDate(val("date_naissance"))],
        ["Nationalité", val("nationalite")],
      ],
    },
    {
      title: "Coordonnées",
      fields: [
        ["Téléphone", phoneVal("telephone_indicatif", "telephone")],
        [
          "WhatsApp",
          $("#whatsapp_identique")?.checked
            ? "Identique au téléphone"
            : phoneVal("whatsapp_indicatif", "whatsapp"),
        ],
        ["E-mail", val("email") || "—"],
        ["Pays de résidence", val("pays_residence")],
        ["Ville", val("ville_residence")],
      ],
    },
    {
      title: "Église et parcours",
      fields: [
        ["Église", egliseLabel()],
        ["Communauté", val("communaute") || "—"],
        ["Fonction", val("fonction_mouvement") || "—"],
        [
          "Baptisé(e)",
          labelRadio("baptise") +
            (val("date_bapteme")
              ? ` (le ${formatDate(val("date_bapteme"))})`
              : ""),
        ],
        ["Date d'arrivée", formatDate(val("date_arrivee")) || "—"],
        ["Niveau d'études", val("niveau_etudes")],
        [
          "Situation pro.",
          labelRadio("situation_professionnelle") +
            (val("situation_professionnelle_autre")
              ? ` (${val("situation_professionnelle_autre")})`
              : ""),
        ],
        ["Profession", val("profession") || "—"],
      ],
    },
    {
      title: "Famille",
      fields: [
        ["Situation matrimoniale", labelRadio("situation_matrimoniale")],
        ["Conjoint", conjointLabel()],
        ["Enfants", childrenLabel()],
      ],
    },
    {
      title: "Tutelle",
      fields: [
        ["Sous tutelle", labelRadio("sous_tutelle")],
        [
          "Lien tuteur",
          val("lien_tuteur") +
            (val("lien_tuteur_autre")
              ? ` (${val("lien_tuteur_autre")})`
              : "") || "—",
        ],
        ["Responsable légal", val("responsable_nom_complet") || "—"],
        [
          "Téléphone responsable",
          phoneVal(
            "responsable_telephone_indicatif",
            "responsable_telephone",
          ) || "—",
        ],
      ],
    },
  ];

  recapEl.innerHTML = sections
    .map(
      (sec) => `
    <div class="recap__section">
      <h3 class="recap__title">${escapeHtml(sec.title)}</h3>
      <dl>
        ${sec.fields
          .map(
            ([k, v]) => `
          <dt>${escapeHtml(k)}</dt>
          <dd>${escapeHtml(String(v || "—")).replace(/\n/g, "<br>")}</dd>
        `,
          )
          .join("")}
      </dl>
    </div>
  `,
    )
    .join("");

  function val(name) {
    const el = form.elements[name];
    if (!el) return "";
    return el.value || "";
  }

  function egliseLabel() {
    const v = val("eglise");
    if (v === "Autres") {
      const autre = val("eglise_autre");
      return autre ? `Autres — ${autre}` : "Autres";
    }
    return v || "—";
  }

  function labelRadio(name) {
    const checked = form.querySelector(`input[name="${name}"]:checked`);
    if (!checked) return "—";
    const lbl = checked.closest("label")?.querySelector("span");
    return lbl ? lbl.textContent.trim() : checked.value;
  }
  function phoneVal(indicName, numName) {
    const indic = form.elements[indicName]?.value || "";
    const num = form.elements[numName]?.value || "";
    return num ? `${indic} ${num}`.trim() : "";
  }
  function formatDate(d) {
    if (!d) return "—";
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return d;
    return dt.toLocaleDateString("fr-FR");
  }
  function conjointLabel() {
    if (blocHidden("bloc-conjoint")) return "—";
    const nom = val("conjoint_nom");
    const prenoms = val("conjoint_prenoms");
    return [prenoms, nom].filter(Boolean).join(" ") || "—";
  }
  function childrenLabel() {
    if (blocHidden("bloc-enfants") || !state.children.length) return "Aucun";
    return state.children
      .map(
        (c, i) =>
          `${i + 1}. ${[c.prenoms, c.nom].filter(Boolean).join(" ") || "—"}`,
      )
      .join("\n");
  }
  function blocHidden(id) {
    const el = document.getElementById(id);
    return !el || el.hidden;
  }
}

/* ============================================
   TURNSTILE (Cloudflare) — désactivé sans clé
   ============================================ */
function initTurnstile() {
  const container = $("#turnstile-container");
  if (!container || typeof turnstile === "undefined") return;
  if (turnstileRendered) return;

  // ⚠️ Turnstile est optionnel avec Web3Forms (qui a son propre anti-spam).
  // Ne pas initialiser pour éviter une clé "VOTRE_SITE_KEY_CLOUDFLARE" invalide.
  return;
}

/* ============================================
   SOUMISSION — Web3Forms
   ============================================ */
function bindSubmit() {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (state.submitting) return;

    // Validation finale
    if (!validateStep(TOTAL_STEPS)) return;

    const consent = $("#consentement_confidentialite");
    if (consent && !consent.checked) {
      showErrors([
        {
          el: consent,
          message: "Vous devez accepter la politique de confidentialité.",
        },
      ]);
      return;
    }

    state.submitting = true;
    btnSubmit.classList.add("is-loading");
    btnSubmit.disabled = true;
    submitStatus.textContent = "Envoi en cours…";

    try {
      const payload = collectPayload();

      // Envoi vers Web3Forms
      const response = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || `Erreur serveur (${response.status})`,
        );
      }

      // Succès : redirection
      window.location.href = "merci.html";
    } catch (err) {
      console.error("Erreur d'envoi :", err);
      submitStatus.textContent = "Échec de l'envoi : " + err.message;
      showErrors([
        {
          el: btnSubmit,
          message: err.message || "Erreur lors de l'envoi. Réessayez.",
        },
      ]);
      state.submitting = false;
      btnSubmit.classList.remove("is-loading");
      btnSubmit.disabled = false;
    }
  });
}

/* ---------- Construction du payload (aplati pour Web3Forms) ---------- */
function collectPayload() {
  const identite = {
    nom: val("nom"),
    prenoms: val("prenoms"),
    sexe: checked("sexe"),
    date_naissance: val("date_naissance"),
    nationalite: val("nationalite"),
  };

  const coordonnees = {
    telephone_indicatif: val("telephone_indicatif"),
    telephone_numero: val("telephone"),
    whatsapp_identique: $("#whatsapp_identique")?.checked ?? false,
    whatsapp_indicatif: $("#whatsapp_identique")?.checked
      ? null
      : val("whatsapp_indicatif"),
    whatsapp_numero: $("#whatsapp_identique")?.checked
      ? null
      : val("whatsapp"),
    email: val("email") || null,
    pays_residence: val("pays_residence"),
    ville_residence: val("ville_residence"),
  };

  const eglise_parcours = {
    eglise: val("eglise"),
    eglise_autre:
      val("eglise") === "Autres" ? val("eglise_autre") || null : null,
    communaute: val("communaute") || null,
    fonction_mouvement: val("fonction_mouvement") || null,
    baptise: checked("baptise"),
    date_bapteme: val("date_bapteme") || null,
    date_arrivee: val("date_arrivee") || null,
    niveau_etudes: val("niveau_etudes"),
    situation_professionnelle: checked("situation_professionnelle"),
    situation_professionnelle_autre:
      val("situation_professionnelle_autre") || null,
    profession: val("profession") || null,
  };

  const conjointHidden = $("#bloc-conjoint")?.hidden;
  const famille = {
    situation_matrimoniale: checked("situation_matrimoniale"),
    conjoint_nom: conjointHidden ? null : val("conjoint_nom"),
    conjoint_prenoms: conjointHidden ? null : val("conjoint_prenoms"),
    conjoint_telephone_indicatif: conjointHidden
      ? null
      : val("conjoint_telephone_indicatif"),
    conjoint_telephone_numero: conjointHidden
      ? null
      : val("conjoint_telephone"),
    conjoint_membre_mouvement: conjointHidden
      ? null
      : checked("conjoint_membre"),
    conjoint_eglise: conjointHidden ? null : val("conjoint_eglise") || null,
    a_enfants: checked("a_enfants"),
    enfants:
      checked("a_enfants") === "oui"
        ? state.children.map((c, i) => ({
            [`enfant_${i + 1}_nom`]: c.nom,
            [`enfant_${i + 1}_prenoms`]: c.prenoms,
            [`enfant_${i + 1}_date_naissance`]: c.date_naissance,
            [`enfant_${i + 1}_niveau_scolaire`]: c.niveau_scolaire,
          }))
        : [],
  };

  const mineurHidden = $("#bloc-mineur")?.hidden;
  const tutelle = {
    sous_tutelle: checked("sous_tutelle"),
    lien_tuteur: val("lien_tuteur") || null,
    lien_tuteur_autre: val("lien_tuteur_autre") || null,
    responsable_nom_complet: mineurHidden
      ? null
      : val("responsable_nom_complet"),
    responsable_telephone_indicatif: mineurHidden
      ? null
      : val("responsable_telephone_indicatif"),
    responsable_telephone_numero: mineurHidden
      ? null
      : val("responsable_telephone"),
    consentement_parental: mineurHidden
      ? null
      : $("#consentement_parental")?.checked ?? false,
  };

  // Aplatissement : { identite: { nom } } → { "identite.nom": ... }
  const flat = {
    access_key: WEB3FORMS_KEY,
    subject: `Nouveau recensement — ${identite.prenoms || ""} ${identite.nom || ""}`.trim(),
    from_name: "Formulaire de recensement CI-MEJ",
    submission_id: $("#submission_id")?.value || "",
    consentement_confidentialite:
      $("#consentement_confidentialite")?.checked ?? false,
  };

  const flatten = (obj, prefix = "") => {
    for (const [k, v] of Object.entries(obj)) {
      if (v === null || v === undefined) {
        flat[prefix + k] = "";
        continue;
      }
      if (Array.isArray(v)) {
        v.forEach((item, i) => {
          if (typeof item === "object" && item !== null) {
            flatten(item, `${prefix}${k}_${i + 1}.`);
          } else {
            flat[`${prefix}${k}_${i + 1}`] = item;
          }
        });
        continue;
      }
      if (typeof v === "object") {
        flatten(v, `${prefix}${k}.`);
        continue;
      }
      flat[prefix + k] = v;
    }
  };

  flatten({ identite, coordonnees, eglise_parcours, famille, tutelle });

  return flat;

  function val(name) {
    return form.elements[name]?.value || "";
  }
  function checked(name) {
    return form.querySelector(`input[name="${name}"]:checked`)?.value || null;
  }
}

/* ============================================
   UTILITAIRES
   ============================================ */
function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}