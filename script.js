// Keys
const INVENTORY_KEY = 'tebascar_inventory';
const AUTH_KEY = 'tebascar_auth';
const USERS_KEY = 'tebascar_users';

// Data inicial
const DEFAULT_INVENTORY = [
    {
        id: 2,
        name: 'Chevrolet Onix Premier 1.0 Turbo',
        year: '2023',
        price: '106.900,00',
        km: '14.000',
        transmission: 'Automático',
        tags: 'Carro, Flex, São Paulo - SP',
        badge: 'Usado certificado',
        image: './assets/chevrolet_onix_1773944719497.png'
    },
    {
        id: 3,
        name: 'Toyota Corolla XEI 2.0',
        year: '2021',
        price: '119.900,00',
        km: '32.000',
        transmission: 'Automático',
        tags: 'Carro, Flex, Histórico verificado',
        badge: 'Usado certificado',
        image: './assets/toyota_corolla_1773944734472.png'
    },
    {
        id: 4,
        name: 'Volkswagen T-Cross Comfortline',
        year: '2022',
        price: '124.900,00',
        km: '27.000',
        transmission: 'Automático',
        tags: 'Carro, Multimídia, Câmera de ré',
        badge: 'Usado certificado',
        image: './assets/volkswagen_tcross_1773944752453.png'
    },
    {
        id: 5,
        name: 'Honda CG 160 Fan',
        year: '2022',
        price: '14.900,00',
        km: '18.000',
        transmission: 'Manual',
        tags: 'Moto, Gasolina, Econômica',
        badge: 'Usado certificado',
        image: './assets/honda_cg160_1773944768558.png'
    }
];

function initApp() {
    // Clear old data to force image refresh
    localStorage.removeItem(INVENTORY_KEY);

    // Populate mock data if empty
    if (!localStorage.getItem(INVENTORY_KEY)) {
        localStorage.setItem(INVENTORY_KEY, JSON.stringify(DEFAULT_INVENTORY));
    }
    // Initialize admin user
    if (!localStorage.getItem(USERS_KEY)) {
        localStorage.setItem(USERS_KEY, JSON.stringify([{ email: 'Admin', password: 'T3bas@' }]));
    }

    // Initialize image upload listener
    const imgUpload = document.getElementById('car-image-upload');
    if (imgUpload) {
        imgUpload.addEventListener('change', function (e) {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function (event) {
                    const img = new Image();
                    img.onload = function () {
                        const canvas = document.createElement('canvas');
                        const ctx = canvas.getContext('2d');
                        const MAX_WIDTH = 800; // Optimize for web/localStorage
                        let width = img.width;
                        let height = img.height;

                        if (width > MAX_WIDTH) {
                            height = Math.round((height * MAX_WIDTH) / width);
                            width = MAX_WIDTH;
                        }

                        canvas.width = width;
                        canvas.height = height;
                        ctx.drawImage(img, 0, 0, width, height);

                        // Compress to 70% JPEG
                        const dataUrl = canvas.toDataURL('image/jpeg', 0.7);

                        document.getElementById('car-image-data').value = dataUrl;
                        document.getElementById('car-image-preview').src = dataUrl;
                        document.getElementById('car-image-preview').style.display = 'block';
                    }
                    img.src = event.target.result;
                }
                reader.readAsDataURL(file);
            }
        });
    }

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);

    // Bind public events
    document.getElementById('search-input').addEventListener('input', renderPublicInventory);
    document.getElementById('type-filter').addEventListener('change', renderPublicInventory);
    document.getElementById('brand-filter').addEventListener('change', renderPublicInventory);

    // Bind Form Events
    document.getElementById('login-form').addEventListener('submit', handleLogin);
    document.getElementById('register-form').addEventListener('submit', handleRegister);
    document.getElementById('admin-form').addEventListener('submit', handleSaveCar);

    // Set hero dynamically just to be sure
    document.getElementById('hero-section').style.backgroundImage = `url('./assets/hero_mustang_1773944704890.png')`;
}

// Router
function handleHashChange() {
    const hash = window.location.hash || '#home';
    let cleanHash = hash.substring(1);

    let scrollToId = null;
    if (['estoque', 'garantia', 'contato'].includes(cleanHash)) {
        if (cleanHash === 'estoque') scrollToId = 'inventory';
        else if (cleanHash === 'garantia') scrollToId = 'guarantee';
        else if (cleanHash === 'contato') scrollToId = 'contact';
        cleanHash = 'home';
    }

    // Hide all views
    document.querySelectorAll('.view').forEach(v => {
        v.classList.remove('active');
        v.classList.add('hidden');
    });

    const isAuthenticated = localStorage.getItem(AUTH_KEY) === 'true';
    const navBtn = document.getElementById('nav-login-btn');

    if (isAuthenticated) {
        navBtn.innerHTML = '<i class="fa-solid fa-user"></i> Login\\Cadastre-se';
        navBtn.href = '#admin';
    } else {
        navBtn.innerHTML = '<i class="fa-solid fa-user"></i> Login\\Cadastre-se';
        navBtn.href = '#login';
    }

    // Protection logic
    if (cleanHash === 'admin' && !isAuthenticated) {
        window.location.hash = '#login';
        return;
    }
    if ((cleanHash === 'login' || cleanHash === 'register') && isAuthenticated) {
        window.location.hash = '#admin';
        return;
    }

    // Show desired view
    const targetView = document.getElementById(`view-${cleanHash}`);
    if (targetView) {
        targetView.classList.remove('hidden');
        targetView.classList.add('active');
    } else {
        document.getElementById('view-home').classList.remove('hidden');
        document.getElementById('view-home').classList.add('active');
    }

    // Render logic per view
    if (cleanHash === 'home' || !cleanHash) {
        if (scrollToId) {
            setTimeout(() => {
                const el = document.getElementById(scrollToId);
                if (el) el.scrollIntoView({ behavior: 'smooth' });
            }, 100);
        } else {
            window.scrollTo(0, 0);
        }
        renderPublicInventory();
    } else if (cleanHash === 'admin') {
        renderAdminTable();
    } else {
        window.scrollTo(0, 0);
    }
}

// Data methods
function getInventory() {
    return JSON.parse(localStorage.getItem(INVENTORY_KEY) || '[]');
}
function saveInventory(data) {
    localStorage.setItem(INVENTORY_KEY, JSON.stringify(data));
}

// Render Public
function renderPublicInventory() {
    const cars = getInventory();
    const grid = document.getElementById('inventory-grid');

    const search = document.getElementById('search-input').value.toLowerCase();
    const type = document.getElementById('type-filter').value;
    const brand = document.getElementById('brand-filter').value.toLowerCase();

    const filtered = cars.filter(c => {
        const matchesSearch = c.name.toLowerCase().includes(search) || (c.tags && c.tags.toLowerCase().includes(search));
        const matchesType = type ? (c.tags && c.tags.toLowerCase().includes(type.toLowerCase())) : true;
        const matchesBrand = brand ? c.name.toLowerCase().includes(brand) : true;
        return matchesSearch && matchesType && matchesBrand;
    });

    if (filtered.length === 0) {
        grid.innerHTML = '<p style="grid-column: 1/-1; text-align:center; color: var(--text-muted)">Nenhum veículo encontrado para a busca especificada.</p>';
        return;
    }

    grid.innerHTML = filtered.map(c => {
        const tagHtml = (c.tags || '').split(',').map(tag => `<span class="tag">${tag.trim()}</span>`).join('');
        let badgesHtml = '';
        if (!c.credibility || c.credibility === 'Ambos') {
            badgesHtml = `
                <span class="cred-badge verified"><i class="fa-solid fa-check-circle"></i> Verificado</span>
                <span class="cred-badge certified"><i class="fa-solid fa-certificate"></i> Certificado</span>
            `;
        } else if (c.credibility === 'Verificado') {
            badgesHtml = `<span class="cred-badge verified"><i class="fa-solid fa-check-circle"></i> Verificado</span>`;
        } else if (c.credibility === 'Certificado') {
            badgesHtml = `<span class="cred-badge certified"><i class="fa-solid fa-certificate"></i> Certificado</span>`;
        }

        return `
            <div class="car-card glass">
                <div class="card-img-wrap">
                    <div class="credibility-badges">
                        ${badgesHtml}
                    </div>
                    <img src="${c.image || './assets/hero_mustang_1773944704890.png'}" alt="${c.name}" onerror="this.src='./assets/hero_mustang_1773944704890.png'">
            </div>
            <div class="card-content">
                <div class="card-header-flex">
                    <h3 class="card-title">${c.name}</h3>
                    <span class="card-year">${c.year}</span>
                </div>
                <div class="card-price">R$ ${c.price}</div>
                <div class="card-features">
                    <span title="Quilometragem"><i class="fa-solid fa-gauge-high"></i> ${c.km} km</span>
                    <span title="Câmbio"><i class="fa-solid fa-gear"></i> ${c.transmission}</span>
                </div>
                <div class="card-tags">
                    ${tagHtml}
                </div>
                <div class="card-actions">
                    <button class="btn btn-outline" onclick="openCarDetails(${c.id})">Detalhes</button>
                    <a href="https://wa.me/5511947383714?text=Olá,%20tenho%20interesse%20no%20veículo:%20${encodeURIComponent(c.name)}" target="_blank" class="btn btn-primary"><i class="fa-brands fa-whatsapp"></i> Negociar</a>
                </div>
            </div>
        </div>
    `}).join('');
}


// Auth functions
function handleLogin(e) {
    if (e) e.preventDefault();
    const u = document.getElementById('login-user').value;
    const p = document.getElementById('login-password').value;
    const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');

    // Check against standard users or hardcoded admin validation
    if ((u === 'Admin' && p === 'T3bas@') || users.find(usr => usr.email === u && usr.password === p)) {
        localStorage.setItem(AUTH_KEY, 'true');
        document.getElementById('login-error').classList.add('hidden');
        document.getElementById('login-form').reset();
        window.location.hash = '#admin';
    } else {
        document.getElementById('login-error').classList.remove('hidden');
    }
}

function handleRegister(e) {
    e.preventDefault();
    const u = document.getElementById('reg-email').value;
    const p = document.getElementById('reg-password').value;
    const c = document.getElementById('reg-confirm').value;
    const err = document.getElementById('reg-error');

    if (p !== c) {
        err.classList.remove('hidden');
        err.textContent = "As senhas não coincidem.";
        return;
    }

    const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
    if (users.find(usr => usr.email === u)) {
        err.classList.remove('hidden');
        err.textContent = "Este email já está cadastrado.";
        return;
    }

    users.push({ email: u, password: p });
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
    err.classList.add('hidden');

    // Automatically switch to login
    alert("Conta criada com sucesso! Você pode fazer o login agora.");
    document.getElementById('reg-form').reset();
    window.location.hash = '#login';
}

function logout() {
    localStorage.removeItem(AUTH_KEY);
    const lf = document.getElementById('login-form');
    if (lf) lf.reset();
    window.location.hash = '#login';
}


// Admin logic
window.openAdminModal = function () {
    document.getElementById('admin-form').reset();
    document.getElementById('car-id').value = '';
    document.getElementById('car-image-data').value = '';
    document.getElementById('car-image-preview').style.display = 'none';
    document.getElementById('car-image-preview').src = '';
    document.getElementById('car-badges-select').value = 'Ambos';
    document.getElementById('modal-title').textContent = 'Adicionar Novo Veículo';
    document.getElementById('admin-modal').classList.remove('hidden');
}

window.closeAdminModal = function () {
    document.getElementById('admin-modal').classList.add('hidden');
}

window.toggleOtherBrand = function () {
    const sel = document.getElementById('car-brand');
    const inp = document.getElementById('car-brand-other');
    if (sel.value === 'Outra') {
        inp.style.display = 'block';
        inp.required = true;
    } else {
        inp.style.display = 'none';
        inp.required = false;
        inp.value = '';
    }
}

function handleSaveCar(e) {
    e.preventDefault();
    const cars = getInventory();
    const id = document.getElementById('car-id').value;

    const type = document.getElementById('car-type').value;
    let brand = document.getElementById('car-brand').value;
    if (brand === 'Outra') {
        const inpStr = document.getElementById('car-brand-other').value.trim();
        brand = inpStr ? inpStr : 'Outra';
    }
    const fuel = document.getElementById('car-fuel').value;
    const tagsString = `${type}, ${brand}, ${fuel}`;
    const imgData = document.getElementById('car-image-data').value;
    const badgeSel = document.getElementById('car-badges-select') ? document.getElementById('car-badges-select').value : 'Ambos';

    // Procrency Fields
    const ownerData = document.getElementById('car-owner') ? document.getElementById('car-owner').value : 'Único Dono';
    const laudoData = document.getElementById('car-laudo') ? document.getElementById('car-laudo').value : 'Laudo Cautelar 100% Aprovado';

    const carData = {
        name: document.getElementById('car-name').value,
        price: document.getElementById('car-price').value,
        year: document.getElementById('car-year').value,
        km: document.getElementById('car-km').value,
        transmission: document.getElementById('car-trans').value,
        image: imgData || './assets/hero_mustang_1773944704890.png',
        tags: tagsString,
        credibility: badgeSel,
        owner: ownerData,
        laudo: laudoData
    };

    if (id) { // Edit
        const index = cars.findIndex(c => c.id == id);
        carData.id = parseInt(id);
        cars[index] = carData;
    } else { // Create
        carData.id = Date.now();
        cars.unshift(carData);
    }

    saveInventory(cars);
    closeAdminModal();
    renderAdminTable();
}

window.editCar = function (id) {
    const car = getInventory().find(c => c.id == id);
    if (!car) return;

    document.getElementById('car-id').value = car.id;
    document.getElementById('car-name').value = car.name || '';
    document.getElementById('car-price').value = car.price || '';
    document.getElementById('car-year').value = car.year || '';
    document.getElementById('car-km').value = car.km || '';
    document.getElementById('car-trans').value = car.transmission || 'Automático';

    if (document.getElementById('car-badges-select')) {
        document.getElementById('car-badges-select').value = car.credibility || 'Ambos';
    }
    if (document.getElementById('car-owner')) document.getElementById('car-owner').value = car.owner || 'Único Dono';
    if (document.getElementById('car-laudo')) document.getElementById('car-laudo').value = car.laudo || 'Laudo Cautelar 100% Aprovado';

    // Parse tags (fallback safely)
    const tagVals = (car.tags || '').split(',').map(s => s.trim());

    // Safely select options
    const setSelectSafely = (selectId, val, defaultVal) => {
        const sel = document.getElementById(selectId);
        if (sel) {
            if (val && Array.from(sel.options).some(o => o.value === val)) {
                sel.value = val;
                return true;
            } else {
                sel.value = defaultVal;
                return false;
            }
        }
        return false;
    };

    setSelectSafely('car-type', tagVals[0], 'Carro');
    const brandFound = setSelectSafely('car-brand', tagVals[1], 'Outra');

    // Handle 'Outra' custom brand
    const inpOther = document.getElementById('car-brand-other');
    if (inpOther && tagVals[1] && !brandFound) {
        document.getElementById('car-brand').value = 'Outra';
        inpOther.style.display = 'block';
        inpOther.value = tagVals[1];
    } else if (inpOther) {
        inpOther.style.display = 'none';
        inpOther.value = '';
    }

    setSelectSafely('car-fuel', tagVals[2], 'Flex');

    document.getElementById('car-image-data').value = car.image || '';
    document.getElementById('car-image-preview').src = car.image || '';
    document.getElementById('car-image-preview').style.display = car.image ? 'block' : 'none';
    const uploadInput = document.getElementById('car-image-upload');
    if (uploadInput) uploadInput.value = '';

    document.getElementById('modal-title').textContent = 'Editar Veículo';
    document.getElementById('admin-modal').classList.remove('hidden');
}

window.duplicateCar = function (id) {
    const cars = getInventory();
    const car = cars.find(c => c.id == id);
    if (!car) return;

    const newCar = { ...car, id: Date.now(), name: car.name + ' (Cópia)' };
    cars.unshift(newCar);
    saveInventory(cars);
    renderAdminTable();
}

window.deleteCar = function (id) {
    if (confirm('Atenção: Tem certeza que deseja excluir permanentemente este veículo do estoque?')) {
        let cars = getInventory();
        cars = cars.filter(c => c.id != id);
        saveInventory(cars);
        renderAdminTable();
    }
}

function renderAdminTable() {
    const cars = getInventory();
    const tbody = document.getElementById('admin-table-body');

    tbody.innerHTML = cars.map(c => `
        <tr>
            <td><img src="${c.image}" alt="Car" onerror="this.src='./assets/hero_mustang_1773944704890.png'"></td>
            <td><strong>${c.name}</strong><br><small style="color:var(--text-muted)">Tags: ${c.tags}</small></td>
            <td style="color:var(--primary); font-weight:bold;">${c.price}</td>
            <td>${c.year} <span style="color:var(--text-muted)">|</span> <i class="fa-solid fa-gauge" style="font-size:0.8rem"></i> ${c.km}<br><span style="color:var(--text-muted)"><i class="fa-solid fa-gear" style="font-size:0.8rem"></i> ${c.transmission}</span></td>
            <td>
                <div class="td-actions" style="flex-wrap: wrap;">
                    <button class="btn btn-outline btn-sm" onclick="editCar(${c.id})"><i class="fa-solid fa-pen"></i> Editar</button>
                    <button class="btn btn-outline btn-sm" onclick="duplicateCar(${c.id})"><i class="fa-solid fa-copy"></i> Duplicar</button>
                    <button class="btn btn-primary btn-sm delete" style="background:#ef4444; border-color:#ef4444;" onclick="deleteCar(${c.id})"><i class="fa-solid fa-trash"></i> Excluir</button>
                </div>
            </td>
        </tr>
    `).join('') || '<tr><td colspan="5" style="text-align:center; padding: 30px;">O estoque está vazio. Adicione um novo veículo!</td></tr>';
}

// Start app
document.addEventListener('DOMContentLoaded', initApp);

// Specific detail methods for public viewing
window.openCarDetails = function (id) {
    const car = getInventory().find(c => c.id == id);
    if (!car) return;

    document.getElementById('details-title').textContent = car.name;

    const ownerLine = car.owner && car.owner !== 'Dono não informado' ? `<li><i class="fa-solid fa-check" style="color: #22c55e; width: 25px;"></i> <strong>${car.owner}</strong> e procedência validada</li>` : '';
    const laudoLine = car.laudo && car.laudo !== 'Laudo não informado' ? `<li><i class="fa-solid fa-check" style="color: #22c55e; width: 25px;"></i> ${car.laudo}</li>` : '';

    const detailsHtml = `
        <img src="${car.image || './assets/hero_mustang_1773944704890.png'}" alt="${car.name}" style="width:100%; border-radius: 8px; margin-bottom: 20px; max-height: 300px; object-fit: cover;">
        <h3 style="color:var(--primary); margin-bottom:15px; font-size: 1.8rem;">R$ ${car.price}</h3>
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px;">
            <p><strong><i class="fa-solid fa-calendar" style="color:var(--primary);"></i> Ano:</strong> ${car.year}</p>
            <p><strong><i class="fa-solid fa-gauge-high" style="color:var(--primary);"></i> KM:</strong> ${car.km}</p>
            <p><strong><i class="fa-solid fa-gear" style="color:var(--primary);"></i> Câmbio:</strong> ${car.transmission}</p>
            <p><strong><i class="fa-solid fa-tags" style="color:var(--primary);"></i> Categoria:</strong> ${car.tags}</p>
        </div>
        <div style="background: rgba(255,255,255,0.05); padding: 20px; border-radius: 8px; border: 1px solid var(--border-glass);">
            <h4 style="margin-bottom: 15px; color: var(--text-main); font-size: 1.1rem;"><i class="fa-solid fa-file-shield"></i> Informações de Procedência</h4>
            <ul style="list-style:none; line-height: 1.8; color: var(--text-muted); font-size: 0.95rem;">
                ${ownerLine}
                ${laudoLine}
                <li><i class="fa-solid fa-check" style="color: #22c55e; width: 25px;"></i> Totalmente revisado internamente</li>
                <li><i class="fa-solid fa-check" style="color: #22c55e; width: 25px;"></i> Pronto para transferência</li>
            </ul>
            <p style="margin-top:15px; font-size:0.95rem; color: var(--text-main);">Veículo inspecionado, entregue com garantia e suporte premium da TebasCar.</p>
        </div>
        <div style="margin-top: 25px;">
            <a href="https://wa.me/5511947383714?text=Olá,%20vi%20os%20detalhes%20do%20veículo%20${encodeURIComponent(car.name)}%20e%20gostaria%20de%20mais%20informações." target="_blank" class="btn btn-primary btn-block btn-large"><i class="fa-brands fa-whatsapp"></i> Falar com Especialista</a>
        </div>
    `;

    document.getElementById('details-body').innerHTML = detailsHtml;
    document.getElementById('details-modal').classList.remove('hidden');
}

window.closeDetailsModal = function () {
    document.getElementById('details-modal').classList.add('hidden');
}
