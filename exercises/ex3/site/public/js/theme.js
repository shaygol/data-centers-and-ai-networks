// Light by default; the toggle remembers the choice per browser (falls back silently if storage is blocked).
(function () {
  var KEY = "miswire-theme";
  function get() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
  function set(v) { try { localStorage.setItem(KEY, v); } catch (e) {} }
  function apply(t) { document.documentElement.setAttribute("data-theme", t); }
  apply(get() === "dark" ? "dark" : "light");
  document.addEventListener("DOMContentLoaded", function () {
    var b = document.getElementById("themeBtn");
    if (!b) return;
    function label() { var d = document.documentElement.getAttribute("data-theme") === "dark"; b.textContent = d ? "☀ Light" : "☾ Dark"; b.setAttribute("aria-label", d ? "Switch to light theme" : "Switch to dark theme"); }
    label();
    b.addEventListener("click", function () {
      var next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
      apply(next); set(next); label();
    });
  });
})();
