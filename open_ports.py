import socket

def get_fqdn():
    fqdn = socket.getfqdn()
    hostname = socket.gethostname()
    print(f"{fqdn} // {hostname}")
    return f"{fqdn} // {hostname}"


###this is a server#####
def open_ports():
    server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    host_ip = "127.0.0.1"
    open_port = 2222
    server.bind((host_ip,open_port))
    server.listen(1)
    print(f"Listening on {host_ip} mambo numba {open_port}")
    #while loop time
    while True:
        conn, addr = server.accept()
        print(f"Connection from{addr}")

        conn.sendall(b"TEST TEST TEST TEST TEST TEST TEST")
        data = conn.recv(1024)
        print("received")

        conn.sendall(b"TEST TEST TEST TEST TEST TEST")
        conn.close()
get_fqdn()
open_ports()
