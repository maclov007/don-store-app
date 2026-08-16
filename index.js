const { makeWASocket, useMultiFileAuthState, delay } = require('@whiskeysockets/baileys');
const pino = require('pino');
const express = require('express');

const app = express();
app.use(express.json());
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => res.send('Bot DON 777 está Online!'));

let sock;
let grupoIdSalvo = null; 
const NUMERO_DONO = "5565993416402@s.whatsapp.net"; // Seu número pessoal como dono

// SENHA DE SEGURANÇA PARA O TELEGRAM
const TOKEN_SECRETO = "DON777_TOKEN_SUPER_SECRETO_123";

async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
    sock = makeWASocket({
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false,
        auth: state,
    });

    if (!sock.authState.creds.registered) {
        const phoneNumber = "639461201441"; // Número do bot (Filipinas)
        const code = await sock.requestPairingCode(phoneNumber);
        console.log(`\nCÓDIGO DE PAREAMENTO: ${code}\n`);
    }

    sock.ev.on('creds.update', saveCreds);

    // --- ROTA PROTEGIDA PARA O TELEGRAM ---
    app.post('/notificar-ggs', async (req, res) => {
        const tokenRecebido = req.headers['authorization'];
        const { quantidade } = req.body;
        
        if (tokenRecebido !== `Bearer ${TOKEN_SECRETO}`) {
            return res.status(401).json({ erro: 'Acesso negado. Token inválido.' });
        }

        if (!quantidade) return res.status(400).send('Faltou quantidade');
        if (!grupoIdSalvo) return res.status(400).send('O bot ainda não identificou o grupo. Mande uma mensagem lá no grupo do WhatsApp primeiro!');

        await delay(3000);
        await sock.sendMessage(grupoIdSalvo, { text: `🔥 *ATUALIZAÇÃO DE LOTE - DON GG'S* 🔥\n\nForam adicionadas *${quantidade} novas GGs* no sistema!\nGestão: *DON 777* 🚀` });
        res.status(200).send('Enviado com sucesso!');
    });

    // --- CAPTURA O ID DO GRUPO SOZINHO E COMANDOS DO DONO ---
    sock.ev.on('messages.upsert', async ({ messages }) => {
        const m = messages[0];
        if (!m.message) return;

        const remoteJid = m.key.remoteJid;
        const sender = m.key.participant || m.key.remoteJid;

        if (remoteJid.endsWith('@g.us') && !grupoIdSalvo) {
            grupoIdSalvo = remoteJid;
            console.log(`[SUCESSO] ID do grupo capturado automaticamente: ${grupoIdSalvo}`);
        }

        if (m.key.fromMe) return;
        const body = m.message.conversation || m.message.extendedTextMessage?.text || "";
        
        if (body.toLowerCase() === '!desligar' && sender.includes(NUMERO_DONO)) {
            await sock.sendMessage(remoteJid, { text: "⚠️ Comando recebido, patrão. Desligando o sistema..." });
            process.exit(0);
        }

        if (body.toLowerCase() === '!menu') {
            await delay(1500);
            await sock.sendMessage(remoteJid, { text: `🤖 *MENU DE GESTÃO - DON GG'S*\n\n📍 !regras - Ver as regras\n🏓 !ping - Verificar sistema\n\n_Gerenciado por DON 777_` });
        }
    });

    // --- BOAS-VINDAS COM AS REGRAS AJUSTADAS ---
    sock.ev.on('group-participants.update', async (update) => {
        if (update.action === 'add') {
            const num = update.participants[0];
            if (!grupoIdSalvo) grupoIdSalvo = update.id; 
            
            await delay(5000);
            const text = `👋 *Seja bem-vindo(a) ao grupo DON GG'S!* @${num.split('@')[0]}\n\n` +
                         `Para uma boa convivência, siga as regras abaixo:\n\n` +
                         `📜 *REGRAS DO GRUPO*:\n` +
                         `1️⃣ Proibido brigas, discussões ou falta de respeito;\n` +
                         `2️⃣ Proibido travas, vírus ou links maliciosos;\n` +
                         `3️⃣ Proibido spam ou divulgação não autorizada;\n` +
                         `4️⃣ Respeito total aos administradores e membros.\n\n` +
                         `_Gestão: DON 777 🚀_`;

            await sock.sendMessage(update.id, { text: text, mentions: [num] });
        }
    });
}

app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
connectToWhatsApp();
