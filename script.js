/* GreisFest · Bikini Open — lógica del formulario.
   Lo único que se toca para otro evento es el bloque CONFIG. */
const CONFIG = {
  evento: "Bikini Open - 21 de noviembre",
  entradas: [
    { tipo: "Pareja", precio: 40000, conAcompanante: true },
    { tipo: "Solo",   precio: 40000 },
    { tipo: "Sola",   precio: 15000 }
  ],
  alias: "greist.fest.mp",
  whatsapp: "5491160375935",         
  endpoint: "PEGAR_URL_DE_APPS_SCRIPT"  // PENDIENTE: se completa cuando armemos el backend
};

const $ = (id) => document.getElementById(id);
const form = $("form");
const pesos = (n) => "$" + n.toLocaleString("es-AR");

/* 1. Dibuja las entradas desde CONFIG */
CONFIG.entradas.forEach((e, i) => {
  const l = document.createElement("label");
  l.className = "ticket";
  l.innerHTML = `<input type="radio" name="tipo" value="${e.tipo}" ${i === 0 ? "checked" : ""}>
                 <span>${e.tipo}</span><b>${pesos(e.precio)}</b>`;
  $("tickets").appendChild(l);
});
$("alias-txt").textContent = CONFIG.alias;
$("wa").href = "https://wa.me/" + CONFIG.whatsapp + "?text=" +
  encodeURIComponent("Hola, tengo una consulta sobre Bikini Open");

const entradaElegida = () =>
  CONFIG.entradas.find((e) => e.tipo === form.tipo.value);

/* 2. Al cambiar de entrada: actualiza monto y muestra/oculta acompañante */
function actualizar() {
  const e = entradaElegida();
  $("monto").textContent = pesos(e.precio);
  $("campo-acomp").hidden = !e.conAcompanante;
}
form.addEventListener("change", (ev) => { if (ev.target.name === "tipo") actualizar(); });
actualizar();

/* 3. Copiar alias */
$("copiar").addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(CONFIG.alias);
    $("copiar").textContent = "Copiado";
  } catch {
    $("copiar").textContent = "Copialo a mano";
  }
  setTimeout(() => ($("copiar").textContent = "Copiar"), 2000);
});

/* 4. Archivo elegido: muestra el nombre */
$("archivo").addEventListener("change", () => {
  const f = $("archivo").files[0];
  $("up-titulo").textContent = f ? f.name : "Elegir imagen";
  $("up-sub").textContent = f ? "Tocá para cambiarla" : "Tocá acá para adjuntarla";
  document.querySelector(".up").classList.toggle("listo", !!f);
});

/* 5. Reduce la foto antes de enviarla (una captura de celular pesa varios MB) */
function comprimir(file, max = 1600, calidad = 0.75) {
  return new Promise((ok, fallo) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * k);
      c.height = Math.round(img.height * k);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      ok(c.toDataURL("image/jpeg", calidad).split(",")[1]);
    };
    img.onerror = () => fallo(new Error("No pudimos leer esa imagen. Probá con otra captura."));
    img.src = url;
  });
}

/* 6. Validación */
function validar() {
  const e = entradaElegida();
  if (form.nombre.value.trim().length < 3) return "Escribí tu nombre y apellido.";
  if (e.conAcompanante && form.acompanante.value.trim().length < 3) return "Escribí el nombre de tu acompañante.";
  if (form.telefono.value.replace(/\D/g, "").length < 8) return "Revisá tu número de WhatsApp.";
  if (!$("archivo").files[0]) return "Falta adjuntar el comprobante de la transferencia.";
  return "";
}
const mostrarError = (msg) => { $("error").textContent = msg; $("error").hidden = !msg; };

/* 7. Envío */
form.addEventListener("submit", async (ev) => {
  ev.preventDefault();
  if (form.web.value) return;                       // campo trampa: es un bot
  const problema = validar();
  mostrarError(problema);
  if (problema) { $("error").scrollIntoView({ behavior: "smooth", block: "center" }); return; }

  const btn = $("enviar");
  btn.disabled = true;
  btn.textContent = "Enviando…";
  try {
    const e = entradaElegida();
    const datos = {
      evento: CONFIG.evento,
      tipo: e.tipo,
      monto: e.precio,
      nombre: form.nombre.value.trim(),
      acompanante: e.conAcompanante ? form.acompanante.value.trim() : "",
      telefono: form.telefono.value.trim(),
      comprobante: await comprimir($("archivo").files[0])
    };
    const r = await fetch(CONFIG.endpoint, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },   // evita el preflight CORS de Apps Script
      body: JSON.stringify(datos)
    });
    const res = await r.json();
    if (!res.ok) throw new Error(res.error || "Error al enviar");
    $("ok-nombre").textContent = datos.nombre.split(" ")[0];
    form.hidden = true;
    $("ok").hidden = false;
    $("ok").scrollIntoView({ behavior: "smooth" });
  } catch (err) {
    mostrarError(err.message.startsWith("No pudimos")
      ? err.message
      : "No se pudo enviar. Probá de nuevo o escribinos por WhatsApp.");
    btn.disabled = false;
    btn.textContent = "Anotarme";
  }
});
