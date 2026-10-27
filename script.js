document.addEventListener("DOMContentLoaded", function() {
    
    // ==============================================================
    // 1. INICIALIZAÇÃO DO MAPA
    // ==============================================================
    const map = L.map('map', {
        maxZoom: 20,
        zoomControl: false
    });

    L.control.zoom({ position: 'topright' }).addTo(map);

    L.tileLayer('https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
        attribution: '© Google Maps',
        maxZoom: 20
    }).addTo(map);
    
    // ==============================================================
    // 2. LIMITES DO CAMPUS E MÁSCARA ESCURA
    // ==============================================================
    const outerBounds = [ [-90, -360], [90, -360], [90, 360], [-90, 360] ];

    // Perímetro exato do IFAM CMZL
    const researchAreaCoords = [
        [-3.078994, -59.935406], [-3.075131, -59.927269], [-3.076986, -59.925383],
        [-3.080300, -59.923344], [-3.085814, -59.929497], [-3.086039, -59.929694],
        [-3.091719, -59.935025], [-3.090686, -59.937494], [-3.091983, -59.938100],
        [-3.086553, -59.939753], [-3.085000, -59.940889], [-3.079206, -59.935694]
    ];

    // Desenha a máscara preta
    const mascaraEscura = L.polygon([outerBounds, researchAreaCoords], {
        color: 'none', fillColor: '#000000', fillOpacity: 0.85    
    }).addTo(map);

    // Desenha a linha verde tracejada
    const campusPolygon = L.polygon(researchAreaCoords, {
        color: '#4ade80', weight: 3, fill: false, dashArray: '8, 8', opacity: 0.8
    }).addTo(map);

    const boundsCampus = campusPolygon.getBounds();

    // Trava a câmara inicialmente no campus
    map.fitBounds(boundsCampus, { padding: [10, 10] });
    setTimeout(() => {
        map.setMinZoom(map.getZoom());
        map.setMaxBounds(boundsCampus.pad(0.1));
    }, 500);

    // ==============================================================
    // 3. LÓGICA DOS MARCADORES E GALERIA
    // ==============================================================
    let todosOsPontos = [];
    let marcadoresNoMapa = [];

    function createCustomIcon(colorClass) {
        // AQUI FORAM ADICIONADAS AS DUAS NOVAS CORES!
        const shadowColors = {
            'red-500': 'rgba(239,68,68,0.8)', 'green-500': 'rgba(34,197,94,0.8)',
            'yellow-500': 'rgba(234,179,8,0.8)', 'blue-500': 'rgba(59,130,246,0.8)',
            'purple-500': 'rgba(168,85,247,0.8)',
            'teal-500': 'rgba(20, 184, 166, 0.8)', // APPs
            'orange-500': 'rgba(249, 115, 22, 0.8)' // Sítio Arqueológico
        };
        const shadowColor = shadowColors[colorClass] || 'rgba(255,255,255,0.8)';
        
        return L.divIcon({
            className: 'custom-div-icon',
            html: `<div class="relative w-4 h-4">
                        <div class="absolute inset-0 bg-${colorClass} rounded-full animate-ping opacity-75"></div>
                        <div class="relative w-4 h-4 bg-${colorClass} border-[1.5px] border-white rounded-full shadow-[0_0_8px_${shadowColor}]"></div>
                    </div>`,
            iconSize: [16, 16], iconAnchor: [8, 8]
        });
    }

    window.filtrarMapa = function(tipoSelecionado) {
        marcadoresNoMapa.forEach(m => map.removeLayer(m));
        marcadoresNoMapa = [];

        const pontosFiltrados = tipoSelecionado === 'todos' 
            ? todosOsPontos : todosOsPontos.filter(p => p.tipo === tipoSelecionado);

        pontosFiltrados.forEach(ponto => {
            const icone = createCustomIcon(ponto.tipo);
            const marker = L.marker([ponto.lat, ponto.lng], {icon: icone}).addTo(map);
            const imgHTML = ponto.imagem ? `<img src="${ponto.imagem}" class="w-full h-24 object-cover rounded mb-2">` : '';
            marker.bindPopup(`
                <div class="p-1 min-w-[200px]">
                    ${imgHTML}
                    <h4 class="font-bold text-white border-b border-slate-600 pb-1 mb-1">${ponto.titulo}</h4>
                    <p class="text-xs text-slate-300">${ponto.descricao}</p>
                </div>
            `);
            marcadoresNoMapa.push(marker);
        });

        const botoes = document.querySelectorAll('.btn-filtro');
        botoes.forEach(btn => {
            if (btn.getAttribute('data-tipo') === tipoSelecionado) {
                btn.classList.add('bg-slate-700', 'border-slate-500', 'text-white');
                btn.classList.remove('opacity-60', 'border-transparent');
            } else {
                btn.classList.remove('bg-slate-700', 'border-slate-500', 'text-white');
                btn.classList.add('opacity-60', 'border-transparent');
            }
        });
        atualizarGaleria(tipoSelecionado, pontosFiltrados);
    };

    function atualizarGaleria(tipoSelecionado, pontos) {
        const galeria = document.getElementById('galeria-dinamica');
        const grid = document.getElementById('galeria-grid');
        const titulo = document.getElementById('galeria-titulo');
        if (!galeria || !grid || !titulo) return; 

        if (tipoSelecionado === 'todos') {
            galeria.classList.add('hidden');
            return;
        }

        // AQUI FORAM ADICIONADOS OS DOIS NOVOS TÍTULOS!
        const nomes = {
            'red-500': 'Acúmulo de Resíduos', 'green-500': 'Corte de Árvores',
            'yellow-500': 'Solo Exposto', 'blue-500': 'Ocupações Irregulares',
            'purple-500': 'Propostas de Intervenção',
            'teal-500': 'APPs',
            'orange-500': 'Sítio Arqueológico'
        };

        galeria.classList.remove('hidden');
        titulo.innerText = `Registos de Campo: ${nomes[tipoSelecionado]}`;
        grid.innerHTML = '';

        if (pontos.length === 0) {
            grid.innerHTML = '<p class="text-slate-400 col-span-3">Nenhum registo fotográfico efetuado para esta categoria ainda.</p>';
            return;
        }

        pontos.forEach(p => {
            const imgSrc = p.imagem ? p.imagem : 'https://via.placeholder.com/600x400/1e293b/ffffff?text=Sem+Foto';
            grid.innerHTML += `
                <div class="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden hover:shadow-[0_0_15px_rgba(255,255,255,0.1)] transition-all">
                    <img src="${imgSrc}" class="w-full h-48 object-cover">
                    <div class="p-4">
                        <h4 class="text-white font-bold text-lg">${p.titulo}</h4>
                        <p class="text-slate-400 text-sm mt-2 line-clamp-3">${p.descricao}</p>
                    </div>
                </div>
            `;
        });
    }

    async function carregarPontosDoBanco() {
        try {
            const response = await fetch('/api/pontos');
            todosOsPontos = await response.json();
            window.filtrarMapa('todos');
        } catch (error) { console.error("Erro ao carregar pontos:", error); }
    }

    carregarPontosDoBanco();
    window.addEventListener('pageshow', function(event) { if (event.persisted) carregarPontosDoBanco(); });
    setTimeout(() => { map.invalidateSize(); }, 500);

    // ==============================================================
    // 4. CONTROLO DAS CAMADAS DO QGIS (CONFIGURAÇÕES DE ZOOM INDIVIDUAIS)
    // ==============================================================
    let camadaQGISAtiva = null; 
    let nomeCamadaAtual = null;
    
    // Suas coordenadas do QGIS
    const limitesElevacao = [
        [-3.093291101, -59.948810536], // SUL, OESTE
        [-3.073781904, -59.914703234]  // NORTE, ESTE
    ];

    const limitesCedidas = [
        [-3.092209331, -59.945612736], 
        [-3.074858817, -59.918845661]  
    ];

    const limitesBacias = [
        [-3.157616920, -60.027881647], 
        [-3.021584407, -59.818020866]  
    ];

    window.fecharMenuQGIS = function(nome) {
        const legenda = document.getElementById(`legenda-${nome}`);
        const icone = document.getElementById(`icone-${nome}`);
        const btn = document.getElementById(`btn-qgis-${nome}`);
        const status = document.getElementById(`status-${nome}`);
        if(legenda && icone && btn && status) {
            legenda.classList.add('hidden'); icone.innerText = '➕';
            btn.classList.remove('border-blue-500', 'bg-slate-800');
            btn.classList.add('bg-slate-700'); status.classList.add('hidden');
        }
    };

    window.abrirMenuQGIS = function(nome) {
        document.getElementById(`legenda-${nome}`).classList.remove('hidden');
        document.getElementById(`icone-${nome}`).innerText = '➖';
        const btn = document.getElementById(`btn-qgis-${nome}`);
        btn.classList.remove('bg-slate-700'); btn.classList.add('border-blue-500', 'bg-slate-800');
        document.getElementById(`status-${nome}`).classList.remove('hidden');
    };

    window.toggleCamadaQGIS = function(nomeCamada, arquivoImagem) {
        const botoes = ['elevacao', 'cedidas', 'bacias'];
        
        // FECHAR A CAMADA (VOLTAR AOS PONTOS NORMAIS)
        if (nomeCamadaAtual === nomeCamada) {
            if (camadaQGISAtiva) map.removeLayer(camadaQGISAtiva);
            camadaQGISAtiva = null; nomeCamadaAtual = null;
            
            botoes.forEach(b => window.fecharMenuQGIS(b));
            marcadoresNoMapa.forEach(m => m.addTo(map)); // Devolve bolinhas
            
            // Destranca e volta ao formato do Campus
            map.setMaxBounds(null);
            mascaraEscura.setStyle({ fillOpacity: 0.85 });
            map.fitBounds(boundsCampus, { padding: [10, 10] });
            setTimeout(() => {
                map.setMinZoom(map.getZoom());
                map.setMaxBounds(boundsCampus.pad(0.1));
            }, 500);
            return;
        }

        // ABRIR UMA CAMADA
        if (camadaQGISAtiva) map.removeLayer(camadaQGISAtiva);
        botoes.forEach(b => window.fecharMenuQGIS(b));
        window.abrirMenuQGIS(nomeCamada);
        marcadoresNoMapa.forEach(m => map.removeLayer(m)); // Esconde bolinhas
        
        let limitesUsados;
        let focoCamera; // Controla onde a câmara foca quando a imagem abre
        
        // ESCOLHE A CONFIGURAÇÃO DE ACORDO COM A CAMADA
        if (nomeCamada === 'bacias') {
            limitesUsados = limitesBacias; // A imagem usa o tamanho gigante
            focoCamera = boundsCampus.pad(0.8); // A câmara afasta do campus para criar o seu enquadramento
            mascaraEscura.setStyle({ fillOpacity: 0 }); // Sem máscara
        } else if (nomeCamada === 'cedidas') {
            limitesUsados = limitesCedidas;
            focoCamera = boundsCampus.pad(0.1); 
            mascaraEscura.setStyle({ fillOpacity: 0 }); 
        } else {
            limitesUsados = limitesElevacao;
            focoCamera = boundsCampus; 
            mascaraEscura.setStyle({ fillOpacity: 0.85 }); 
        }
        
        // Destranca o mapa
        map.setMaxBounds(null);
        
        // A câmara viaja suavemente para o enquadramento que definimos (focoCamera)
        map.fitBounds(focoCamera, { padding: [10, 10] });
        
        setTimeout(() => {
            map.setMinZoom(10); // Permite afastar o zoom manualmente
            // Tranca a área de arrastar no tamanho total da IMAGEM GIGANTE (limitesUsados) e não apenas no foco!
            map.setMaxBounds(L.latLngBounds(limitesUsados).pad(0.1));
        }, 500);
        
        // Adiciona a imagem no mapa
        camadaQGISAtiva = L.imageOverlay(arquivoImagem, limitesUsados, {
            opacity: 0.85, interactive: false
        }).addTo(map);
        
        nomeCamadaAtual = nomeCamada;
    };
});

// ==============================================================
// 5. FUNÇÃO DO MENU RETRÁTIL (Acordeão Animado)
// ==============================================================
window.toggleMenuCamadas = function() {
    const conteudo = document.getElementById('conteudo-menu-camadas');
    const seta = document.getElementById('seta-menu-camadas');
    if (conteudo && seta) {
        if (conteudo.style.maxHeight === '0px' || conteudo.style.maxHeight === '') {
            conteudo.style.maxHeight = '1000px';
            conteudo.classList.remove('opacity-0'); conteudo.classList.add('opacity-100');
        } else {
            conteudo.style.maxHeight = '0px';
            conteudo.classList.remove('opacity-100'); conteudo.classList.add('opacity-0');
        }
        seta.classList.toggle('rotate-180');
    }
};