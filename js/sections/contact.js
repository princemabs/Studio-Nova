import { gsap } from "gsap";
import { createMarquee } from "../core/marquee.js";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function initContact({ lenis }) {
  const marquee = document.querySelector(".marquee");
  if (marquee) createMarquee(marquee, { speed: 70, direction: -1, followScroll: true, skew: true, lenis });

  const emailLink = document.querySelector("[data-email]");
  const email = emailLink ? emailLink.getAttribute("href").replace("mailto:", "") : "";

  initCopy(email);
  initForm(email);
}

function initCopy(email) {
  const button = document.querySelector("[data-copy]");
  if (!button || !email) return;
  const label = button.querySelector("span");
  let timer = 0;

  button.addEventListener("click", async () => {
    let copied = false;
    try {
      await navigator.clipboard.writeText(email);
      copied = true;
    } catch {
      // Fallback for browsers without the async clipboard API
      const field = document.createElement("textarea");
      field.value = email;
      field.setAttribute("readonly", "");
      field.style.position = "fixed";
      field.style.opacity = "0";
      document.body.appendChild(field);
      field.select();
      copied = document.execCommand("copy");
      field.remove();
    }
    if (!copied) return;
    button.classList.add("is-copied");
    label.textContent = "Copied!";
    gsap.fromTo(button, { scale: 0.92 }, { scale: 1, duration: 0.6, ease: "elastic.out(1, 0.4)" });
    clearTimeout(timer);
    timer = setTimeout(() => {
      button.classList.remove("is-copied");
      label.textContent = "Copy";
    }, 2200);
  });
}

/**
 * The form has no backend: on submit it validates, then opens the visitor's
 * email app with everything pre-filled. Swap `send()` for a fetch() to your
 * own endpoint (Formspree, Netlify Forms, an API route…) if you prefer.
 */
function initForm(email) {
  const form = document.querySelector(".contact-form");
  if (!form) return;
  const status = form.querySelector(".form-status");
  const submit = form.querySelector(".btn-submit");

  const fields = {
    name: form.querySelector("#cf-name"),
    email: form.querySelector("#cf-email"),
    message: form.querySelector("#cf-message"),
  };

  const rules = {
    name: (v) => (v.trim().length >= 2 ? "" : "Please tell me your name."),
    email: (v) => (EMAIL_PATTERN.test(v.trim()) ? "" : "Please enter a valid email address."),
    message: (v) => (v.trim().length >= 10 ? "" : "A few more words about your project, please."),
  };

  const validate = (key) => {
    const input = fields[key];
    const message = rules[key](input.value);
    const wrapper = input.closest(".field");
    wrapper.classList.toggle("is-invalid", Boolean(message));
    wrapper.querySelector(".field__error").textContent = message;
    input.setAttribute("aria-invalid", String(Boolean(message)));
    return !message;
  };

  Object.keys(fields).forEach((key) => {
    fields[key].addEventListener("blur", () => fields[key].value && validate(key));
    fields[key].addEventListener("input", () => {
      if (fields[key].closest(".field").classList.contains("is-invalid")) validate(key);
    });
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const results = Object.keys(fields).map(validate);
    if (results.includes(false)) {
      const firstInvalid = form.querySelector(".is-invalid input, .is-invalid textarea");
      firstInvalid?.focus();
      gsap.fromTo(form.querySelectorAll(".is-invalid"), { x: -8 }, { x: 0, duration: 0.6, ease: "elastic.out(1, 0.3)" });
      status.classList.add("is-error");
      status.textContent = "Please check the highlighted fields.";
      return;
    }

    const interests = [...form.querySelectorAll('input[name="interest"]:checked')].map((input) => input.value);
    const budget = form.querySelector('input[name="budget"]:checked')?.value;
    const name = fields.name.value.trim();

    const subject = `New project inquiry from ${name}`;
    const body = [
      fields.message.value.trim(),
      "",
      "—",
      `Name: ${name}`,
      `Email: ${fields.email.value.trim()}`,
      `Interested in: ${interests.join(", ") || "—"}`,
      `Budget: ${budget || "—"}`,
    ].join("\n");

    send({ to: email, subject, body });

    status.classList.remove("is-error");
    status.textContent = "Thanks! Your email app should open with the message ready to send.";
    submit.classList.add("is-sent");
    gsap.fromTo(submit, { scale: 0.94 }, { scale: 1, duration: 0.8, ease: "elastic.out(1, 0.4)" });
    setTimeout(() => submit.classList.remove("is-sent"), 3000);
  });
}

function send({ to, subject, body }) {
  window.location.href = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
