import urllib.request
import re
import sys

def get_ig_image(url, output_path):
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'})
        html = urllib.request.urlopen(req).read().decode('utf-8')
        match = re.search(r'<meta property="og:image" content="([^"]+)"', html)
        if match:
            img_url = match.group(1).replace('&amp;', '&')
            urllib.request.urlretrieve(img_url, output_path)
            print(f"Success: {output_path}")
        else:
            print(f"Failed to find og:image for {url}")
    except Exception as e:
        print(f"Error for {url}: {e}")

urls = [
    ("https://www.instagram.com/reel/DTcR_lgjH4d/", "img/gallery/vivek-triumph.png"),
    ("https://www.instagram.com/p/DCGQE1myElC/", "img/gallery/shanvi-abudhabi.png"),
    ("https://www.instagram.com/reel/C8mTBM8ydA_/", "img/gallery/shivali-lbp.png"),
    ("https://www.instagram.com/reel/DEJ993Mqlsk/", "img/gallery/reet-miniso.png"),
    ("https://www.instagram.com/reel/C_h_ReAJBSM/", "img/gallery/reet-yousta.png"),
    ("https://www.instagram.com/reel/DBL2qZPyFZv/", "img/gallery/shruti-oppo.png"),
    ("https://www.instagram.com/reel/CxFQx5mRgHf/", "img/gallery/shreya-ytmusic.png"),
    ("https://www.instagram.com/reel/DBYUPYjI2qh/", "img/gallery/shruti-sugar.png"),
    ("https://www.instagram.com/reel/DBx7Y3Lo17z/", "img/gallery/shruti-kitkat.png"),
    ("https://www.instagram.com/reel/DC9JAZKSCKx/", "img/gallery/shruti-uber.png")
]

for url, path in urls:
    get_ig_image(url, path)
