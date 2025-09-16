import smtplib
from smtplib import SMTP
import socket
import asyncio
import time

###smtp debauchery#####
async def main():
    print('Begin SMTP......')
    await asyncio.sleep(3)
    s = smtplib.SMTP()
    # here we begin the connection
    connect = s.connect(host='localhost', port=2222)
    # s.connect(host='localhost', port=2222)
    #optional TLS
    if connect:
        s.starttls()
        s.ehlo()
        #optional - login
        # s.login("username", "password")
        msg = "subject: Test\r\n\rhello :)"
        s.sendmail("michaeljdefilippi@yahoo.com",
                   ["michaeljdefilippi@yahoo.com"], msg)
        s.set_debuglevel(1)
        s.quit()


asyncio.run(main())



#
# host =  "192.168.1.223"
# port = 25
# s = smtplib.SMTP()
# s.connect(host = 'localhost', port = 0)