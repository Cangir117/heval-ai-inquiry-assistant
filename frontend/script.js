const button = document.getElementById("analyzeBtn");
const result = document.getElementById("result");

button.addEventListener("click", async () => {
  const formData = {
    name: document.getElementById("name").value,
    email: document.getElementById("email").value,
    website: document.getElementById("website").value,
    company: document.getElementById("company").value,
    subject: document.getElementById("subject").value,
    message: document.getElementById("message").value,
  };

  result.className = "result-card loading";
  result.innerHTML = "Analyse läuft...";

  result.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });

  try {
    const response = await fetch("http://localhost:3000/analyze", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(formData),
    });

    const data = await response.json();

    if (!response.ok) {
      result.className = "result-card error";
      result.innerHTML = data.error || "Fehler bei der Anfrage.";
      return;
    }

    result.className = "result-card";
    result.innerHTML = `
      <p><strong>Kategorie:</strong> ${data.category}</p>
      <p><strong>Priorität:</strong> ${data.priority}</p>
      <p><strong>Lead-Typ:</strong> ${data.leadType}</p>

      <h4>Antwort 1</h4>
      <p>${data.replyOption1}</p>

      <h4>Antwort 2</h4>
      <p>${data.replyOption2}</p>
    `;
  } catch (error) {
    result.className = "result-card error";
    result.innerHTML = "Verbindungsfehler. Bitte erneut versuchen.";
  }
});
