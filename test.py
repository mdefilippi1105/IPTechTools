import io
import requests
import pandas as pd
import matplotlib.pyplot as plt

def radar():
    cf_api_url = "https://api.cloudflare.com/client/v4"
    params = "dateRange=7d&format=csv"
    my_token = "9t45-iLA1U9fQVD7X2ATuzThQ2sDEBPwkyDRwY-y"
    r = requests.get(f"{cf_api_url}/radar/http/summary/device_type?"
                     f"{params}", headers={"Authorization": f"Bearer {my_token}"})
    print(r)
    df = pd.read_csv(io.StringIO(r.text))

    print("DataFrame shape:", df.shape)
    print(df.head())
    if df.empty:
        print("DataFrame is empty, nothing to plot.")
        return
    df.plot(kind="bar")
    plt.tight_layout()
    plt.show()
    plt.savefig("/static/img/radar.png")

radar()
