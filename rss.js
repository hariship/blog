const fs = require('fs');
const axios = require('axios');
const cheerio = require('cheerio');

async function fetchPosts() {
    const url = 'https://haripriya.org/blog'; // Your blog URL
    const { data } = await axios.get(url);
    const $ = cheerio.load(data);
    const posts = [];

    // Assuming posts are listed as <a> tags within article elements, update selector as needed
    $('article a').each((_, element) => {
        const post = {
            title: $(element).text(),
            link: $(element).attr('href'),
            // You might want to fetch other details like date, description, etc.
        };
        posts.push(post);
    });

    return posts;
}

function generateXML(posts) {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>';
    xml += '<rss version="2.0">';
    xml += '<channel>';
    xml += '<title>Your Blog Title</title>';
    xml += '<link>https://haripriya.org/blog</link>';
    xml += '<description>Your blog description</description>';

    posts.forEach(post => {
        xml += '<item>';
        xml += `<title>${post.title}</title>`;
        xml += `<link>${post.link}</link>`;
        // Add other elements like <description>, <pubDate>, etc.
        xml += '</item>';
    });

    xml += '</channel>';
    xml += '</rss>';

    return xml;
}

async function main() {
    const posts = await fetchPosts();
    const xmlContent = generateXML(posts);
    fs.writeFileSync('blog-feed.xml', xmlContent);
    console.log('Generated blog-feed.xml successfully!');
}

main().catch(console.error);
