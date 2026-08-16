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
let grupoIdSalvo = null; 
const NUMERO_DONO = "5565993416402@s.whatsapp.net";
const TOKEN_SECRETO = "DON777_TOKEN_SUPER_SECRETO_123";

// --- TELA WEB PARA ESCANEAR O QR CODE FACILMENTE ---
app.get('/', (req, res) => {
    res.send(`
        <html>
            <head>
                <title>Painel - DON 777</title>
                <meta name="viewport" content="width=device-width, initial-scale=1">
                <style>
                    body { font-family: Arial, sans-serif; text-align: center; background: #121212; color: #fff; margin-top: 50px; }
                    .card { background: #1e1e1e; padding: 20px; border-radius: 10px; display: inline-block; box-shadow: 0 4px 10px rgba(0,0,0,0.5); }
                    h2 { color: #00ff88; }
                    img { margin-top: 15px; border-radius: 8px; background: #fff; padding: 10px; width: 260px; height: 260px; }
                    p { font-size: 16px; }
                </style>
            </head>
            <body>
                <div class="card">
                    <h2>🤖 BOT DON GG'S - CONEXÃO</h2>
                    <p>Status: <b>${statusConexao}</b></p>
                    ${qrGlobal ? `<img src="${qrGlobal}" />` : `<p>Carregando QR Code ou já conectado...</p>`}
                    <p style="font-size: 12px; color: #aaa; margin-top: 15px;">Atualize a página se o QR Code expirar.</p>
                </div>
                <script>setTimeout(() => { location.reload(); }, 10000);</script>
            </body>
        </html>
    `);
});

async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
    
    sock = makeWASocket({
        logger: pino({ level: 'silent' }),
        printQRInTerminal: true,
        auth: state,
    });

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        if (qr) {
            statusConexao = 'Escaneie o QR Code abaixo';
            qrGlobal = await qrcode.toDataURL(qr);
        }

        if (connection === 'open') {
            statusConexao = 'CONECTADO COM SUCESSO! 🚀';
            qrGlobal = '';
            console.log('[SUCESSO] Bot conectado ao WhatsApp!');
        }

        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            statusConexao = 'Desconectado. Tentando reconectar...';
            if (shouldReconnect) {
                connectToWhatsApp();
            }
        }
    });

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

    // --- CAPTURA O ID DO GRUPO E COMANDOS DO DONO ---
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

    // --- BOAS-VINDAS ---
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
