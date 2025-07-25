const express = require("express");
const axios = require("axios");

const app = express();
const port = process.env.PORT || 3000;

app.get("/", async (req, res) => {
  const {
    token,
    phoneNumber,
    automationOnHold,
    bitrixToken,
    bitrixUser,
    bitrixDomain,
    dealId
  } = req.query;

  if (!token || !phoneNumber || !automationOnHold || !bitrixToken || !bitrixUser || !bitrixDomain || !dealId) {
    return res.status(400).send("Parâmetros obrigatórios ausentes.");
  }

  const automationFlag = automationOnHold === "true";

  try {
    // 1. Envia para API do Xano
    const pauseResponse = await axios.post(
      "https://xltw-api6-8lww.b2.xano.io/api:5ONttZdQ/contatos",
      {
        phoneNumber,
        automationOnHold: automationFlag
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      }
    );

    const retorno = pauseResponse.data;

    // 2. Formata o comentário com retorno
    const {
      nome = "Não informado",
      numero_tel = phoneNumber,
      whatsapp_id = "N/A",
      email = "Não informado",
      status = "Sem status",
      fluxo = {}
    } = retorno;

    const comentario = `🛑 *API de Pausa Executada com Sucesso*
📱 Telefone: ${numero_tel}
⏸️ Pausado: ${automationFlag ? "✅" : "❌"}

👤 Nome: ${nome}
📞 WhatsApp ID: ${whatsapp_id}
📧 E-mail: ${email || "(não informado)"}
📌 Status: ${status}
🔄 Fluxo Ativo: ${fluxo.ativo ? "Ativo ✅" : "Inativo ❌"}

🔁 *Código original da resposta da API:*
${JSON.stringify(retorno)}`;

    // 3. Envia comentário ao Bitrix
    const bitrixURL = `https://${bitrixDomain}/rest/${bitrixUser}/${bitrixToken}/crm.timeline.comment.add.json`;

    await axios.post(bitrixURL, {
      fields: {
        ENTITY_ID: dealId,
        ENTITY_TYPE: "deal",
        COMMENT: comentario
      }
    });

    res.status(200).send("Pausa executada e comentário adicionado com sucesso.");
  } catch (error) {
    console.error("Erro:", error.response?.data || error.message);
    res.status(500).send(`Erro: ${error.response?.data || error.message}`);
  }
});

app.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
});
