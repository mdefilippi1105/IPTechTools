import io
import time
import numpy as np
import requests
import pandas as pd
import matplotlib.pyplot as plt
import shodan


# Use the Censys API docs in upcoming charts
def censys_test():
    my_token = "censys_Z4vjFho9_DHbhFgsA2GTy62buQ9hmd4AY"

    try:
        results = shodan_api.search('apache')
        print("Results found: {}".format(results['total']))
        for result in results:
            print('IP: {}'.format(result['ip_str']))
            print(result['data'])
            print("")
            print(results.text[:500])
    except Exception as e:
        print("Error {}".format(e))


def test_graph():
    xpoints = np.array([1, 3, 5, 7, 9, 11,12,14,100])
    ypoints = np.array([0, 2, 4, 6, 8, 10, 12,14,100])
    plt.scatter(xpoints, ypoints)
    font1 = {'family': 'serif', 'color': 'blue', 'size': 20}
    font2 = {'family': 'serif', 'color': 'darkred', 'size': 15}

    plt.title("Here is the title", fontdict=font1, loc = 'left')
    plt.xlabel("X Label is shown here", fontdict = font2)
    plt.ylabel("Y Label values are shown here", fontdict=font2)
    plt.grid(color = 'blue', linestyle = '--', linewidth = 0.5)
    plt.show()

def show_censys():
