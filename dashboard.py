import io
import requests
import pandas as pd
import matplotlib.pyplot as plt

##This is used for showing devices listed by OS connected to the internet
def show_device_type():
    cf_api_url = "https://api.cloudflare.com/client/v4"
    dimension = "os"
    params = {
        "dateRange": "7d",
        "dimension": "os",
        "format": "csv"
    }
    my_token = "9t45-iLA1U9fQVD7X2ATuzThQ2sDEBPwkyDRwY-y"

    # this is the request URL made comprised of url + dimension + parameters
    r_device_type = requests.get(f"{cf_api_url}/radar/http/summary/{dimension}", headers={"Authorization": f"Bearer {my_token}"}, params = params)
    print(r_device_type.text[:500])
    df_device = pd.read_csv(io.StringIO(r_device_type.text))

    df_device.T.plot(kind="bar", legend=False)
    plt.tight_layout()
    plt.savefig("/Users/michaeldefilippi/PycharmProjects/Website/static/charts/device_graph.png")
    plt.close()
    return plt


def show_traffic():
    cf_api_url = "https://api.cloudflare.com/client/v4"
    dimension = "timeseries"
    params = {
        "dateRange": "7d",
        "format": "csv"
    }
    my_token = "9t45-iLA1U9fQVD7X2ATuzThQ2sDEBPwkyDRwY-y"

    # this is the request URL made comprised of url + dimension + parameters
    r_continent = requests.get(f"{cf_api_url}/radar/http/{dimension}", headers={"Authorization": f"Bearer {my_token}"}, params = params)

    # read csv file
    df_traffic = pd.read_csv(io.StringIO(r_continent.text))
    print(r_continent.text[:500])


    df_traffic["Serie_0 timestamps"] = pd.to_datetime(df_traffic["Serie_0 timestamps"])
    df_traffic = df_traffic.sort_values("Serie_0 timestamps")

    df_traffic.plot(
        x = "Serie_0 timestamps",
        y = "Serie_0 values",
        kind="line",
        legend=False)
    plt.xlabel("Time (UTC)")
    plt.ylabel("Global HTTP Traffic")
    plt.tight_layout()
    plt.savefig("/Users/michaeldefilippi/PycharmProjects/Website/static/charts/traffic_graph.png")
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

    print(r_creds.text[:500])

    ## this is how you take the csv text and pipe it into a
    ## Pandas dataframe
    df_cred = pd.read_csv(io.StringIO(r_creds.text))

    plt.figure(figsize=(10, 5), dpi=120)
    # df_cred.plot()
    df_cred.plot( kind="line",
              label="My Line",
              color="blue",
              linewidth=2,
              marker="o")
    plt.xlabel("X-axis Label")
    plt.ylabel("Y-axis Label")
    plt.title("Title of Plot")
    plt.xticks(rotation=45)
    plt.legend()  # shows the label
    plt.grid(True)
    plt.tight_layout()
    plt.savefig("/Users/michaeldefilippi/PycharmProjects/Website/static/charts/cred_graph.png")
    plt.close()
    return plt


def show_trending_domains():
    my_token = "9t45-iLA1U9fQVD7X2ATuzThQ2sDEBPwkyDRwY-y"
    cf_api_url = "https://api.cloudflare.com/client/v4"
    params = {
        "dateRange" : "7d", # 7days
        "format" : "csv",

    }
    r_trends = requests.get(f"{cf_api_url}/radar/ranking/top",
                     params=params, headers={"Authorization": f"Bearer {my_token}"})

    print(r_trends.text[:500])

    ## this is how you take the csv text and pipe it into a
    ## Pandas dataframe
    df_trend= pd.read_csv(io.StringIO(r_trends.text))

    plt.figure(figsize=(10, 5), dpi=120)

    df_trend = df_trend.set_index("Top_0 domain")
    df_trend = df_trend.sort_values("Top_0 rank")

    df_trend.plot( kind="barh",
              label="My Line",
              color="blue",
              )
    plt.xlabel("Rank (lower is better)")
    plt.ylabel("Domain")
    plt.title("Most Popular Domains")# shows the label
    plt.gca().invert_yaxis()
    plt.grid(axis = "x", linestyle = "--", alpha = 0.4)
    plt.tight_layout()
    plt.savefig("/Users/michaeldefilippi/PycharmProjects/Website/static/charts/trend_graph.png")
    plt.close()

show_traffic()
show_trending_domains()
show_leaked_creds()
show_device_type()








































