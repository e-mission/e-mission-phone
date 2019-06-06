import pandas as pd
import arrow
import sys
import datetime as pydt
import argparse
import subprocess
import os
import pytz

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument("dbfilename",
        help="log file to convert to csv and add date")
    parser.add_argument("-o", "--output",
        help="the path for the final output file. Default is /tmp/<dbfilename>.withdate.log")
    parser.add_argument("-z", "--timezone", default="America/Los_Angeles",
        help="the timezone to use for the output. Default is America/Los_Angeles. Full list is at https://en.wikipedia.org/wiki/List_of_tz_database_time_zones")

    args = parser.parse_args()
   
    db_path = args.dbfilename
    db_filename = os.path.basename(db_path) 
    exported_csv_filename = "/tmp/"+db_filename+".csv"
    out_path = "/tmp/"+db_filename+".withdate.log"
    if args.output is not None:
        out_path = args.output

    fp = open(exported_csv_filename, "w")
    print("exporting csv to "+exported_csv_filename)
    subprocess.call(['sqlite3', '-header', '-csv', db_path, "select * from logTable;"], stdout=fp)
    print("adding dates to the dataframe")
    log_df = pd.read_csv(exported_csv_filename)
    log_df['dt'] = log_df.ts.apply(lambda ts: arrow.get(ts).to(args.timezone))
    print("exporting csv with date to "+out_path)
    log_df[["ts", "dt", "message"]].to_csv(out_path)
