// /api/chat.js (Este é o seu proxy seguro no Vercel)

const { GoogleGenAI } = require('@google/genai');

// A biblioteca do Google irá ler a chave de segurança da variável de ambiente GEMINI_API_KEY
const ai = new GoogleGenAI({}); 
const GEMINI_MODEL = "gemini-2.5-flash";

module.exports = async (req, res) => {
    // Garante que a requisição é um POST para segurança básica
    if (req.method !== 'POST') {
        res.status(405).send('Method Not Allowed');
        return;
    }

    try {
        // Pega o histórico e a nova mensagem do corpo da requisição
        const { contents } = req.body; 

        const response = await ai.models.generateContent({
            model: GEMINI_MODEL,
            contents: contents, // Usa o histórico e a nova mensagem
            config: {
                maxOutputTokens: 500, // Limite de saída
            }
        });

        // Retorna a resposta (apenas o texto) para o seu frontend
        res.status(200).json({ text: response.text });
        
    } catch (error) {
        // Em caso de erro, retorna mensagem segura
        console.error("Erro da API Gemini no proxy:", error.message);
        res.status(500).json({ error: 'Erro do servidor. Tente novamente mais tarde.' });
    }
};
