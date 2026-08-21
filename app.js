/* かんばんボード: 本を異なるステータスリストに移動 */
const STORAGE_KEY = 'kanban_books_v2'
let currentStatus = null
let editingIndex = null

function getBooks(){
  try{
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []
  }catch(e){
    console.error('failed to parse books', e)
    return []
  }
}

function saveBooks(books){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(books))
}

function renderKanban(){
  const statuses = ['積読', '読了', '搬入する', '搬入済み', '売れた']
  const books = getBooks()
  
  statuses.forEach(status => {
    const container = document.querySelector(`[data-status="${status}"]`)
    container.innerHTML = ''
    
    const booksInStatus = books.filter(b => b.status === status)
    
    booksInStatus.forEach((b, idx) => {
      const bookIdx = books.indexOf(b)
      const card = createCard(b, bookIdx)
      container.appendChild(card)
    })
    
    // 各リストの一番下に「本を追加」カードを追加
    const addCard = document.createElement('div')
    addCard.className = 'kanban-card add-card'
    addCard.textContent = '+ 本を追加'
    addCard.addEventListener('click', () => {
      currentStatus = status
      openAddModal()
    })
    container.appendChild(addCard)
    
    // カードがない場合は「本がありません」を表示
    if(booksInStatus.length === 0){
      const empty = document.createElement('div')
      empty.className = 'empty-state'
      empty.textContent = '本がありません'
      container.insertBefore(empty, container.firstChild)
    }
  })
}

function createCard(book, idx){
  const card = document.createElement('div')
  card.className = 'kanban-card'
  card.draggable = true
  card.dataset.index = idx
  
  const title = document.createElement('div')
  title.className = 'card-title'
  title.textContent = escapeHtml(book.title)
  
  const meta = document.createElement('div')
  meta.className = 'card-meta'
  
  const costSpan = document.createElement('span')
  costSpan.className = 'editable-field'
  costSpan.dataset.field = 'cost'
  costSpan.dataset.index = idx
  costSpan.textContent = book.cost ? `¥${Number(book.cost).toLocaleString()}` : '¥—'
  costSpan.title = 'クリックで編集'
  
  const priceSpan = document.createElement('span')
  priceSpan.className = 'editable-field'
  priceSpan.dataset.field = 'price'
  priceSpan.dataset.index = idx
  priceSpan.textContent = book.price ? `¥${Number(book.price).toLocaleString()}` : '¥—'
  priceSpan.title = 'クリックで編集'
  
  const profitAmount = (book.cost !== undefined && book.price !== undefined && book.cost !== null && book.price !== null) 
    ? book.price - book.cost 
    : null
  const profitClass = profitAmount !== null && profitAmount >= 0 ? 'positive' : (profitAmount !== null ? 'negative' : '')
  const profitText = profitAmount !== null ? `¥${Number(profitAmount).toLocaleString()}` : '¥—'
  
  const profitSpan = document.createElement('span')
  profitSpan.className = `profit-field ${profitClass}`
  profitSpan.textContent = profitText
  
  meta.appendChild(costSpan)
  meta.appendChild(document.createTextNode(' / '))
  meta.appendChild(priceSpan)
  meta.appendChild(document.createTextNode(' / '))
  meta.appendChild(profitSpan)
  
  card.appendChild(title)
  card.appendChild(meta)
  
  // カード全体をクリックして編集
  card.addEventListener('click', (e) => {
    if(e.target.classList.contains('editable-field')) return
    e.stopPropagation()
    openEditModal(idx)
  })
  
  // 編集フィールドのクリックイベント
  costSpan.addEventListener('click', (e) => {
    e.stopPropagation()
    editField(costSpan, 'cost', book.cost || '')
  })
  priceSpan.addEventListener('click', (e) => {
    e.stopPropagation()
    editField(priceSpan, 'price', book.price || '')
  })
  
  card.addEventListener('dragstart', handleDragStart)
  card.addEventListener('dragend', handleDragEnd)
  
  return card
}

function editField(span, field, currentValue){
  if(span.querySelector('input')) return
  
  const input = document.createElement('input')
  input.type = 'number'
  input.min = '0'
  input.step = '0.01'
  input.value = currentValue
  input.className = 'edit-input'
  
  const idx = parseInt(span.dataset.index)
  
  function saveEdit(){
    const newValue = input.value ? Number(input.value) : null
    const books = getBooks()
    books[idx][field] = newValue
    saveBooks(books)
    renderKanban()
  }
  
  function cancelEdit(){
    renderKanban()
  }
  
  input.addEventListener('keydown', (e) => {
    if(e.key === 'Enter') saveEdit()
    if(e.key === 'Escape') cancelEdit()
  })
  
  input.addEventListener('blur', saveEdit)
  
  span.textContent = ''
  span.appendChild(input)
  input.focus()
  input.select()
}

let draggedCard = null

function handleDragStart(e){
  if(this.classList.contains('add-card')) {
    e.preventDefault()
    return
  }
  draggedCard = this
  this.classList.add('dragging')
  e.dataTransfer.effectAllowed = 'move'
}

function handleDragEnd(e){
  this.classList.remove('dragging')
}

function setupDropZones(){
  const containers = document.querySelectorAll('.kanban-cards')
  
  containers.forEach(container => {
    container.addEventListener('dragover', (e) => {
      e.preventDefault()
      e.dataTransfer.dropEffect = 'move'
      container.classList.add('drag-over')
    })
    
    container.addEventListener('dragleave', (e) => {
      if(e.target === container){
        container.classList.remove('drag-over')
      }
    })
    
    container.addEventListener('drop', (e) => {
      e.preventDefault()
      container.classList.remove('drag-over')
      
      if(!draggedCard) return
      
      const bookIdx = parseInt(draggedCard.dataset.index)
      const newStatus = container.dataset.status
      
      const books = getBooks()
      books[bookIdx].status = newStatus
      saveBooks(books)
      renderKanban()
    })
  })
}

function addBook(book){
  const books = getBooks()
  book.status = book.status || '積読'
  books.push(book)
  saveBooks(books)
  renderKanban()
}

function updateBook(index, book){
  const books = getBooks()
  books[index] = { ...books[index], ...book }
  saveBooks(books)
  renderKanban()
}

function deleteBook(index){
  const books = getBooks()
  books.splice(index, 1)
  saveBooks(books)
  renderKanban()
}

function escapeHtml(s){
  return s.replace(/[&<>"']/g, c=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'
  })[c])
}

async function fetchPromosFromServer(books){
  try{
    const resp = await fetch('/api/generate', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({books})
    })
    if(!resp.ok) throw new Error('server error')
    const data = await resp.json()
    return data.promos || []
  }catch(e){
    console.warn('server generate failed', e)
    return null
  }
}

function clientGeneratePromos(books){
  if(!books || books.length === 0) return ['搬入済みの本がありません。']
  return books.slice(0,5).map(b=>{
    const title = b.title.length > 30 ? b.title.slice(0,27) + '…' : b.title
    const price = b.price ? `¥${Number(b.price).toLocaleString()}` : ''
    return `${title} ${price}。状態良好・即購入歓迎！`
  })
}

async function generateSNS(){
  const books = getBooks().filter(b => b.status === '搬入済み')
  const modal = document.getElementById('sns-modal')
  const statusEl = document.getElementById('sns-status')
  const resultsEl = document.getElementById('sns-results')
  statusEl.textContent = '生成中...'
  resultsEl.innerHTML = ''
  modal.classList.add('modal-open')

  let promos = await fetchPromosFromServer(books)
  if(promos === null){
    promos = clientGeneratePromos(books)
    statusEl.textContent = 'ローカル生成（API未設定）'
  } else {
    statusEl.textContent = '生成結果'
  }

  promos.forEach(p=>{
    const pEl = document.createElement('div')
    pEl.className = 'sns-line'
    pEl.textContent = p
    resultsEl.appendChild(pEl)
  })
}

document.addEventListener('DOMContentLoaded', ()=>{
  const snsBtn = document.getElementById('sns-btn')
  if(snsBtn) snsBtn.addEventListener('click', generateSNS)

  const snsClose = document.getElementById('sns-modal-close')
  if(snsClose) snsClose.addEventListener('click', ()=>document.getElementById('sns-modal').classList.remove('modal-open'))

  const snsCopy = document.getElementById('sns-copy')
  if(snsCopy) snsCopy.addEventListener('click', async ()=>{
    const lines = Array.from(document.querySelectorAll('.sns-line')).map(n=>n.textContent).join('\n\n')
    try{
      await navigator.clipboard.writeText(lines)
      alert('コピーしました')
    }catch(e){
      console.warn('copy failed', e)
      prompt('以下をコピーしてください', lines)
    }
  })
})

function openAddModal(){
  const modal = document.getElementById('add-modal')
  modal.classList.add('modal-open')
  document.getElementById('add-title').focus()
}

function closeAddModal(){
  currentStatus = null
  const modal = document.getElementById('add-modal')
  modal.classList.remove('modal-open')
  document.getElementById('add-form').reset()
}

function openEditModal(index){
  editingIndex = index
  const books = getBooks()
  const book = books[index]
  
  document.getElementById('edit-title').value = book.title
  document.getElementById('edit-cost').value = book.cost || ''
  document.getElementById('edit-price').value = book.price || ''
  
  const modal = document.getElementById('edit-modal')
  modal.classList.add('modal-open')
  document.getElementById('edit-title').focus()
}

function closeEditModal(){
  editingIndex = null
  const modal = document.getElementById('edit-modal')
  modal.classList.remove('modal-open')
  document.getElementById('edit-form').reset()
}

document.addEventListener('DOMContentLoaded', ()=>{
  renderKanban()
  setupDropZones()
  
  // 新規追加モーダルの閉じる
  document.getElementById('add-modal').querySelector('.modal-close').addEventListener('click', closeAddModal)
  document.getElementById('add-modal').querySelector('.modal-cancel').addEventListener('click', closeAddModal)
  document.getElementById('add-modal').addEventListener('click', (e) => {
    if(e.target.id === 'add-modal') closeAddModal()
  })
  
  // 編集モーダルの閉じる
  document.getElementById('edit-modal').querySelector('.modal-close').addEventListener('click', closeEditModal)
  document.getElementById('edit-modal').querySelector('.modal-cancel').addEventListener('click', closeEditModal)
  document.getElementById('edit-modal').addEventListener('click', (e) => {
    if(e.target.id === 'edit-modal') closeEditModal()
  })
  
  // 削除ボタン
  document.getElementById('edit-modal').querySelector('.modal-delete').addEventListener('click', (e) => {
    e.preventDefault()
    const book = getBooks()[editingIndex]
    if(confirm(`『${book.title}』を削除しますか？`)){
      deleteBook(editingIndex)
      closeEditModal()
    }
  })
  
  // 新規追加フォーム
  document.getElementById('add-form').addEventListener('submit', e=>{
    e.preventDefault()
    const title = document.getElementById('add-title').value.trim()
    const cost = document.getElementById('add-cost').value
    const price = document.getElementById('add-price').value
    if(!title) return alert('タイトルは必須です')
    addBook({
      title,
      cost: cost ? Number(cost) : null,
      price: price ? Number(price) : null,
      status: currentStatus,
      createdAt: Date.now()
    })
    closeAddModal()
  })
  
  // 編集フォーム
  document.getElementById('edit-form').addEventListener('submit', e=>{
    e.preventDefault()
    const title = document.getElementById('edit-title').value.trim()
    const cost = document.getElementById('edit-cost').value
    const price = document.getElementById('edit-price').value
    if(!title) return alert('タイトルは必須です')
    updateBook(editingIndex, {
      title,
      cost: cost ? Number(cost) : null,
      price: price ? Number(price) : null
    })
    closeEditModal()
  })
})
