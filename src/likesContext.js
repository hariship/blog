app.get('/scrape', async (req, res) => {
  try {
    const url = 'https://www.haripriya.org/blog';
    const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle2' });
    await autoScroll(page);

    const posts = await page.evaluate(() => {
      const items = [];
      document.querySelectorAll('.item-link-wrapper').forEach(elem => {
        const title = elem.querySelector('.post-title')?.textContent.trim();
        const description = elem.querySelector('.post-description')?.textContent.trim();
        const imageUrl = elem.querySelector('.gallery-item-visible')?.src;
        items.push({ title, description, imageUrl });
      });
      return items;
    });

    await browser.close();

    // Save each post individually in Redis and preserve existing likesCount
    for (const post of posts) {
      // Check if the likesCount exists in the Redis likes:{title} key
      const existingLikes = await redisClient.get(`likes:${post.title}`);

      // Retrieve the current post data from Redis, if exists
      const existingPost = await redisClient.get(`post:${post.title}`);

      let likesCount = 0; // Default likes count to 0 if not found
      if (existingLikes) {
        likesCount = parseInt(existingLikes, 10); // Use existing likes count
      }

      // If the post already exists, merge it with the new scraped data and preserve likesCount
      const postData = {
        ...post,
        likesCount: existingPost ? JSON.parse(existingPost).likesCount || likesCount : likesCount,
      };

      // Save the post data back to Redis
      await redisClient.set(`post:${post.title}`, JSON.stringify(postData));
    }

    res.json(posts);
  } catch (error) {
    console.error('Error fetching data:', error);
    res.status(500).send('Internal Server Error');
  }
});