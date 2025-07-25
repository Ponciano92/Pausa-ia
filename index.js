const express = require("express");
const axios = require("axios");

const app = express();
const port = process.env.PORT || 3000;

// Extrai um número válido do campo "Telefone", tratando espaços e formatos mistos
function extrairTelefoneValido(rawTelefones) {
  const numeros = rawTelefones
    .replace(/\s/g, "") // remove espaços
    .split(",")
    .map(n => n.replace(/\D/g, "")) // limpa tudo que não for número
    .filter(n => n.length >= 11);

  const unicos = [...new Set(numeros)];
  const valido = unicos.find(n => n.length === 13); // busca o formato ideal

  return valido || unicos[0] || null;
}

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

  const numeroFormatado = extrairTelefoneValido(phoneNumber);
  if (!numeroFormatado) {
    return res.status(400).send("Nenhum telefone válido encontrado.");
  }

  const automationFlag = automationOnHold === "true";

  try {
    const pauseResponse = await axios.post(
      "https://xltw-api6-8lww.b2.xano.io/api:5ONttZdQ/contatos",
      {
        phoneNumber: numeroFormatado,
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
    const {
      nome = "Não informado",
      numero_tel = numeroFormatado,
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
