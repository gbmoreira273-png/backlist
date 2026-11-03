
// ======================================================
// 1. IMPORTAÇÃO DAS BIBLIOTECAS
// ======================================================

// Express cria nosso servidor e as rotas.
const express = require("express");

// CORS permite o acesso ao backend por outros endereços.
const cors = require("cors");

// Crypto será usado para proteger senhas e criar tokens.
const crypto = require("crypto");


// ======================================================
// 2. CONFIGURAÇÃO INICIAL DO SERVIDOR
// ======================================================

// Criamos nossa aplicação utilizando Express.
const app = express();

// Definimos a porta em que o servidor irá funcionar.
const PORT = 3000;

// Permite que o servidor receba dados no formato JSON.
app.use(express.json());

// Habilita o CORS.
app.use(cors());


// ======================================================
// 3. ARMAZENAMENTO DOS DADOS EM VARIÁVEIS
// ======================================================

// Lista de usuários cadastrados.
// Inicialmente está vazia.
let usuarios = [];

// Lista de movimentações financeiras.
// Inicialmente está vazia.
let movimentacoes = [];

// Lista de sessões dos usuários autenticados.
// Os tokens ficam armazenados somente enquanto o servidor
// estiver funcionando.
let sessoes = [];


// ======================================================
// 4. FUNÇÕES AUXILIARES
// ======================================================

// Função para gerar um identificador único.
function gerarId() {
    return crypto.randomUUID();
}

// Função para transformar a senha em um hash.
// Assim não precisamos guardar a senha original.
function criarHash(senha) {
    const salt = crypto.randomBytes(16).toString("hex");

    const hash = crypto.scryptSync(senha, salt, 64).toString("hex");

    return { salt, hash };
}

// Função para verificar se a senha informada está correta.
function verificarSenha(senha, usuario) {
    const hashInformado = crypto.scryptSync(
        senha,
        usuario.salt,
        64
    );

    const hashOriginal = Buffer.from(usuario.hash, "hex");

    return crypto.timingSafeEqual(hashInformado, hashOriginal);
}

// Função para verificar se o usuário está autenticado.
function autenticar(req, res, next) {

    // Procuramos o token enviado no cabeçalho da requisição.
    const token = req.headers.authorization;

    if (!token || !token.startsWith("Bearer ")) {
        return res.status(401).json({
            mensagem: "Acesso negado. Faça login primeiro."
        });
    }

    // Removemos a palavra Bearer e pegamos somente o token.
    const tokenRecebido = token.substring(7);

    // Procuramos a sessão correspondente ao token.
    const sessao = sessoes.find(
        s => s.token === tokenRecebido
    );

    if (!sessao) {
        return res.status(401).json({
            mensagem: "Token inválido. Faça login novamente."
        });
    }

    // Guardamos o usuário autenticado na requisição.
    req.usuarioId = sessao.usuarioId;

    // Permite continuar para a rota solicitada.
    next();
}


// ======================================================
// 5. ROTA INICIAL
// ======================================================

// GET significa consultar ou buscar informações.
app.get("/", (req, res) => {

    res.json({
        mensagem: "API do Sistema Financeiro funcionando!",
        versao: "1.0"
    });

});


// ======================================================
// 6. CADASTRO DE USUÁRIOS
// ======================================================

// POST significa enviar informações para cadastrar algo.
app.post("/usuarios/cadastrar", (req, res) => {

    // Recebemos login e senha enviados pelo usuário.
    const { login, senha } = req.body;

    // Verificamos se os campos foram preenchidos.
    if (!login || !senha) {
        return res.status(400).json({
            mensagem: "Informe login e senha."
        });
    }

    // Verificamos o tamanho mínimo da senha.
    if (typeof senha !== "string" || senha.length < 8) {
        return res.status(400).json({
            mensagem: "A senha precisa ter pelo menos 8 caracteres."
        });
    }

    if (typeof login !== "string" || login.trim().length < 3) {
        return res.status(400).json({
            mensagem: "O login precisa ter pelo menos 3 caracteres."
        });
    }

    // Verificamos se o login já está cadastrado.
    const usuarioExiste = usuarios.find(
        u => u.login === login.trim()
    );

    if (usuarioExiste) {
        return res.status(409).json({
            mensagem: "Este login já está cadastrado."
        });
    }

    // Criamos o hash da senha.
    const senhaProtegida = criarHash(senha);

    // Criamos o novo usuário.
    const novoUsuario = {
        id: gerarId(),
        login: login.trim(),
        salt: senhaProtegida.salt,
        hash: senhaProtegida.hash
    };

    // Salvamos o usuário na variável.
    usuarios.push(novoUsuario);

    res.status(201).json({
        mensagem: "Usuário cadastrado com sucesso!",
        usuario: {
            id: novoUsuario.id,
            login: novoUsuario.login
        }
    });

});


// ======================================================
// 7. LOGIN E VALIDAÇÃO DE USUÁRIO
// ======================================================

// POST utilizado para verificar login e senha.
app.post("/usuarios/login", (req, res) => {

    const { login, senha } = req.body;

    // Verificamos se os dados foram informados.
    if (!login || !senha) {
        return res.status(400).json({
            mensagem: "Informe login e senha."
        });
    }

    // Procuramos o usuário pelo login.
    const usuario = usuarios.find(
        u => u.login === login.trim()
    );

    // Se não encontrar o usuário, o login está incorreto.
    if (!usuario) {
        return res.status(401).json({
            mensagem: "Login ou senha incorretos."
        });
    }

    // Conferimos se a senha está correta.
    if (!verificarSenha(senha, usuario)) {
        return res.status(401).json({
            mensagem: "Login ou senha incorretos."
        });
    }

    // Geramos um token aleatório para a sessão.
    const token = crypto.randomBytes(32).toString("hex");

    // Guardamos o token associado ao usuário.
    sessoes.push({
        token,
        usuarioId: usuario.id
    });

    res.json({
        mensagem: "Login realizado com sucesso!",
        token: token,
        usuario: {
            id: usuario.id,
            login: usuario.login
        }
    });

});


// ======================================================
// 8. ROTA PARA SAIR DO SISTEMA (LOGOUT)
// ======================================================

app.post("/usuarios/logout", autenticar, (req, res) => {

    const token = req.headers.authorization.substring(7);

    // Removemos a sessão do usuário.
    sessoes = sessoes.filter(
        s => s.token !== token
    );

    res.json({
        mensagem: "Logout realizado com sucesso!"
    });

});


// ======================================================
// 9. CADASTRAR ENTRADAS E SAÍDAS FINANCEIRAS
// ======================================================

// POST para cadastrar uma movimentação financeira.
app.post("/financeiro", autenticar, (req, res) => {

    // Recebemos os dados enviados pelo frontend.
    const { descricao, tipo, valor, data } = req.body;

    // Verificamos se todos os campos foram preenchidos.
    if (!descricao || !tipo || valor === undefined || !data) {
        return res.status(400).json({
            mensagem: "Preencha todos os campos."
        });
    }

    // O tipo precisa ser entrada ou saída.
    if (!["entrada", "saida"].includes(tipo)) {
        return res.status(400).json({
            mensagem: "O tipo deve ser entrada ou saida."
        });
    }

    // O valor precisa ser um número positivo e válido.
    if (
        typeof valor !== "number" ||
        !Number.isFinite(valor) ||
        valor <= 0
    ) {
        return res.status(400).json({
            mensagem: "Informe um valor numérico maior que zero."
        });
    }

    // Verificamos se a data possui formato válido.
    if (
        typeof data !== "string" ||
        !/^\d{4}-\d{2}-\d{2}$/.test(data) ||
        !Number.isFinite(Date.parse(data + "T00:00:00Z")) ||
        new Date(data + "T00:00:00Z").toISOString().slice(0, 10) !== data
    ) {
        return res.status(400).json({
            mensagem: "Informe uma data válida no formato AAAA-MM-DD."
        });
    }

    // Criamos a movimentação.
    const novaMovimentacao = {
        id: gerarId(),
        usuarioId: req.usuarioId,
        descricao: descricao,
        tipo: tipo,
        valor: valor,
        data: data
    };

    // Guardamos a movimentação na variável.
    movimentacoes.push(novaMovimentacao);

    res.status(201).json({
        mensagem: "Movimentação cadastrada com sucesso!",
        movimentacao: novaMovimentacao
    });

});


// ======================================================
// 10. CONSULTAR TODAS AS MOVIMENTAÇÕES
// ======================================================

// GET para listar as movimentações do usuário autenticado.
app.get("/financeiro", autenticar, (req, res) => {

    // Mostramos somente as movimentações daquele usuário.
    const lista = movimentacoes.filter(
        m => m.usuarioId === req.usuarioId
    );

    res.json({
        total: lista.length,
        movimentacoes: lista
    });

});


// ======================================================
// 11. CONSULTAR O RESULTADO FINANCEIRO ATUAL
// ======================================================

// GET para calcular entradas, saídas e saldo.
app.get("/financeiro/resumo", autenticar, (req, res) => {

    // Buscamos as movimentações do usuário.
    const lista = movimentacoes.filter(
        m => m.usuarioId === req.usuarioId
    );

    // Somamos todas as entradas.
    const entradas = lista
        .filter(m => m.tipo === "entrada")
        .reduce((total, m) => total + m.valor, 0);

    // Somamos todas as saídas.
    const saidas = lista
        .filter(m => m.tipo === "saida")
        .reduce((total, m) => total + m.valor, 0);

    // Calculamos o saldo atual.
    const saldo = entradas - saidas;

    res.json({
        totalEntradas: Number(entradas.toFixed(2)),
        totalSaidas: Number(saidas.toFixed(2)),
        saldoAtual: Number(saldo.toFixed(2))
    });

});


// ======================================================
// 12. CONSULTAR UMA MOVIMENTAÇÃO ESPECÍFICA
// ======================================================

// GET para buscar uma movimentação pelo ID.
app.get("/financeiro/:id", autenticar, (req, res) => {

    const id = req.params.id;

    const movimentacao = movimentacoes.find(
        m => m.id === id && m.usuarioId === req.usuarioId
    );

    if (!movimentacao) {
        return res.status(404).json({
            mensagem: "Movimentação não encontrada."
        });
    }

    res.json(movimentacao);

});


// ======================================================
// 13. EDITAR UMA MOVIMENTAÇÃO
// ======================================================

// PUT significa atualizar informações existentes.
app.put("/financeiro/:id", autenticar, (req, res) => {

    const id = req.params.id;

    // Procuramos a movimentação do usuário.
    const movimentacao = movimentacoes.find(
        m => m.id === id && m.usuarioId === req.usuarioId
    );

    if (!movimentacao) {
        return res.status(404).json({
            mensagem: "Movimentação não encontrada."
        });
    }

    const { descricao, tipo, valor, data } = req.body;

    // Validamos somente os campos enviados.
    if (descricao !== undefined) {
        if (typeof descricao !== "string" || !descricao.trim()) {
            return res.status(400).json({
                mensagem: "Descrição inválida."
            });
        }
    }

    if (tipo !== undefined) {
        if (!["entrada", "saida"].includes(tipo)) {
            return res.status(400).json({
                mensagem: "O tipo deve ser entrada ou saida."
            });
        }
    }

    if (valor !== undefined) {
        if (
            typeof valor !== "number" ||
            !Number.isFinite(valor) ||
            valor <= 0
        ) {
            return res.status(400).json({
                mensagem: "Informe um valor válido maior que zero."
            });
        }
    }

    if (data !== undefined) {
        if (
            typeof data !== "string" ||
            !/^\d{4}-\d{2}-\d{2}$/.test(data) ||
            !Number.isFinite(Date.parse(data + "T00:00:00Z")) ||
            new Date(data + "T00:00:00Z").toISOString().slice(0, 10) !== data
        ) {
            return res.status(400).json({
                mensagem: "Informe uma data válida no formato AAAA-MM-DD."
            });
        }
    }

    // Atualizamos somente os campos enviados.
    if (descricao !== undefined) movimentacao.descricao = descricao.trim();
    if (tipo !== undefined) movimentacao.tipo = tipo;
    if (valor !== undefined) movimentacao.valor = valor;
    if (data !== undefined) movimentacao.data = data;

    res.json({
        mensagem: "Movimentação atualizada com sucesso!",
        movimentacao: movimentacao
    });

});


// ======================================================
// 14. EXCLUIR UMA MOVIMENTAÇÃO
// ======================================================

// DELETE significa excluir uma informação.
app.delete("/financeiro/:id", autenticar, (req, res) => {

    const id = req.params.id;

    // Procuramos a movimentação pertencente ao usuário.
    const indice = movimentacoes.findIndex(
        m => m.id === id && m.usuarioId === req.usuarioId
    );

    if (indice === -1) {
        return res.status(404).json({
            mensagem: "Movimentação não encontrada."
        });
    }

    // Removemos a movimentação da lista.
    movimentacoes.splice(indice, 1);

    res.json({
        mensagem: "Movimentação excluída com sucesso!"
    });

});


// ======================================================
// 15. INICIAR O SERVIDOR
// ======================================================

// Colocamos o servidor para funcionar.
app.listen(PORT, () => {

    console.log("------------------------------------");
    console.log(" SISTEMA FINANCEIRO INICIADO!");
    console.log("------------------------------------");
    console.log(`Servidor rodando em http://localhost:${PORT}`);

});
