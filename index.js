const { makeWASocket, useMultiFileAuthState, delay, DisconnectReason } = require('@whiskeysockets/baileys');
const pino = require('pino');
const express = require('express');
const qrcode = require('qrcode');

const app = express();
app.use(express.json());
const PORT = process.env.PORT || 3000;

let sock;
let qrGlobal = '';
let statusConexao = 'Aguardando inicialização...';

// Se você já souber o ID depois, pode colocar aqui. Se não, deixe vazio ''
let grupoIdSalvo = ""; 

const NUMERO_DONO = "5565993416402@s.whatsapp.net";
const TOKEN_SECRETO = "DON777_TOKEN_SUPER_SECRETO_123";

app.get('/', (req, res) => {
    res.send(`<h1>Status: ${statusConexao}</h1>${qrGlobal ? `<img src="${qrGlobal}" />` : ''}`);
});

async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
    sock = makeWASocket({ logger: pino({ level: 'silent' }), auth: state });

    sock.ev.on('connection.update', async (update) => {
        const { connection, qr } = update;
        if (qr) { qrGlobal = await qrcode.toDataURL(qr); statusConexao = 'Escaneie o QR Code'; }
        if (connection === 'open') { statusConexao = 'CONECTADO! 🚀'; qrGlobal = ''; }
        if (connection === 'close') connectToWhatsApp();
    });

    sock.ev.on('creds.update', saveCreds);

    // --- COMANDO PARA DESCOBRIR O ID DO GRUPO ---
    sock.ev.on('messages.upsert', async ({ messages }) => {
        const m = messages[0];
        if (!m.message) return;

        const remoteJid = m.key.remoteJid;
        const body = m.message.conversation || m.message.extendedTextMessage?.text || "";

        // Se você mandar !meuid no grupo, ele te responde com o ID exato
        if (body.toLowerCase() === '!meuid' && remoteJid.endsWith('@g.us')) {
            grupoIdSalvo = remoteJid;
            console.log(`[ID ENCONTRADO] O ID deste grupo é: ${remoteJid}`);
            await sock.sendMessage(remoteJid, { text: `📍 *ID deste grupo:* \n\`${remoteJid}\`` });
        }
    });

    app.post('/notificar-ggs', async (req, res) => {
        const tokenRecebido = req.headers['authorization'];
        const { quantidade } = req.body;
        
        if (tokenRecebido !== `Bearer ${TOKEN_SECRETO}`) return res.status(401).send('Acesso negado.');
        if (!grupoIdSalvo) return res.status(400).send('ID do grupo não configurado.');

        await delay(3000);
        await sock.sendMessage(grupoIdSalvo, { text: `🔥 *ATUALIZAÇÃO DE LOTE - DON GG'S* 🔥\n\nForam adicionadas *${quantidade} novas GGs* no sistema!\nGestão: *DON 777* 🚀` });
        res.status(200).send('Enviado!');
    });
}

app.listen(PORT, () => console.log(`Rodando na porta ${PORT}`));
connectToWhatsApp();
