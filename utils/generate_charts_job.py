import os
import utils.dashboard as dashboard

os.environ["CF_TOKEN"] = "9t45-iLA1U9fQVD7X2ATuzThQ2sDEBPwkyDRwY-y"


def generate_all ():
    dashboard.delete_old_charts()
    dashboard.generate_all()

if __name__ == '__main__':
    generate_all()
