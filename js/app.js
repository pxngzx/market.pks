/* Phukhieo Marketing - Google Cloud / Sheets Edition */

// 🔗 เชื่อมต่อกับ Google Apps Script Web App ของคุณแล้ว
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxzh5bjxHQuHnoLTJro7623i_sx5Xcry12uQjrbdxRgYwOkvtKMlW_6tRO3xt2v_auaEQ/exec"
const ADMIN_PIN = "PKstudent_mk";
const placeholder = "assets/images/product-placeholder.svg";
const $ = (selector) => document.querySelector(selector);
const escapeHTML = (value = "") => String(value).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const money = value => new Intl.NumberFormat("th-TH").format(Number(value) || 0);

// ฟังก์ชันสร้างการ์ดสินค้า
function productCard(product, owner = false) {
  return `<article class="product-card">
    <a href="product.html?id=${encodeURIComponent(product.id || '')}"><img class="product-image" src="${product.image || placeholder}" alt="${escapeHTML(product.name)}" onerror="this.src='${placeholder}'"></a>
    <div class="product-card-body"><h3>${escapeHTML(product.name)}</h3><div class="product-price">฿${money(product.price)}</div>
    <div class="product-meta"><span>${escapeHTML(product.contact || "โรงเรียนภูเขียว")}</span><span class="status-pill">${product.status === "approved" ? "อนุมัติแล้ว" : product.status === "rejected" ? "ไม่อนุมัติ" : "รอตรวจสอบ"}</span></div></div>
    ${owner ? `<div class="admin-card-actions"><button class="btn btn-danger" data-delete-id="${escapeHTML(product.id || '')}">ลบสินค้า</button></div>` : ""}
  </article>`;
}

// ดึงข้อมูลสินค้าจาก Google Sheets
async function fetchProductsFromGoogle() {
  try {
    const response = await fetch(GOOGLE_SCRIPT_URL);
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (e) {
    console.error("Error loading products: ", e);
    return [];
  }
}

// ระบบหน้าแรก (Home)
async function setupHome() {
  const target = $("#featured-products");
  if (target) {
    const products = await fetchProductsFromGoogle();
    const approved = products.filter(p => p.status === "approved").slice(0, 3);
    target.innerHTML = approved.length ? approved.map(p => productCard(p)).join("") : `<div class="empty-state">ยังไม่มีสินค้าแนะนำในขณะนี้</div>`;
  }
}

// ระบบค้นหาสินค้า (Search)
async function setupSearch() {
  const target = $("#all-products");
  if (!target) return;
  const input = $("#search-input"), sort = $("#sort-select"), count = $("#results-count");
  
  const allData = await fetchProductsFromGoogle();
  const render = () => {
    let products = allData.filter(p => p.status === "approved");
    const q = (input?.value || "").trim().toLowerCase();
    if (q) products = products.filter(p => `${p.name} ${p.description} ${p.contact}`.toLowerCase().includes(q));
    if (sort?.value === "price-low") products.sort((a,b) => Number(a.price) - Number(b.price));
    else if (sort?.value === "price-high") products.sort((a,b) => Number(b.price) - Number(a.price));
    else products.sort((a,b) => Number(b.createdAt) - Number(a.createdAt));
    if (count) count.textContent = `พบ ${products.length} รายการ`;
    target.innerHTML = products.length ? products.map(p => productCard(p)).join("") : `<div class="empty-state">ไม่พบสินค้า</div>`;
  };
  input?.addEventListener("input", render); sort?.addEventListener("change", render); render();
}

// ระบบรายละเอียดสินค้า (Detail)
async function setupDetail() {
  const target = $("#product-detail");
  if (!target) return;
  const id = new URLSearchParams(location.search).get("id");
  const products = await fetchProductsFromGoogle();
  const product = products.find(p => String(p.id) === String(id) && p.status === "approved");
  if (!product) { target.innerHTML = `<div class="empty-state">ไม่พบสินค้านี้ หรือสินค้ายังไม่ได้รับการอนุมัติ</div>`; return; }
  target.innerHTML = `<img class="detail-image" src="${product.image || placeholder}" alt="${escapeHTML(product.name)}" onerror="this.src='${placeholder}'">
    <div class="detail-info"><span class="eyebrow">PHUKHIEO MARKETPLACE</span><h1>${escapeHTML(product.name)}</h1><div class="detail-price">฿${money(product.price)}</div>
    <p class="detail-description">${escapeHTML(product.description || "ไม่มีรายละเอียดเพิ่มเติม")}</p>
    <div class="detail-contact"><b>ช่องทางติดต่อผู้ขาย</b><p>${escapeHTML(product.contact)}</p><small>โปรดนัดรับและซื้อขายในพื้นที่ปลอดภัย</small></div></div>`;
}

// ระบบเพิ่มสินค้า (Seller)
function setupSeller() {
  const form = $("#product-form");
  if (!form) return;
  const imageInput = $("#product-image"), preview = $("#image-preview");
  let selectedImageBase64 = "";

  imageInput?.addEventListener("change", () => {
    const file = imageInput.files?.[0]; 
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert("รูปภาพมีขนาดใหญ่เกิน 2 MB ครับ กรุณาเลือกรูปภาพที่มีขนาดเล็กกว่านี้");
      imageInput.value = ""; 
      selectedImageBase64 = "";
      if (preview) preview.innerHTML = "<span>ภาพตัวอย่างจะแสดงที่นี่</span>";
      return;
    }

    const reader = new FileReader();
    reader.onload = () => { 
      selectedImageBase64 = reader.result; 
      if (preview) preview.innerHTML = `<img src="${selectedImageBase64}">`; 
    };
    reader.readAsDataURL(file);
  });

  form.addEventListener("submit", async event => {
    event.preventDefault();
    const btn = $("#submit-product");
    
    if (!selectedImageBase64) {
      alert("กรุณาเลือกรูปภาพสินค้าก่อนส่งข้อมูลครับ");
      return;
    }

    if (btn) { 
      btn.disabled = true; 
      btn.textContent = "กำลังบันทึกข้อมูล..."; 
    }

    try {
      const payload = {
        action: "create",
        id: "prod_" + Date.now(),
        name: $("#product-name").value.trim(),
        price: Number($("#product-price").value),
        description: $("#product-description").value.trim(),
        contact: $("#product-contact").value.trim(),
        image: selectedImageBase64,
        status: "pending",
        createdAt: Date.now()
      };

      await fetch(GOOGLE_SCRIPT_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload)
      });

      alert("ส่งสินค้าให้ Admin ตรวจสอบเรียบร้อยแล้วค่ะ! 🌸");
      form.reset(); 
      selectedImageBase64 = "";
      if (preview) preview.innerHTML = "<span>ภาพตัวอย่างจะแสดงที่นี่</span>";
    } catch (e) {
      alert("เกิดข้อผิดพลาดในการบันทึกข้อมูล: " + e.message);
    } finally {
      if (btn) { 
        btn.disabled = false; 
        btn.textContent = "ส่งให้ Admin อนุมัติ ↗"; 
      }
    }
  });
}

// ระบบ Admin (อนุมัติ / ปฏิเสธ / ลบสินค้า)
function setupAdmin() {
  const loginForm = $("#admin-login-form"); if (!loginForm) return;
  const loginPanel = $("#admin-login-panel"), dashboard = $("#admin-dashboard");

  const renderAdmin = async () => {
    const products = await fetchProductsFromGoogle();
    const pending = products.filter(p => p.status === "pending");
    const approved = products.filter(p => p.status === "approved");

    const pendingTarget = $("#pending-products");
    const approvedTarget = $("#approved-products");

    if(pendingTarget) {
      pendingTarget.innerHTML = pending.length ? pending.map(p => productCard(p, false)).join("") : `<div class="empty-state">ไม่มีสินค้ารออนุมัติ</div>`;
      pendingTarget.querySelectorAll(".product-card").forEach((card, idx) => {
        const p = pending[idx];
        const actions = document.createElement("div"); actions.className = "admin-card-actions";
        actions.innerHTML = `<button class="btn btn-success" data-approve="${p.id}">อนุมัติ</button><button class="btn btn-danger" data-reject="${p.id}">ไม่อนุมัติ</button>`;
        card.appendChild(actions);
      });
      pendingTarget.querySelectorAll("[data-approve]").forEach(b => b.addEventListener("click", async () => {
        await fetch(GOOGLE_SCRIPT_URL, {
          method: "POST",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify({ action: "update", id: b.dataset.approve, status: "approved" })
        });
        renderAdmin();
      }));
      pendingTarget.querySelectorAll("[data-reject]").forEach(b => b.addEventListener("click", async () => {
        await fetch(GOOGLE_SCRIPT_URL, {
          method: "POST",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify({ action: "update", id: b.dataset.reject, status: "rejected" })
        });
        renderAdmin();
      }));
    }

    if(approvedTarget) {
      approvedTarget.innerHTML = approved.length ? approved.map(p => productCard(p, true)).join("") : `<div class="empty-state">ยังไม่มีสินค้าที่อนุมัติ</div>`;
      approvedTarget.querySelectorAll("[data-delete-id]").forEach(btn => {
        btn.addEventListener("click", async () => {
          if (confirm("ต้องการลบสินค้านี้ออกจากระบบใช่ไหมคะ?")) {
            await fetch(GOOGLE_SCRIPT_URL, {
              method: "POST",
              headers: { "Content-Type": "text/plain;charset=utf-8" },
              body: JSON.stringify({ action: "delete", id: btn.dataset.deleteId })
            });
            alert("ลบสินค้าเรียบร้อยแล้วค่ะ! 🌸");
            renderAdmin();
          }
        });
      });
    }
  };

  loginForm.addEventListener("submit", event => {
    event.preventDefault();
    const pinInput = $("#admin-pin");
    const msg = $("#admin-login-message");
    if (pinInput && pinInput.value === ADMIN_PIN) {
      alert("เข้าสู่ระบบแอดมินโรงเรียนภูเขียวเรียบร้อยแล้วค่ะ! 🌸");
      if(loginPanel) loginPanel.classList.add("hidden"); 
      if(dashboard) dashboard.classList.remove("hidden"); 
      renderAdmin();
    } else {
      if(msg) msg.textContent = "รหัส PIN ไม่ถูกต้อง";
    }
  });

  const logoutBtn = $("#admin-logout");
  if(logoutBtn) {
    logoutBtn.addEventListener("click", () => { 
      if(dashboard) dashboard.classList.add("hidden"); 
      if(loginPanel) loginPanel.classList.remove("hidden"); 
      const pinInput = $("#admin-pin");
      if(pinInput) pinInput.value = ""; 
    });
  }
}

// เปิดการทำงานทุกระบบเมื่อโหลดหน้าเว็บ
document.addEventListener('DOMContentLoaded', () => {
  setupHome(); 
  setupSearch(); 
  setupDetail(); 
  setupSeller(); 
  setupAdmin();

  // อนิเมชันดอกไม้ร่วง 🌸
  setInterval(() => {
    const flower = document.createElement('div');
    flower.classList.add('flower-petal');
    flower.innerText = ['🌸', '🌺', '💮', '✨'][Math.floor(Math.random() * 4)];
    flower.style.left = Math.random() * 100 + 'vw';
    flower.style.animationDuration = Math.random() * 3 + 4 + 's';
    flower.style.fontSize = Math.random() * 10 + 16 + 'px';
    document.body.appendChild(flower);
    setTimeout(() => flower.remove(), 7000);
  }, 450);

  // ดาววิบวับประดับหน้าเว็บ ✦
  const mainContainers = document.querySelectorAll('.hero, .container, header, .card');
  mainContainers.forEach(container => {
    container.style.position = 'relative';
    for (let i = 0; i < 3; i++) {
      const star = document.createElement('span');
      star.classList.add('star-sparkle');
      star.innerText = '✦';
      star.style.top = Math.random() * 80 + 10 + '%';
      star.style.left = Math.random() * 90 + 5 + '%';
      star.style.animationDelay = Math.random() * 2 + 's';
      container.appendChild(star);
    }
  });
});