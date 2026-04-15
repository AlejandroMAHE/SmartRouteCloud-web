import { auth } from "./firebase.js";
import { sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// ELEMENTOS
const emailInput = document.getElementById("email");
const btnReset = document.getElementById("btnReset");
const errorMsg = document.getElementById("error");

// EVENTO BOTÓN
btnReset.addEventListener("click", async () => {
  const email = emailInput.value.trim();

  // VALIDACIÓN
  if (!email) {
    mostrarError(" Ingresa tu correo");
    return;
  }

  try {
    await sendPasswordResetEmail(auth, email);

    // ÉXITO
    errorMsg.style.color = "green";
    errorMsg.textContent = "📧 Revisa tu correo para cambiar la contraseña";

  } catch (error) {
    console.error(error);

    // ERRORES CONTROLADOS
    if (error.code === "auth/user-not-found") {
      mostrarError("El correo no está registrado");
    } else if (error.code === "auth/invalid-email") {
      mostrarError("Correo inválido");
    } else {
      mostrarError("Error al enviar el correo");
    }
  }
});

// FUNCIÓN PARA MOSTRAR ERRORES
function mostrarError(mensaje) {
  errorMsg.style.color = "red";
  errorMsg.textContent = mensaje;
}