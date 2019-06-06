import fileinput
import argparse
import logging

BUILD_GRADLE = "platforms/android/build.gradle"
# BUILD_GRADLE = "/tmp/build.gradle"
LINE_BEFORE = "// PLUGIN GRADLE EXTENSIONS END"
OUR_ADD_REMOVE_LINE = 'apply from: "cordova-plugin-crosswalk-webview/xwalk6-workaround.gradle"'

def add_gradle_line():
    for line in fileinput.input(BUILD_GRADLE, inplace=True):
        line = line.strip("\n")
        print(line)
        if line == LINE_BEFORE:
            print(OUR_ADD_REMOVE_LINE)

def remove_gradle_line():
    for line in fileinput.input(BUILD_GRADLE, inplace=True):
        line = line.strip("\n")
        if line == OUR_ADD_REMOVE_LINE:
            pass
        else:
            print(line)

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    group = parser.add_mutually_exclusive_group(required=True)

    group.add_argument("-a", "--add", action="store_true",
        help="add the xwalk line to build.gradle")
    group.add_argument("-r", "--remove", action="store_true",
        help="remove the xwalk line from build.gradle")

    args = parser.parse_args()

    if args.add:
        add_gradle_line()
    if args.remove:
        remove_gradle_line()
