// VARIÁVEIS DE CONFIGURAÇÃO
const GEMINI_MODEL = "gemini-2.5-flash"; 
const MAX_HISTORY_PAIRS = 5; // Limita o contexto às últimas 5 trocas (para custo/perfomance)

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

// 2. FUNÇÃO PRINCIPAL DE ENVIO (CHAMADA AO PROXY SEGURO)

async function sendMessage() {
    const text = userInput.value.trim();
    if (!text) return;

    appendMessage("user", text);
    userInput.value = "";

    const typingDiv = showTyping();

    // Prepara o histórico LIMITADO (apenas as últimas N interações)
    const contentsToSend = [];

    // Calcula o índice inicial para pegar as últimas N entradas (MAX_HISTORY_PAIRS)
    const startIndex = Math.max(0, conversationHistory.length - MAX_HISTORY_PAIRS);

    // Itera APENAS sobre as entradas mais recentes para o contexto
    for (let i = startIndex; i < conversationHistory.length; i++) {
        const entry = conversationHistory[i];
        
        // Adiciona a pergunta do usuário e a resposta da IA (par completo)
        contentsToSend.push({ role: "user", parts: [{ text: entry.user }] });
        contentsToSend.push({ role: "model", parts: [{ text: entry.ai }] });
    }
    
    // Adiciona a nova mensagem do usuário
    contentsToSend.push({ role: "user", parts: [{ text: text }] });

    try {
        // 🚨 CHAMA O PROXY SEGURO NO VERCEL, NÃO A URL DA API DIRETA!
        const response = await fetch('/api/chat', { 
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                contents: contentsToSend, // Envia o histórico limitado
            }),
        });

        // A resposta agora vem do seu servidor (proxy), não diretamente do Gemini
        const data = await response.json();
        typingDiv.remove();
        
        if (response.ok) {
            // Se o proxy retornar sucesso, ele envia o texto em data.text
            let aiMessage = data.text;
            appendMessage("system", aiMessage); 

            // ATUALIZAÇÃO DO HISTÓRICO APÓS RESPOSTA BEM-SUCEDIDA
            conversationHistory.push({ user: text, ai: aiMessage });
            updateHistorySidebar();
            saveHistory();
        
        } else {
            // Se o proxy retornar erro (ex: 500), mostra a mensagem de erro do servidor
            let aiMessage = `❌ Erro do Servidor: ${data.error || 'Falha na comunicação com o proxy.'}`;
            appendMessage("system", aiMessage); 
        }

    } catch (error) {
        typingDiv.remove();
        appendMessage("system", "❌ Erro de Conexão (Rede). Verifique sua rede.");
        console.error("Erro de Conexão:", error);
    }
}

// 4. GERENCIAMENTO DE HISTÓRICO (SEM ALTERAÇÕES)
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
