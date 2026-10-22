// AIO - All In One (simple version). Data is saved in the browser using localStorage.
var cart = JSON.parse(localStorage.getItem("cart") || "{}");
var orders = JSON.parse(localStorage.getItem("orders") || "[]");

function $(id) { return document.getElementById(id); }
function rs(n) { return "Rs " + Math.round(n * 100) / 100; }
function saveCart() { localStorage.setItem("cart", JSON.stringify(cart)); showCartCount(); }
function saveOrders() { localStorage.setItem("orders", JSON.stringify(orders)); }
function say(text, isError) { var m = $("msg"); m.className = isError ? "error" : "msg"; m.textContent = text; }
function getProduct(id) { for (var i = 0; i < PRODUCTS.length; i++) { if (PRODUCTS[i].id == id) return PRODUCTS[i]; } }

function showCartCount() {
  var n = 0;
  for (var id in cart) { n += cart[id]; }
  $("cart-link").textContent = "Cart (" + n + ")";
}

// ---------- Groceries and Medicines page ----------
function showProducts(module) {
  var cat = $("category").value, word = $("search").value.toLowerCase(), html = "";
  for (var i = 0; i < PRODUCTS.length; i++) {
    var p = PRODUCTS[i];
    if (p.module != module) continue;
    if (cat != "All" && p.cat != cat) continue;
    if (word && (p.name + " " + p.cat).toLowerCase().indexOf(word) == -1) continue;
    var extra = module == "medicine" ? (p.rx ? " (Prescription needed)" : " (No prescription)") : "";
    var button = p.stock < 1 ? "Out of stock" : "<button onclick='addToCart(" + p.id + ")'>Add to cart</button>";
    html += "<tr><td>" + p.emoji + " " + p.name + extra + "</td><td>" + p.cat + "</td><td>" + p.unit + "</td><td>" + rs(p.price) + "</td><td>" + (cart[p.id] || 0) + "</td><td>" + button + "</td></tr>";
  }
  if (html == "") html = "<tr><td colspan='6'>No items found.</td></tr>";
  $("product-rows").innerHTML = html;
}
function startProducts(module) {
  var cats = [];
  for (var i = 0; i < PRODUCTS.length; i++) {
    if (PRODUCTS[i].module == module && cats.indexOf(PRODUCTS[i].cat) == -1) cats.push(PRODUCTS[i].cat);
  }
  var opts = "<option>All</option>";
  for (var j = 0; j < cats.length; j++) { opts += "<option>" + cats[j] + "</option>"; }
  $("category").innerHTML = opts;
  $("category").onchange = function () { showProducts(module); };
  $("search").oninput = function () { showProducts(module); };
  window.currentModule = module;
  showProducts(module);
}
function addToCart(id) {
  var p = getProduct(id);
  if ((cart[id] || 0) + 1 > p.stock) { say("Only " + p.stock + " of " + p.name + " in stock.", true); return; }
  cart[id] = (cart[id] || 0) + 1;
  saveCart();
  say(p.name + " added to cart.");
  showProducts(window.currentModule);
}

// ---------- Cart page ----------
function calcBill() {
  var item = 0, hasMed = false, hasGrocery = false, needsRx = false;
  for (var id in cart) {
    var p = getProduct(id);
    item += p.price * cart[id];
    if (p.module == "medicine") hasMed = true; else hasGrocery = true;
    if (p.rx) needsRx = true;
  }
  var count = Object.keys(cart).length;
  var delivery = 0;
  if (count > 0) {
    if (hasMed && !hasGrocery) delivery = item < 299 ? 20 : 0; else delivery = item < 199 ? 15 : 0;
  }
  var handling = count > 0 ? 5 : 0, discount = 0, note = "";
  var code = $("promo").value.trim().toUpperCase();
  if (code == "FIRST50") {
    var old = orders.filter(function (o) { return o.type == "Grocery" || o.type == "Medicine"; });
    if (old.length > 0) note = "FIRST50 works only on the first order."; else discount = Math.min(50, item);
  } else if (code == "SAVE20") { discount = Math.min(100, item * 0.2); }
  else if (code != "") { note = "Invalid promo code. Try FIRST50 or SAVE20."; }
  return { item: item, delivery: delivery, handling: handling, discount: discount, note: note, total: item + delivery + handling - discount, hasMed: hasMed, needsRx: needsRx, count: count };
}
function showCart() {
  var html = "";
  for (var id in cart) {
    var p = getProduct(id);
    html += "<tr><td>" + p.emoji + " " + p.name + "</td><td>" + rs(p.price) + "</td><td>" + cart[id] + "</td><td>" + rs(p.price * cart[id]) + "</td>" +
      "<td><button onclick='changeQty(" + id + ",1)'>+</button> <button onclick='changeQty(" + id + ",-1)'>-</button> <button class='red' onclick='changeQty(" + id + ",-100)'>Remove</button></td></tr>";
  }
  if (html == "") html = "<tr><td colspan='5'>Your cart is empty.</td></tr>";
  $("cart-rows").innerHTML = html;
  var b = calcBill();
  $("bill").innerHTML = "Items total: " + rs(b.item) + "<br>Delivery: " + (b.delivery ? rs(b.delivery) : "Free") + "<br>Handling: " + rs(b.handling) +
    "<br>Discount: " + rs(b.discount) + "<br><b>Total: " + rs(b.total) + "</b>" + (b.note ? "<br><span class='error'>" + b.note + "</span>" : "");
  $("rx-box").style.display = b.needsRx ? "block" : "none";
}
function changeQty(id, change) {
  var p = getProduct(id), q = cart[id] + change;
  if (q > p.stock) { say("Only " + p.stock + " in stock.", true); return; }
  if (q <= 0) delete cart[id]; else cart[id] = q;
  saveCart(); showCart();
}
function placeOrder() {
  var b = calcBill();
  if (b.count == 0) { say("Your cart is empty.", true); return; }
  if ($("address").value.trim() == "") { say("Please enter your delivery address.", true); return; }
  if (b.needsRx && $("rx-file").files.length == 0) { say("Please attach a prescription for the Rx medicines.", true); return; }
  if (b.note) { say(b.note, true); return; }
  var names = [];
  for (var id in cart) { names.push(cart[id] + " x " + getProduct(id).name); }
  newOrder(b.hasMed ? "Medicine" : "Grocery", names.join(", "), b.total);
  cart = {}; saveCart(); showCart();
  say("Order placed! Go to the Orders page to see it.");
}

// ---------- Orders ----------
var FLOWS = {
  Grocery: ["Placed", "Packed", "Out for delivery", "Delivered"],
  Medicine: ["Placed", "Pharmacist review", "Packed", "Out for delivery", "Delivered"],
  Print: ["Placed", "Printing", "Ready", "Delivered"],
  Service: ["Booked", "Provider assigned", "On the way", "Completed"]
};
function newOrder(type, summary, total) {
  orders.unshift({ ref: type.charAt(0) + Math.floor(1000 + Math.random() * 9000), type: type, summary: summary, total: total, time: Date.now() });
  saveOrders();
}
function showOrders() {
  var html = "";
  for (var i = 0; i < orders.length; i++) {
    var o = orders[i], flow = FLOWS[o.type];
    var step = Math.min(flow.length - 1, Math.floor((Date.now() - o.time) / 10000)); // status changes every 10 seconds
    html += "<tr><td>" + o.ref + "</td><td>" + o.type + "</td><td>" + o.summary + "</td><td>" + rs(o.total) + "</td><td>" + flow[step] + "</td><td>" + new Date(o.time).toLocaleString() + "</td></tr>";
  }
  if (html == "") html = "<tr><td colspan='6'>No orders yet.</td></tr>";
  $("order-rows").innerHTML = html;
}

// ---------- Printouts ----------
function getQuote() {
  var pages = Math.max(1, Number($("pages").value) || 1), copies = Math.max(1, Number($("copies").value) || 1);
  var rate = $("colour").value == "Color" ? 10 : 2;
  if ($("paper").value == "A3") rate = rate * 2;
  var bind = { "None": 0, "Stapled": 5, "Spiral": 30 }[$("binding").value] * copies;
  var discount = $("sides").value == "Double-sided" ? 0.5 * pages * copies : 0;
  var price = Math.max(1, rate * pages * copies - discount + bind);
  var delivery = $("fulfil").value == "Store pickup" ? 0 : (price >= 199 ? 0 : 20);
  $("quote").innerHTML = "Printing: " + rs(price) + "<br>Delivery: " + (delivery ? rs(delivery) : "Free") + "<br>Handling: Rs 5<br><b>Total: " + rs(price + delivery + 5) + "</b>";
  return { pages: pages, copies: copies, total: price + delivery + 5 };
}
function placePrint() {
  var file = $("file").files[0];
  if (!file) { say("Please choose a document to print.", true); return; }
  var q = getQuote();
  newOrder("Print", file.name + " - " + q.pages + " pages x " + q.copies + " copies", q.total);
  say("Print order placed! Go to the Orders page to see it.");
}

// ---------- Home services ----------
function showServiceItems() {
  var cat = SERVICES[$("svc-cat").selectedIndex], html = "";
  for (var i = 0; i < cat.items.length; i++) {
    var it = cat.items[i];
    html += "<tr><td><input type='checkbox' class='svc-check' value='" + it.id + "' onchange='serviceTotal()'></td><td>" + it.name + "</td><td>" + (it.desc || "") + "</td><td>" + rs(it.price) + "</td></tr>";
  }
  $("svc-rows").innerHTML = html;
  serviceTotal();
}
function selectedServices() {
  var chosen = [], boxes = document.getElementsByClassName("svc-check");
  for (var i = 0; i < boxes.length; i++) {
    if (boxes[i].checked) {
      for (var c = 0; c < SERVICES.length; c++) {
        for (var k = 0; k < SERVICES[c].items.length; k++) { if (SERVICES[c].items[k].id == boxes[i].value) chosen.push(SERVICES[c].items[k]); }
      }
    }
  }
  return chosen;
}
function serviceTotal() {
  var sum = 0, list = selectedServices();
  for (var i = 0; i < list.length; i++) { sum += list[i].price; }
  $("svc-total").textContent = "Estimated total: " + rs(sum);
  return sum;
}
function startServices() {
  var opts = "";
  for (var i = 0; i < SERVICES.length; i++) { opts += "<option>" + SERVICES[i].emoji + " " + SERVICES[i].name + "</option>"; }
  $("svc-cat").innerHTML = opts;
  $("svc-cat").onchange = showServiceItems;
  showServiceItems();
}
function bookService() {
  var list = selectedServices();
  if (list.length == 0) { say("Please select at least one service.", true); return; }
  if ($("svc-address").value.trim() == "" || $("svc-date").value == "") { say("Please enter the address and date.", true); return; }
  var names = list.map(function (s) { return s.name; });
  newOrder("Service", names.join(", ") + " on " + $("svc-date").value + " (" + $("svc-slot").value + ")", serviceTotal());
  say("Service booked! Go to the Orders page to see it.");
}
