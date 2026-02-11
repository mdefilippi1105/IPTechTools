import os
import requests

if request.method == "POST":
    ip = request.form.get('ip')
    if ip:
        try:
            ipaddress.ip_address(ip)
            if platform.system() == "Windows":
                ping_cmd = f"ping -n 8 {ip}"
            else:
                ping_cmd = f"ping -c 8 {ip}"
                result = os.popen(ping_cmd).read()

        except ValueError:
            result = "Invalid IP Address"
        except Exception as e:
            result = f"Error running ping {e}"
