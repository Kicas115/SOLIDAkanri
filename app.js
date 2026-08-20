/* かんばんボード: 本を異なるステータスリストに移動 */
const STORAGE_KEY = 'kanban_books_v2'

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
    
    if(booksInStatus.length === 0){
      const empty = document.createElement('div')
      empty.className = 'empty-state'
      empty.textContent = '本がありません'
      container.appendChild(empty)
      return
    }
    
    booksInStatus.forEach((b, idx) => {
      const bookIdx = books.indexOf(b)
      const card = createCard(b, bookIdx)
      container.appendChild(card)
    })
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
  if(book.author || book.year){
    meta.textContent = `${escapeHtml(book.author || '-')} ${book.year ? '• ' + escapeHtml(String(book.year)) : ''}`
  }
  
  const controls = document.createElement('div')
  controls.className = 'card-controls'
  
  const deleteBtn = document.createElement('button')
  deleteBtn.className = 'delete-btn'
  deleteBtn.textContent = '削除'
  deleteBtn.addEventListener('click', (e) => {
    e.stopPropagation()
    if(confirm(`『${book.title}』を削除しますか？`)){
      deleteBook(idx)
    }
  })
  
  controls.appendChild(deleteBtn)
  
  card.appendChild(title)
  if(meta.textContent) card.appendChild(meta)
  card.appendChild(controls)
  
  card.addEventListener('dragstart', handleDragStart)
  card.addEventListener('dragend', handleDragEnd)
  
  return card
}

let draggedCard = null

function handleDragStart(e){
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

function deleteBook(index){
  const books = getBooks()
  books.splice(index, 1)
  saveBooks(books)
  renderKanban()
}

function escapeHtml(s){
  return s.replace(/[&<>"']/g, c=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"
  })[c])
}

document.addEventListener('DOMContentLoaded', ()=>{
  renderKanban()
  setupDropZones()
  
  const form = document.getElementById('book-form')
  form.addEventListener('submit', e=>{
    e.preventDefault()
    const title = document.getElementById('title').value.trim()
    const author = document.getElementById('author').value.trim()
    const year = document.getElementById('year').value
    if(!title) return alert('タイトルは必須です')
    addBook({
      title,
      author,
      year: year? Number(year): null,
      createdAt: Date.now()
    })
    form.reset()
    document.getElementById('title').focus()
  })
})
