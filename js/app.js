/* Phukhieo Marketing - Google Cloud / Sheets Edition */

// 🔗 เชื่อมต่อกับ Google Apps Script Web App ของคุณเรียบร้อยแล้ว
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwlU6JgdCHgcpKkjD4xAbpFf4nluUISfKL5Ww6zimbgE3jZnquaHX6Mv3Dr61JnAKdf1Q/exec"; 

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

    const rawAuth = localStorage.getItem("pk_seller_auth");
    let sellerEmail = "38340@phukhieo.ac.th";
    let sellerName = "ผู้ใช้งานระบบ";
    if (rawAuth) {
      try {
        const auth = JSON.parse(rawAuth);
        sellerEmail = auth.email || sellerEmail;
        sellerName = auth.name || sellerName;
      } catch(e) {}
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
        createdAt: Date.now(),
        sellerEmail: sellerEmail,
        sellerName: sellerName
      };

      await fetch(GOOGLE_SCRIPT_URL, {
        method: "POST",
        mode: "no-cors",
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

// ระบบ Admin
function setupAdmin() {
  const dashboard = $("#admin-dashboard"); 
  if (!dashboard) return;

  const renderAdmin = async () => {
    const products = await fetchProductsFromGoogle();
    const pending = products.filter(p => p.status === "pending");
    const approved = products.filter(p => p.status === "approved");

    const pendingTarget = $("#pending-products");
    const approvedTarget = $("#approved-products");

    if(pendingTarget) {
      pendingTarget.innerHTML = pending.length ? pending.map(p => {
        return `<article class="product-card">
          <img class="product-image" src="${p.image || placeholder}" alt="${escapeHTML(p.name)}" onerror="this.src='${placeholder}'">
          <div class="product-card-body">
            <h3>${escapeHTML(p.name)}</h3>
            <div class="product-price">฿${money(p.price)}</div>
            <div class="seller-info-tag">👤 ผู้ลงขาย: ${escapeHTML(p.sellerName || "ไม่ระบุ")} <br>📧 ${escapeHTML(p.sellerEmail || "ไม่ระบุอีเมล")}</div>
            <div class="product-meta"><span>${escapeHTML(p.contact || "โรงเรียนภูเขียว")}</span><span class="status-pill">รอตรวจสอบ</span></div>
          </div>
          <div class="admin-card-actions"><button class="btn btn-success" data-approve="${p.id}">อนุมัติ</button><button class="btn btn-danger" data-reject="${p.id}">ไม่อนุมัติ</button></div>
        </article>`;
      }).join("") : `<div class="empty-state">ไม่มีสินค้ารออนุมัติ</div>`;

      pendingTarget.querySelectorAll("[data-approve]").forEach(b => b.addEventListener("click", async () => {
        await fetch(GOOGLE_SCRIPT_URL, {
          method: "POST",
          mode: "no-cors",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify({ action: "update", id: b.dataset.approve, status: "approved" })
        });
        setTimeout(renderAdmin, 1500);
      }));
      pendingTarget.querySelectorAll("[data-reject]").forEach(b => b.addEventListener("click", async () => {
        await fetch(GOOGLE_SCRIPT_URL, {
          method: "POST",
          mode: "no-cors",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify({ action: "update", id: b.dataset.reject, status: "rejected" })
        });
        setTimeout(renderAdmin, 1500);
      }));
    }

    if(approvedTarget) {
      approvedTarget.innerHTML = approved.length ? approved.map(p => productCard(p, true)).join("") : `<div class="empty-state">ยังไม่มีสินค้าที่อนุมัติ</div>`;
      approvedTarget.querySelectorAll("[data-delete-id]").forEach(btn => {
        btn.addEventListener("click", async () => {
          if (confirm("ต้องการลบสินค้านี้ออกจากระบบใช่ไหมคะ?")) {
            await fetch(GOOGLE_SCRIPT_URL, {
              method: "POST",
              mode: "no-cors",
              headers: { "Content-Type": "text/plain;charset=utf-8" },
              body: JSON.stringify({ action: "delete", id: btn.dataset.deleteId })
            });
            alert("ลบสินค้าเรียบร้อยแล้วค่ะ! 🌸");
            setTimeout(renderAdmin, 1500);
          }
        });
      });
    }
  };

  const savedAdmin = localStorage.getItem("pk_admin_auth");
  if (savedAdmin) {
    renderAdmin();
  }
}

// เปิดการทำงานทุกระบบเมื่อโหลดหน้าเว็บ
document.addEventListener('DOMContentLoaded', () => {
  setupHome(); 
  setupSearch(); 
  setupDetail(); 
  setupSeller(); 
  setupAdmin();

  // --- ระบบอิโมจิร่วง Whimsical (🍡✨💗🍰🍭) พร้อมปุ่มเปิด/ปิด ---
  const whimsicalEmojis = ['🍡', '✨', '💗', '🍰', '🍭'];
  let emojiInterval = null;
  let isEmojiActive = localStorage.getItem("pk_emojis_enabled") !== "false";

  const toggleContainer = document.createElement("div");
  toggleContainer.id = "emoji-toggle-container";
  toggleContainer.innerHTML = `
    <span>✨ เอฟเฟกต์</span>
    <button id="emoji-toggle-btn" type="button">${isEmojiActive ? "ปิดเอฟเฟกต์" : "เปิดเอฟเฟกต์"}</button>
  `;
  document.body.appendChild(toggleContainer);

  const toggleBtn = document.getElementById("emoji-toggle-btn");

  function startEmojis() {
    if (emojiInterval) return;
    emojiInterval = setInterval(() => {
      const el = document.createElement('div');
      el.classList.add('whimsical-petal');
      el.innerText = whimsicalEmojis[Math.floor(Math.random() * whimsicalEmojis.length)];
      el.style.left = Math.random() * 100 + 'vw';
      el.style.animationDuration = (Math.random() * 3 + 4) + 's';
      el.style.fontSize = (Math.random() * 12 + 18) + 'px';
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 7000);
    }, 500);
  }

  function stopEmojis() {
    clearInterval(emojiInterval);
    emojiInterval = null;
    document.querySelectorAll('.whimsical-petal').forEach(el => el.remove());
  }

  if (isEmojiActive) {
    startEmojis();
  }

  toggleBtn.addEventListener("click", () => {
    isEmojiActive = !isEmojiActive;
    localStorage.setItem("pk_emojis_enabled", isEmojiActive);
    if (isEmojiActive) {
      startEmojis();
      toggleBtn.textContent = "ปิดเอฟเฟกต์";
    } else {
      stopEmojis();
      toggleBtn.textContent = "เปิดเอฟเฟกต์";
    }
  });

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