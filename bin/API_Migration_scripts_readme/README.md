
# README for python scripts for API Migration 

This .ipynb contains two python scripts:

1. A webscraper that scrapes the name of the package and the class for a given Android API Differences link. 

2. Python script that uses the aforementioned data to cross-check and find matching java classes in a given directory.


## Installation
```bash
  pip install beautifulsoup4
  pip install requests
```

## Usage
Both these scripts are stored in a single jupyter notebook for ease of use. Running the entire book using "Run all". 


1. webscraper - Running this script stores a CSV file from a given hyperlink which contains the package. It accesses the packages (it is hyperlinked) and then notes down the classes. All the data is stored in a CSV file. 
The CSV file is stored in the default location of the notebook. Only change that can be quoted is the URL change (apart from potential improvements).

2. This python script is designed in such a way where it uses the data extracted from a webpage and then compares the contents of (a) java file(s) in a given directory. Any matches found is printed out. 
