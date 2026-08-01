#!/usr/bin/env python3
"""生成微信小程序 tabBar 图标（81x81，3x 超采样抗锯齿，纯 Python 无依赖）"""
import zlib, struct, math, os

S = 81          # 输出尺寸
SS = 3          # 超采样倍数
N = S * SS      # 工作画布尺寸
NORMAL = (154, 164, 155)   # #9AA49B
ACTIVE = (62, 122, 95)     # #3E7A5F
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'tabbar')

def blank():
    return [[(0, 0, 0, 0)] * N for _ in range(N)]

def in_tri(px, py, a, b, c):
    def sgn(p1, p2, p3): return (p1[0]-p3[0])*(p2[1]-p3[1]) - (p2[0]-p3[0])*(p1[1]-p3[1])
    d1, d2, d3 = sgn((px,py),a,b), sgn((px,py),b,c), sgn((px,py),c,a)
    neg = d1 < 0 or d2 < 0 or d3 < 0
    pos = d1 > 0 or d2 > 0 or d3 > 0
    return not (neg and pos)

def in_rect(px, py, x0, y0, x1, y1): return x0 <= px <= x1 and y0 <= py <= y1
def in_circle(px, py, cx, cy, r): return (px-cx)**2 + (py-cy)**2 <= r*r
def in_ellipse(px, py, cx, cy, rx, ry): return ((px-cx)/rx)**2 + ((py-cy)/ry)**2 <= 1

def seg_dist(px, py, x1, y1, x2, y2):
    vx, vy = x2-x1, y2-y1
    wx, wy = px-x1, py-y1
    L2 = vx*vx + vy*vy
    t = max(0.0, min(1.0, (wx*vx + wy*vy) / L2)) if L2 else 0
    return math.hypot(wx - t*vx, wy - t*vy)

def paint(img, color, fn):
    c4 = (color[0], color[1], color[2], 255)
    for y in range(N):
        row = img[y]
        for x in range(N):
            if fn((x + 0.5) / SS, (y + 0.5) / SS):
                row[x] = c4

def down(img):
    out = [[(0,0,0,0)]*S for _ in range(S)]
    for by in range(S):
        for bx in range(S):
            r = g = b = a = 0
            for dy in range(SS):
                for dx in range(SS):
                    pr, pg, pb, pa = img[by*SS+dy][bx*SS+dx]
                    r += pr*pa; g += pg*pa; b += pb*pa; a += pa
            if a:
                out[by][bx] = (r//a, g//a, b//a, a//(SS*SS))
    return out

def png_write(img, path):
    raw = b''
    for row in img:
        raw += b'\x00' + b''.join(struct.pack('4B', *px) for px in row)
    def chunk(t, d):
        return struct.pack('>I', len(d)) + t + d + struct.pack('>I', zlib.crc32(t+d) & 0xffffffff)
    ihdr = struct.pack('>IIBBBBB', S, S, 8, 6, 0, 0, 0)
    with open(path, 'wb') as f:
        f.write(b'\x89PNG\r\n\x1a\n')
        f.write(chunk(b'IHDR', ihdr))
        f.write(chunk(b'IDAT', zlib.compress(raw, 9)))
        f.write(chunk(b'IEND', b''))

def save(name, img, color):
    for idx, c in ((name, color),):
        png_write(down(img), os.path.join(OUT, idx + '.png'))

def icon_home(c):
    img = blank()
    paint(img, c, lambda px,py: (in_tri(px,py,(13,40),(68,40),(40.5,12))
        or in_rect(px,py,22,39,59,67)) and not in_rect(px,py,36,50,45,67))
    return img

def icon_history(c):
    img = blank()
    paint(img, c, lambda px,py: abs(math.hypot(px-40.5,py-40.5) - 23) <= 4)
    paint(img, c, lambda px,py: seg_dist(px,py,40.5,40.5,40.5,21) <= 3.2)
    paint(img, c, lambda px,py: seg_dist(px,py,40.5,40.5,54,44.5) <= 3.2)
    return img

def icon_note(c):
    img = blank()
    paint(img, c, lambda px,py: in_rect(px,py,35.5,13.5,41.5,54))
    paint(img, c, lambda px,py: in_rect(px,py,41.5,13.5,56,20.5))
    paint(img, c, lambda px,py: in_circle(px,py,27.5,50.5,8.5))
    paint(img, c, lambda px,py: in_circle(px,py,52.5,55.5,8.5))
    return img

def icon_bag(c):
    img = blank()
    paint(img, c, lambda px,py: in_rect(px,py,21,31,60,66))
    paint(img, c, lambda px,py: in_rect(px,py,29.5,21.5,34.5,31))
    paint(img, c, lambda px,py: in_rect(px,py,46.5,21.5,51.5,31))
    paint(img, c, lambda px,py: in_rect(px,py,29.5,18,51.5,24))
    return img

def icon_person(c):
    img = blank()
    paint(img, c, lambda px,py: in_circle(px,py,40.5,27,11.5))
    paint(img, c, lambda px,py: in_ellipse(px,py,40.5,73,25.5,17) and py >= 54)
    return img

def main():
    os.makedirs(OUT, exist_ok=True)
    icons = {'home': icon_home, 'history': icon_history, 'venues': icon_note,
             'shops': icon_bag, 'profile': icon_person}
    for key, fn in icons.items():
        for suffix, color in (('', NORMAL), ('-a', ACTIVE)):
            png_write(down(fn(color)), os.path.join(OUT, f'{key}{suffix}.png'))
    print('generated:', sorted(os.listdir(OUT)))

if __name__ == '__main__':
    main()
