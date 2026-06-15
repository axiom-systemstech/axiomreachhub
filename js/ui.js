// ============================================================
// AXIOM REACH-HUB - UI CONTROLLER v1.0
// Con Three.js, TensorFlow.js, Transformers.js
// ============================================================

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { pipeline } from '@xenova/transformers';

// ---------- DOM Elements ----------
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const cancelBtn = document.getElementById('cancelBtn');
const resultsContainer = document.getElementById('resultsContainer');
const totalItemsSpan = document.getElementById('totalItems');
const activeSourcesSpan = document.getElementById('activeSources');
const lastSearchSpan = document.getElementById('lastSearch');
const speedSlider = document.getElementById('speedSlider');
const speedValue = document.getElementById('speedValue');
const summaryBox = document.getElementById('summaryBox');
const summaryText = document.getElementById('summaryText');
const activityChartCanvas = document.getElementById('activityChart');
const wordcloudContainer = document.getElementById('wordcloudContainer');
const radarCanvas = document.getElementById('radarCanvas');
const historyList = document.getElementById('historyList');
const achievementsContainer = document.getElementById('achievementsContainer');

// ---------- Variables ----------
let currentSearchTerm = '';
let isExtracting = false;
let extractionInterval = null;
let currentResults = [];
let totalItems = 0;
let sourceCounts = { twitter: 0, reddit: 0, github: 0, iptv: 0, hn: 0, arxiv: 0 };
let searchHistory = JSON.parse(localStorage.getItem('reachhub_history') || '[]');
let achievements = JSON.parse(localStorage.getItem('reachhub_achievements') || '[]');
let streak = parseInt(localStorage.getItem('reachhub_streak') || '0');
let lastDate = localStorage.getItem('reachhub_lastDate');

// ---------- Datasets simulados ----------
const datasets = {
    twitter: [
        { title: "Nuevo modelo de IA supera a GPT-4", content: "Investigadores presentan arquitectura revolucionaria con 1M de contexto...", url: "#", author: "@aiscientist" },
        { title: "Rust 2026: Lo que viene en el nuevo release", content: "Mejoras en compilación asíncrona y nuevo borrow checker...", url: "#", author: "@rustlang" },
        { title: "Seguridad en IA: El nuevo estándar NIST", content: "Guías para implementar sistemas de IA seguros y confiables...", url: "#", author: "@NIST" }
    ],
    reddit: [
        { title: "AMA con el equipo de Anthropic", content: "Preguntas y respuestas sobre Claude 4 y seguridad en IA...", subreddit: "r/MachineLearning", score: 2456 },
        { title: "Mi experiencia con Local LLMs", content: "Guía para ejecutar modelos de 70B en una GPU de 24GB...", subreddit: "r/LocalLLaMA", score: 1892 },
        { title: "Discusión sobre AGI", content: "¿Estamos más cerca de la inteligencia artificial general?", subreddit: "r/singularity", score: 3421 }
    ],
    github: [
        { title: "llama.cpp", content: "Inferencia de LLMs en CPU, 15k+ estrellas esta semana...", stars: 15200, language: "C++" },
        { title: "transformers.js", content: "Transformers en el navegador, nueva versión 4.2.0...", stars: 8900, language: "JavaScript" },
        { title: "axum", content: "Framework web para Rust, tendencia en backend...", stars: 5600, language: "Rust" }
    ],
    iptv: [
        { title: "Live: AI Conference 2026", content: "Streaming en vivo de la conferencia principal...", viewers: "12.5k", quality: "4K" },
        { title: "Tutorial: Construye tu propio agente IA", content: "Stream en vivo con código en Rust...", viewers: "3.2k", quality: "HD" },
        { title: "Debate: Ética en IA", content: "Panel de expertos discutiendo regulaciones...", viewers: "8.7k", quality: "HD" }
    ],
    hn: [
        { title: "Show HN: Framework de agentes autónomos", content: "Nueva herramienta para orquestar agentes de IA...", score: 567, comments: 89 },
        { title: "La evolución de WebAssembly", content: "Análisis del estado actual y futuro de WASM...", score: 423, comments: 56 },
        { title: "OpenAI anuncia nueva API", content: "Reducción de precios y nuevos modelos...", score: 892, comments: 234 }
    ],
    arxiv: [
        { title: "Attention Is All You Need Revisited", content: "Nuevo paper sobre arquitecturas transformer...", authors: "Vaswani et al.", date: "2026-06-10" },
        { title: "RAG con memoria a largo plazo", content: "Mejoras en sistemas de recuperación aumentada...", authors: "Chen et al.", date: "2026-06-09" },
        { title: "Eficiencia energética en LLMs", content: "Métodos para reducir consumo en inferencia...", authors: "Zhang et al.", date: "2026-06-08" }
    ]
};

// ---------- Three.js Setup ----------
let scene, camera, renderer, particles;
let threeInitialized = false;

function initThree() {
    if (threeInitialized) return;
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.top = '0';
    container.style.left = '0';
    container.style.width = '100%';
    container.style.height = '100%';
    container.style.zIndex = '0';
    container.style.pointerEvents = 'none';
    document.body.insertBefore(container, document.body.firstChild);
    
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    renderer = new THREE.WebGLRenderer({ alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);
    
    const geometry = new THREE.BufferGeometry();
    const particleCount = 2000;
    const positions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
        positions[i*3] = (Math.random() - 0.5) * 200;
        positions[i*3+1] = (Math.random() - 0.5) * 100;
        positions[i*3+2] = (Math.random() - 0.5) * 100 - 50;
    }
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({ color: 0x00e5ff, size: 0.2, transparent: true, opacity: 0.5 });
    particles = new THREE.Points(geometry, material);
    scene.add(particles);
    
    camera.position.z = 50;
    
    function animate() {
        requestAnimationFrame(animate);
        if (particles) {
            particles.rotation.y += 0.002;
            particles.rotation.x += 0.001;
        }
        renderer.render(scene, camera);
    }
    animate();
    threeInitialized = true;
}

// ---------- TensorFlow.js Sentiment ----------
let sentimentModel = null;
async function loadSentimentModel() {
    try {
        sentimentModel = await tf.loadLayersModel('https://storage.googleapis.com/tfjs-models/tfjs/sentiment_cnn_v1/model.json');
        console.log('Modelo de sentimiento cargado');
    } catch(e) { console.log('Modelo no disponible, usando simulación'); }
}
loadSentimentModel();

// ---------- Transformers.js Summarization ----------
let summarizer = null;
async function loadSummarizer() {
    try {
        summarizer = await pipeline('summarization', 'Xenova/distilbart-cnn-12-6');
        console.log('Summarizer cargado');
    } catch(e) { console.log('Summarizer no disponible'); }
}
loadSummarizer();

// ---------- Helper Functions ----------
function getRandomItemFromSource(source, searchTerm) {
    const items = datasets[source];
    if (!items || items.length === 0) return null;
    const randomIndex = Math.floor(Math.random() * items.length);
    const item = { ...items[randomIndex] };
    item.title = item.title.replace(/LLM|IA|AI/g, match => match + ' ' + searchTerm.split(' ').slice(0,2).join(' '));
    return item;
}

function formatResult(item, source, searchTerm) {
    let content = '';
    let author = '';
    let meta = '';
    if (source === 'twitter') {
        content = item.content;
        author = item.author;
        meta = `🐦 ${author} · ${Math.floor(Math.random() * 100)} min`;
    } else if (source === 'reddit') {
        content = item.content;
        meta = `📚 ${item.subreddit} · ⬆️ ${item.score}`;
    } else if (source === 'github') {
        content = item.content;
        meta = `🐙 ⭐ ${item.stars} · ${item.language}`;
    } else if (source === 'iptv') {
        content = item.content;
        meta = `📺 ${item.viewers} espectadores · ${item.quality}`;
    } else if (source === 'hn') {
        content = item.content;
        meta = `🔥 🗳️ ${item.score} · 💬 ${item.comments}`;
    } else if (source === 'arxiv') {
        content = item.content;
        meta = `📄 ${item.authors} · ${item.date}`;
    }
    return { title: item.title, content, meta, source };
}

function addResultCard(result) {
    const card = document.createElement('div');
    card.className = `result-card ${result.source}`;
    card.innerHTML = `
        <div class="result-header">
            <span class="result-source ${result.source}">${result.source.toUpperCase()}</span>
            <span>📅 ahora</span>
        </div>
        <div class="result-title">${result.title}</div>
        <div class="result-content">${result.content.substring(0, 150)}...</div>
        <div class="result-meta">${result.meta}</div>
    `;
    resultsContainer.appendChild(card);
    card.classList.add('streaming');
    setTimeout(() => card.classList.remove('streaming'), 300);
}

function updateStats() {
    totalItemsSpan.innerText = totalItems;
    let activeSources = Object.values(sourceCounts).filter(v => v > 0).length;
    activeSourcesSpan.innerText = activeSources;
    updateRadarChart();
    updateActivityChart();
    updateWordcloud();
    checkAchievements();
}

function updateRadarChart() {
    const ctx = radarCanvas.getContext('2d');
    ctx.clearRect(0, 0, radarCanvas.width, radarCanvas.height);
    const sources = ['twitter', 'reddit', 'github', 'iptv', 'hn', 'arxiv'];
    const maxVal = Math.max(...Object.values(sourceCounts), 1);
    const centerX = radarCanvas.width/2, centerY = radarCanvas.height/2, radius = 120;
    const angles = sources.map((_, i) => (i * 2 * Math.PI / sources.length) - Math.PI/2);
    ctx.beginPath();
    for (let i = 0; i < angles.length; i++) {
        const val = (sourceCounts[sources[i]] / maxVal) * radius;
        const x = centerX + val * Math.cos(angles[i]);
        const y = centerY + val * Math.sin(angles[i]);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = 'rgba(0,229,255,0.2)';
    ctx.fill();
    ctx.strokeStyle = '#00e5ff';
    ctx.lineWidth = 2;
    ctx.stroke();
    for (let i = 0; i < angles.length; i++) {
        const x = centerX + (radius + 15) * Math.cos(angles[i]);
        const y = centerY + (radius + 15) * Math.sin(angles[i]);
        ctx.fillStyle = '#8E92A2';
        ctx.font = '10px Inter';
        ctx.fillText(sources[i], x - 15, y - 5);
    }
}

function updateActivityChart() {
    const ctx = activityChartCanvas.getContext('2d');
    ctx.clearRect(0, 0, activityChartCanvas.width, activityChartCanvas.height);
    // Simulación simple de actividad
    ctx.fillStyle = '#00e5ff';
    for (let i = 0; i < 10; i++) {
        const height = Math.random() * 50;
        ctx.fillRect(i * 28, activityChartCanvas.height - height, 20, height);
    }
}

function updateWordcloud() {
    const words = currentResults.flatMap(r => r.title.toLowerCase().split(' '));
    const freq = {};
    words.forEach(w => { if(w.length > 3) freq[w] = (freq[w] || 0) + 1; });
    const sorted = Object.entries(freq).sort((a,b) => b[1] - a[1]).slice(0, 20);
    wordcloudContainer.innerHTML = sorted.map(([word, count]) => `<span style="font-size: ${12 + count * 4}px; margin:4px; display:inline-block;">${word}</span>`).join('');
}

async function generateSummary() {
    if (!summarizer || currentResults.length === 0) {
        summaryText.innerText = currentResults.length > 0 ? "Resumen no disponible (modelo cargando...)" : "No hay resultados para resumir";
        return;
    }
    const texts = currentResults.map(r => r.content).join('. ').substring(0, 1000);
    try {
        const result = await summarizer(texts, { max_length: 100, min_length: 30 });
        summaryText.innerText = result[0].summary_text;
        summaryBox.classList.remove('hidden');
    } catch(e) { summaryText.innerText = "Error generando resumen"; }
}

function checkAchievements() {
    const newAchievements = [];
    if (totalItems >= 10 && !achievements.find(a => a.id === 'first10')) {
        newAchievements.push({ id: 'first10', name: '🔟 10 items extraídos' });
    }
    if (totalItems >= 50 && !achievements.find(a => a.id === 'first50')) {
        newAchievements.push({ id: 'first50', name: '🏆 50 items extraídos' });
    }
    if (Object.values(sourceCounts).filter(v => v > 0).length >= 6 && !achievements.find(a => a.id === 'allSources')) {
        newAchievements.push({ id: 'allSources', name: '🌐 Todas las fuentes' });
    }
    if (newAchievements.length > 0) {
        achievements.push(...newAchievements);
        localStorage.setItem('reachhub_achievements', JSON.stringify(achievements));
        renderAchievements();
        newAchievements.forEach(() => {
            achievementsContainer.classList.add('achievement-unlocked');
            setTimeout(() => achievementsContainer.classList.remove('achievement-unlocked'), 500);
        });
    }
}

function renderAchievements() {
    if (achievements.length === 0) {
        achievementsContainer.innerHTML = '// Sin logros todavía. ¡Sigue extrayendo datos!';
        return;
    }
    achievementsContainer.innerHTML = achievements.map(a => `<div class="achievement-badge">${a.name}</div>`).join('');
}

function renderHistory() {
    if (searchHistory.length === 0) {
        historyList.innerHTML = '// No hay búsquedas recientes';
        return;
    }
    historyList.innerHTML = searchHistory.slice(-10).reverse().map(h => `
        <div class="history-item" data-term="${h.term}">
            <span>🔍 ${h.term}</span>
            <span>📅 ${new Date(h.date).toLocaleString()}</span>
        </div>
    `).join('');
    document.querySelectorAll('.history-item').forEach(el => {
        el.addEventListener('click', () => {
            searchInput.value = el.dataset.term;
            startExtraction();
        });
    });
}

function saveToHistory(term) {
    searchHistory.unshift({ term, date: new Date().toISOString() });
    if (searchHistory.length > 20) searchHistory.pop();
    localStorage.setItem('reachhub_history', JSON.stringify(searchHistory));
    renderHistory();
}

function shareSearch() {
    const url = new URL(window.location.href);
    url.searchParams.set('q', currentSearchTerm);
    navigator.clipboard.writeText(url.href);
    alert('Enlace copiado al portapapeles');
}

// ---------- Extracción Simulada ----------
function startExtraction() {
    const term = searchInput.value.trim();
    if (!term) return;
    if (isExtracting) stopExtraction();
    
    currentSearchTerm = term;
    currentResults = [];
    totalItems = 0;
    sourceCounts = { twitter: 0, reddit: 0, github: 0, iptv: 0, hn: 0, arxiv: 0 };
    resultsContainer.innerHTML = '';
    updateStats();
    saveToHistory(term);
    lastSearchSpan.innerText = new Date().toLocaleTimeString();
    
    isExtracting = true;
    searchBtn.style.display = 'none';
    cancelBtn.style.display = 'inline-block';
    const speed = parseInt(speedSlider.value);
    let speedText = 'Rápida';
    if (speed > 300) speedText = 'Lenta';
    else if (speed > 150) speedText = 'Normal';
    speedValue.innerText = speedText;
    
    const activeSources = [];
    document.querySelectorAll('.source-filter:checked').forEach(cb => {
        activeSources.push(cb.dataset.source);
    });
    
    let intervalCount = 0;
    extractionInterval = setInterval(() => {
        if (activeSources.length === 0) return;
        const randomSource = activeSources[Math.floor(Math.random() * activeSources.length)];
        const item = getRandomItemFromSource(randomSource, term);
        if (item) {
            const formatted = formatResult(item, randomSource, term);
            currentResults.push(formatted);
            totalItems++;
            sourceCounts[randomSource]++;
            updateStats();
            addResultCard(formatted);
            if (currentResults.length === 1) generateSummary();
            if (totalItems % 5 === 0) generateSummary();
        }
        intervalCount++;
        if (intervalCount > 50) stopExtraction();
    }, speed);
}

function stopExtraction() {
    if (extractionInterval) clearInterval(extractionInterval);
    isExtracting = false;
    searchBtn.style.display = 'inline-block';
    cancelBtn.style.display = 'none';
    generateSummary();
    updateStreak();
}

function updateStreak() {
    const today = new Date().toDateString();
    if (lastDate !== today) {
        if (lastDate === new Date(Date.now() - 86400000).toDateString()) streak++;
        else streak = 1;
        lastDate = today;
        localStorage.setItem('reachhub_streak', streak);
        localStorage.setItem('reachhub_lastDate', lastDate);
    }
}

// ---------- Export Functions ----------
function exportMarkdown() {
    let md = `# AXIOM REACH-HUB - Resultados para "${currentSearchTerm}"\n\n`;
    md += `- **Fecha:** ${new Date().toLocaleString()}\n- **Items extraídos:** ${totalItems}\n\n`;
    md += `## Resultados\n\n`;
    currentResults.forEach(r => {
        md += `### ${r.title}\n`;
        md += `**Fuente:** ${r.source.toUpperCase()}\n`;
        md += `${r.content}\n\n`;
    });
    const blob = new Blob([md], { type: 'text/markdown' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `reachhub-${currentSearchTerm.replace(/\s/g, '-')}.md`;
    a.click();
}

function exportJSON() {
    const data = { term: currentSearchTerm, date: new Date().toISOString(), results: currentResults, stats: sourceCounts };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `reachhub-${currentSearchTerm.replace(/\s/g, '-')}.json`;
    a.click();
}

function copyAllResults() {
    const text = currentResults.map(r => `${r.source.toUpperCase()}: ${r.title}\n${r.content}\n`).join('\n---\n\n');
    navigator.clipboard.writeText(text);
    alert('Resultados copiados al portapapeles');
}

// ---------- Voice Search ----------
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
if (SpeechRecognition) {
    const recognition = new SpeechRecognition();
    recognition.lang = 'es-ES';
    document.getElementById('voiceBtn').onclick = () => {
        recognition.start();
    };
    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        searchInput.value = transcript;
        startExtraction();
    };
} else {
    document.getElementById('voiceBtn').style.opacity = '0.5';
    document.getElementById('voiceBtn').title = 'Web Speech API no soportada';
}

// ---------- Event Listeners ----------
searchBtn.addEventListener('click', startExtraction);
cancelBtn.addEventListener('click', stopExtraction);
speedSlider.addEventListener('input', (e) => {
    const val = parseInt(e.target.value);
    if (val > 300) speedValue.innerText = 'Lenta';
    else if (val > 150) speedValue.innerText = 'Normal';
    else speedValue.innerText = 'Rápida';
});
document.getElementById('exportMarkdownBtn').addEventListener('click', exportMarkdown);
document.getElementById('exportJsonBtn').addEventListener('click', exportJSON);
document.getElementById('copyAllBtn').addEventListener('click', copyAllResults);
document.getElementById('clearHistoryBtn').addEventListener('click', () => {
    searchHistory = [];
    localStorage.setItem('reachhub_history', JSON.stringify(searchHistory));
    renderHistory();
});
document.getElementById('shareSearchBtn').addEventListener('click', shareSearch);

// View toggle
let currentView = 'grid';
document.querySelectorAll('.view-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentView = btn.dataset.view;
        resultsContainer.className = currentView === 'grid' ? 'results-grid' : 'results-list';
    });
});

// Tema oscuro/claro
const themeToggle = document.getElementById('themeToggle');
const htmlTag = document.documentElement;
themeToggle.addEventListener('click', () => {
    const isDark = htmlTag.getAttribute('data-theme') === 'dark';
    htmlTag.setAttribute('data-theme', isDark ? 'light' : 'dark');
    themeToggle.innerText = isDark ? '☀️' : '🌙';
});

// Modo kiosco
document.getElementById('kioskBtn').onclick = () => document.documentElement.requestFullscreen();

// Tutorial
document.getElementById('tourBtn').onclick = () => alert('🔍 Tutorial:\n1. Introduce un término de búsqueda\n2. Selecciona las fuentes\n3. Haz clic en EXTRaer\n4. Los resultados aparecerán en tiempo real\n5. Exporta a MD/JSON o copia todo');

// Inicialización
function loadFromURL() {
    const params = new URLSearchParams(window.location.search);
    const q = params.get('q');
    if (q) {
        searchInput.value = q;
        startExtraction();
    } else {
        startExtraction();
    }
}

initThree();
renderAchievements();
renderHistory();
loadFromURL();