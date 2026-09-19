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
            console.log('SUCCESS: WhatsApp conectado e pronto para anotações pessoais!');
        }
    });

    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0];
        if (!msg) return;

        const senderJid = msg.key.remoteJid || '';
        
        // Variações do seu número no WhatsApp
        const NUMERO_COM_9 = '5551980447806';
        const NUMERO_SEM_9 = '555180447806';

        // Verifica se a mensagem é do seu próprio número (chat "Você" ou enviado por si)
        const isMeuNumero = senderJid.includes(NUMERO_COM_9) || senderJid.includes(NUMERO_SEM_9) || msg.key.fromMe;

        // REGRA DE SEGURANÇA: Se for mensagem de clientes/terceiros, ignora 100%
        if (!isMeuNumero) {
            return;
        }

        const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text;

        if (text) {
            // Evita que o bot responda à sua própria confirmação em loop
            if (text.startsWith('✅ *Gasto Anotado')) return;

            console.log(`[DONO] Nova anotação processada: ${text}`);
            
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
