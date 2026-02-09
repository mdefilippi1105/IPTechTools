######### Created on July 9th 2025 9:50pm ################
from dotenv import load_dotenv
load_dotenv()

import json
import platform
import html
import time
import cv2
import requests
from django.db.models.functions import NullIf
from flask import Flask, request, render_template_string, render_template
import os
import paramiko
import socket
import io
import pandas as pd
import utils.dashboard as dash








###################################
# ####### to update into site #######
# cd ~/mysite
# source ~/venvs/myapp/bin/activate
# git pull
####################################

################################
##### to do ####################
################################

# order key-value pairs for geo results -done
# add mac address lookup -done
# netstat - done
# add background - done
# align loading bar - done
# add what's my ip? - done
# clean up results aka clean up JSON
# try ripe API for network statistics
# generate more charts

app = Flask(__name__)

MAC_ADDR_API_KEY = os.environ["MAC_ADDR_API_KEY"]
IP_STACK_API_KEY = os.environ["IP_STACK_API_KEY"]

@app.route('/', methods = ['GET', 'POST'])
def index():
    result = None
    return render_template('index.html', result=result)

@app.route('/ping', methods = ['GET', 'POST'])
def ping():
    result = None #result is blank first
    if request.method =='POST':
        ip = request.form.get('ip')
        if ip:
            try:
                if platform.system() == "Windows":
                    ping_cmd = f"ping -n 8 {ip}"
                else:
                    ping_cmd = f"ping -c 8 {ip}"
                result = os.popen(ping_cmd).read()
            except Exception as e:
                result = f"Error running ping {e}"

    return render_template('ping.html', result=result)

@app.route('/geo/', methods = ['GET', 'POST'])
def geo():
    result = ""
    if request.method =='POST':
        time.sleep(1)
        ip = request.form.get('ip_lookup')
        response = requests.get(f"http://ip-api.com/json/{ip}")
        result = response.json()
        length = len(result)
        print(f"{length} total results found.")
        dump = json.dumps(result, indent=4)
        for key, value in result.items():
            print(f"DEBUG-->{key}:{value}")
    else:
        dump = ""
    return render_template('geo.html', result=result)

@app.route('/trace', methods=['GET', 'POST'])
def trace():
    trace_result = ""  # result is blank first
    if request.method == 'POST':
        trace_ip = request.form.get('ip_lookup')
        if trace_ip:
            try:
                if platform.system() =="Windows":
                    trace_command = f"tracert {trace_ip}"
                else:
                    trace_command = f"traceroute {trace_ip}"
                trace_result = os.popen(trace_command).read()
                print(f"DEBUG-->{trace_result}")

            except Exception as e:
                trace_result = f"Error running trace: {e}"
        else:
            trace_result = "Please enter valid IP or check network."

    return render_template('trace.html', result=trace_result)

###################
##### OUI lookup ##
###################

# mac address lookup api key need to lookup more specifics.
MAC_ADDR_API_KEY = "01k0nbhy1qahrw96yzbt8emsyf01k0nbkb7gcaans368jkc9xw24cqc92gbziz97"
MAC_ADDR_API_URL = str("https://api.maclookup.app/v2/macs/{mac_lookup}")

@app.route('/mac/',methods=['GET', 'POST'])
def mac_lookup():
    dump = ""
    if request.method == 'POST':
        try:
            if request.form.get('mac_lookup') is None:
                pass
            else:
                ip = request.form.get('mac_lookup') #grab ip from html form
                response = requests.get(f"https://api.maclookup.app/v2/macs/{ip}") #api link with ip data
                result = response.json() # json response
                dump = json.dumps(result, indent=4)
        except Exception as e:
            dump = f"Error running mac lookup: {e}"
    return render_template('mac.html', result=dump)

#######################
##### deep geo search #
#######################

@app.route('/deepgeo', methods=['GET', 'POST'])
def deep_search():
    dump = ""
    if request.method == 'POST':
        try:
            if request.form.get('ip_deep_lookup') is None:
                pass
            else:
                ip = request.form.get('ip_deep_lookup')
                ip_stack_api_url = f'https://api.ipstack.com/{ip}?access_key={IP_STACK_API_KEY}'
                response = requests.get(ip_stack_api_url)
                result = response.json()
                dump = json.dumps(result, indent=4, sort_keys=True)
        except Exception as e:
            dump = f"Error running deep search: {e}"
    return render_template('deep.html', result=dump)

####################################################
##### port checker tool ############################
####################################################

@app.route('/route_table', methods=['GET', 'POST'])
def route_table():
    result = None
    if request.method =='POST':
            host = request.form.get("host")
            port = request.form.get("port")
            time.sleep(1)
            try:
                port = int(port)
                assert 1 <= port <= 65535
            except Exception as e:
                route_result = f"{e}"
            else:
                is_open = False
            try:
                #here we make the connection#
                with socket.create_connection((host, port), timeout=5):
                    is_open = True
            except OSError:
                is_open = False
            result = f"{host}:{port} is {'OPEN' if is_open else 'closed/filtered out'}"

    return render_template('route_table.html', result=result)

##########################
##### ssh client #########
##########################

@app.route('/ssh/',methods=['GET', 'POST'])
def ssh_client():
    ssh_talk = ""
    if request.method == 'POST':
        try:
            #grab all the form data and turn into variables
            ssh_target = request.form.get('target') #grab the ssh target
            ssh_port = request.form.get('port')
            ssh_user = request.form.get('username')
            ssh_password = request.form.get('password')
            ssh_argument = request.form.get('ssh_argument')

            # create the ssh object
            client = paramiko.SSHClient()
            # this trusts new server fingerprint, auto trust new servers
            client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
            # initiate connection
            client.connect(f'{ssh_target}', port=int(ssh_port),
                           username=f'{ssh_user}', password=f'{ssh_password}')

            # splits into 2 pipes - in/out
            stdin, stdout, stderr= client.exec_command(f"{ssh_argument}")
            print(f"{stdin}, {stdout}, {stderr}")
            stdout.channel.recv_exit_status()
            ssh_output = stdout.read().decode()

            ssh_error = stderr.read().decode()

            ssh_talk = ssh_output + ssh_error
            print(ssh_talk)
        except Exception as e:
            print(f"Error: {e}")
    return render_template('ssh.html', result=ssh_talk)

#############################
###### rtsp client ##########
#############################

@app.route('/rtsp/',methods=['GET', 'POST'])
def rtsp_client():
    result = []
    try:
        rtsp_target = request.form.get('rtsp-ip')
        rtsp_username = request.form.get('rtsp-username')
        rtsp_password = request.form.get('rtsp-password')
        cap = cv2.VideoCapture(f"rtsp://{rtsp_username}:{rtsp_password}@{rtsp_target}/axis-media/media.amp")
        while True:
            ret, frame = cap.read()
            cv2.imshow("cap", frame)
            if cv2.waitKey(1) & 0xFF == ord('q'):  # press q to quot
                break
    except Exception as e:
        result = f"Error running rtsp client: {e}"
    return render_template('rtsp_cam.html', result=result)



#############################
#### whats my ip? ###########
#############################
@app.route('/public/', methods=['GET','POST'])
def get_public():
    public_output = None
    if request.method == 'POST':
        time.sleep(2)
        real_ip = request.headers.get('CF-Connecting-IP', request.remote_addr)
        public_header = request.headers.get
        host_platform = request.headers.get("Sec-Ch-Ua-Platform", request.remote_addr)
        user_agent = request.headers.get("User-Agent")
        browser_engine = request.headers.get("Sec-Ch-Ua", request.remote_addr)

        parts = []
        for item, value in request.headers.items():
            parts.append(f"{item}: {value}")
            all_ip_info = "\n".join(parts)

        #This is for internal inspection
        public_output = (f"Current IP address is {real_ip}. "
                         f"\n\nCurrently captured platform is {host_platform.upper()}."
                         f"\n\nBrowser engine is currently {browser_engine.upper()}")
        print(f"DEBUG ---> {public_header}")
        print(f"DEBUG ---> {user_agent}")
        print(f"DEBUG ---> {public_output}")
        print(f"DEBUG ---> {all_ip_info}")

    else:
        public_output = []
    return render_template('public.html', result=public_output)


@app.route('/latency', methods=['GET','POST'])
# all the heavy lifting here is being done by javascript
# see client_ping.js
def latency_check():
    result = []
    return render_template('latency.html', result=result)

@app.route('/contact_me/',methods=['GET', 'POST'])
def contact_me():
    result = []
    return render_template('contact_me.html', result=result)

####This app is for testing only not linking to the main webpage

@app.route('/test/',methods=['GET', 'POST'])
def test():
    result = ""
    return render_template('___test.html', result=result)

if __name__ == '__main__':
    app.run(debug=True)



