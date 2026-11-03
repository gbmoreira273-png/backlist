
// =====================================================
// 1. IMPORTANDO AS BIBLIOTECAS
// =====================================================

// Importa o Express para criar o servidor e as rotas.
const express = require("express");

// Importa o CORS para permitir comunicação com o frontend.
const cors = require("cors");

// Cria a aplicação Express.
const app = express();

// Define a porta onde o servidor será executado.
const PORT = 3000;


// =====================================================
// 2. CONFIGURAÇÕES DO SERVIDOR
// =====================================================

// Permite que o frontend acesse o backend.
app.use(cors());

// Permite receber dados no formato JSON.
app.use(express.json());


// =====================================================
// 3. VARIÁVEIS PARA ARMAZENAR OS DADOS
// =====================================================

// Array que armazenará os usuários cadastrados.
// Os dados ficarão apenas na memória.
let usuarios = [];

// Array que armazenará as movimentações financeiras.
let movimentacoes = [];

// Variável que controla o próximo ID de usuário.
let proximoIdUsuario = 1;

// Variável que controla o próximo ID financeiro.
let proximoIdMovimentacao = 1;


// =====================================================
// 4. ROTA INICIAL
// =====================================================

// GET: apresenta uma mensagem quando acessamos a API.
app.get("/", (req, res) => {

    res.send("API do Sistema Financeiro funcionando!");

});


// =====================================================
// 5. CADASTRAR USUÁRIO
// =====================================================

// POST: recebe login e senha e cadastra um usuário.

app.post("/usuarios", (req, res) => {

    // Recebe os dados enviados pelo frontend.
    const { login, senha } = req.body;

    // Verifica se login e senha foram informados.
    if (!login || !senha) {

        return res.status(400).json({
            mensagem: "Informe o login e a senha!"
        });

    }

    // Verifica se o login já está cadastrado.
    const usuarioExistente = usuarios.find(
        usuario => usuario.login === login
    );

    if (usuarioExistente) {

        return res.status(409).json({
            mensagem: "Este login já está cadastrado!"
        });

    }

    // Cria um novo usuário.
    const novoUsuario = {

        id: proximoIdUsuario++,
        login: login,
        senha: senha

    };

    // Guarda o usuário no array.
    usuarios.push(novoUsuario);

    // Retorna uma mensagem de sucesso.
    res.status(201).json({

        mensagem: "Usuário cadastrado com sucesso!",

        usuario: {
            id: novoUsuario.id,
            login: novoUsuario.login
        }

    });

});


// =====================================================
// 6. VALIDAR LOGIN E SENHA
// =====================================================

// POST: verifica se o usuário existe e se a senha está correta.

app.post("/login", (req, res) => {

    // Recebe login e senha.
    const { login, senha } = req.body;

    // Verifica se os campos foram preenchidos.
    if (!login || !senha) {

        return res.status(400).json({
            mensagem: "Informe login e senha!"
        });

    }

    // Procura um usuário com login e senha correspondentes.
    const usuarioEncontrado = usuarios.find(
        usuario =>
            usuario.login === login &&
            usuario.senha === senha
    );

    // Se não encontrar, o acesso será negado.
    if (!usuarioEncontrado) {

        return res.status(401).json({
            mensagem: "Login ou senha incorretos!"
        });

    }

    // Se encontrar, libera o acesso.
    res.json({

        mensagem: "Login realizado com sucesso!",

        usuario: {
            id: usuarioEncontrado.id,
            login: usuarioEncontrado.login
        }

    });

});


// =====================================================
// 7. CADASTRAR ENTRADAS E SAÍDAS
// =====================================================

// POST: cadastra uma movimentação financeira.

app.post("/financeiro", (req, res) => {

    // Recebe os dados enviados pelo frontend.
    const { descricao, tipo, valor, usuarioId } = req.body;

    // Verifica se todos os campos foram preenchidos.
    if (!descricao || !tipo || valor === undefined || usuarioId === undefined) {

        return res.status(400).json({
            mensagem: "Preencha todos os campos!"
        });

    }

    // Verifica se o tipo é entrada ou saída.
    if (tipo !== "entrada" && tipo !== "saida") {

        return res.status(400).json({
            mensagem: "O tipo deve ser entrada ou saida!"
        });

    }

    // Verifica se o valor é numérico e positivo.
    if (typeof valor !== "number" || !Number.isFinite(valor) || valor <= 0) {

        return res.status(400).json({
            mensagem: "Informe um valor numérico maior que zero!"
        });

    }

    // Verifica se o usuário está cadastrado.
    const usuarioExiste = usuarios.find(
        usuario => usuario.id === Number(usuarioId)
    );

    if (!usuarioExiste) {

        return res.status(404).json({
            mensagem: "Usuário não encontrado!"
        });

    }

    // Cria a movimentação financeira.
    const novaMovimentacao = {

        id: proximoIdMovimentacao++,
        descricao: descricao,
        tipo: tipo,
        valor: valor,
        usuarioId: Number(usuarioId),
        data: new Date().toISOString()

    };

    // Armazena a movimentação.
    movimentacoes.push(novaMovimentacao);

    // Retorna a movimentação cadastrada.
    res.status(201).json({

        mensagem: "Movimentação cadastrada com sucesso!",

        movimentacao: novaMovimentacao

    });

});


// =====================================================
// 8. LISTAR MOVIMENTAÇÕES FINANCEIRAS
// =====================================================

// GET: apresenta todas as movimentações de um usuário.

app.get("/financeiro/:usuarioId", (req, res) => {

    // Recebe o ID pela URL.
    const usuarioId = Number(req.params.usuarioId);

    // Filtra somente as movimentações daquele usuário.
    const resultado = movimentacoes.filter(
        movimentacao => movimentacao.usuarioId === usuarioId
    );

    // Retorna as movimentações encontradas.
    res.json(resultado);

});


// =====================================================
// 9. APRESENTAR RESULTADO FINANCEIRO ATUAL
// =====================================================

// GET: calcula o total de entradas, saídas e saldo atual.

app.get("/financeiro/:usuarioId/resumo", (req, res) => {

    // Recebe o ID do usuário.
    const usuarioId = Number(req.params.usuarioId);

    // Busca as movimentações do usuário.
    const dadosUsuario = movimentacoes.filter(
        movimentacao => movimentacao.usuarioId === usuarioId
    );

    // Soma todas as entradas.
    const totalEntradas = dadosUsuario
        .filter(item => item.tipo === "entrada")
        .reduce((total, item) => total + item.valor, 0);

    // Soma todas as saídas.
    const totalSaidas = dadosUsuario
        .filter(item => item.tipo === "saida")
        .reduce((total, item) => total + item.valor, 0);

    // Calcula o saldo atual.
    const saldoAtual = totalEntradas - totalSaidas;

    // Retorna o resultado financeiro.
    res.json({

        totalEntradas: Number(totalEntradas.toFixed(2)),

        totalSaidas: Number(totalSaidas.toFixed(2)),

        saldoAtual: Number(saldoAtual.toFixed(2))

    });

});


// =====================================================
// 10. ATUALIZAR MOVIMENTAÇÃO FINANCEIRA
// =====================================================

// PUT: altera uma movimentação já cadastrada.

app.put("/financeiro/:id", (req, res) => {

    // Recebe o ID pela URL.
    const id = Number(req.params.id);

    // Recebe os novos dados.
    const { descricao, tipo, valor } = req.body;

    // Procura a movimentação.
    const movimentacao = movimentacoes.find(
        item => item.id === id
    );

    // Verifica se encontrou.
    if (!movimentacao) {

        return res.status(404).json({
            mensagem: "Movimentação não encontrada!"
        });

    }

    // Valida os campos enviados.
    if (
        !descricao ||
        (tipo !== "entrada" && tipo !== "saida") ||
        typeof valor !== "number" ||
        !Number.isFinite(valor) ||
        valor <= 0
    ) {

        return res.status(400).json({
            mensagem: "Informe descrição, tipo válido e valor positivo!"
        });

    }

    // Atualiza os dados.
    movimentacao.descricao = descricao;
    movimentacao.tipo = tipo;
    movimentacao.valor = valor;

    // Retorna o resultado.
    res.json({

        mensagem: "Movimentação atualizada com sucesso!",

        movimentacao: movimentacao

    });

});


// =====================================================
// 11. EXCLUIR MOVIMENTAÇÃO FINANCEIRA
// =====================================================

// DELETE: remove uma movimentação.

app.delete("/financeiro/:id", (req, res) => {

    // Recebe o ID.
    const id = Number(req.params.id);

    // Procura a posição da movimentação no array.
    const indice = movimentacoes.findIndex(
        item => item.id === id
    );

    // Verifica se encontrou.
    if (indice === -1) {

        return res.status(404).json({
            mensagem: "Movimentação não encontrada!"
        });

    }

    // Remove a movimentação do array.
    movimentacoes.splice(indice, 1);

    // Retorna mensagem de sucesso.
    res.json({

        mensagem: "Movimentação excluída com sucesso!"

    });

});


// =====================================================
// 12. INICIAR O SERVIDOR
// =====================================================

// Coloca o servidor em funcionamento.

app.listen(PORT, () => {

    console.log("----------------------------------");
    console.log(" SISTEMA FINANCEIRO INICIADO!");
    console.log(` Servidor: http://localhost:${PORT}`);
    console.log("----------------------------------");

});
