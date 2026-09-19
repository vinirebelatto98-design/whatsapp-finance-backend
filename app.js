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
            console.log('SUCCESS: WhatsApp conectado e restrito apenas ao dono!');
        }
    });

    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0];
        
        // REGRA DE SEGURANÇA MÁXIMA:
        // Se a mensagem NÃO veio de você mesmo (fromMe === false), o bot ignora e encerra imediatamente.
        if (!msg.key.fromMe) {
            return;
        }

        const remoteJid = msg.key.remoteJid;
        const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text;

        if (text) {
            console.log(`Mensagem própria processada: ${text}`);
            
            const replyText = `✅ *Anotado no seu Chat Pessoal!*\n\nConteúdo: "${text}"`;
            
            try {
                await sock.sendMessage(remoteJid, { text: replyText });
            } catch (err) {
                console.error('Erro ao responder no seu chat:', err);
            }
        }
    });
}

connectToWhatsApp();
