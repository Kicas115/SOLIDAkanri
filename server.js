require('dotenv').config()
const express = require('express')
const path = require('path')
const cors = require('cors')

const app = express()
app.use(cors())
app.use(express.json())

// Serve static files (the SPA)
app.use(express.static(path.join(__dirname)))

app.post('/api/generate', async (req, res) => {
  const books = Array.isArray(req.body.books) ? req.body.books : []

  // If OPENAI_API_KEY is provided, proxy a request to OpenAI Chat Completions
  if (process.env.OPENAI_API_KEY) {
    try {
      const titles = books.map(b => {
        const price = b.price ? `（${b.price}円）` : ''
        return `- ${b.title}${price}`
      }).join('\n')

      const userPrompt = `以下の搬入済み書籍に基づいて、フリマアプリ向けに短く魅力的な宣伝文を日本語で5件出力してください。各行は独立した宣伝文にしてください。価格がある場合は価格を含め、購入を促す簡潔なフレーズにしてください。\n\n${titles}`

      const payload = {
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'あなたは日本語で短く魅力的なフリマ向け商品説明を書くアシスタントです。' },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 300,
        temperature: 0.8
      }

      const resp = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: JSON.stringify(payload)
      })

      if (!resp.ok) {
        const txt = await resp.text()
        console.error('openai error', resp.status, txt)
        return res.status(500).json({ error: 'openai_error' })
      }

      const json = await resp.json()
      const content = json.choices && json.choices[0] && json.choices[0].message && json.choices[0].message.content
      if (!content) return res.status(500).json({ error: 'no_content' })

      // Split output into lines and return
      const promos = content.split(/\r?\n/).map(s => s.trim()).filter(Boolean).slice(0, 10)
      return res.json({ promos })
    } catch (err) {
      console.error('ai proxy error', err)
      return res.status(500).json({ error: 'ai_proxy_failed' })
    }
  }

  // Fallback: simple local generation if no API key
  if (books.length === 0) {
    return res.json({ promos: ['搬入済みの本がありません。'] })
  }

  const promos = books.slice(0, 10).map(b => {
    const title = b.title.length > 40 ? b.title.slice(0, 37) + '…' : b.title
    const price = b.price ? `¥${Number(b.price).toLocaleString()}` : ''
    return `${title} ${price}。状態良好・即購入歓迎！ #即買いOK`
  })

  res.json({ promos })
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => console.log(`server running on port ${PORT}`))
