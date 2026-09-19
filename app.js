const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const pino = require('pino');
const http = require('http');

// Servidor HTTP simples para manter o Render ativo
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
        const { connection, lastDisconnect, qr } = update;

        // Gera o link direto idêntico ao de ontem para abrir no Google Chrome
        if (qr) {
            const qrLink = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qr)}`;
            console.log('\n==================================================');
            console.log('COPIE E ABRA O LINK ABAIXO NO GOOGLE PARA VER O QR CODE:');
            console.log(qrLink);
            console.log('==================================================\n');
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
                console.log(`Mensagem recebida de ${remoteJid}: ${text}`);
                
                // Resposta de teste gratuita no WhatsApp
                const replyText = `✅ *Mensagem Recebida com Sucesso!*\n\nVocê enviou: "${text}"\n\nO bot está funcionando perfeitamente no Render!`;
                
                try {
                    await sock.sendMessage(remoteJid, { text: replyText });
                    console.log('Resposta enviada com sucesso no WhatsApp!');
                } catch (err) {
                    console.error('Erro ao enviar no WhatsApp:', err);
                }
            }
        }
    });
}

connectToWhatsApp();
