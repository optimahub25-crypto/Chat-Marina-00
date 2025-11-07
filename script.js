// ===============================================
// 🔑 CONFIGURAÇÃO DA CHAVE DA API (GOOGLE GEMINI)
// CHAVE ATUALIZADA: Nova chave Gemini inserida.
// ===============================================
const GEMINI_API_KEY = "AIzaSyAl85x6wSFSBu86Q6RU1zWBuNUsf1iRt8k"; 
const GEMINI_MODEL = "gemini-2.5-flash"; 

// Variáveis DOM
const chatBox = document.getElementById('chatBox'); 
const userInput = document.getElementById('userInput'); 
const historyList = document.getElementById('historyList'); 
const clearHistoryButton = document.getElementById('clearHistoryButton'); 

// Variável para armazenar o histórico e carregar do armazenamento local
let conversationHistory = JSON.parse(localStorage.getItem('marinaChatHistory')) || [];

// 1. ADIÇÃO DE MENSAGENS E ESTILIZAÇÃO

function appendMessage(sender, text) {
    const msg = document.createElement("div");
    msg.classList.add("message", sender === "user" ? "user" : "system"); 
    
    // CORREÇÃO FINAL: Usar innerText para garantir que a formatação Markdown (**) 
    // seja tratada como texto puro e exibida corretamente no chat.
    msg.innerText = text; 
    
    chatBox.appendChild(msg);
    chatBox.scrollTop = chatBox.scrollHeight;
}

function showTyping() {
    const existingTyping = document.querySelector('.typing-indicator');
    if (existingTyping) existingTyping.remove();

    const typingDiv = document.createElement("div");
    typingDiv.classList.add("message", "system", "typing-indicator");
    typingDiv.innerHTML = `
      <div class="typing">
        <span class="dot">.</span>
        <span class="dot">.</span>
        <span class="dot">.</span>
      </div>
    `;
    chatBox.appendChild(typingDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
    return typingDiv;
}

// 2. FUNÇÃO PRINCIPAL DE ENVIO (INTEGRAÇÃO COM GEMINI)

async function sendMessage() {
    const text = userInput.value.trim();
    if (!text) return;

    appendMessage("user", text);
    userInput.value = "";

    const typingDiv = showTyping();

    // Prepara o histórico da conversa no formato "contents" do Gemini
    const contentsToSend = [];
    
    // Converte o histórico (user/ai) para o formato Gemini (role: user/model)
    conversationHistory.forEach(entry => {
        contentsToSend.push({ role: "user", parts: [{ text: entry.user }] });
        contentsToSend.push({ role: "model", parts: [{ text: entry.ai }] });
    });
    
    // Adiciona a nova mensagem do usuário
    contentsToSend.push({ role: "user", parts: [{ text: text }] });

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                contents: contentsToSend,
            }),
        });

        const data = await response.json();
        
        let aiMessage = "⚠️ Erro ao gerar resposta. Não foi possível extrair o texto.";
        let success = false; 

        // 1. Tenta pegar a mensagem de erro da API
        if (data.error) {
            aiMessage = `❌ Erro da API: ${data.error.message}.`;
        }
        
        // 2. Tenta pegar o texto do candidato (resposta válida)
        else if (data.candidates && data.candidates.length > 0 && data.candidates[0].content && data.candidates[0].content.parts) {
             aiMessage = data.candidates[0].content.parts[0].text;
             success = true;
        } 
        
        // 3. Captura se a resposta foi bloqueada por segurança
        else if (data.promptFeedback?.blockReason) {
             aiMessage = `⚠️ Sua pergunta foi bloqueada por razões de segurança. Motivo: ${data.promptFeedback.blockReason}`;
        }
        
        typingDiv.remove();
        appendMessage("system", aiMessage); 

        // 3. ATUALIZAÇÃO DO HISTÓRICO APÓS RESPOSTA (SÓ SALVA SE HOUVER SUCESSO)
        if (success) {
            conversationHistory.push({ user: text, ai: aiMessage });
            updateHistorySidebar();
            saveHistory();
        }

    } catch (error) {
        typingDiv.remove();
        appendMessage("system", "❌ Erro de Conexão (Rede). Verifique sua rede ou o Live Server.");
        console.error("Erro de Conexão:", error);
    }
}

// 4. GERENCIAMENTO DE HISTÓRICO
function saveHistory() {
    localStorage.setItem('marinaChatHistory', JSON.stringify(conversationHistory));
}

function updateHistorySidebar() {
    historyList.innerHTML = ''; 
    const cleanedHistory = conversationHistory.filter(item => item.user && item.ai);
    
    cleanedHistory.forEach((item, index) => {
        const listItem = document.createElement('li');
        const displayQuery = item.user.length > 30 ? item.user.substring(0, 30) + '...' : item.user;
        listItem.textContent = displayQuery;
        
        listItem.onclick = () => loadConversation(index);
        
        historyList.appendChild(listItem);
    });
}

function loadConversation(index) {
    chatBox.innerHTML = ''; 
    appendMessage("system", "Conversa do histórico carregada:"); 

    for (let i = 0; i <= index; i++) {
        const entry = conversationHistory[i];
        if (entry) {
            appendMessage( "user", entry.user);
            appendMessage( "system", entry.ai);
        }
    }
}

function clearHistory() {
    if (confirm("Tem certeza que deseja apagar todo o histórico de conversas?")) {
        conversationHistory = [];
        saveHistory();
        updateHistorySidebar();
        chatBox.innerHTML = '<div class="message system">Histórico de conversas apagado. Como posso ajudar você agora?</div>';
    }
}

// 5. EVENT LISTENERS E INICIALIZAÇÃO
document.querySelector('.input-area button').addEventListener("click", sendMessage); 
userInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") sendMessage();
});

clearHistoryButton.addEventListener('click', clearHistory);

updateHistorySidebar();

if (conversationHistory.length === 0 && chatBox.children.length < 2) {
    appendMessage("system", "Bem-vindo(a) à Marina Chat IA! Seu ambiente de conversa com o Google Gemini. Como posso ajudar você hoje?");
}