const express = require("express");
const axios = require("axios");

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

function extrairTelefoneValido(rawTelefones) {
  const numeros = rawTelefones
    .split(",")
    .map(n => n.replace(/\D/g, ""))
    .filter(n => n.length >= 11);

  const unicos = [...new Set(numeros)];
  const valido = unicos.find(n => n.length === 13);
  return valido || unicos[0] || null;
}

app.post("/", async (req, res) => {
  const query = req.query;
  const headers = req.headers;

  // ✅ Pega o token da IA: primeiro do header, se não, da query
  const tokenIA = headers["authorization"]?.replace("Bearer ", "") || query.token;

  // ✅ Dados do Bitrix: headers > query
  const bitrixToken = headers["bitrix-token"] || query.bitrixToken;
  const bitrixUser = headers["bitrix-user"] || query.bitrixUser;
  const bitrixDomain = headers["bitrix-domain"] || query.bitrixDomain;
  const dealId = headers["deal-id"] || query.dealId;

  const phoneNumber = query.phoneNumber;
  const automationOnHold = query.automationOnHold;
  const details = query.details;

  if (!tokenIA || !phoneNumber) {
    return res.status(400).send("Parâmetros obrigatórios ausentes: token da IA e phoneNumber.");
  }

  const numeroFormatado = extrairTelefoneValido(phoneNumber);
  if (!numeroFormatado) {
    return res.status(400).send("Nenhum telefone válido encontrado.");
  }

  const payloadIA = { phoneNumber: numeroFormatado };

  if (automationOnHold !== undefined) {
    payloadIA.automationOnHold = automationOnHold === "true";
  }

  if (details) {
    payloadIA.details = details;
  }

  try {
    const resposta = await axios.post(
      "https://xltw-api6-8lww.b2.xano.io/api:5ONttZdQ/contatos",
      payloadIA,
      {
        headers: {
          Authorization: `Bearer ${tokenIA}`,
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

    const comentario = `🛑 *API Executada com Sucesso*
📱 Telefone: ${numero_tel}
${automationOnHold !== undefined ? `⏸️ Pausado: ${automationOnHold === "true" ? "✅" : "❌"}\n` : ""}
📝 Detalhes: ${details || "N/A"}

👤 Nome: ${nome}
📞 WhatsApp ID: ${whatsapp_id}
📧 E-mail: ${email || "(não informado)"}
📌 Status: ${status}
🔄 Fluxo Ativo: ${fluxo.ativo ? "Ativo ✅" : "Inativo ❌"}

🔁 *Código original da resposta da API:*
${JSON.stringify(retorno)}`;

    // Verifica se deve comentar no Bitrix
    const dadosBitrixPresentes = bitrixToken && bitrixUser && bitrixDomain && dealId;

    if (dadosBitrixPresentes) {
      const urlBitrix = `https://${bitrixDomain}/rest/${bitrixUser}/${bitrixToken}/crm.timeline.comment.add.json`;
      await axios.post(urlBitrix, {
        fields: {
          ENTITY_ID: dealId,
          ENTITY_TYPE: "deal",
          COMMENT: comentario
        }
      });
    }

    res.status(200).json({
      mensagem: "Execução concluída com sucesso.",
      bitrix: dadosBitrixPresentes ? "Comentário enviado" : "Comentário não enviado (dados incompletos)",
      retorno
    });
  } catch (err) {
    console.error("Erro:", err.response?.data || err.message);
    res.status(500).send(`Erro: ${err.response?.data || err.message}`);
  }
});

app.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
});
