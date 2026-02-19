const CARS_URL = "assets/cars.json";
const fmtBRL = (v) => Number(v||0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

async function loadCars() {
  const res = await fetch(CARS_URL, { cache: "no-store" });
  if (!res.ok) throw new Error("Não foi possível carregar assets/cars.json");
  return await res.json();
}
function uniq(arr){ return [...new Set(arr.filter(Boolean))].sort(); }
function badge(text){ return `<span class="pill">${text}</span>`; }

function carCard(c) {
  const isSold = !!c.sold;
  const whats = c.linkWhats || `https://wa.me/5500000000000?text=${encodeURIComponent("Olá! Tenho interesse no " + (c.title||"veículo") + ".")}`;
  return `
  <article class="card" style="position:relative">
    ${c.certified ? `<span class="ribbon">Usado certificado</span>` : ``}
    ${isSold ? `<span class="sold">VENDIDO</span>` : ``}
    <div class="media"><img src="${c.image}" alt="Foto de ${c.title}" loading="lazy"></div>
    <div class="body">
      <div class="row">
        <div class="title">${c.title}</div>
        <div class="pill">${c.year}</div>
      </div>
      <div class="row" style="margin-top:6px">
        <div class="price">${fmtBRL(c.price)}</div>
        <div class="muted">${Number(c.km||0).toLocaleString("pt-BR")} km • ${c.gearbox||"-"}</div>
      </div>
      <div class="pills">
        ${badge(((c.type||"carro")==="moto" ? "Moto" : "Carro"))}
        ${badge((c.warrantyMonths||0) + " meses garantia")}
        ${badge(c.fuel||"-")}
        <span class="muted">• ${c.city||"-"}</span>
      </div>
      <div class="pills">${(c.highlights||[]).slice(0,3).map(badge).join("")}</div>
      <div class="row" style="margin-top:12px">
        <button class="btn" data-act="details" data-id="${c.id}">Ver detalhes</button>
        <a class="btn whats" href="${whats}" target="_blank" rel="noopener">WhatsApp</a>
      </div>
      ${isSold ? `<p class="muted" style="margin:10px 0 0">Este veículo já foi vendido — fale com a gente para opções semelhantes.</p>` : ``}
    </div>
  </article>`;
}

function openModal(car){
  const dlg = document.getElementById("dlg");
  document.getElementById("dlgTitle").textContent = `${car.title} • ${car.year}`;
  document.getElementById("dlgImg").src = car.image;
  document.getElementById("dlgPrice").textContent = fmtBRL(car.price);
  document.getElementById("dlgMeta").textContent = `${(String(car.type||"carro")==="moto" ? "Moto" : "Carro")} • ${Number(car.km||0).toLocaleString("pt-BR")} km • ${car.gearbox||"-"} • ${car.fuel||"-"} • ${car.city||"-"}`;
  document.getElementById("dlgWarranty").textContent = `${car.warrantyMonths||0} meses de garantia` + (car.certified ? " • Certificado" : "");
  document.getElementById("dlgNotes").textContent = car.notes || "—";
  document.getElementById("dlgSafety").innerHTML = (car.safety||[]).map(s=>`<li>${s}</li>`).join("") || "<li>—</li>";
  document.getElementById("dlgHighlights").innerHTML = (car.highlights||[]).map(h=>`<li>${h}</li>`).join("") || "<li>—</li>";
  const whats = car.linkWhats || `https://wa.me/5500000000000?text=${encodeURIComponent("Olá! Tenho interesse no " + (car.title||"veículo") + ".")}`;
  document.getElementById("dlgWhats").href = whats;
  dlg.showModal();
}

function applyFilters(list) {
  const q = (document.getElementById("q").value || "").trim().toLowerCase();
  const onlyAvail = document.getElementById("onlyAvail").checked;
  const onlyCertified = document.getElementById("onlyCertified").checked;
  const type = document.getElementById("type") ? document.getElementById("type").value : "";
  const brand = document.getElementById("brand").value;
  const yearMin = Number(document.getElementById("yearMin").value || 0);
  const priceMax = Number(document.getElementById("priceMax").value || 0);

  return list.filter(c => {
    const okQ = !q || String(c.title||"").toLowerCase().includes(q);
    const okAvail = !onlyAvail || !c.sold;
    const okCert = !onlyCertified || !!c.certified;
    const okType = !type || String(c.type||"carro") === type;
    const okBrand = !brand || c.brand === brand;
    const okYear = !yearMin || Number(c.year||0) >= yearMin;
    const okPrice = !priceMax || Number(c.price||0) <= priceMax;
    return okQ && okAvail && okCert && okType && okBrand && okYear && okPrice;
  });
}

function byFeatured(a,b){
  const as = (a.sold ? 0 : 1) + (a.certified ? 0.2 : 0) + (a.warrantyMonths ? 0.01*a.warrantyMonths : 0);
  const bs = (b.sold ? 0 : 1) + (b.certified ? 0.2 : 0) + (b.warrantyMonths ? 0.01*b.warrantyMonths : 0);
  return bs - as;
}

async function init() {
  const grid = document.getElementById("grid");
  const empty = document.getElementById("empty");
  document.getElementById("y").textContent = new Date().getFullYear();

  let cars = await loadCars();
  cars.sort(byFeatured);

  const brands = uniq(cars.map(c=>c.brand));
  const brandSel = document.getElementById("brand");
  brandSel.innerHTML = `<option value="">Todas as marcas</option>` + brands.map(b=>`<option value="${b}">${b}</option>`).join("");

  function render() {
    const filtered = applyFilters(cars);
    grid.innerHTML = filtered.map(carCard).join("");
    empty.style.display = filtered.length ? "none" : "block";
  }

  ["input","change"].forEach(ev => {
    ["q","onlyAvail","onlyCertified","type","brand","yearMin","priceMax"].forEach(id=>{
      const el = document.getElementById(id);
      if(el) el.addEventListener(ev, render);
    });
  });

  grid.addEventListener("click", (e)=>{
    const btn = e.target.closest("button");
    if(!btn) return;
    if(btn.dataset.act !== "details") return;
    const id = btn.dataset.id;
    const car = cars.find(c=>c.id===id);
    if(car) openModal(car);
  });

  render();
}
init().catch(err => {
  console.error(err);
  const empty = document.getElementById("empty");
  if (empty) {
    empty.style.display = "block";
    empty.textContent = "Erro ao carregar veículos. Verifique o arquivo assets/cars.json.";
  }
});
