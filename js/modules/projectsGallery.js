// public/js/modules/projectsGallery.js
import { registerLazy } from './lazyLoad.js';

const projects = [
    {
        title: "Projeto Mario Memmory",
        description: "Um jogo da memória interativo desenvolvido inicialmente em aula e posteriormente aprimorado de forma independente. Implementado com HTML5, CSS3 e JavaScript puro, inclui recursos como responsividade completa, áudio dinâmico, centralização de elementos para diferentes resoluções e layout otimizado para melhor experiência do usuário.",
        image: "./images/projeto-memoria.webp",
        liveUrl: "https://ipierette.github.io/mario-memory/",
        githubUrl: "https://github.com/ipierette/mario-memory"
    },
    {
        title: "Agência XYZ",
        description: "Landing page responsiva para uma agência fictícia de desenvolvimento web, criada com HTML5 semântico e CSS3 moderno. Possui design minimalista, seções bem estruturadas e tipografia legível, utilizando boas práticas de SEO e acessibilidade. O layout é totalmente adaptável a diferentes tamanhos de tela e foi otimizado para rápido carregamento, com foco em UI limpa e profissional.",
        image: "./images/projeto-agenciaxyz.webp",
        liveUrl: "https://ipierette.github.io/landing-page-xyz/",
        githubUrl: "https://github.com/ipierette/landing-page-xyz"
    },
    {
        title: "Chat-Bot Via Lactea",
        description: "Aplicação front-end que simula um chatbot com personalidade dinâmica e respostas contextuais, utilizando HTML5, CSS3 e JavaScript puro. O projeto incorpora efeitos visuais interativos, animações suaves e design responsivo, proporcionando uma experiência de usuário envolvente. Inclui manipulação avançada do DOM e lógica modular para fácil expansão de funcionalidades.",
        image: "./images/chatbot.webp",
        liveUrl: "https://ipierette.github.io/chat-bot-via-lactea/",
        githubUrl: "https://github.com/ipierette/chat-bot-via-lactea"
    },
    {
        title: "Mini-Portifólio",
        description: "Versão compacta de um portfólio pessoal, criada com HTML5, CSS3 e JavaScript, focada em apresentar informações essenciais de forma clara e responsiva. Utiliza CSS modular para organização do código, animações leves para enriquecer a experiência e estrutura semântica otimizada para acessibilidade e SEO. Ideal para exibição rápida de habilidades e projetos em um formato enxuto e visualmente atraente",
        image: "./images/projeto-miniport.webp",
        liveUrl: "https://ipierette.github.io/mini-portifolio/",
        githubUrl: "https://github.com/ipierette/mini-portifolio"
    }
];

let currentProjectIndex = 0;
const projectDots = [];
let activeDotIndex = 0;

// --- helper de preload do próximo slide ---
function preload(src) {
  if (!src) return;
  const img = new Image();
  img.decoding = 'async';
  img.loading = 'eager';
  img.src = src;
}

function updateProjectContent(project) {
    const projectImage = document.getElementById('project-image');
    const projectTitle = document.getElementById('project-title');
    const projectDescription = document.getElementById('project-description');
    const liveLink = document.querySelector('.project-links a[aria-label="Ver projeto ao vivo"]');
    const githubLink = document.querySelector('.project-links a[aria-label="Ver código do projeto no GitHub"]');

    // --- CARREGAMENTO DO SLIDE ATUAL (EAGER) ---
    // Substitui o antigo bloco de lazy aqui para evitar o atraso na animação
    // (antes: loading="lazy", data-src e registerLazy) :contentReference[oaicite:1]{index=1}
    if (projectImage) {
        // evita layout shift (ajuste se seu card tiver outro tamanho)
        if (!projectImage.width)  projectImage.width  = 600;
        if (!projectImage.height) projectImage.height = 400;

        // remover qualquer resquício de lazy do slide anterior
        projectImage.classList.remove('lazy');
        projectImage.removeAttribute('data-src');
        projectImage.removeAttribute('loading');

        // prioriza decodificação/pintura imediata
        projectImage.decoding = 'async';
        projectImage.setAttribute('fetchpriority', 'high');

        // define o recurso real diretamente (GIF ou WebP animado)
        projectImage.src = project.image;

        // pré-carrega o PRÓXIMO slide em background
        const nextIdx = (currentProjectIndex + 1) % projects.length;
        const next = projects[nextIdx];
        if (next?.image) preload(next.image);
    }

    if (projectTitle) projectTitle.textContent = project.title;
    if (projectDescription) projectDescription.textContent = project.description;
    if (liveLink) {
        liveLink.href = project.liveUrl;
        liveLink.target = "_blank";
        liveLink.rel = "noopener noreferrer";
    }
    if (githubLink) {
        githubLink.href = project.githubUrl;
        githubLink.target = "_blank";
        githubLink.rel = "noopener noreferrer";
    }
}

function createProjectDots() {
    const projectDotsContainer = document.getElementById('project-dots');
    if (!projectDotsContainer) return;

    projectDotsContainer.innerHTML = '';
    projects.forEach((_, index) => {
        const dot = document.createElement('span');
        dot.classList.add('project-dot');
        if (index === currentProjectIndex) {
            dot.classList.add('active');
        }
        dot.addEventListener('click', () => {
            currentProjectIndex = index;
            updateProjectContent(projects[currentProjectIndex]);
            updateProjectDots();
        });
        projectDotsContainer.appendChild(dot);
        projectDots.push(dot);
    });
}

function updateProjectDots() {
    if (projectDots[activeDotIndex]) {
        projectDots[activeDotIndex].classList.remove('active');
    }
    if (projectDots[currentProjectIndex]) {
        projectDots[currentProjectIndex].classList.add('active');
    }
    activeDotIndex = currentProjectIndex;
}

export function initProjectsGallery() {
    const prevProjectBtn = document.getElementById('prev-project');
    const nextProjectBtn = document.getElementById('next-project');

    if (!prevProjectBtn || !nextProjectBtn || !document.getElementById('project-image')) return;

    prevProjectBtn.addEventListener('click', () => {
        currentProjectIndex = (currentProjectIndex - 1 + projects.length) % projects.length;
        updateProjectContent(projects[currentProjectIndex]);
        updateProjectDots();
    });

    nextProjectBtn.addEventListener('click', () => {
        currentProjectIndex = (currentProjectIndex + 1) % projects.length;
        updateProjectContent(projects[currentProjectIndex]);
        updateProjectDots();
    });

    createProjectDots();
    // Inicializa o conteúdo do primeiro projeto
    updateProjectContent(projects[currentProjectIndex]);
    updateProjectDots();
}
