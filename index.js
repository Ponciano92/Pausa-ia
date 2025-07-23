const express = require("express");
const axios = require("axios");

const app = express();
const port = process.env.PORT || 3000;

app.get("/", async (req, res) => {
  const { token, phoneNumber, automationOnHold } = req.query;

  if (!token || !phoneNumber) {
    return res.status(400).send("Parâmetros obrigatórios ausentes.");
  }

  // Converte "true"/"false" (string) para booleano real
  const automationFlag = automationOnHold === "true";

  try {
    const response = await axios.post(
      "https://xltw-api6-8lww.b2.xano.io/api:5ONttZdQ/contatos",
      {
        phoneNumber: phoneNumber,
        automationOnHold: automationFlag
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      }
    );

    res.status(200).send(`Sucesso: ${JSON.stringify(response.data)}`);
  } catch (error) {
    res.status(500).send(`Erro ao enviar para Xano: ${error.message}`);
  }
});

app.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
});
