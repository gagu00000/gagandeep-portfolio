const https = require('https');
const fs = require('fs');

const items = [
  { url: 'https://www.instagram.com/reel/C-p913RSF8U/', name: 'sccg-1' },
  { url: 'https://www.instagram.com/reel/C9t-zVoyQ-S/', name: 'sccg-2' },
  { url: 'https://www.instagram.com/reel/C_iHRHAttW6/', name: 'sccg-3' },
  { url: 'https://www.instagram.com/reel/DKrgdzXN4uY/', name: 'kifs-1' },
  { url: 'https://www.instagram.com/reel/DI3-m4wTKC_/', name: 'kifs-2' }
];

async function fetchMeta(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'curl/7.68.0' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        // Find og:image
        const match = data.match(/<meta property="og:image" content="([^"]+)"/);
        if (match) {
          // Unescape HTML entities
          const imgUrl = match[1].replace(/&amp;/g, '&');
          resolve(imgUrl);
        } else {
          resolve(null);
        }
      });
    }).on('error', reject);
  });
}

async function downloadImage(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (res) => {
      res.pipe(file);
      file.on('finish', () => {
        file.close(resolve);
      });
    }).on('error', err => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

async function run() {
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    console.log(`Fetching ${item.url}...`);
    try {
      const imgUrl = await fetchMeta(item.url);
      if (imgUrl) {
        console.log(`Found image, downloading to ${item.name}.jpg`);
        await downloadImage(imgUrl, `./img/gallery/${item.name}.jpg`);
        console.log(`Success: ${item.name}`);
      } else {
        console.log(`No image found for ${item.url}`);
      }
    } catch (e) {
      console.error(`Failed ${item.url}: ${e.message}`);
    }
  }
}

run();
