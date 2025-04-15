# Make summarizer directory a proper Python package
# This allows using imports like: from summarizer.module import function

import os
import sys

# Make the summarizer directory itself importable
sys.path.append(os.path.dirname(os.path.abspath(__file__))) 