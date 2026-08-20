/* MVP: 本の一覧表示・追加・削除・localStorage永続化 */
const STORAGE_KEY = 'mvp_books_v1'

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

function renderBooks(){
  const list = document.getElementById('book-list')
  list.innerHTML = ''
  const books = getBooks()
  if(books.length === 0){
    const li = document.createElement('li')
    li.className = 'book-item'
    li.innerHTML = '<em>蔵書がありません。追加してください。</em>'
    list.appendChild(li)
    return
  }

  books.forEach((b, idx) => {
    const li = document.createElement('li')
    li.className = 'book-item'

    const meta = document.createElement('div')
    meta.className = 'book-meta'
    meta.innerHTML = `<strong>${escapeHtml(b.title)}</strong><div class="badge">${escapeHtml(b.author || '-')} ${b.year? '• ' + escapeHtml(String(b.year)) : ''}</div>`

    const controls = document.createElement('div')
    controls.className = 'controls'

    const del = document.createElement('button')
    del.textContent = '削除'
    del.className = 'delete'
    del.addEventListener('click', ()=>{
      if(confirm(`『${b.title}』を削除しますか？`)){
        deleteBook(idx)
      }
    })

    controls.appendChild(del)

    li.appendChild(meta)
    li.appendChild(controls)
    list.appendChild(li)
  })
}

function addBook(book){
  const books = getBooks()
  books.push(book)
  saveBooks(books)
  renderBooks()
}

function deleteBook(index){
  const books = getBooks()
  books.splice(index,1)
  saveBooks(books)
  renderBooks()
}

function escapeHtml(s){
  return s.replace(/[&<>"']/g, c=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"
  })[c])
}

document.addEventListener('DOMContentLoaded', ()=>{
  renderBooks()
  const form = document.getElementById('book-form')
  form.addEventListener('submit', e=>{
    e.preventDefault()
    const title = document.getElementById('title').value.trim()
    const author = document.getElementById('author').value.trim()
    const year = document.getElementById('year').value
    if(!title) return alert('タイトルは必須です')
    addBook({title,author,year: year? Number(year): null, createdAt: Date.now()})
    form.reset()
    document.getElementById('title').focus()
  })
})
