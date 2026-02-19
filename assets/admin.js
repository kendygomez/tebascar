const STORAGE_KEY = "tebascar_cars_editor_v4";
const FILE_NAME = "cars.json";

const defaults = {
  id: "",
  title: "",
  type: "carro",
  brand: "",
  model: "",
  year: new Date().getFullYear(),
  km: 0,
  price: 0,
  city: "",
  gearbox: "Manual",
  fuel: "Flex",
  warrantyMonths: 6,
  certified: true,
  sold: false,
  image: "",
  highlights: [],
  notes: "",
  safety: [],
  linkWhats: ""
};

function $(id){ return document.getElementById(id); }

async function loadBaseCars(){
  const res = await fetch("assets/cars.json", { cache: "no-store" });
  if(!res.ok) throw new Error("Não carregou assets/cars.json");
  return await res.json();
}
function loadDraft(){ try{ const raw=localStorage.getItem(STORAGE_KEY); return raw?JSON.parse(raw):null; }catch{return null;} }
function saveDraft(cars){ localStorage.setItem(STORAGE_KEY, JSON.stringify(cars)); }
function uid(){ return "v" + Math.random().toString(16).slice(2, 8) + Date.now().toString(16).slice(-4); }

function toForm(car){
  const c = {...defaults, ...car};
  $("car_id").value = c.id || "";
  $("title").value = c.title || "";
  $("type").value = c.type || "carro";
  $("brand").value = c.brand || "";
  $("model").value = c.model || "";
  $("year").value = c.year ?? "";
  $("km").value = c.km ?? "";
  $("price").value = c.price ?? "";
  $("city").value = c.city || "";
  $("gearbox").value = c.gearbox || "Manual";
  $("fuel").value = c.fuel || "Flex";
  $("warrantyMonths").value = c.warrantyMonths ?? 0;
  $("certified").checked = !!c.certified;
  $("sold").checked = !!c.sold;
  $("image").value = c.image || "";
  $("highlights").value = (c.highlights || []).join(", ");
  $("notes").value = c.notes || "";
  $("safety").value = (c.safety || []).join(", ");
  $("linkWhats").value = c.linkWhats || "";
}

function fromForm(){
  const id = $("car_id").value.trim();
  return {
    id: id || uid(),
    title: $("title").value.trim(),
    type: $("type").value,
    brand: $("brand").value.trim(),
    model: $("model").value.trim(),
    year: Number($("year").value || 0),
    km: Number($("km").value || 0),
    price: Number($("price").value || 0),
    city: $("city").value.trim(),
    gearbox: $("gearbox").value,
    fuel: $("fuel").value,
    warrantyMonths: Number($("warrantyMonths").value || 0),
    certified: $("certified").checked,
    sold: $("sold").checked,
    image: $("image").value.trim(),
    highlights: ($("highlights").value || "").split(",").map(s=>s.trim()).filter(Boolean),
    notes: $("notes").value.trim(),
    safety: ($("safety").value || "").split(",").map(s=>s.trim()).filter(Boolean),
    linkWhats: $("linkWhats").value.trim()
  };
}

function validate(v){
  const errs = [];
  if(!v.title) errs.push("Título é obrigatório.");
  if(!v.type) errs.push("Tipo é obrigatório.");
  if(!v.brand) errs.push("Marca é obrigatória.");
  if(!v.model) errs.push("Modelo é obrigatório.");
  if(!v.year || v.year < 1980) errs.push("Ano inválido.");
  if(!v.image) errs.push("URL da imagem é obrigatória.");
  if(!v.city) errs.push("Cidade/UF é obrigatório.");
  if(!v.price || v.price <= 0) errs.push("Preço inválido.");
  return errs;
}
function fmtBRL(v){ return Number(v||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"}); }

function renderTable(list){
  const tbody = $("tbody");
  tbody.innerHTML = list.map(v => `
    <tr>
      <td><span class="kbd">${v.id}</span></td>
      <td>${v.title}${v.sold ? ' <span class="kbd" style="color:#fecaca">• VENDIDO</span>' : ''}</td>
      <td>${(String(v.type||"carro")==="moto" ? "Moto" : "Carro")}</td>
      <td>${v.brand}</td>
      <td>${v.year}</td>
      <td>${fmtBRL(v.price)}</td>
      <td>${v.certified ? "Sim" : "Não"}</td>
      <td>
        <button class="btn" data-act="edit" data-id="${v.id}">Editar</button>
        <button class="btn ghost" data-act="del" data-id="${v.id}">Excluir</button>
      </td>
    </tr>
  `).join("");
}

function downloadJSON(list){
  const blob = new Blob([JSON.stringify(list, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = FILE_NAME;
  a.click();
  URL.revokeObjectURL(a.href);
}

function uploadJSON(file){
  return new Promise((resolve, reject)=>{
    const reader = new FileReader();
    reader.onload = ()=>{
      try{
        const data = JSON.parse(String(reader.result||""));
        if(!Array.isArray(data)) throw new Error("O JSON precisa ser uma lista.");
        resolve(data);
      }catch(e){ reject(e); }
    };
    reader.onerror = ()=>reject(reader.error);
    reader.readAsText(file);
  });
}

async function init(){
  $("y").textContent = new Date().getFullYear();
  let list = await loadBaseCars();
  const draft = loadDraft();
  if(draft && Array.isArray(draft)) list = draft;

  renderTable(list);
  toForm({});
  $("status").textContent = "Edite aqui → Exportar cars.json → substituir assets/cars.json no GitHub/Vercel.";

  $("btnNew").onclick = ()=> toForm({});

  $("btnSave").onclick = ()=>{
    const v = fromForm();
    const errs = validate(v);
    if(errs.length){ alert(errs.join("\\n")); return; }
    const idx = list.findIndex(x=>x.id===v.id);
    if(idx>=0) list[idx] = v; else list.unshift(v);
    saveDraft(list);
    renderTable(list);
    $("status").textContent = "Salvo no rascunho (navegador). Exporte para publicar.";
  };

  $("btnMarkSold").onclick = ()=>{
    const id = $("car_id").value.trim();
    if(!id){ alert("Abra um item para marcar como vendido."); return; }
    const idx = list.findIndex(x=>x.id===id);
    if(idx<0){ alert("Item não encontrado."); return; }
    list[idx].sold = true;
    saveDraft(list);
    renderTable(list);
    toForm(list[idx]);
    $("status").textContent = "Marcado como vendido no rascunho. Exporte para publicar.";
  };

  $("btnExport").onclick = ()=> downloadJSON(list);

  $("fileImport").addEventListener("change", async (e)=>{
    const file = e.target.files?.[0];
    if(!file) return;
    try{
      const data = await uploadJSON(file);
      list = data;
      saveDraft(list);
      renderTable(list);
      $("status").textContent = "Importado com sucesso. Exporte para publicar.";
    }catch(err){
      alert("Falha ao importar: " + err.message);
    }finally{
      e.target.value = "";
    }
  });

  $("btnReset").onclick = async ()=>{
    if(!confirm("Voltar para o cars.json publicado e limpar rascunho?")) return;
    localStorage.removeItem(STORAGE_KEY);
    list = await loadBaseCars();
    renderTable(list);
    toForm({});
    $("status").textContent = "Rascunho limpo. Você está vendo o cars.json publicado.";
  };

  $("tbody").addEventListener("click", (e)=>{
    const btn = e.target.closest("button");
    if(!btn) return;
    const id = btn.dataset.id;
    const act = btn.dataset.act;
    const idx = list.findIndex(x=>x.id===id);
    if(idx<0) return;

    if(act==="edit"){
      toForm(list[idx]);
      window.scrollTo({top:0, behavior:"smooth"});
    }
    if(act==="del"){
      if(!confirm("Excluir este item?")) return;
      list.splice(idx,1);
      saveDraft(list);
      renderTable(list);
      toForm({});
      $("status").textContent = "Excluído no rascunho. Exporte para publicar.";
    }
  });
}
init().catch(err=>{
  console.error(err);
  alert("Erro no painel: " + err.message);
});
