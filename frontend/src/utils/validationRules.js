export function required(msg = "This field is required") {
  return function validateRequired(v) {
    return (v === null || v === undefined || String(v).trim() === "" ? msg : null);
  };
}

export function email(msg = "Please enter a valid email address") {
  return function validateEmail(v) {
    return /.+@.+\..+/.test(String(v || "").trim()) ? null : msg;
  };
}

export function minLength(n, msg = `Must be at least ${n} characters`) {
  return function validateMinLength(v) {
    return (String(v || "").length >= n ? null : msg);
  };
}

export function passwordStrong(msg = "Use 8+ chars incl. upper, lower, number, symbol") {
  return function validatePasswordStrong(v) {
    return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\w\s]).{8,}$/.test(String(v || "")) ? null : msg;
  };
}

export function matches(field, msg = "Does not match") {
  return function validateMatches(v, all) {
    return (v === all?.[field] ? null : msg);
  };
}
