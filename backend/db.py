import os
import psycopg2
import logging

# Set up logging
logging.basicConfig(level=logging.INFO,
                    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


# Detect environment - Check if we're running in Docker or locally
def is_running_in_docker():
    """Check if the code is running inside a Docker container"""
    try:
        with open('/proc/self/cgroup', 'r') as f:
            return 'docker' in f.read()
    except:
        return False


# Set host based on environment
if is_running_in_docker():
    # In Docker, use the service name
    DB_HOST = "db"
else:
    # Not in Docker, use localhost
    DB_HOST = "localhost"

# Get other connection parameters (with defaults)
DB_PORT = os.environ.get('DB_PORT', '5432')
DB_NAME = os.environ.get('DB_NAME', 'kumeet')
DB_USER = os.environ.get('DB_USER', 'postgres')
DB_PASSWORD = os.environ.get('DB_PASSWORD', 'postgres')

logger.info(f"Environment: {'Docker' if is_running_in_docker() else 'Local'}")
logger.info(f"Connecting to database: host={DB_HOST}, port={DB_PORT}, name={DB_NAME}, user={DB_USER}")

try:
    # Connect to the database
    conn = psycopg2.connect(
        host=DB_HOST,
        port=DB_PORT,
        dbname=DB_NAME,
        user=DB_USER,
        password=DB_PASSWORD
    )

    # Disable autocommit
    conn.autocommit = False

    # Test the connection
    with conn.cursor() as cursor:
        cursor.execute("SELECT 1")
        cursor.fetchone()

    logger.info("PostgreSQL connection is successful!")
except Exception as e:
    logger.error(f"PostgreSQL connection error: {e}")
    conn = None