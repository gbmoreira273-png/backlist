
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

// ==========================================
// CONFIGURAÇÕES
// ==========================================

const app = express();

app.use(express.json());

const allowedOrigins = process.env.FRONTEND_URL
    ? process.env.FRONTEND_URL.split(",").map(origin => origin.trim())
    : ["*"];

app.use(cors({
    origin: (origin, callback) => {
        if (
            allowedOrigins.includes("*") ||
            !origin ||
            allowedOrigins.includes(origin)
        ) {
            return callback(null, true);
        }

        return callback(new Error("Origem não autorizada pelo CORS"));
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));

// ==========================================
// CONEXÃO COM SUPABASE
// ==========================================

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
    throw new Error("Configure SUPABASE_URL e SUPABASE_KEY.");
}

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
);

// ==========================================
// ROTA PRINCIPAL
// ==========================================

app.get("/", (req, res) => {
    res.status(200).json({
        mensagem: "API de Lista de Tarefas funcionando!",
        status: "online",
        tecnologia: "Node.js + Express + Supabase"
    });
});

// ==========================================
// READ - LISTAR TODAS AS TAREFAS
// GET /api/tarefas
// ==========================================

app.get("/api/tarefas", async (req, res) => {
    try {
        const { data, error } = await supabase
            .from("tarefas")
            .select("*")
            .order("created_at", { ascending: false });

        if (error) throw error;

        return res.status(200).json(data);

    } catch (error) {
        console.error("Erro ao listar:", error.message);

        return res.status(500).json({
            erro: "Não foi possível listar as tarefas."
        });
    }
});

// ==========================================
// READ - BUSCAR TAREFA POR ID
// GET /api/tarefas/:id
// ==========================================

app.get("/api/tarefas/:id", async (req, res) => {
    try {
        const { id } = req.params;

        const { data, error } = await supabase
            .from("tarefas")
            .select("*")
            .eq("id", id)
            .maybeSingle();

        if (error) throw error;

        if (!data) {
            return res.status(404).json({
                erro: "Tarefa não encontrada."
            });
        }

        return res.status(200).json(data);

    } catch (error) {
        console.error("Erro ao buscar:", error.message);

        return res.status(500).json({
            erro: "Não foi possível buscar a tarefa."
        });
    }
});

// ==========================================
// CREATE - CADASTRAR TAREFA
// POST /api/tarefas
// ==========================================

app.post("/api/tarefas", async (req, res) => {
    try {
        const { titulo, descricao } = req.body;

        if (
            typeof titulo !== "string" ||
            !titulo.trim()
        ) {
            return res.status(400).json({
                erro: "O título da tarefa é obrigatório."
            });
        }

        if (
            descricao !== undefined &&
            descricao !== null &&
            typeof descricao !== "string"
        ) {
            return res.status(400).json({
                erro: "A descrição deve ser um texto."
            });
        }

        const { data, error } = await supabase
            .from("tarefas")
            .insert([{
                titulo: titulo.trim(),
                descricao: descricao?.trim() || null,
                concluida: false
            }])
            .select()
            .single();

        if (error) throw error;

        return res.status(201).json({
            mensagem: "Tarefa cadastrada com sucesso!",
            tarefa: data
        });

    } catch (error) {
        console.error("Erro ao cadastrar:", error.message);

        return res.status(500).json({
            erro: "Não foi possível cadastrar a tarefa."
        });
    }
});

// ==========================================
// UPDATE - EDITAR TAREFA
// PUT /api/tarefas/:id
// ==========================================

app.put("/api/tarefas/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const { titulo, descricao, concluida } = req.body;

        const atualizacao = {};

        if (titulo !== undefined) {
            if (
                typeof titulo !== "string" ||
                !titulo.trim()
            ) {
                return res.status(400).json({
                    erro: "O título não pode estar vazio."
                });
            }

            atualizacao.titulo = titulo.trim();
        }

        if (descricao !== undefined) {
            if (
                descricao !== null &&
                typeof descricao !== "string"
            ) {
                return res.status(400).json({
                    erro: "A descrição deve ser um texto."
                });
            }

            atualizacao.descricao = descricao?.trim() || null;
        }

        if (concluida !== undefined) {
            if (typeof concluida !== "boolean") {
                return res.status(400).json({
                    erro: "Concluída deve ser true ou false."
                });
            }

            atualizacao.concluida = concluida;
        }

        if (Object.keys(atualizacao).length === 0) {
            return res.status(400).json({
                erro: "Informe pelo menos um campo para atualizar."
            });
        }

        const { data, error } = await supabase
            .from("tarefas")
            .update(atualizacao)
            .eq("id", id)
            .select()
            .maybeSingle();

        if (error) throw error;

        if (!data) {
            return res.status(404).json({
                erro: "Tarefa não encontrada."
            });
        }

        return res.status(200).json({
            mensagem: "Tarefa atualizada com sucesso!",
            tarefa: data
        });

    } catch (error) {
        console.error("Erro ao atualizar:", error.message);

        return res.status(500).json({
            erro: "Não foi possível atualizar a tarefa."
        });
    }
});

// ==========================================
// PATCH - ALTERNAR CONCLUSÃO
// PATCH /api/tarefas/:id/concluir
// ==========================================

app.patch("/api/tarefas/:id/concluir", async (req, res) => {
    try {
        const { id } = req.params;

        const { data: tarefa, error: buscaErro } = await supabase
            .from("tarefas")
            .select("concluida")
            .eq("id", id)
            .maybeSingle();

        if (buscaErro) throw buscaErro;

        if (!tarefa) {
            return res.status(404).json({
                erro: "Tarefa não encontrada."
            });
        }

        const { data, error } = await supabase
            .from("tarefas")
            .update({
                concluida: !tarefa.concluida
            })
            .eq("id", id)
            .select()
            .single();

        if (error) throw error;

        return res.status(200).json({
            mensagem: "Status alterado com sucesso!",
            tarefa: data
        });

    } catch (error) {
        console.error("Erro ao concluir:", error.message);

        return res.status(500).json({
            erro: "Não foi possível alterar o status."
        });
    }
});

// ==========================================
// DELETE - EXCLUIR TAREFA
// DELETE /api/tarefas/:id
// ==========================================

app.delete("/api/tarefas/:id", async (req, res) => {
    try {
        const { id } = req.params;

        const { data, error } = await supabase
            .from("tarefas")
            .delete()
            .eq("id", id)
            .select("id")
            .maybeSingle();

        if (error) throw error;

        if (!data) {
            return res.status(404).json({
                erro: "Tarefa não encontrada."
            });
        }

        return res.status(200).json({
            mensagem: "Tarefa excluída com sucesso!"
        });

    } catch (error) {
        console.error("Erro ao excluir:", error.message);

        return res.status(500).json({
            erro: "Não foi possível excluir a tarefa."
        });
    }
});

// ==========================================
// TRATAMENTO DE ROTAS INEXISTENTES
// ==========================================

app.use((req, res) => {
    res.status(404).json({
        erro: "Rota não encontrada."
    });
});

// ==========================================
// TRATAMENTO DE ERROS
// ==========================================

app.use((error, req, res, next) => {
    console.error("Erro interno:", error.message);

    res.status(500).json({
        erro: "Erro interno no servidor."
    });
});

// ==========================================
// EXPORTAÇÃO PARA VERCEL
// ==========================================

export default app;

// ==========================================
// EXECUÇÃO LOCAL
// ==========================================

if (!process.env.VERCEL) {
    const PORT = process.env.PORT || 3000;

    app.listen(PORT, () => {
        console.log("----------------------------------");
        console.log(" API DE LISTA DE TAREFAS");
        console.log("----------------------------------");
        console.log(` Servidor: http://localhost:${PORT}`);
        console.log(` Tarefas: http://localhost:${PORT}/api/tarefas`);
        console.log("----------------------------------");
    });
}
