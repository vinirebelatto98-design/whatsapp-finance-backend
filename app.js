const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const pino = require('pino');
const http = require('http');

// Servidor HTTP para manter o Render ativo
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
            console.log('SUCCESS: WhatsApp conectado e protegido exclusivamente para o seu número!');
        }
    });

    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0];
        if (!msg) return;

        const senderJid = msg.key.remoteJid || '';
        const isFromMe = msg.key.fromMe;

        // Variações do seu número (com 9 e sem 9 dígitos)
        const NUMERO_COM_9 = '5551980447806';
        const NUMERO_SEM_9 = '555180447806';

        // Verifica se a mensagem veio de você (seja pelo seu próprio chat ou mandando para o seu número)
        const isMeuNumero = senderJid.includes(NUMERO_COM_9) || senderJid.includes(NUMERO_SEM_9) || isFromMe;

        // TRAVA DE SEGURANÇA: Se NÃO for o seu número, ignora totalmente
        if (!isMeuNumero) {
            return;
        }

        const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text;

        if (text) {
            console.log(`[DONO] Mensagem recebida: ${text}`);
            
            const replyText = `✅ *Gasto Anotado (Privado)!*\n\nConteúdo: "${text}"`;
            
            try {
                await sock.sendMessage(senderJid, { text: replyText });
                console.log('Resposta enviada com sucesso no seu chat!');
            } catch (err) {
                console.error('Erro ao enviar resposta:', err);
            }
        }
    });
}

connectToWhatsApp();
