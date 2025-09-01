import socket
import paramiko

HOST = "0.0.0.0"
PORT = 2222
USERNAME = "user"
PASSWORD = "password"

#generate a key
host_key = paramiko.RSAKey.generate(2048)

class SshServer(paramiko.ServerInterface):
    def check_auth(self, username, password):
        if username == USERNAME and password == PASSWORD:
            return paramiko.AUTH_SUCCESSFUL
        return paramiko.AUTH_FAILED

    def get_allowed_auths(self, username):
        return "password"

###################################
############ Main server loop #####
###################################

sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
sock.bind((HOST, PORT))
sock.listen(1)
print("Waiting for connection...")

client, addr = sock.accept()
print(f"Connection established from {addr}")

transport = paramiko.Transport(client)
transport.add_server_key(host_key)
server = SshServer()
transport.start_server(server=server)

chan = transport.accept(60)
if chan:
    chan.send("Hello You Are Connected")
    chan.close()
transport.close()
