require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const app = express();
const port = process.env.PROXY_SERVER_PORT || 3001;

const NOTION_API_KEY = process.env.NOTION_API_KEY;
const PAGE_ID = process.env.NOTION_PAGE_ID;

app.use(cors());
app.use(express.json());

app.get('/notion-page', async (req, res) => {
  try {
    const response = await axios.get(`${process.env.REACT_APP_NOTION_API_URL || 'https://api.notion.com'}/v1/blocks/${PAGE_ID}/children`, {
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

