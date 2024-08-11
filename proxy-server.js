const express = require('express');
const axios = require('axios');
const cors = require('cors');
const app = express();
const port = 3001; // You can use any available port

const NOTION_API_KEY = 'secret_c1LF4A3lKJW9D22knONfRlQfDjqUQD3ejQKjBDaGdaV'; // Use your Integration Token
const PAGE_ID = '49b1c541d2524b25b6ab35fcc0a98fef'; // Replace with your Notion page ID

app.use(cors());
app.use(express.json());

app.get('/notion-page', async (req, res) => {
  try {
    const response = await axios.get(`https://api.notion.com/v1/blocks/${PAGE_ID}/children`, {
      headers: {
        'Authorization': `Bearer ${NOTION_API_KEY}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
    });
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching data from Notion:', error.response ? error.response.data : error.message);
    res.status(500).send('Error fetching data from Notion');
  }
});

app.listen(port, () => {
  console.log(`Proxy server is running on http://localhost:${port}`);
});

