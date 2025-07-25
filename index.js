const express = require("express");
const axios = require("axios");

const app = express();
const port = process.env.PORT || 3000;

// Middleware para garantir que aceita parâmetros com espaços ou vírgulas
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Lógica para pegar um número válido entre vários enviados
function extrairTelefoneValido(rawTelefones) {
  const numeros = rawTelefones
    .split(",")
    .map(n => n.replace(/\D/g, ""))
    .filter(n => n.length >= 11);

  const unicos = [...new Set(numeros)];
  const valido = unicos.find(n => n.length === 13);

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

  const flag = automationOnHold === "true";

  try {
    const resposta = await axios.post(
      "https://xltw-api6-8lww.b2.xano.io/api:5ONttZdQ/contatos",
      {
        phoneNumber: numeroFormatado,
        automationOnHold: flag
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      }
    );

    const retorno = resposta.data;
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
⏸️ Pausado: ${flag ? "✅" : "❌"}

👤 Nome: ${nome}
📞 WhatsApp ID: ${whatsapp_id}
📧 E-mail: ${email || "(não informado)"}
📌 Status: ${status}
🔄 Fluxo Ativo: ${fluxo.ativo ? "Ativo ✅" : "Inativo ❌"}

🔁 *Código original da resposta da API:*
${JSON.stringify(retorno)}`;

    const urlBitrix = `https://${bitrixDomain}/rest/${bitrixUser}/${bitrixToken}/crm.timeline.comment.add.json`;

    await axios.post(urlBitrix, {
      fields: {
        ENTITY_ID: dealId,
        ENTITY_TYPE: "deal",
        COMMENT: comentario
      }
    });

    res.status(200).send("Pausa executada e comentário adicionado com sucesso.");
  } catch (err) {
    console.error("Erro:", err.response?.data || err.message);
    res.status(500).send(`Erro: ${err.response?.data || err.message}`);
  }
});

app.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
});
