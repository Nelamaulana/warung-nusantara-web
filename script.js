// ======================================================
// BAGIAN 1
// Koneksi Firebase + Ambil Elemen HTML
// ======================================================

// Import Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js";

import {
    getFirestore,
    collection,
    getDocs,
    addDoc,
    doc,
    setDoc,
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


// =======================
// Inisialisasi Firebase
// =======================
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);


// =======================
// Ambil Komponen HTML
// =======================

const customerName = document.getElementById("customerName");
const customerPhone = document.getElementById("customerPhone");

const restaurantSelect = document.getElementById("restaurantSelect");
const menuSelect = document.getElementById("menuSelect");

const tableNumber = document.getElementById("tableNumber");

const qty = document.getElementById("qty");

const price = document.getElementById("price");

const totalPrice = document.getElementById("totalPrice");

const btnOrder = document.getElementById("btnOrder");

const orderList = document.getElementById("orderList");


// =======================
// Variabel Global
// =======================

let selectedRestaurantId = "";
let selectedMenuId = "";
let selectedMenuName = "";
let selectedPrice = 0;

console.log("Firebase berhasil terkoneksi.");
// ======================================================
// BAGIAN 2
// Menampilkan Restoran dan Menu dari Firestore
// ======================================================

// =======================
// Load Restoran
// =======================

async function loadRestaurants() {

    restaurantSelect.innerHTML =
        '<option value="">-- Pilih Restoran --</option>';

    const snapshot = await getDocs(collection(db, "restaurants"));

    snapshot.forEach((docSnap) => {

        const data = docSnap.data();

        const option = document.createElement("option");

        option.value = docSnap.id;
        option.textContent = data.name;

        restaurantSelect.appendChild(option);

    });

}

loadRestaurants();


// =======================
// Saat Restoran Dipilih
// =======================

restaurantSelect.addEventListener("change", async () => {

    selectedRestaurantId = restaurantSelect.value;

    menuSelect.innerHTML =
        '<option value="">-- Pilih Menu --</option>';

    price.value = "";
    totalPrice.value = "";

    if (selectedRestaurantId === "") return;

    const snapshot = await getDocs(
        collection(db, "restaurants", selectedRestaurantId, "menus")
    );

    snapshot.forEach((docSnap) => {

        const menu = docSnap.data();

        const option = document.createElement("option");

        option.value = docSnap.id;
        option.textContent = menu.name;

        option.dataset.name = menu.name;
        option.dataset.price = menu.price;

        menuSelect.appendChild(option);

    });

});


// =======================
// Saat Menu Dipilih
// =======================

menuSelect.addEventListener("change", () => {

    const selectedOption =
        menuSelect.options[menuSelect.selectedIndex];

    selectedMenuId = selectedOption.value;

    selectedMenuName = selectedOption.dataset.name;

    selectedPrice = Number(selectedOption.dataset.price);

    price.value = selectedPrice;

    totalPrice.value =
        selectedPrice * Number(qty.value);

});


// =======================
// Hitung Total Otomatis
// =======================

qty.addEventListener("input", () => {

    totalPrice.value =
        selectedPrice * Number(qty.value);

});
// ======================================================
// BAGIAN 3
// Simpan Customer + Order + OrderItems
// ======================================================

btnOrder.addEventListener("click", async () => {

    // Validasi input
    if (
        customerName.value === "" ||
        customerPhone.value === "" ||
        selectedRestaurantId === "" ||
        selectedMenuId === "" ||
        tableNumber.value === "" ||
        qty.value === ""
    ) {
        alert("Lengkapi semua data terlebih dahulu!");
        return;
    }

    try {

        // =======================
        // 1. Simpan Customer
        // =======================

        const customerRef = doc(collection(db, "customers"));

        await setDoc(customerRef, {

            name: customerName.value,
            phone: customerPhone.value,
            loyaltyPoints: 0

        });

        // =======================
        // 2. Simpan Order
        // =======================

        const orderRef = doc(collection(db, "orders"));

        await setDoc(orderRef, {

            customerId: customerRef.id,

            restaurantId: selectedRestaurantId,

            tableNumber: Number(tableNumber.value),

            status: "pending",

            totalPrice: Number(totalPrice.value),

            createdAt: serverTimestamp()

        });

        // =======================
        // 3. Simpan Order Item
        // =======================

        const itemRef = doc(
            collection(db, "orders", orderRef.id, "orderItems")
        );

        await setDoc(itemRef, {

            menuId: selectedMenuId,

            menuName: selectedMenuName,

            qty: Number(qty.value),

            unitPrice: selectedPrice,

            subtotal:
                selectedPrice * Number(qty.value)

        });

        alert("Pesanan berhasil disimpan!");

        // =======================
        // Reset Form
        // =======================

        customerName.value = "";
        customerPhone.value = "";
        restaurantSelect.value = "";
        menuSelect.innerHTML =
            '<option value="">-- Pilih Menu --</option>';

        tableNumber.value = "";
        qty.value = 1;
        price.value = "";
        totalPrice.value = "";

        selectedRestaurantId = "";
        selectedMenuId = "";
        selectedMenuName = "";
        selectedPrice = 0;

    } catch (error) {

        console.error(error);

        alert("Terjadi kesalahan saat menyimpan data.");

    }

});
// ======================================================
// BAGIAN 4
// Menampilkan Pesanan Secara Real-Time
// ======================================================

function loadOrdersRealtime() {

    onSnapshot(collection(db, "orders"), async (snapshot) => {

        orderList.innerHTML = "";

        for (const orderDoc of snapshot.docs) {

            const order = orderDoc.data();

            // Ambil data orderItems
            const itemSnapshot = await getDocs(
                collection(db, "orders", orderDoc.id, "orderItems")
            );

            let menu = "";
            let qty = 0;
            let subtotal = 0;

            itemSnapshot.forEach((itemDoc) => {

                const item = itemDoc.data();

                menu = item.menuName;
                qty = item.qty;
                subtotal = item.subtotal;

            });

            orderList.innerHTML += `

            <div class="order-card">

                <h3>Pesanan</h3>

                <p><b>ID Order :</b> ${orderDoc.id}</p>

                <p><b>Nomor Meja :</b> ${order.tableNumber}</p>

                <p><b>Menu :</b> ${menu}</p>

                <p><b>Jumlah :</b> ${qty}</p>

                <p><b>Total :</b> Rp ${subtotal.toLocaleString("id-ID")}</p>

                <p><b>Status :</b> ${order.status}</p>

                <hr>

            </div>

            `;

        }

    });

}

loadOrdersRealtime();