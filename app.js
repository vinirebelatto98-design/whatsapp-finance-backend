const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const pino = require('pino');
const OpenAI = require('openai');
const http = require('http');

const PORT = process.env.PORT || 3000;
http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('WhatsApp Bot esta ativo!\n');
}).listen(PORT, () => {
    console.log(`Servidor HTTP ativo na porta ${PORT}`);
});

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
    const { version } = await fetchLatestBaileysVersion();
    
    const sock = makeWASocket({
        version,
        auth: state,
        logger: pino({ level: 'silent' }),
        browser: ['Mac OS', 'Chrome', '121.0.0.0'],
        syncFullHistory: false
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        if (qr) {
            console.log('==================================================');
            console.log('LINK DO QR CODE (COPIE E ABRA NO NAVEGADOR):');
            console.log(`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qr)}`);
            console.log('==================================================');
        }

        if (connection === 'close') {
            const statusCode = lastDisconnect?.error?.output?.statusCode;
            const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
            console.log(`Conexao fechada (${statusCode}). Reconectando...`);
            if (shouldReconnect) {
                setTimeout(connectToWhatsApp, 3000);
            }
        } else if (connection === 'open') {
            console.log('SUCCESS: WhatsApp conectado com sucesso!');
        }
    });

    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0];
        if (!msg.key.fromMe && m.type === 'notify') {
            const remoteJid = msg.key.remoteJid;
            const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text;

            if (text) {
                try {
                    const response = await openai.chat.completions.create({
                        model: "gpt-4o-mini",
                        messages: [{ role: "user", content: text }],
                    });

                    const replyText = response.choices[0].message.content;
                    await sock.sendMessage(remoteJid, { text: replyText });
                } catch (err) {
                    console.error('Erro na OpenAI:', err);
                }
            }
        }
    });
}

connectToWhatsApp();
