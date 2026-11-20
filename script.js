const cards = [...document.querySelectorAll('.product-card')];
const filters = [...document.querySelectorAll('.filter')];
const searchPanel = document.querySelector('#search-panel');
const searchInput = document.querySelector('#product-search');
const searchToggle = document.querySelector('.search-toggle');
const mobileNav = document.querySelector('#mobile-nav');
const menuToggle = document.querySelector('.menu-toggle');
const gallery = document.querySelector('#gallery-dialog');
const cartDialog = document.querySelector('#cart-dialog');
const toast = document.querySelector('#toast');
const cart = new Map();
let activeFilter = 'todos';
let galleryIndex = 0;
let toastTimer;

document.querySelector('#year').textContent = new Date().getFullYear();

const money = value => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
const normalize = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR');

function announce(message) {
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 3300);
}

function applyFilters() {
  const query = normalize(searchInput.value.trim());
  let visible = 0;
  cards.forEach(card => {
    const categoryMatch = activeFilter === 'todos' || card.dataset.category === activeFilter;
    const textMatch = normalize(`${card.dataset.name} ${card.querySelector('.product-info p').textContent} ${card.dataset.category} ${card.dataset.search || ''}`).includes(query);
    const show = categoryMatch && textMatch;
    card.hidden = !show;
    if (show) visible++;
  });
  document.querySelector('#product-grid').classList.toggle('single-result', visible === 1);
  document.querySelector('#empty-results').hidden = visible > 0;
  document.querySelector('#search-count').textContent = query ? `${visible} ${visible === 1 ? 'resultado' : 'resultados'}` : '';
}

function selectFilter(name) {
  activeFilter = name;
  filters.forEach(button => {
    const selected = button.dataset.filter === name;
    button.classList.toggle('active', selected);
    button.setAttribute('aria-pressed', String(selected));
  });
  applyFilters();
}

filters.forEach(button => button.addEventListener('click', () => selectFilter(button.dataset.filter)));
document.querySelectorAll('[data-filter-link]').forEach(link => link.addEventListener('click', () => {
  searchInput.value = '';
  selectFilter(link.dataset.filterLink);
}));
searchInput.addEventListener('input', () => {
  selectFilter('todos');
});
searchInput.addEventListener('keydown', event => {
  if (event.key === 'Enter') document.querySelector('#colecao').scrollIntoView({ behavior: 'smooth' });
});

function setSearch(open) {
  searchPanel.hidden = !open;
  searchToggle.setAttribute('aria-expanded', String(open));
  if (open) {
    setMenu(false);
    searchInput.focus();
  } else if (searchInput.value) {
    searchInput.value = '';
    applyFilters();
  }
}

function setMenu(open) {
  mobileNav.hidden = !open;
  menuToggle.setAttribute('aria-expanded', String(open));
  menuToggle.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
}

searchToggle.addEventListener('click', () => setSearch(searchPanel.hidden));
document.querySelector('.search-close').addEventListener('click', () => setSearch(false));
menuToggle.addEventListener('click', () => {
  setSearch(false);
  setMenu(mobileNav.hidden);
});
mobileNav.querySelectorAll('a').forEach(link => link.addEventListener('click', () => setMenu(false)));
window.addEventListener('resize', () => { if (window.innerWidth > 800) setMenu(false); });

function renderGallery() {
  const card = cards[galleryIndex];
  const image = card.querySelector('.product-image img');
  document.querySelector('#gallery-image').src = card.dataset.image;
  document.querySelector('#gallery-image').alt = image.alt;
  document.querySelector('#gallery-category').textContent = card.querySelector('.product-category').textContent;
  document.querySelector('#gallery-title').textContent = card.dataset.name;
  document.querySelector('#gallery-position').textContent = `${galleryIndex + 1} de ${cards.length}`;
}

function moveGallery(direction) {
  galleryIndex = (galleryIndex + direction + cards.length) % cards.length;
  renderGallery();
}

cards.forEach((card, index) => {
  card.querySelector('.product-image').addEventListener('click', () => {
    galleryIndex = index;
    renderGallery();
    gallery.showModal();
  });
  card.querySelector('.add-button').addEventListener('click', () => addItem(card.dataset.id));
});

document.querySelector('.gallery-close').addEventListener('click', () => gallery.close());
document.querySelector('.gallery-prev').addEventListener('click', () => moveGallery(-1));
document.querySelector('.gallery-next').addEventListener('click', () => moveGallery(1));
gallery.addEventListener('click', event => { if (event.target === gallery) gallery.close(); });
gallery.addEventListener('keydown', event => {
  if (event.key === 'ArrowLeft') moveGallery(-1);
  if (event.key === 'ArrowRight') moveGallery(1);
});

function productById(id) { return cards.find(card => card.dataset.id === id); }

function addItem(id) {
  cart.set(id, (cart.get(id) || 0) + 1);
  renderCart();
  announce(`${productById(id).dataset.name} adicionado ao carrinho.`);
}

function cartItemMarkup(id, quantity) {
  const product = productById(id);
  const name = product.dataset.name;
  return `<div class="cart-item" data-id="${id}">
    <img src="${product.dataset.image}" alt="" />
    <div class="cart-item-content"><strong>${name}</strong><span>${money(Number(product.dataset.price) * quantity)}</span>
    <div class="cart-qty"><button type="button" data-action="decrease" aria-label="Diminuir quantidade de ${name}">−</button><span>${quantity}</span><button type="button" data-action="increase" aria-label="Aumentar quantidade de ${name}">+</button><button class="remove-item" type="button" data-action="remove">Remover</button></div></div>
  </div>`;
}

function renderCart() {
  const count = [...cart.values()].reduce((sum, quantity) => sum + quantity, 0);
  const total = [...cart].reduce((sum, [id, quantity]) => sum + Number(productById(id).dataset.price) * quantity, 0);
  document.querySelector('.cart-count').textContent = count;
  document.querySelector('#cart-heading-count').textContent = `(${count})`;
  document.querySelector('#cart-total').textContent = money(total);
  document.querySelector('#cart-items').innerHTML = count
    ? [...cart].map(([id, quantity]) => cartItemMarkup(id, quantity)).join('')
    : '<div class="cart-empty"><svg><use href="#i-bag"/></svg><h3>Seu carrinho está vazio</h3><p>Encontre uma composição para começar um gesto especial.</p></div>';
  document.querySelector('.checkout-button').disabled = count === 0;
}

document.querySelector('#cart-items').addEventListener('click', event => {
  const button = event.target.closest('button[data-action]');
  if (!button) return;
  const id = button.closest('.cart-item').dataset.id;
  const action = button.dataset.action;
  if (action === 'remove') cart.delete(id);
  if (action === 'increase') cart.set(id, cart.get(id) + 1);
  if (action === 'decrease') {
    const next = cart.get(id) - 1;
    if (next === 0) cart.delete(id); else cart.set(id, next);
  }
  renderCart();
});

document.querySelectorAll('.cart-trigger,.footer-cart').forEach(button => button.addEventListener('click', () => {
  renderCart();
  cartDialog.showModal();
}));
document.querySelector('.cart-close').addEventListener('click', () => cartDialog.close());
document.querySelector('.cart-continue').addEventListener('click', () => cartDialog.close());
cartDialog.addEventListener('click', event => { if (event.target === cartDialog) cartDialog.close(); });
document.querySelector('.checkout-button').addEventListener('click', () => announce('Esta é uma prévia. O atendimento e a finalização do pedido serão configurados após a aprovação.'));

renderCart();
