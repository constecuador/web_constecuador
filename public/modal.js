const resultado = await response.json();

if(resultado.ok){

    document
        .getElementById("modalExito")
        .classList.add("active");

}

const btnCerrar =
document.getElementById("cerrarModal");

btnCerrar.addEventListener("click", () => {

    document
        .getElementById("modalExito")
        .classList.remove("active");

});



// ✅ Después
(async () => {
    const response = await fetch("/enviar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(datos)
    });

    const resultado = await response.json();

    if (resultado.ok) {
        document.getElementById("modalExito").classList.add("active");
        formulario.reset();
    } else {
        alert("Error al enviar el mensaje");
    }

    const btnCerrar = document.getElementById("cerrarModal");
    btnCerrar.addEventListener("click", () => {
        document.getElementById("modalExito").classList.remove("active");
    });
})();

const resultado = await response.json();

if(resultado.ok){

    document
        .getElementById("modalExito")
        .classList.add("active");

    formulario.reset();

}else{

    alert("Error al enviar el mensaje");

}