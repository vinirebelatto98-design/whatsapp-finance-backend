const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Memória temporária para armazenar os gastos
let gastos = [];

// Interface do App Web (Otimizada para Celular)
app.get('/', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Finanças Pessoais</title>
        <style>
            * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
            body { background-color: #f4f6f8; margin: 0; padding: 20px; display: flex; justify-content: center; }
            .container { max-width: 400px; width: 100%; background: white; padding: 25px; border-radius: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
            h2 { margin-top: 0; color: #1a1a1a; text-align: center; }
            .form-group { margin-bottom: 15px; }
            label { display: block; margin-bottom: 5px; font-weight: 600; font-size: 14px; color: #4a5568; }
            input { width: 100%; padding: 12px; border: 1px solid #cbd5e0; border-radius: 8px; font-size: 16px; outline: none; }
            input:focus { border-color: #3182ce; }
            button { width: 100%; padding: 14px; background: #3182ce; color: white; border: none; border-radius: 8px; font-size: 16px; font-weight: bold; cursor: pointer; }
            button:active { background: #2b6cb0; }
            .lista { margin-top: 25px; border-top: 1px solid #e2e8f0; padding-top: 15px; }
            .item-gasto { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #edf2f7; font-size: 15px; }
            .valor { font-weight: bold; color: #e53e3e; }
        </style>
    </head>
    <body>
        <div class="container">
            <h2>💰 Lançar Gasto</h2>
            <form action="/adicionar" method="POST">
                <div class="form-group">
                    <label>O que você comprou?</label>
                    <input type="text" name="descricao" placeholder="Ex: Almoço, Uber, Mercado" required autofocus>
                </div>
                <div class="form-group">
                    <label>Valor (R$)</label>
                    <input type="number" step="0.01" name="valor" placeholder="0,00" required>
                </div>
                <button type="submit">Salvar Gasto</button>
            </form>

            <div class="lista">
                <h3>Últimos Lançamentos</h3>
                ${gastos.map(g => `
                    <div class="item-gasto">
                        <span>${g.descricao}</span>
                        <span class="valor">R$ ${parseFloat(g.valor).toFixed(2)}</span>
                    </div>
                `).join('')}
            </div>
        </div>
    </body>
    </html>
    `);
});

// Rota para cadastrar o gasto
app.post('/adicionar', (req, res) => {
    const { descricao, valor } = req.body;
    if (descricao && valor) {
        gastos.unshift({ descricao, valor, data: new Date() });
    }
    res.redirect('/');
});

app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
