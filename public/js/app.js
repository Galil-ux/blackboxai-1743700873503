// Global state
let cart = [];
let products = [];

// DOM Elements
const searchInput = document.getElementById('search');
const clearSearchBtn = document.getElementById('clear-search');
const scanBarcodeBtn = document.getElementById('scan-barcode');
const viewCartBtn = document.getElementById('view-cart');
const cartCount = document.getElementById('cart-count');
const scannerContainer = document.getElementById('scanner-container');
const scannerVideo = document.getElementById('scanner-video');
const closeScannerBtn = document.getElementById('close-scanner');
const productsGrid = document.getElementById('products-grid');
const cartDrawer = document.getElementById('cart-drawer');
const closeCartBtn = document.getElementById('close-cart');
const cartItems = document.getElementById('cart-items');
const cartTotal = document.getElementById('cart-total');
const checkoutBtn = document.getElementById('checkout-btn');

// Initialize the app
async function init() {
  await fetchProducts();
  renderProducts();
  setupEventListeners();
}

// Fetch products from API
async function fetchProducts() {
  try {
    const response = await fetch('/api/products');
    products = await response.json();
  } catch (error) {
    console.error('Error fetching products:', error);
  }
}

// Render products to the grid
function renderProducts(filteredProducts = products) {
  productsGrid.innerHTML = filteredProducts.map(product => `
    <div class="product-card bg-white rounded-lg shadow-md overflow-hidden">
      <div class="h-48 bg-gray-200 overflow-hidden">
        <img src="${product.images[0] || 'https://images.pexels.com/photos/3561339/pexels-photo-3561339.jpeg'}" 
             alt="${product.name}" class="w-full h-full object-cover">
      </div>
      <div class="p-4">
        <h3 class="font-bold text-lg mb-1">${product.name}</h3>
        <p class="text-gray-600 mb-2">${product.variety.join(', ')}</p>
        <div class="flex justify-between items-center">
          <span class="font-bold text-blue-600">$${product.price.toFixed(2)}</span>
          <span class="text-sm ${product.stock < 5 ? 'text-red-500' : 'text-gray-500'}">
            ${product.stock} in stock
          </span>
        </div>
        <button class="add-to-cart mt-3 w-full py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg touch-target"
                data-id="${product._id}" ${product.stock === 0 ? 'disabled' : ''}>
          ${product.stock === 0 ? 'Out of stock' : 'Add to cart'}
        </button>
      </div>
    </div>
  `).join('');
}

// Setup event listeners
function setupEventListeners() {
  // Search functionality
  searchInput.addEventListener('input', () => {
    const searchTerm = searchInput.value.toLowerCase();
    const filtered = products.filter(p => 
      p.name.toLowerCase().includes(searchTerm) ||
      p.variety.some(v => v.toLowerCase().includes(searchTerm))
    );
    renderProducts(filtered);
  });

  clearSearchBtn.addEventListener('click', () => {
    searchInput.value = '';
    renderProducts();
  });

  // Cart functionality
  viewCartBtn.addEventListener('click', () => {
    cartDrawer.classList.remove('closed');
  });

  closeCartBtn.addEventListener('click', () => {
    cartDrawer.classList.add('closed');
  });

  // Barcode scanner
  scanBarcodeBtn.addEventListener('click', () => {
    scannerContainer.classList.remove('hidden');
    startBarcodeScanner();
  });

  closeScannerBtn.addEventListener('click', () => {
    scannerContainer.classList.add('hidden');
    stopBarcodeScanner();
  });

  // Checkout
  checkoutBtn.addEventListener('click', proceedToCheckout);

  // Delegate add to cart events
  productsGrid.addEventListener('click', (e) => {
    if (e.target.classList.contains('add-to-cart')) {
      const productId = e.target.dataset.id;
      addToCart(productId);
    }
  });
}

// Cart management
function addToCart(productId) {
  const product = products.find(p => p._id === productId);
  if (!product) return;

  const existingItem = cart.find(item => item.productId === productId);
  if (existingItem) {
    if (existingItem.quantity < product.stock) {
      existingItem.quantity++;
    } else {
      alert(`Only ${product.stock} items available in stock`);
      return;
    }
  } else {
    cart.push({
      productId,
      quantity: 1,
      name: product.name,
      price: product.price,
      image: product.images[0]
    });
  }

  updateCartUI();
}

function updateCartUI() {
  // Update cart count
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  cartCount.textContent = totalItems;
  cartCount.classList.toggle('hidden', totalItems === 0);

  // Update cart items list
  cartItems.innerHTML = cart.map(item => `
    <div class="flex items-center py-2 border-b">
      <img src="${item.image || 'https://images.pexels.com/photos/3561339/pexels-photo-3561339.jpeg'}" 
           class="w-12 h-12 object-cover rounded mr-3">
      <div class="flex-grow">
        <h4 class="font-medium">${item.name}</h4>
        <div class="flex items-center mt-1">
          <button class="decrease-quantity px-2 text-gray-500" data-id="${item.productId}">
            <i class="fas fa-minus"></i>
          </button>
          <span class="mx-2">${item.quantity}</span>
          <button class="increase-quantity px-2 text-gray-500" data-id="${item.productId}">
            <i class="fas fa-plus"></i>
          </button>
          <span class="ml-auto font-bold">$${(item.price * item.quantity).toFixed(2)}</span>
        </div>
      </div>
      <button class="remove-item ml-2 text-red-500" data-id="${item.productId}">
        <i class="fas fa-trash"></i>
      </button>
    </div>
  `).join('');

  // Update cart total
  const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  cartTotal.textContent = `$${total.toFixed(2)}`;

  // Add event listeners for cart item controls
  document.querySelectorAll('.decrease-quantity').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const productId = e.currentTarget.dataset.id;
      updateCartItemQuantity(productId, -1);
    });
  });

  document.querySelectorAll('.increase-quantity').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const productId = e.currentTarget.dataset.id;
      updateCartItemQuantity(productId, 1);
    });
  });

  document.querySelectorAll('.remove-item').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const productId = e.currentTarget.dataset.id;
      removeFromCart(productId);
    });
  });
}

function updateCartItemQuantity(productId, change) {
  const item = cart.find(i => i.productId === productId);
  if (!item) return;

  const product = products.find(p => p._id === productId);
  if (!product) return;

  const newQuantity = item.quantity + change;
  
  if (newQuantity < 1) {
    removeFromCart(productId);
    return;
  }

  if (newQuantity > product.stock) {
    alert(`Only ${product.stock} items available in stock`);
    return;
  }

  item.quantity = newQuantity;
  updateCartUI();
}

function removeFromCart(productId) {
  cart = cart.filter(item => item.productId !== productId);
  updateCartUI();
}

// Barcode scanner
function startBarcodeScanner() {
  navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
    .then(stream => {
      scannerVideo.srcObject = stream;
      // TODO: Add barcode scanning library integration
    })
    .catch(err => {
      console.error('Error accessing camera:', err);
      alert('Could not access camera. Please check permissions.');
      scannerContainer.classList.add('hidden');
    });
}

function stopBarcodeScanner() {
  const stream = scannerVideo.srcObject;
  if (stream) {
    stream.getTracks().forEach(track => track.stop());
    scannerVideo.srcObject = null;
  }
}

// Checkout process
async function proceedToCheckout() {
  if (cart.length === 0) {
    alert('Your cart is empty');
    return;
  }

  const paymentMethod = prompt('Select payment method:\n1. Cash\n2. Card\n3. M-Pesa');
  if (!paymentMethod) return;

  let paymentData = {};
  switch (paymentMethod.toLowerCase()) {
    case '1':
    case 'cash':
      paymentData.method = 'cash';
      break;
    case '2':
    case 'card':
      paymentData.method = 'card';
      break;
    case '3':
    case 'mpesa':
      paymentData.method = 'mpesa';
      paymentData.phone = prompt('Enter your M-Pesa phone number:');
      if (!paymentData.phone) return;
      break;
    default:
      alert('Invalid payment method');
      return;
  }

  try {
    const response = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: cart.map(item => ({
          productId: item.productId,
          quantity: item.quantity
        })),
        paymentMethod: paymentData.method,
        phone: paymentData.phone
      })
    });

    const result = await response.json();
    if (result.success) {
      alert(`Payment successful!\nTransaction ID: ${result.payment.transactionId}`);
      cart = [];
      updateCartUI();
      await fetchProducts();
      renderProducts();
      cartDrawer.classList.add('closed');
    } else {
      alert('Payment failed: ' + (result.message || 'Unknown error'));
    }
  } catch (error) {
    console.error('Checkout error:', error);
    alert('Error processing payment. Please try again.');
  }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', init);