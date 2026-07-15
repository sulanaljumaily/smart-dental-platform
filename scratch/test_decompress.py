import os

pb_path = r"C:\Users\AL NABAA\.gemini\antigravity\conversations\2520a352-494f-4c39-83b8-e64b5a6c2745.pb"
with open(pb_path, 'rb') as f:
    data = f.read(100000)

print(f"Read {len(data)} bytes.")

# Test zlib
try:
    import zlib
    print("zlib:", zlib.decompress(data)[:100])
except Exception as e:
    print("zlib failed:", e)

# Test gzip
try:
    import gzip
    print("gzip:", gzip.decompress(data)[:100])
except Exception as e:
    print("gzip failed:", e)

# Test bz2
try:
    import bz2
    print("bz2:", bz2.decompress(data)[:100])
except Exception as e:
    print("bz2 failed:", e)

# Test lzma
try:
    import lzma
    print("lzma:", lzma.decompress(data)[:100])
except Exception as e:
    print("lzma failed:", e)

# Test brotli
try:
    import brotli
    print("brotli:", brotli.decompress(data)[:100])
except Exception as e:
    print("brotli failed:", e)

# Test zstandard
try:
    import zstandard as zstd
    dctx = zstd.ZstdDecompressor()
    print("zstd:", dctx.decompress(data)[:100])
except Exception as e:
    print("zstd failed:", e)
