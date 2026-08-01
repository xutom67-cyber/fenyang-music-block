#!/usr/bin/env python3
"""生成地图标记图标：venue(绿)/shop(金)/loc(蓝)，48x48，4x 超采样"""
import zlib, struct, math, os

S = 48
SS = 4
N = S * SS
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'markers')

def blank(): return [[(0, 0, 0, 0)] * N for _ in range(N)]

def png_write(img, path):
    raw = b''
    for row in img:
        raw += b'\x00' + b''.join(struct.pack('4B', *px) for px in row)
    def chunk(t, d):
        return struct.pack('>I', len(d)) + t + d + struct.pack('>I', zlib.crc32(t + d) & 0xffffffff)
    ihdr = struct.pack('>IIBBBBB', S, S, 8, 6, 0, 0, 0)
    with open(path, 'wb') as f:
        f.write(b'\x89PNG\r\n\x1a\n')
        f.write(chunk(b'IHDR', ihdr))
        f.write(chunk(b'IDAT', zlib.compress(raw, 9)))
        f.write(chunk(b'IEND', b''))

def circle_icon(color, r, ring, dot=None):
    img = blank()
    for y in range(N):
        for x in range(N):
            px, py = (x + 0.5) / SS, (y + 0.5) / SS
            d = math.hypot(px - S / 2, py - S / 2)
            if d <= r:
                img[y][x] = (color[0], color[1], color[2], 255)
            elif d <= r + ring:
                img[y][x] = (255, 255, 255, 255)
            if dot and d <= dot:
                img[y][x] = (255, 255, 255, 255)
    return img

def main():
    os.makedirs(OUT, exist_ok=True)
    icons = {
        'venue.png': circle_icon((127, 182, 154), 17, 3.2),      # 场地：绿
        'shop.png': circle_icon((201, 169, 106), 13.5, 3.0),     # 商店：金
        'loc.png': circle_icon((74, 144, 217), 12, 2.8, 4.5)     # 我的位置：蓝
    }
    for name, img in icons.items():
        png_write(img, os.path.join(OUT, name))
    print('generated:', sorted(os.listdir(OUT)))

if __name__ == '__main__':
    main()
