import os
import utils.dashboard as dashboard

os.environ["CF_TOKEN"] = ""


def generate_all ():
    dashboard.delete_old_charts()
    dashboard.generate_all()

if __name__ == '__main__':
    generate_all()
