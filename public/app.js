const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:5001'
  : window.location.origin;
const GST_RATE = 0.18;

let products = [];
let cart = [];

document.addEventListener('DOMContentLoaded', () => {
  const page = document.body.dataset.page;

  if (page === 'inventory') {
    initInventoryPage();
  }

  if (page === 'billing') {
    initBillingPage();
  }

  if (page === 'history') {
    initHistoryPage();
  }
});

function showLoading() {
  let loader = document.getElementById('global-loader');
  if (!loader) {
    loader = document.createElement('div');
    loader.id = 'global-loader';
    loader.style.position = 'fixed';
    loader.style.top = '0';
    loader.style.left = '0';
    loader.style.width = '100vw';
    loader.style.height = '100vh';
    loader.style.backgroundColor = 'rgba(255, 255, 255, 0.7)';
    loader.style.display = 'flex';
    loader.style.justifyContent = 'center';
    loader.style.alignItems = 'center';
    loader.style.zIndex = '9999';
    loader.style.fontSize = '1.5rem';
    loader.style.fontWeight = 'bold';
    loader.style.color = '#333';
    loader.textContent = 'Loading...';
    document.body.appendChild(loader);
  }
  loader.style.display = 'flex';
}

function hideLoading() {
  const loader = document.getElementById('global-loader');
  if (loader) {
    loader.style.display = 'none';
  }
}

async function apiRequest(path, options = {}) {
  showLoading();
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...options
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Something went wrong');
    }

    return data;
  } finally {
    hideLoading();
  }
}

async function loadProducts() {
  const result = await apiRequest('/products');
  products = result.data || [];
  return products;
}

function formatCurrency(value) {
  return `Rs. ${Number(value).toFixed(2)}`;
}

function printThermalBill(billData) {
  const dateObj = new Date(billData.date || billData.createdAt || new Date());
  const dateStr = dateObj.toLocaleDateString('en-GB');
  const timeStr = dateObj.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

  let itemsHtml = '';
  billData.items.forEach(item => {
    // If it's from the cart directly, itemTotal is called totalPrice, so we handle both cases
    const itemTotal = item.itemTotal !== undefined ? item.itemTotal : item.totalPrice;
    
    if (item.pricingType === 'unit') {
      itemsHtml += `
        <div>${item.name}</div>
        <div>Qty: ${item.quantity}  Price: ${(item.price || 0).toFixed(2)}</div>
        <div>Total: Rs. ${itemTotal.toFixed(2)}</div>
        <div class="line"></div>
      `;
    } else {
      itemsHtml += `
        <div>${item.name} (${item.length || 0} x ${item.breadth || 0})</div>
        <div>Qty: ${item.quantity}  Rate: ${(item.rate || 0).toFixed(2)}/sqft</div>
        <div>Total: Rs. ${itemTotal.toFixed(2)}</div>
        <div class="line"></div>
      `;
    }
  });

  const billHtml = `
    <html>
    <head>
      <title>Bill</title>
      <style>
        body { width: 80mm; font-family: monospace; font-size: 12px; margin: 0; padding: 10px; }
        .center { text-align: center; }
        .line { border-top: 1px dashed black; margin: 6px 0; }
      </style>
    </head>
    <body>
      <div class="center"><h3>RAJ PLYWOOD CO.</h3></div>
      <div class="line"></div>
      <div>Date: ${dateStr}  Time: ${timeStr}</div>
      <div class="line"></div>
      <br>${itemsHtml}<br>
      <div>Subtotal: Rs. ${billData.subtotal.toFixed(2)}</div>
      <div>GST (18%): Rs. ${billData.gst.toFixed(2)}</div>
      <div>Delivery: Rs. ${billData.deliveryFee.toFixed(2)}</div>
      <div class="line"></div>
      <div><strong>TOTAL: Rs. ${(billData.totalAmount || billData.grandTotal || 0).toFixed(2)}</strong></div>
      <div class="line"></div>
      <div class="center" style="margin-top: 15px;">Thank you for your visit!</div>
    </body>
    </html>
  `;

  const printWindow = window.open('', '_blank');
  printWindow.document.write(billHtml);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 250);
}

// ---------------------
// Inventory Page
// ---------------------
async function initInventoryPage() {
  const searchInput = document.getElementById('inventorySearch');
  const tableBody = document.getElementById('inventoryTableBody');
  const modal = document.getElementById('productModal');
  const openBtn = document.getElementById('openProductModalBtn');
  const closeBtn = document.getElementById('closeProductModalBtn');
  const form = document.getElementById('productForm');
  const modalTitle = document.getElementById('productModalTitle');
  const productIdInput = document.getElementById('productId');

  async function refreshTable() {
    try {
      await loadProducts();
      renderInventoryTable(products, tableBody);
    } catch (error) {
      alert(error.message);
    }
  }

  function openModalForAdd() {
    form.reset();
    productIdInput.value = '';
    modalTitle.textContent = 'Add Product';
    modal.classList.remove('hidden');
  }

  function openModalForEdit(product) {
    productIdInput.value = product._id;
    document.getElementById('name').value = product.name;
    document.getElementById('category').value = product.category;
    document.getElementById('brand').value = product.brand;
    document.getElementById('thickness').value = product.thickness;
    document.getElementById('pricingType').value = product.pricingType || 'area';
    document.getElementById('length').value = product.length || '';
    document.getElementById('breadth').value = product.breadth || '';
    document.getElementById('purchasePrice').value = product.purchasePrice;
    document.getElementById('sellingPrice').value = product.sellingPrice;
    document.getElementById('quantity').value = product.quantity;
    modalTitle.textContent = 'Edit Product';
    modal.classList.remove('hidden');
  }

  openBtn.addEventListener('click', openModalForAdd);
  closeBtn.addEventListener('click', () => modal.classList.add('hidden'));

  searchInput.addEventListener('input', () => {
    const keyword = searchInput.value.trim().toLowerCase();

    const filtered = products.filter((product) => {
      return (
        product.name.toLowerCase().includes(keyword) ||
        product.category.toLowerCase().includes(keyword) ||
        product.brand.toLowerCase().includes(keyword) ||
        (product.size && product.size.toLowerCase().includes(keyword))
      );
    });

    renderInventoryTable(filtered, tableBody);
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const payload = {
      name: document.getElementById('name').value.trim(),
      category: document.getElementById('category').value.trim(),
      brand: document.getElementById('brand').value.trim(),
      thickness: document.getElementById('thickness').value.trim(),
      pricingType: document.getElementById('pricingType').value,
      length: Number(document.getElementById('length').value) || 0,
      breadth: Number(document.getElementById('breadth').value) || 0,
      purchasePrice: Number(document.getElementById('purchasePrice').value),
      sellingPrice: Number(document.getElementById('sellingPrice').value),
      quantity: Number(document.getElementById('quantity').value)
    };

    const productId = productIdInput.value;

    try {
      if (productId) {
        await apiRequest(`/products/${productId}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
      } else {
        await apiRequest('/products', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
      }

      modal.classList.add('hidden');
      await refreshTable();
      document.getElementById('inventorySearch').focus();
    } catch (error) {
      alert(error.message);
    }
  });

  tableBody.addEventListener('click', async (event) => {
    const action = event.target.dataset.action;
    const productId = event.target.dataset.id;

    if (!action || !productId) {
      return;
    }

    if (action === 'edit') {
      const product = products.find((item) => item._id === productId);
      if (product) {
        openModalForEdit(product);
      }
      return;
    }

    if (action === 'delete') {
      const confirmed = confirm('Are you sure you want to delete this product?');
      if (!confirmed) {
        return;
      }

      try {
        await apiRequest(`/products/${productId}`, { method: 'DELETE' });
        await refreshTable();
      } catch (error) {
        alert(error.message);
      }
    }
  });

  await refreshTable();
}

function renderInventoryTable(items, tableBody) {
  if (!items.length) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="9" class="empty-state">No products found.</td>
      </tr>
    `;
    return;
  }

  tableBody.innerHTML = items
    .map((item) => {
      return `
        <tr>
          <td>${item.name}</td>
          <td>${item.category}</td>
          <td>${item.brand}</td>
          <td>${item.thickness}</td>
          <td>${item.pricingType === 'unit' ? 'N/A' : `${item.length} × ${item.breadth}`}</td>
          <td>${formatCurrency(item.purchasePrice)}</td>
          <td>${formatCurrency(item.sellingPrice)}</td>
          <td>${item.quantity}</td>
          <td>
            <div class="action-row">
              <button class="btn btn-light btn-sm" data-action="edit" data-id="${item._id}">Edit</button>
              <button class="btn btn-danger btn-sm" data-action="delete" data-id="${item._id}">Delete</button>
            </div>
          </td>
        </tr>
      `;
    })
    .join('');
}

// ---------------------
// Billing Page
// ---------------------
async function initBillingPage() {
  const searchInput = document.getElementById('billingSearch');
  const productListEl = document.getElementById('billingProductList');
  const cartItemsEl = document.getElementById('cartItems');
  const totalPriceEl = document.getElementById('totalPrice');
  const gstToggle = document.getElementById('gstToggle');
  const deliveryFeeInput = document.getElementById('deliveryFee');
  const generateBillBtn = document.getElementById('generateBillBtn');

  async function refreshProducts() {
    try {
      await loadProducts();
      renderBillingProducts(products, productListEl);
    } catch (error) {
      alert(error.message);
    }
  }

  function updateTotals() {
    const subtotal = cart.reduce((sum, item) => sum + item.totalPrice, 0);
    const gst = gstToggle.checked ? subtotal * GST_RATE : 0;
    const deliveryFee = Number(deliveryFeeInput.value) || 0;
    const total = subtotal + gst + deliveryFee;
    totalPriceEl.textContent = formatCurrency(total);
    generateBillBtn.disabled = cart.length === 0;
  }

  function syncCartWithStock() {
    cart = cart.filter((cartItem) => {
      const product = products.find((p) => p._id === cartItem.productId);
      if (!product) {
        return false;
      }
      if (cartItem.quantity > product.quantity) {
        cartItem.quantity = product.quantity;
      }
      return cartItem.quantity > 0;
    });
  }

  function renderCart() {
    if (!cart.length) {
      cartItemsEl.innerHTML = '<div class="empty-state">Cart is empty.</div>';
      updateTotals();
      return;
    }

    cartItemsEl.innerHTML = cart
      .map((item) => {
        return `
          <div class="cart-item">
            <div style="flex: 1;">
              <strong>${item.name}</strong>
              <div class="product-meta">${item.pricingType === 'unit' ? 'Unit Product' : `${item.length} × ${item.breadth}`}</div>
            </div>
            
            <div style="width: 100px;">
              <label style="font-size: 0.75rem; color: var(--muted); gap: 0.1rem; font-weight: normal;">
                ${item.pricingType === 'unit' ? 'Price/Unit' : 'Rate/sq.ft'}
                <input type="number" data-action="${item.pricingType === 'unit' ? 'update-price' : 'update-rate'}" data-id="${item.productId}" value="${item.pricingType === 'unit' ? item.price : item.rate}" min="0" step="0.01" style="padding: 0.4rem; font-size: 0.9rem;" />
              </label>
            </div>

            <div class="qty-controls">
              <button class="qty-btn" data-action="decrease" data-id="${item.productId}">-</button>
              <strong>${item.quantity}</strong>
              <button class="qty-btn" data-action="increase" data-id="${item.productId}">+</button>
            </div>
            
            <div style="min-width: 80px; text-align: right;">
              <strong id="item-total-${item.productId}">${formatCurrency(item.totalPrice)}</strong>
            </div>
          </div>
        `;
      })
      .join('');

    updateTotals();
  }

  function addToCart(productId) {
    const product = products.find((item) => item._id === productId);
    if (!product) {
      return;
    }

    if (product.quantity <= 0) {
      alert('Insufficient stock for this product.');
      return;
    }

    const existingItem = cart.find((item) => item.productId === productId);

    if (existingItem) {
      if (existingItem.quantity >= product.quantity) {
        alert('Cannot add more than available stock.');
        return;
      }
      existingItem.quantity += 1;
      existingItem.totalPrice = existingItem.pricingType === 'unit' 
        ? existingItem.price * existingItem.quantity 
        : existingItem.area * existingItem.rate * existingItem.quantity;
    } else {
      const rateOrPrice = product.sellingPrice || 0;
      const pricingType = product.pricingType || 'area';
      const isArea = pricingType === 'area';
      const area = isArea ? (product.length * product.breadth) : 1;
      
      cart.push({
        productId: product._id,
        name: product.name,
        pricingType: pricingType,
        length: product.length,
        breadth: product.breadth,
        rate: isArea ? rateOrPrice : 0,
        price: isArea ? 0 : rateOrPrice,
        area: area,
        quantity: 1,
        totalPrice: isArea ? (area * rateOrPrice * 1) : (rateOrPrice * 1),
        sellingPrice: product.sellingPrice
      });
    }

    renderCart();
  }

  function updateRate(productId, newRateStr) {
    const rate = Number(newRateStr);
    if (isNaN(rate) || rate < 0) return;
    
    const cartItem = cart.find(item => item.productId === productId);
    if (!cartItem) return;
    
    cartItem.rate = rate;
    cartItem.totalPrice = cartItem.area * cartItem.rate * cartItem.quantity;
    
    const itemTotalEl = document.getElementById(`item-total-${productId}`);
    if (itemTotalEl) {
      itemTotalEl.textContent = formatCurrency(cartItem.totalPrice);
    }
    updateTotals();
  }

  function updatePrice(productId, newPriceStr) {
    const price = Number(newPriceStr);
    if (isNaN(price) || price < 0) return;
    
    const cartItem = cart.find(item => item.productId === productId);
    if (!cartItem) return;
    
    cartItem.price = price;
    cartItem.totalPrice = cartItem.price * cartItem.quantity;
    
    const itemTotalEl = document.getElementById(`item-total-${productId}`);
    if (itemTotalEl) {
      itemTotalEl.textContent = formatCurrency(cartItem.totalPrice);
    }
    updateTotals();
  }

  function changeCartQuantity(productId, action) {
    const cartItem = cart.find((item) => item.productId === productId);
    const product = products.find((item) => item._id === productId);

    if (!cartItem || !product) {
      return;
    }

    if (action === 'increase') {
      if (cartItem.quantity >= product.quantity) {
        alert('Cannot add more than available stock.');
        return;
      }
      cartItem.quantity += 1;
      cartItem.totalPrice = cartItem.pricingType === 'unit' 
        ? cartItem.price * cartItem.quantity 
        : cartItem.area * cartItem.rate * cartItem.quantity;
    }

    if (action === 'decrease') {
      cartItem.quantity -= 1;
      if (cartItem.quantity <= 0) {
        cart = cart.filter((item) => item.productId !== productId);
      } else {
        cartItem.totalPrice = cartItem.pricingType === 'unit' 
          ? cartItem.price * cartItem.quantity 
          : cartItem.area * cartItem.rate * cartItem.quantity;
      }
    }

    renderCart();
  }

  function renderBillingProducts(items, container) {
    if (!items.length) {
      container.innerHTML = '<div class="empty-state">No products available.</div>';
      return;
    }

    container.innerHTML = items
      .map((item) => {
        return `
          <div class="product-item">
            <div>
              <strong>${item.name}</strong>
              <span class="product-meta">
                ${item.brand} | ${item.pricingType === 'unit' ? 'Unit' : `${item.length}×${item.breadth}`} | Stock: ${item.quantity}
              </span>
            </div>
            <button class="btn btn-light" data-action="add-to-cart" data-id="${item._id}">Add</button>
          </div>
        `;
      })
      .join('');
  }

  searchInput.addEventListener('input', () => {
    const keyword = searchInput.value.trim().toLowerCase();
    const filtered = products.filter((product) => {
      return (
        product.name.toLowerCase().includes(keyword) ||
        product.brand.toLowerCase().includes(keyword) ||
        product.category.toLowerCase().includes(keyword) ||
        (product.size && product.size.toLowerCase().includes(keyword))
      );
    });
    renderBillingProducts(filtered, productListEl);
  });

  productListEl.addEventListener('click', (event) => {
    if (event.target.dataset.action === 'add-to-cart') {
      addToCart(event.target.dataset.id);
    }
  });

  cartItemsEl.addEventListener('click', (event) => {
    const action = event.target.dataset.action;
    const id = event.target.dataset.id;
    if (action === 'increase' || action === 'decrease') {
      changeCartQuantity(id, action);
    }
  });

  cartItemsEl.addEventListener('input', (event) => {
    const action = event.target.dataset.action;
    const id = event.target.dataset.id;
    if (action === 'update-rate') {
      updateRate(id, event.target.value);
    } else if (action === 'update-price') {
      updatePrice(id, event.target.value);
    }
  });

  gstToggle.addEventListener('change', updateTotals);
  deliveryFeeInput.addEventListener('input', updateTotals);

  generateBillBtn.addEventListener('click', async () => {
    if (!cart.length) {
      alert('Cart is empty.');
      return;
    }

    try {
      const payload = {
        items: cart.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          pricingType: item.pricingType,
          rate: item.rate,
          price: item.price
        })),
        deliveryFee: Number(deliveryFeeInput.value) || 0,
        applyGst: gstToggle.checked
      };

      const response = await apiRequest('/bill', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      // The backend returns the saved Bill object directly under response.data
      printThermalBill(response.data);

      cart = [];
      gstToggle.checked = false;
      deliveryFeeInput.value = 0;
      await refreshProducts();
      syncCartWithStock();
      renderCart();
      renderBillingProducts(products, productListEl);
    } catch (error) {
      alert(error.message);
    }
  });

  await refreshProducts();
  renderCart();
}

// ---------------------
// History Page
// ---------------------
async function initHistoryPage() {
  const tableBody = document.getElementById('historyTableBody');
  const filterSelect = document.getElementById('historyFilter');
  let bills = [];

  async function refreshHistory() {
    try {
      const result = await apiRequest('/bills');
      bills = result.data || [];
      renderHistoryTable();
    } catch (error) {
      alert(error.message);
    }
  }

  function renderHistoryTable() {
    const filter = filterSelect.value;
    let filteredBills = bills;

    if (filter === 'today') {
      const today = new Date().toDateString();
      filteredBills = bills.filter(bill => new Date(bill.createdAt || bill.date).toDateString() === today);
    }

    if (!filteredBills.length) {
      tableBody.innerHTML = `<tr><td colspan="4" class="empty-state">No bills found.</td></tr>`;
      return;
    }

    tableBody.innerHTML = filteredBills.map((bill, index) => {
      const dateObj = new Date(bill.createdAt || bill.date);
      const dateStr = dateObj.toLocaleDateString('en-GB') + ' ' + dateObj.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
      const totalItems = bill.items.reduce((sum, item) => sum + item.quantity, 0);

      return `
        <tr>
          <td>${dateStr}</td>
          <td>${totalItems}</td>
          <td><strong>${formatCurrency(bill.totalAmount)}</strong></td>
          <td>
            <button class="btn btn-light btn-sm" data-action="view-bill" data-index="${index}">View</button>
          </td>
        </tr>
      `;
    }).join('');
  }

  filterSelect.addEventListener('change', renderHistoryTable);

  tableBody.addEventListener('click', (event) => {
    if (event.target.dataset.action === 'view-bill') {
      const index = event.target.dataset.index;
      
      const filter = filterSelect.value;
      let filteredBills = bills;
      if (filter === 'today') {
        const today = new Date().toDateString();
        filteredBills = bills.filter(bill => new Date(bill.createdAt || bill.date).toDateString() === today);
      }

      const bill = filteredBills[index];
      if (bill) {
        printThermalBill(bill);
      }
    }
  });

  await refreshHistory();
}
