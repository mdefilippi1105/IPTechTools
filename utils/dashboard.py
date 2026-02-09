import io
import requests
from pathlib import Path
import pandas as pd
import matplotlib.pyplot as plt
import matplotlib.patheffects as pe
from django.utils.termcolors import foreground
import os

from dotenv import load_dotenv
load_dotenv()



CF_TOKEN = os.environ["CF_TOKEN"]


###########################################################################################################
##################### effects variables ###################################################################
###########################################################################################################

glow = [
    pe.withStroke(linewidth=3, foreground=(200/255, 220/255, 255/255, 0.9)),
    pe.withStroke(linewidth=2, foreground=(120/255, 170/255, 255/255, 0.8)),
    pe.withStroke(linewidth=1, foreground=(60/255, 120/255, 255/255, 0.6)),
]
glow_text = [
    pe.withStroke(linewidth=.75, foreground=(200/255, 220/255, 255/255, 0.9)),
    pe.withStroke(linewidth=.50, foreground=(120/255, 170/255, 255/255, 0.8)),
    pe.withStroke(linewidth=.25, foreground=(60/255, 120/255, 255/255, 0.6)),
]

###########################################################################################################
##################### folder variables ####################################################################
###########################################################################################################


project_folder = Path(__file__).resolve().parent.parent
charts_folder = project_folder / "static" / "charts"  # build the dir -> join the folders
charts_folder.mkdir(parents=True, exist_ok=True)

###########################################################################################################
##################### chart logic #########################################################################
###########################################################################################################

##This is used for showing devices listed by OS connected to the internet
def show_device_type():

    cf_api_url = "https://api.cloudflare.com/client/v4"
    dimension = "os"
    params = {
        "dateRange": "7d",
        "dimension": "os",
        "format": "csv"
    }

    # this is the request URL made comprised of url + dimension + parameters
    r_device_type = requests.get(f"{cf_api_url}/radar/http/summary/{dimension}", headers={"Authorization": f"Bearer {CF_TOKEN}"}, params = params)
    print(r_device_type.text[:500])
    df_device = pd.read_csv(io.StringIO(r_device_type.text))
    plt.style.use("seaborn-v0_8")
    df_device.T.plot(kind="bar", legend=False,)

    ##Color the text
    plt.tick_params(
        axis='both',  # x, y, or both
        labelsize=12,  # font size
        labelcolor="white",
        color = "white"
    )
    ## get axes of the plot you are on
    ax = plt.gca()
    ## for label in  x ticks and y ticks (concatenated) :
    for label in ax.get_xticklabels() + ax.get_yticklabels():
        ## apply the glow text
        label.set_path_effects(glow_text)


    plt.title("Top Device Operating System",
              path_effects=glow,
              pad=12,
              color="white"
              )

    plt.tight_layout()
    out_file = charts_folder / "device_graph.png"
    plt.savefig(out_file, transparent=True)
    print("Saving chart to:", out_file)

    plt.close()
    return plt


def show_traffic():


    cf_api_url = "https://api.cloudflare.com/client/v4"
    dimension = "timeseries"
    params = {
        "dateRange": "7d",
        "format": "csv"
    }
    # this is the request URL made comprised of url + dimension + parameters
    r_continent = requests.get(f"{cf_api_url}/radar/http/{dimension}", headers={"Authorization": f"Bearer {CF_TOKEN}"}, params = params)

    # read csv file
    df_traffic = pd.read_csv(io.StringIO(r_continent.text))
    print(r_continent.text[:500])

    df_traffic["Serie_0 timestamps"] = pd.to_datetime(df_traffic["Serie_0 timestamps"])
    df_traffic = df_traffic.sort_values("Serie_0 timestamps")
    plt.style.use("seaborn-v0_8")
    df_traffic.plot(
        x = "Serie_0 timestamps",
        y = "Serie_0 values",
        kind="line",
        legend=False)

    ##Color the text
    plt.tick_params(
        axis='both',  # x, y, or both
        labelsize=12,  # font size
        labelcolor="white",
        color = "white"
    )
    ## get axes of the plot you are on
    ax = plt.gca()
    ## for label in  x ticks and y ticks (concatenated) :
    for label in ax.get_xticklabels() + ax.get_yticklabels():
        ## apply the glow text
        label.set_path_effects(glow_text)

    plt.title("Global HTTP Traffic This Week,",
              path_effects=glow,
              pad=12,
              color="white"
              )
    plt.xlabel("Time (UTC)",path_effects=glow_text, color="white")
    plt.ylabel("Global HTTP Traffic",path_effects=glow_text, color="white")
    plt.tight_layout()
    out_file = charts_folder / "traffic_graph.png"
    plt.savefig(out_file, transparent=True)
    plt.close()
    return plt

# graph to show leaked credentials
def show_leaked_creds():
    cf_api_url = "https://api.cloudflare.com/client/v4"
    params = {
        "dateRange" : "7d", # 7days
        "format" : "csv"
    }
    r_creds = requests.get(f"{cf_api_url}/radar/leaked_credential_checks/timeseries_groups/compromised",
                     params=params, headers={"Authorization": f"Bearer {CF_TOKEN}"})
    print(r_creds.text[:500])

    ## this is how you take the csv text and pipe it into a
    ## Pandas dataframe
    df_cred = pd.read_csv(io.StringIO(r_creds.text))

    x_column1 = "Serie_0 timestamps"
    y_column1 = "Serie_0  C O M P R O M I S E D"
    x_column2 = "Serie_0 timestamps"
    y_column2 = "Serie_0  C L E A N"

    #give me the first 30 rows of df_cred iloc = integer location
    df_slice = df_cred.iloc[0:30]
    plt.style.use("seaborn-v0_8")
    plt.figure(figsize=(10, 5), dpi=120)
    plt.scatter(df_slice[x_column1], df_slice[y_column1])
    plt.scatter(df_slice[x_column2], df_slice[y_column2])
    plt.xlabel("X-axis Label", path_effects=glow_text, color="white")
    plt.ylabel("Y-axis Label")

    ##Color the text
    plt.tick_params(
        axis='both',  # x, y, or both
        labelsize=12,  # font size
        labelcolor="white",
        color = "white"
    )
    ## get axes of the plot you are on
    ax = plt.gca()
    ## for label in  x ticks and y ticks (concatenated) :
    for label in ax.get_xticklabels() + ax.get_yticklabels():
        ## apply the glow text
        label.set_path_effects(glow_text)



    plt.title("Compromised Credential Usage This Week",
        path_effects = glow,
         pad = 12,
        color = "white"
    )
    plt.xticks(rotation=45)
    plt.legend()  # shows the label
    plt.tight_layout()

    out_file = charts_folder / "cred_graph.png"
    plt.savefig(out_file, transparent=True)
    plt.close()
    return plt


def show_trending_domains():


    cf_api_url = "https://api.cloudflare.com/client/v4"
    params = {
        "dateRange" : "7d", # 7days
        "format" : "csv",
    }
    r_trends = requests.get(f"{cf_api_url}/radar/ranking/top",
                     params=params, headers={"Authorization": f"Bearer {CF_TOKEN}"})
    print(r_trends.text[:500])

    ## this is how you take the csv text and pipe it into a
    ## Pandas dataframe
    df_trend= pd.read_csv(io.StringIO(r_trends.text))

    plt.style.use("seaborn-v0_8")
    plt.figure(figsize=(10, 5), dpi=120)
    fig, ax = plt.subplots(figsize=(10, 5), dpi=120)

    df_trend = df_trend.set_index("Top_0 domain")
    df_trend = df_trend.sort_values("Top_0 rank")

    df_trend.plot( kind="barh",
              label="My Line",
              color="blue",
              )
    plt.xlabel("Rank (lower is better)", path_effects=glow_text, color="white")
    plt.ylabel("Domain")

    ##Color the text
    plt.tick_params(
        axis='both',  # x, y, or both
        labelsize=12,  # font size
        labelcolor="white",
        color = "white"
    )
    ## get axes of the plot you are on
    ax = plt.gca()
    ## for label in  x ticks and y ticks (concatenated) :
    for label in ax.get_xticklabels() + ax.get_yticklabels():
        ## apply the glow text
        label.set_path_effects(glow_text)

    plt.title("Most Popular Domains",
              path_effects=glow,
              pad=12,
              color="white"
              )
    #invert
    plt.gca().invert_yaxis()
    plt.grid(axis = "x", linestyle = "--", alpha = 0.4)

    plt.tight_layout()
    out_file = charts_folder / "trend_graph.png"
    plt.savefig(out_file, transparent=True)
    plt.close()

###########################################################################################################
##################### create / remove charts ##############################################################
###########################################################################################################



##This is used to wipe out the old charts
def delete_old_charts():
    # full path of python file > turn to path object > go up 2 folders
    project_folder = Path(__file__).resolve().parent.parent
    charts_folder = project_folder / "static" / "charts" # build the dir -> join the folders
    charts_folder.mkdir(parents=True, exist_ok=True) # if folder exists, dont crash

    for file in charts_folder.glob("*.png"): #finds all PNG files in folder
        file.unlink() #deletes the file


def generate_all():
    show_traffic()
    show_trending_domains()
    show_leaked_creds()
    show_device_type()
    print(os.getcwd())






































