import io
import requests
import pandas as pd
import matplotlib.pyplot as plt

##This is used for showing devices listed by OS connected to the internet
def show_device_type():
    cf_api_url = "https://api.cloudflare.com/client/v4"
    params = "dateRange=7d&format=json"
    my_token = "9t45-iLA1U9fQVD7X2ATuzThQ2sDEBPwkyDRwY-y"
    r_device_type = requests.get(f"{cf_api_url}/radar/http/summary/location?"
                     f"{params}", headers={"Authorization": f"Bearer {my_token}"})
    for device in r_device_type:
        print(device)

    df_device = pd.read_csv(io.StringIO(r_device_type.text))
    device_counts = df_device["device type"].value_counts()

    print("DataFrame shape:", df_device.shape)
    print(df_device.head())

    if df_device.empty:
        print("DataFrame is empty, nothing to plot.")


    device_counts.plot(kind="bar")
    plt.tight_layout()
    plt.savefig("/Users/michaeldefilippi/PycharmProjects/Website/static/device_graph.png")
    plt.close()
    return plt

# graph to show leaked credentials
def show_leaked_creds():
    my_token = "9t45-iLA1U9fQVD7X2ATuzThQ2sDEBPwkyDRwY-y"
    cf_api_url = "https://api.cloudflare.com/client/v4"
    params = {
        "dateRange" : "7d", # 7days
        "format" : "csv"
    }
    r_creds = requests.get(f"{cf_api_url}/radar/leaked_credential_checks/timeseries_groups/compromised",
                     params=params, headers={"Authorization": f"Bearer {my_token}"})
    for cred in r_creds:
        print(cred)


    ## this is how you take the csv text and pipe it into a
    ## Pandas dataframe
    df_cred = pd.read_csv(io.StringIO(r_creds.text))

    print("DataFrame shape:", df_cred.shape)
    print(df_cred.head())

    if df_cred.empty:
        print("DataFrame is empty, nothing to plot.")


    df_cred.plot(kind="line")
    plt.plot( label="My Line", color="blue", linestyle="--", marker="o")
    plt.xlabel("X-axis Label")
    plt.ylabel("Y-axis Label")
    plt.title("Title of Plot")
    plt.xticks(rotation=45)
    plt.legend()  # shows the label
    plt.grid(True)
    plt.tight_layout()
    plt.savefig("/Users/michaeldefilippi/PycharmProjects/Website/static/cred_graph.png")
    plt.close()
    return plt




































