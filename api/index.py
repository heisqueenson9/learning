import sys
import os

# Ensure the api/ directory is on the Python path so 'app.*' imports resolve
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.main import app
