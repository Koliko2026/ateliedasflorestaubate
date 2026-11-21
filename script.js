const SUPABASE_URL = 'https://rnambehchlgavkrbvhsp.supabase.co';
const SUPABASE_KEY = 'sb_publishable_NLMsqyUXIkLSZCR_IkbL_Q_aJaifSER';
const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let cards = [];
let productsData = [];
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

const fallbackProducts = [
  {
    id: 1,
    nome: 'Buquê Aurora',
    descricao: 'Rosas suaves e folhagens em uma composição delicada.',
    preco: 189.00,
    categoria: 'buques',
    imagem_url: 'assets/buque-aurora.webp',
    disponivel: true
  },
  {
    id: 2,
    nome: 'Buquê Luz do Dia',
    descricao: 'Girassóis e flores leves para iluminar o momento.',
    preco: 149.00,
    categoria: 'buques',
    imagem_url: 'assets/buque-sol.webp',
    disponivel: true
  },
  {
    id: 3,
    nome: 'Arranjo Sereno',
    descricao: 'Flores claras em vaso para uma presença elegante.',
    preco: 219.00,
    categoria: 'arranjos',
    imagem_url: 'assets/arranjo-sereno.webp',
    disponivel: true
  },
  {
    id: 4,
    nome: 'Cesta Afeto',
    descricao: 'Flores e pequenos mimos para surpreender com carinho.',
    preco: 249.00,
    categoria: 'cestas',
    imagem_url: 'assets/cesta-afeto.webp',
    disponivel: true
  }
];

const categoryLabels = {
  buques: 'BUQUÊ',
  arranjos: 'ARRANJO',
  cestas: 'CESTA'
};

function announce(message) {
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 4000);
}

function applyFilters() {
  const query = normalize(searchInput.value.trim());
  let visible = 0;
  cards.forEach(card => {
    const categoryMatch = activeFilter === 'todos' || card.dataset.category === activeFilter;
    const textMatch = normalize(`${card.dataset.name} ${card.querySelector('.product-info p').textContent} ${card.dataset.category}`).includes(query);
    const show = categoryMatch && textMatch;
    card.hidden = !show;
    if (show) visible++;
  });
  document.querySelector('#product-grid').classList.toggle('single-result', visible === 1);
  document.querySelector('#empty-results').hidden = cards.length > 0 && visible > 0 ? true : (cards.length === 0);
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
searchInput.addEventListener('input', () => selectFilter('todos'));
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

document.querySelector('.gallery-close').addEventListener('click', () => gallery.close());
document.querySelector('.gallery-prev').addEventListener('click', () => moveGallery(-1));
document.querySelector('.gallery-next').addEventListener('click', () => moveGallery(1));
gallery.addEventListener('click', event => { if (event.target === gallery) gallery.close(); });
gallery.addEventListener('keydown', event => {
  if (event.key === 'ArrowLeft') moveGallery(-1);
  if (event.key === 'ArrowRight') moveGallery(1);
});

function productById(id) { return cards.find(card => String(card.dataset.id) === String(id)); }

function addItem(id) {
  const key = String(id);
  cart.set(key, (cart.get(key) || 0) + 1);
  renderCart();
  announce(`${productById(key).dataset.name} adicionado ao carrinho.`);
}

function cartItemMarkup(id, quantity) {
  const product = productById(id);
  if (!product) return '';
  const name = product.dataset.name;
  return `<div class="cart-item" data-id="${id}">
    <img src="${product.dataset.image}" alt="" />
    <div class="cart-item-content"><strong>${name}</strong><span>${money(Number(product.dataset.price) * quantity)}</span>
    <div class="cart-qty"><button type="button" data-action="decrease" aria-label="Diminuir quantidade de ${name}">−</button><span>${quantity}</span><button type="button" data-action="increase" aria-label="Aumentar quantidade de ${name}">+</button><button class="remove-item" type="button" data-action="remove">Remover</button></div></div>
  </div>`;
}

function renderCart() {
  const count = [...cart.values()].reduce((sum, quantity) => sum + quantity, 0);
  const total = [...cart].reduce((sum, [id, quantity]) => {
    const p = productById(id);
    return sum + (p ? Number(p.dataset.price) * quantity : 0);
  }, 0);
  document.querySelector('.cart-count').textContent = count;
  document.querySelector('#cart-heading-count').textContent = `(${count})`;
  document.querySelector('#cart-total').textContent = money(total);
  document.querySelector('#cart-items').innerHTML = count
    ? [...cart].map(([id, quantity]) => cartItemMarkup(id, quantity)).join('')
    : '<div class="cart-empty"><svg><use href="#i-bag"/></svg><h3>Seu carrinho está vazio</h3><p>Encontre uma composição para começar um gesto especial.</p></div>';
  document.querySelector('#checkout-form').style.display = count > 0 ? 'flex' : 'none';
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

document.querySelector('.checkout-button').addEventListener('click', async () => {
  const nome = document.querySelector('#cliente-nome').value.trim();
  const whatsapp = document.querySelector('#cliente-whatsapp').value.trim();
  const obs = document.querySelector('#cliente-obs').value.trim();

  if (!nome || !whatsapp) {
    announce('Por favor, preencha seu nome e WhatsApp.');
    return;
  }

  const btn = document.querySelector('.checkout-button');
  btn.disabled = true;
  btn.textContent = 'Enviando pedido...';

  const itensResumo = [...cart].map(([id, qtd]) => `${qtd}x ${productById(id).dataset.name}`).join(', ');
  const total = [...cart].reduce((sum, [id, qtd]) => sum + Number(productById(id).dataset.price) * qtd, 0);

  const { error } = await db.from('pedidos').insert([{
    cliente_nome: nome,
    cliente_whatsapp: whatsapp,
    produto_nome: itensResumo,
    valor: total,
    observacoes: obs,
    status: 'Pendente'
  }]);

  btn.disabled = false;
  btn.textContent = 'Enviar pedido ao ateliê';

  if (error) {
    announce('Erro ao enviar pedido. Tente novamente.');
    return;
  }

  cart.clear();
  document.querySelector('#cliente-nome').value = '';
  document.querySelector('#cliente-whatsapp').value = '';
  document.querySelector('#cliente-obs').value = '';
  renderCart();
  cartDialog.close();
  announce('Pedido enviado com sucesso! Em breve falaremos com você no WhatsApp.');
});

async function loadProducts() {
  const defaultProducts = [
    {
      id: 1,
      nome: 'Buquê Aurora',
      categoria: 'buques',
      preco: 189,
      descricao: 'Rosas claras e folhagens frescas do dia.',
      imagem_url: 'assets/buque-aurora.webp',
      disponivel: true
    },
    {
      id: 2,
      nome: 'Buquê Luz do Dia',
      categoria: 'buques',
      preco: 165,
      descricao: 'Flores solares com acabamento artesanal.',
      imagem_url: 'assets/buque-sol.webp',
      disponivel: true
    },
    {
      id: 3,
      nome: 'Arranjo Sereno',
      categoria: 'arranjos',
      preco: 210,
      descricao: 'Composição equilibrada para mesa ou presente.',
      imagem_url: 'assets/arranjo-sereno.webp',
      disponivel: true
    },
    {
      id: 4,
      nome: 'Cesta Afeto',
      categoria: 'cestas',
      preco: 245,
      descricao: 'Seleção especial para celebrar momentos marcantes.',
      imagem_url: 'assets/cesta-afeto.webp',
      disponivel: true
    }
  ];

  const grid =
    document.querySelector('#product-grid') ||
    document.querySelector('#catalog-grid') ||
    document.querySelector('.products-grid') ||
    document.querySelector('[data-catalog]');

  const formatPrice = (val) => {
    if (typeof money === 'function') return money(Number(val || 0));
    return 'R$ ' + Number(val || 0).toFixed(2).replace('.', ',');
  };

  const renderList = (list) => {
    const items = (Array.isArray(list) && list.length > 0) ? list : defaultProducts;
    if (typeof productsData !== 'undefined') {
      productsData = items;
    }
    if (typeof renderCards === 'function') {
      renderCards(items);
    }
    if (grid) {
      grid.innerHTML = items.map(item => {
        const cat = String(item.categoria || 'buques').toLowerCase();
        const img = item.imagem_url || 'assets/buque-aurora.webp';
        return `
          <article class="product-card" data-category="${cat}" data-id="${item.id}" data-name="${item.nome}" data-price="${Number(item.preco || 0)}" data-image="${img}">
            <div class="product-image">
              <img src="${img}" alt="${item.nome}" loading="lazy" />
            </div>
            <div class="product-body">
              <span class="product-category">${cat}</span>
              <h3>${item.nome}</h3>
              <p>${item.descricao || ''}</p>
              <div class="product-footer">
                <strong>${formatPrice(item.preco)}</strong>
                <button type="button" class="button button-small" onclick="addItem(${item.id})">Adicionar</button>
              </div>
            </div>
          </article>
        `;
      }).join('');
      if (typeof cards !== 'undefined') {
        cards = [...grid.querySelectorAll('.product-card')];
      }
    }
  };

  // Mostra os produtos na hora para nunca ficar preso em "Carregando..."
  renderList(defaultProducts);

  // Tenta atualizar com o Supabase sem travar a tela
  try {
    if (typeof db !== 'undefined' && db && typeof db.from === 'function') {
      const { data, error } = await db
        .from('produtos')
        .select('*')
        .eq('disponivel', true)
        .order('id', { ascending: true });

      if (!error && Array.isArray(data) && data.length > 0) {
        renderList(data);
      }
    }
  } catch (err) {
    // Mantém os produtos já exibidos na tela
  }
}

renderCart();
loadProducts();
