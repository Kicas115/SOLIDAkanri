/* かんばんボード: 本を異なるステータスリストに移動 */
const STORAGE_KEY = 'kanban_books_v2'
const SNS_API_KEY_STORAGE_KEY = 'sns_api_key_session_v1'
const SNS_MODEL_NAME_STORAGE_KEY = 'sns_model_name_session_v1'
const SNS_SELECTED_BOOKS_KEY = 'sns_selected_books_v1'
const DEFAULT_GEMINI_MODEL = 'gemini-3.5-flash-lite'
let currentStatus = null
let editingIndex = null

function getStoredApiKey(){
  try{
    return sessionStorage.getItem(SNS_API_KEY_STORAGE_KEY) || ''
  }catch(e){
    console.warn('failed to read sns api key', e)
    return ''
  }
}

function saveStoredApiKey(apiKey){
  const value = (apiKey || '').trim()
  try{
    if(!value){
      sessionStorage.removeItem(SNS_API_KEY_STORAGE_KEY)
      return
    }
    sessionStorage.setItem(SNS_API_KEY_STORAGE_KEY, value)
  }catch(e){
    console.warn('failed to save sns api key', e)
  }
}

function getStoredModelName(){
  try{
    const value = sessionStorage.getItem(SNS_MODEL_NAME_STORAGE_KEY)
    return (value && value.trim()) || DEFAULT_GEMINI_MODEL
  }catch(e){
    console.warn('failed to read sns model name', e)
    return DEFAULT_GEMINI_MODEL
  }
}

function saveStoredModelName(modelName){
  const value = (modelName || '').trim()
  try{
    if(!value){
      sessionStorage.removeItem(SNS_MODEL_NAME_STORAGE_KEY)
      return
    }
    sessionStorage.setItem(SNS_MODEL_NAME_STORAGE_KEY, value)
  }catch(e){
    console.warn('failed to save sns model name', e)
  }
}

function getSelectedBookIds(){
  try{
    const stored = localStorage.getItem(SNS_SELECTED_BOOKS_KEY)
    return stored ? JSON.parse(stored) : []
  }catch(e){
    console.warn('failed to read selected books', e)
    return []
  }
}

function setSelectedBookIds(ids){
  try{
    localStorage.setItem(SNS_SELECTED_BOOKS_KEY, JSON.stringify(ids))
  }catch(e){
    console.warn('failed to save selected books', e)
  }
}

function maskApiKey(apiKey){
  if(!apiKey) return '未設定'
  const trimmed = apiKey.trim()
  if(trimmed.length <= 4) return '••••'
  return `••••${trimmed.slice(-4)}`
}

function updateApiKeyStatus(){
  const apiKey = getStoredApiKey()
  const modelName = getStoredModelName()
  const input = document.getElementById('sns-api-key-input')
  const modelInput = document.getElementById('sns-model-input')
  const statusEl = document.getElementById('sns-api-key-status')
  if(input && apiKey){
    input.value = ''
  }
  if(modelInput){
    modelInput.value = modelName
  }
  if(statusEl){
    statusEl.textContent = `${maskApiKey(apiKey)} / ${modelName}`
  }
}

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
    if(card.dataset.dragMoved === 'true'){
      card.dataset.dragMoved = 'false'
      e.preventDefault()
      e.stopPropagation()
      return
    }
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
  card.addEventListener('touchstart', handleTouchStart, { passive: false })
  card.addEventListener('touchmove', handleTouchMove, { passive: false })
  card.addEventListener('touchend', handleTouchEnd, { passive: false })
  card.addEventListener('touchcancel', () => cleanupTouchDrag(), { passive: false })
  
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
let touchDragState = null
let touchGhost = null

function clearDropHighlights(){
  document.querySelectorAll('.kanban-cards.drag-over').forEach((container) => {
    container.classList.remove('drag-over')
  })
}

function moveBookToStatus(bookIdx, newStatus){
  if(Number.isNaN(bookIdx) || !newStatus) return

  const books = getBooks()
  if(!books[bookIdx]) return

  books[bookIdx].status = newStatus
  saveBooks(books)
  renderKanban()
}

function findDropContainer(clientX, clientY){
  const target = document.elementFromPoint(clientX, clientY)
  if(!target) return null

  return target.closest('.kanban-cards')
}

function updateTouchGhostPosition(clientX, clientY){
  if(!touchGhost) return

  touchGhost.style.left = `${clientX + 12}px`
  touchGhost.style.top = `${clientY + 12}px`
}

function cleanupTouchDrag(){
  if(touchGhost){
    touchGhost.remove()
    touchGhost = null
  }
  if(draggedCard){
    draggedCard.classList.remove('dragging')
    draggedCard = null
  }
  touchDragState = null
  clearDropHighlights()
}

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
  draggedCard = null
}

function handleTouchStart(e){
  if(this.classList.contains('add-card')) return
  if(e.target.closest('.editable-field')) return

  const touch = e.touches[0]
  if(!touch) return

  e.preventDefault()
  draggedCard = this
  touchDragState = {
    card: this,
    startX: touch.clientX,
    startY: touch.clientY,
    moved: false
  }
  this.classList.add('dragging')
  this.dataset.dragMoved = 'false'

  if(!touchGhost){
    touchGhost = this.cloneNode(true)
    touchGhost.classList.add('touch-drag-ghost')
    touchGhost.style.width = `${this.getBoundingClientRect().width}px`
    document.body.appendChild(touchGhost)
  }
  updateTouchGhostPosition(touch.clientX, touch.clientY)
}

function handleTouchMove(e){
  if(!touchDragState) return

  const touch = e.touches[0]
  if(!touch) return

  const dx = touch.clientX - touchDragState.startX
  const dy = touch.clientY - touchDragState.startY
  if(Math.abs(dx) > 8 || Math.abs(dy) > 8){
    touchDragState.moved = true
    touchDragState.card.dataset.dragMoved = 'true'
    e.preventDefault()
  }

  updateTouchGhostPosition(touch.clientX, touch.clientY)

  const container = findDropContainer(touch.clientX, touch.clientY)
  clearDropHighlights()
  if(container){
    container.classList.add('drag-over')
  }
}

function handleTouchEnd(e){
  if(!touchDragState) return

  const touch = e.changedTouches[0]
  const targetContainer = touch ? findDropContainer(touch.clientX, touch.clientY) : null

  if(touchDragState.moved && targetContainer){
    const bookIdx = parseInt(draggedCard.dataset.index)
    moveBookToStatus(bookIdx, targetContainer.dataset.status)
    cleanupTouchDrag()
    return
  }

  if(touchDragState.moved){
    cleanupTouchDrag()
    return
  }

  if(draggedCard){
    draggedCard.classList.remove('dragging')
  }
  if(touchGhost){
    touchGhost.remove()
    touchGhost = null
  }
  draggedCard = null
  touchDragState = null
  clearDropHighlights()
}

function setupDropZones(){
  const containers = document.querySelectorAll('.kanban-cards')
  
  containers.forEach(container => {
    container.addEventListener('dragover', (e) => {
      e.preventDefault()
      if(e.dataTransfer){
        e.dataTransfer.dropEffect = 'move'
      }
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
      moveBookToStatus(bookIdx, newStatus)
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

function buildGeminiPrompt(books, platform = 'x', tone = 'catchy'){
  if(!books || books.length === 0){
    return '本なし。短いSNS販促文を1文だけ作成。'
  }

  const platformName = platform === 'instagram' ? 'Instagram' : 'X'
  const toneName = tone === 'polite' ? '丁寧' : '親しみやすい'
  const booksText = books
    .map(book => {
      const title = (book.title || '無題').replace(/[|;]/g, '')
      const author = (book.author || '').replace(/[|;]/g, '')
      const summary = (book.summary || '').replace(/[|;]/g, '')
      const details = [author, summary].filter(Boolean).join('/')
      return details ? `${title}/${details}` : title
    })
    .slice(0, 10)
    .join('|')
  return `${platformName}用、${toneName}な販促文を1文。${booksText}`
}

async function fetchPromosFromServer(books, platform = 'x', tone = 'catchy'){
  const apiKey = getStoredApiKey()
  if(!apiKey) return { promos: null, error: 'APIキーが未設定です。' }

  const prompt = buildGeminiPrompt(books, platform, tone)
  const modelNames = [getStoredModelName(), DEFAULT_GEMINI_MODEL].filter((value, index, array) => value && array.indexOf(value) === index)
  let lastError = null

  for(const modelName of modelNames){
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${encodeURIComponent(apiKey)}`
    try{
      console.info('Gemini request', { modelName, url })
      const requestBody = {
        contents: [{
          role: 'user',
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          temperature: 0.5,
          maxOutputTokens: 80
        }
      }
      
      const resp = await fetch(url, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(requestBody)
      })

      if(!resp.ok){
        const errorBody = await resp.text().catch(() => '')
        lastError = { modelName, status: resp.status, body: errorBody }
        console.warn('Gemini generate failed', { modelName, status: resp.status, body: errorBody, url })
        if(resp.status !== 404){
          return {
            promos: null,
            error: `Gemini APIエラー (${resp.status})。${errorBody ? errorBody : 'APIキーやモデルの利用可否を確認してください。'}`
          }
        }
        continue
      }

      const data = await resp.json()
      const text = (data?.candidates || [])
        .map((candidate) => candidate?.content?.parts?.map((part) => part?.text || '').join('') || '')
        .join('\n')
        .trim()

      if(!text){
        return {
          promos: null,
          error: `Gemini API (${modelName}) から空の応答が返りました。キーの権限とモデルの有効化を確認してください。`
        }
      }

      return {
        promos: text
          .split(/\n+/)
          .map((line) => line.trim())
          .filter(Boolean)
          .slice(0, 1),
        error: null
      }
    }catch(e){
      console.warn('Gemini fetch exception', { modelName, error: e })
      lastError = { modelName, error: String(e) }
      break
    }
  }

  const detail = lastError ? JSON.stringify(lastError) : '詳細なし'
  console.warn('Gemini all models failed', detail)
  return {
    promos: null,
    error: `Gemini APIへの接続に失敗しました。モデル名とAPIキーを確認してください。詳細: ${detail}`
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

function initSNSBooksList(){
  const allBooks = getBooks().filter(b => b.status === '搬入済み')
  const booksList = document.getElementById('sns-books-list')
  if(!booksList) return
  
  booksList.innerHTML = ''
  
  if(allBooks.length === 0){
    const empty = document.createElement('div')
    empty.style.padding = '12px'
    empty.style.fontSize = '13px'
    empty.style.color = '#999'
    empty.textContent = '搬入済みの本がありません'
    booksList.appendChild(empty)
    return
  }
  
  const selectedIds = getSelectedBookIds()
  
  allBooks.forEach((book, index)=>{
    const bookId = `book_${index}_${book.createdAt}`
    const isSelected = selectedIds.includes(bookId)
    
    const item = document.createElement('div')
    item.className = 'sns-book-item'
    
    const checkbox = document.createElement('input')
    checkbox.type = 'checkbox'
    checkbox.id = bookId
    checkbox.checked = isSelected
    checkbox.addEventListener('change', ()=>{
      const currentSelected = getSelectedBookIds()
      if(checkbox.checked){
        if(!currentSelected.includes(bookId)) currentSelected.push(bookId)
      }else{
        const idx = currentSelected.indexOf(bookId)
        if(idx !== -1) currentSelected.splice(idx, 1)
      }
      setSelectedBookIds(currentSelected)
    })
    
    const label = document.createElement('label')
    label.htmlFor = bookId
    const title = book.title.length > 30 ? book.title.slice(0,27) + '…' : book.title
    const displayText = `${title} ${book.price ? `(¥${Number(book.price).toLocaleString()})` : ''}`
    label.textContent = displayText
    
    item.appendChild(checkbox)
    item.appendChild(label)
    booksList.appendChild(item)
  })
}

async function generateSNS(){
  const allBooks = getBooks().filter(b => b.status === '搬入済み')
  const modal = document.getElementById('sns-modal')
  const statusEl = document.getElementById('sns-status')
  const resultsEl = document.getElementById('sns-results')
  
  initSNSBooksList()
  
  const selectedIds = getSelectedBookIds()
  let books = selectedIds.length > 0 
    ? allBooks.filter((b, index) => selectedIds.includes(`book_${index}_${b.createdAt}`))
    : allBooks
  
  const platformSelected = document.querySelector('input[name="sns-platform"]:checked')
  const toneSelected = document.querySelector('input[name="sns-tone"]:checked')
  const platform = platformSelected ? platformSelected.value : 'x'
  const tone = toneSelected ? toneSelected.value : 'catchy'
  
  statusEl.textContent = '生成中...'
  resultsEl.innerHTML = ''
  modal.classList.add('modal-open')
  updateApiKeyStatus()

  const apiKey = getStoredApiKey()
  if(!apiKey){
    statusEl.textContent = 'Gemini APIキーが未設定です。保存ボタンで設定してください。'
    const empty = document.createElement('div')
    empty.className = 'sns-line'
    empty.textContent = 'Gemini APIキーを設定すると、販促文を生成できます。'
    resultsEl.appendChild(empty)
    return
  }

  const apiResult = await fetchPromosFromServer(books, platform, tone)
  let promos = apiResult.promos
  if(promos === null){
    promos = clientGeneratePromos(books)
    statusEl.textContent = apiResult.error || 'ローカル生成（API利用不可）'
  } else {
    statusEl.textContent = '生成結果'
  }

  promos.forEach((p, index)=>{
    const item = document.createElement('details')
    item.className = 'sns-item'
    item.open = true

    const summary = document.createElement('summary')
    summary.innerHTML = `販促文 ${index + 1} <button class="sns-copy-btn" type="button" data-text="${escapeHtml(p)}" title="この販促文をコピー">📋</button>`

    const pEl = document.createElement('div')
    pEl.className = 'sns-line'
    pEl.textContent = p

    item.appendChild(summary)
    item.appendChild(pEl)
    resultsEl.appendChild(item)

    const copyBtn = summary.querySelector('.sns-copy-btn')
    if(copyBtn){
      copyBtn.addEventListener('click', async (e)=>{
        e.stopPropagation()
        const text = copyBtn.getAttribute('data-text')
        try{
          await navigator.clipboard.writeText(text)
          copyBtn.textContent = '✓'
          setTimeout(()=>{ copyBtn.textContent = '📋' }, 1500)
        }catch(e){
          console.warn('copy failed', e)
          alert('クリップボードへのコピーに失敗しました')
        }
      })
    }
  })
}

document.addEventListener('DOMContentLoaded', ()=>{
  const snsBtn = document.getElementById('sns-btn')
  if(snsBtn) snsBtn.addEventListener('click', ()=>{
    const modal = document.getElementById('sns-modal')
    if(modal) modal.classList.add('modal-open')
    generateSNS()
  })

  const snsGenerate = document.getElementById('sns-generate')
  if(snsGenerate) snsGenerate.addEventListener('click', generateSNS)

  const snsClose = document.getElementById('sns-modal-close')
  if(snsClose) snsClose.addEventListener('click', ()=>document.getElementById('sns-modal').classList.remove('modal-open'))

  const snsApiKeySave = document.getElementById('sns-api-key-save')
  if(snsApiKeySave){
    snsApiKeySave.addEventListener('click', ()=>{
      const input = document.getElementById('sns-api-key-input')
      const modelInput = document.getElementById('sns-model-input')
      const apiKey = input ? input.value : ''
      const modelName = modelInput ? (modelInput.value || DEFAULT_GEMINI_MODEL) : DEFAULT_GEMINI_MODEL
      saveStoredApiKey(apiKey)
      saveStoredModelName(modelName)
      updateApiKeyStatus()
      if(apiKey){
        alert('Gemini APIキーとモデル名を保存しました')
      }
    })
  }

  const snsApiKeyClear = document.getElementById('sns-api-key-clear')
  if(snsApiKeyClear){
    snsApiKeyClear.addEventListener('click', ()=>{
      const input = document.getElementById('sns-api-key-input')
      const modelInput = document.getElementById('sns-model-input')
      if(input) input.value = ''
      if(modelInput) modelInput.value = DEFAULT_GEMINI_MODEL
      saveStoredApiKey('')
      saveStoredModelName(DEFAULT_GEMINI_MODEL)
      updateApiKeyStatus()
      alert('Gemini APIキーとモデル名を削除しました')
    })
  }

  const snsSelectAll = document.getElementById('sns-books-select-all')
  if(snsSelectAll){
    snsSelectAll.addEventListener('click', (e)=>{
      e.preventDefault()
      const allBooks = getBooks().filter(b => b.status === '搬入済み')
      const allIds = allBooks.map((b, index) => `book_${index}_${b.createdAt}`)
      setSelectedBookIds(allIds)
      initSNSBooksList()
    })
  }

  const snsClearAll = document.getElementById('sns-books-clear-all')
  if(snsClearAll){
    snsClearAll.addEventListener('click', (e)=>{
      e.preventDefault()
      setSelectedBookIds([])
      initSNSBooksList()
    })
  }

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

  updateApiKeyStatus()
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
  document.getElementById('edit-author').value = book.author || ''
  document.getElementById('edit-summary').value = book.summary || ''
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
    const author = document.getElementById('edit-author').value.trim()
    const summary = document.getElementById('edit-summary').value.trim()
    const cost = document.getElementById('edit-cost').value
    const price = document.getElementById('edit-price').value
    if(!title) return alert('タイトルは必須です')
    updateBook(editingIndex, {
      title,
      author,
      summary,
      cost: cost ? Number(cost) : null,
      price: price ? Number(price) : null
    })
    closeEditModal()
  })
})
