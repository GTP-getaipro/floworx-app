export const required = (msg = "This field is required") => v =>
  (v == null || String(v).trim() === "" ? msg : null);

export const email = (msg = "Enter a valid email") => v =>
  /.+@.+\..+/.test(String(v || "").trim()) ? null : msg;

export const minLength = (n, msg = `Must be at least ${n} characters`) => v =>
  (String(v || "").length >= n ? null : msg);

export const passwordStrong = (msg = "Use 8+ chars incl. upper, lower, number, symbol") => v =>
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\w\s]).{8,}$/.test(String(v || "")) ? null : msg;

export const matches = (field, msg = "Does not match") => (v, all) =>
  (v === all?.[field] ? null : msg);
