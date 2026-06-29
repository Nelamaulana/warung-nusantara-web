import { initializeApp } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js";
import {
    getFirestore,
    collection,
    getDocs,
    getDoc,
    addDoc,
    doc,
    setDoc,
    query,
    where,
    updateDoc,
    onSnapshot,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

// =======================
// Firebase Config
// =======================
const firebaseConfig = {
    apiKey: "AIzaSyANInKK5CBOCXpMgMQ9djp0wWPBgBoNY7s",
    authDomain: "warung-nusantara-a74f9.firebaseapp.com",
    projectId: "warung-nusantara-a74f9",
    storageBucket: "warung-nusantara-a74f9.firebasestorage.app",
    messagingSenderId: "1085086172585",
    appId: "1:1085086172585:web:7f210c7e62dc0378d030b8"
};

const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);

console.log("Firebase berhasil terkoneksi.");

// =======================
// Ambil Elemen HTML
// =======================
const customerName     = document.getElementById("customerName");
const customerPhone    = document.getElementById("customerPhone");
const restaurantSelect = document.getElementById("restaurantSelect");
const menuSelect       = document.getElementById("menuSelect");
const tableNumber      = document.getElementById("tableNumber");
const qtyInput         = document.getElementById("qty");
const priceEl          = document.getElementById("price");
const totalPriceEl     = document.getElementById("totalPrice");
const btnOrder         = document.getElementById("btnOrder");
const orderList        = document.getElementById("orderList");
const emptyRow         = document.getElementById("emptyRow");

// Tombol ±
document.getElementById("qtyMinus").addEventListener("click", () => {
    const v = parseInt(qtyInput.value) || 1;
    if (v > 1) { qtyInput.value = v - 1; updateTotal(); }
});
document.getElementById("qtyPlus").addEventListener("click", () => {
    qtyInput.value = (parseInt(qtyInput.value) || 1) + 1;
    updateTotal();
});

// =======================
// Variabel Global
// =======================
let selectedRestaurantId = "";
let selectedMenuId       = "";
let selectedMenuName     = "";
let selectedPrice        = 0;
let activeFilter         = "all";
let allOrders            = [];   // simpan semua baris untuk filter

// ======================================================
// BAGIAN 2
// Menampilkan Restoran dan Menu dari Firestore
// ======================================================

async function loadRestaurants() {
    restaurantSelect.innerHTML = '<option value="">— Pilih cabang —</option>';
    const snapshot = await getDocs(collection(db, "restaurants"));
    snapshot.forEach((docSnap) => {
        const data   = docSnap.data();
        const option = document.createElement("option");
        option.value       = docSnap.id;
        option.textContent = data.name;
        restaurantSelect.appendChild(option);
    });
}

loadRestaurants();

restaurantSelect.addEventListener("change", async () => {
    selectedRestaurantId = restaurantSelect.value;
    menuSelect.innerHTML = '<option value="">— Pilih menu —</option>';
    priceEl.value      = "";
    totalPriceEl.value = "";
    selectedPrice      = 0;
    selectedMenuId     = "";
    selectedMenuName   = "";
    updatePriceDisplay();

    if (!selectedRestaurantId) return;

    const snapshot = await getDocs(
        collection(db, "restaurants", selectedRestaurantId, "menus")
    );

    snapshot.forEach((docSnap) => {
        const menu   = docSnap.data();

        // Hanya tampilkan menu yang tersedia
        if (menu.available === false) return;

        const option = document.createElement("option");
        option.value              = docSnap.id;
        option.textContent        = `${menu.name} — Rp ${Number(menu.price).toLocaleString("id-ID")}`;
        option.dataset.name       = menu.name;
        option.dataset.price      = menu.price;
        menuSelect.appendChild(option);
    });
});

menuSelect.addEventListener("change", () => {
    const opt        = menuSelect.options[menuSelect.selectedIndex];
    selectedMenuId   = opt.value;
    selectedMenuName = opt.dataset.name   || "";
    selectedPrice    = Number(opt.dataset.price) || 0;
    updatePriceDisplay();
});

qtyInput.addEventListener("input", updateTotal);

function updateTotal() {
    const qty = parseInt(qtyInput.value) || 1;
    totalPriceEl.textContent = "Rp " + (selectedPrice * qty).toLocaleString("id-ID");
    priceEl.textContent      = "Rp " + selectedPrice.toLocaleString("id-ID");
}

function updatePriceDisplay() {
    if (selectedPrice > 0) {
        priceEl.textContent      = "Rp " + selectedPrice.toLocaleString("id-ID");
        totalPriceEl.textContent = "Rp " + (selectedPrice * (parseInt(qtyInput.value) || 1)).toLocaleString("id-ID");
    } else {
        priceEl.textContent      = "—";
        totalPriceEl.textContent = "—";
    }
}

// ======================================================
// BAGIAN 3
// Simpan Customer + Order + OrderItems
// ======================================================

btnOrder.addEventListener("click", async () => {
    // Validasi
    if (!customerName.value.trim() || !customerPhone.value.trim() ||
        !selectedRestaurantId || !selectedMenuId ||
        !tableNumber.value || !qtyInput.value) {
        showToast("⚠ Lengkapi semua data terlebih dahulu!", "error");
        return;
    }

    btnOrder.disabled    = true;
    btnOrder.textContent = "Menyimpan…";

    try {
        // 1. Cari customer berdasarkan nomor HP — kalau sudah ada, pakai yang lama
        const q        = query(
            collection(db, "customers"),
            where("phone", "==", customerPhone.value.trim())
        );
        const existing = await getDocs(q);

        let customerRef;
        if (!existing.empty) {
            // Sudah ada → pakai dokumen lama, tidak buat duplikat
            customerRef = existing.docs[0].ref;
        } else {
            // Belum ada → buat customer baru
            customerRef = doc(collection(db, "customers"));
            await setDoc(customerRef, {
                name:          customerName.value.trim(),
                phone:         customerPhone.value.trim(),
                loyaltyPoints: 0
            });
        }

        // 2. Simpan Order
        const orderRef = doc(collection(db, "orders"));
        await setDoc(orderRef, {
            customerId:    customerRef.id,
            restaurantId:  selectedRestaurantId,
            tableNumber:   Number(tableNumber.value),
            status:        "pending",
            totalPrice:    selectedPrice * Number(qtyInput.value),
            createdAt:     serverTimestamp()
        });

        // 3. Simpan Order Item
        const itemRef = doc(collection(db, "orders", orderRef.id, "orderItems"));
        await setDoc(itemRef, {
            menuId:    selectedMenuId,
            menuName:  selectedMenuName,
            qty:       Number(qtyInput.value),
            unitPrice: selectedPrice,
            subtotal:  selectedPrice * Number(qtyInput.value)
        });

        showToast("✓ Pesanan berhasil dikirim!", "success");
        resetForm();

    } catch (error) {
        console.error(error);
        showToast("✗ Gagal menyimpan pesanan.", "error");
    } finally {
        btnOrder.disabled = false;
        btnOrder.innerHTML = `
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M6 2 3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
                <line x1="3" y1="6" x2="21" y2="6"/>
                <path d="M16 10a4 4 0 01-8 0"/>
            </svg>
            Kirim Pesanan`;
    }
});

function resetForm() {
    customerName.value     = "";
    customerPhone.value    = "";
    restaurantSelect.value = "";
    menuSelect.innerHTML   = '<option value="">— Pilih menu —</option>';
    tableNumber.value      = "";
    qtyInput.value         = 1;
    priceEl.textContent    = "—";
    totalPriceEl.textContent = "—";
    selectedRestaurantId   = "";
    selectedMenuId         = "";
    selectedMenuName       = "";
    selectedPrice          = 0;
}

// ======================================================
// BAGIAN 4
// Menampilkan Pesanan Secara Real-Time
// ======================================================

const STATUS_LABEL = {
    pending: "Menunggu",
    cooking: "Dimasak",
    ready:   "Siap",
    done:    "Selesai"
};

function loadOrdersRealtime() {
    onSnapshot(collection(db, "orders"), async (snapshot) => {
        // Kumpulkan semua data
        const rows = [];
        for (const orderDoc of snapshot.docs) {
            const order = orderDoc.data();

            // Ambil order items
            const itemSnap = await getDocs(
                collection(db, "orders", orderDoc.id, "orderItems")
            );

            let menuName = "—";
            let qty      = 0;
            let subtotal = 0;

            itemSnap.forEach((itemDoc) => {
                const item = itemDoc.data();
                menuName = item.menuName;
                qty      = item.qty;
                subtotal = item.subtotal;
            });

            // Ambil nama customer
            let custName = "—";
            try {
                const custDoc = await getDoc(doc(db, "customers", order.customerId));
                if (custDoc.exists()) custName = custDoc.data().name;
            } catch (e) {
                console.error(e);
            }

            rows.push({
                custName,
                menuName,
                qty,
                subtotal,
                status: order.status || "pending",
                tableNumber: order.tableNumber
            });
        }

        allOrders = rows;
        renderOrders();
    });
}

function renderOrders() {
    const filtered = activeFilter === "all"
        ? allOrders
        : allOrders.filter(r => r.status === activeFilter);

    // Hapus baris lama (kecuali emptyRow)
    const existing = orderList.querySelectorAll("tr:not(#emptyRow)");
    existing.forEach(r => r.remove());

    if (filtered.length === 0) {
        emptyRow.style.display = "";
        return;
    }
    emptyRow.style.display = "none";

    filtered.forEach(row => {
        const statusClass = `status-${row.status}`;
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>
                <div style="font-weight:600">${row.custName}</div>
                <div style="font-size:11px;color:var(--text-3)">Meja ${row.tableNumber || "—"}</div>
            </td>
            <td>${row.menuName}</td>
            <td style="text-align:center;font-weight:600">${row.qty}</td>
            <td style="font-weight:600;color:var(--brand)">Rp ${Number(row.subtotal).toLocaleString("id-ID")}</td>
            <td><span class="status-badge ${statusClass}">${STATUS_LABEL[row.status] || row.status}</span></td>
        `;
        orderList.appendChild(tr);
    });
}

// Filter tombol
document.querySelectorAll(".filter-btn").forEach(btn => {
    btn.addEventListener("click", () => {
        document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        activeFilter = btn.dataset.status;
        renderOrders();
    });
});

loadOrdersRealtime();

// ======================================================
// HELPER: Toast Notification
// ======================================================
function showToast(msg, type = "success") {
    const toast = document.getElementById("toast");
    const msgEl = document.getElementById("toastMsg");
    msgEl.textContent = msg;
    toast.className   = `toast toast-${type} show`;
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => {
        toast.classList.remove("show");
    }, 2800);
}
