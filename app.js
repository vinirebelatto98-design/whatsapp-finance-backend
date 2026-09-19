const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const pino = require('pino');
const http = require('http');

const PORT = process.env.PORT || 3000;
http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('WhatsApp Bot esta ativo!\n');
}).listen(PORT, () => {
    console.log(`Servidor HTTP ativo na porta ${PORT}`);
});

async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys_v3');
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
        const { connection, lastDisconnect } = update;

        if (connection === 'close') {
            const statusCode = lastDisconnect?.error?.output?.statusCode;
            const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) {
                setTimeout(connectToWhatsApp, 3000);
            }
        } else if (connection === 'open') {
            console.log('SUCCESS: WhatsApp conectado! Mande uma mensagem no seu chat pessoal agora.');
        }
    });

    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0];
        if (!msg) return;

        const senderJid = msg.key.remoteJid || '';
        const participantJid = msg.key.participant || '';
        const isFromMe = msg.key.fromMe;
        const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text;

        // DIAGNÓSTICO: Imprime no log do Render exatamente de onde veio a mensagem
        console.log(`\n================ MENSAGEM DETECTADA ================`);
        console.log(`fromMe: ${isFromMe}`);
        console.log(`remoteJid: ${senderJid}`);
        console.log(`participant: ${participantJid}`);
        console.log(`Texto: ${text}`);
        console.log(`====================================================\n`);

        // Responde a QUALQUER mensagem por enquanto para testarmos no seu chat
        if (text) {
            try {
                await sock.sendMessage(senderJid, { text: `🤖 Bot recebeu seu teste: "${text}"` });
            } catch (err) {
                console.error('Erro ao enviar:', err);
            }
        }
    });
}

connectToWhatsApp();
