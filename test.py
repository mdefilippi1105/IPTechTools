import io
import time

import requests
import pandas as pd
import matplotlib.pyplot as plt

# graph to show leaked credentials
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
    plt.savefig("/Users/michaeldefilippi/PycharmProjects/Website/charts/trend_graph.png")
    plt.close()
show_trending_domains()


