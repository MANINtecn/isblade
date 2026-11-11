import socket
import json
import sys

def send_blender_code(code, timeout=120):
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.settimeout(timeout)
    s.connect(('localhost', 9876))
    payload = json.dumps({'type': 'execute_code', 'params': {'code': code}}).encode('utf-8')
    s.sendall(payload)
    chunks = []
    while True:
        try:
            chunk = s.recv(65536)
            if not chunk:
                break
            chunks.append(chunk)
            try:
                data = b''.join(chunks)
                res = json.loads(data.decode('utf-8'))
                s.close()
                return res
            except Exception:
                pass
        except socket.timeout:
            break
    s.close()
    return None

if __name__ == '__main__':
    code = sys.argv[1] if len(sys.argv) > 1 else 'import bpy\nprint("Blender version:", bpy.app.version_string)'
    res = send_blender_code(code)
    if res and 'result' in res and 'result' in res['result']:
        print(res['result']['result'])
    else:
        print(res)

