import os
import psycopg2
import psycopg2.pool
import logging
from contextlib import contextmanager
from config.settings import settings

# Set up logging
logging.basicConfig(level=logging.INFO,
                    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Database connection parameters from settings
DB_HOST = settings.DB_HOST
DB_PORT = settings.DB_PORT
DB_NAME = settings.DB_NAME
DB_USER = settings.DB_USER
DB_PASSWORD = settings.DB_PASSWORD

# Default pool sizes
DB_POOL_MIN_SIZE = getattr(settings, 'DB_POOL_MIN_SIZE', 1)
DB_POOL_MAX_SIZE = getattr(settings, 'DB_POOL_MAX_SIZE', 10)

# If DATABASE_URL is provided, parse it
db_url = os.environ.get('DATABASE_URL')
if db_url and db_url.startswith('postgresql://'):
    # Format: postgresql://username:password@hostname:port/database
    logger.info(f"Using DATABASE_URL environment variable")
    try:
        # Extract credentials and host information
        credentials_host = db_url.replace('postgresql://', '').split('@')
        if len(credentials_host) == 2:
            # Extract username and password
            user_pass = credentials_host[0].split(':')
            if len(user_pass) == 2:
                DB_USER = user_pass[0]
                DB_PASSWORD = user_pass[1]
            
            # Extract host, port and database
            host_port_db = credentials_host[1].split('/')
            if len(host_port_db) >= 2:
                host_port = host_port_db[0].split(':')
                DB_HOST = host_port[0]
                if len(host_port) == 2:
                    DB_PORT = host_port[1]
                DB_NAME = host_port_db[1]
                
        logger.info(f"Parsed DATABASE_URL: host={DB_HOST}, port={DB_PORT}, name={DB_NAME}, user={DB_USER}")
    except Exception as e:
        logger.warning(f"Could not parse DATABASE_URL completely: {str(e)}, using default settings")

logger.info(f"Connecting to database: host={DB_HOST}, port={DB_PORT}, name={DB_NAME}, user={DB_USER}")
logger.info(f"Using connection pool settings: min_size={DB_POOL_MIN_SIZE}, max_size={DB_POOL_MAX_SIZE}")

# Create a connection pool
try:
    connection_pool = psycopg2.pool.SimpleConnectionPool(
        minconn=DB_POOL_MIN_SIZE,
        maxconn=DB_POOL_MAX_SIZE,
        host=DB_HOST,
        port=DB_PORT,
        dbname=DB_NAME,
        user=DB_USER,
        password=DB_PASSWORD
    )
    logger.info("PostgreSQL connection pool created successfully!")
except Exception as e:
    logger.error(f"Error creating PostgreSQL connection pool: {e}")
    connection_pool = None

@contextmanager
def get_db_connection():
    """
    Context manager to get a database connection from the pool.
    Ensures the connection is returned to the pool after use.
    
    Usage:
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute("SELECT * FROM users")
                rows = cursor.fetchall()
    """
    if connection_pool is None:
        raise Exception("Database connection pool is not initialized")
    
    conn = None
    try:
        conn = connection_pool.getconn()
        conn.autocommit = False
        yield conn
    except Exception as e:
        logger.error(f"Error getting connection from pool: {e}")
        raise
    finally:
        if conn:
            connection_pool.putconn(conn)

@contextmanager
def transaction():
    """
    Context manager for database transactions.
    Automatically handles commit and rollback.
    
    Usage:
        with transaction() as conn:
            with conn.cursor() as cursor:
                cursor.execute("INSERT INTO users (name) VALUES (%s)", ("John",))
                # Will be automatically committed if no exceptions occur
                # or rolled back if an exception is raised
    """
    with get_db_connection() as conn:
        try:
            yield conn
            conn.commit()
            logger.debug("Transaction committed successfully")
        except Exception as e:
            conn.rollback()
            logger.error(f"Transaction rolled back due to error: {e}")
            raise

def execute_query(query, params=None, fetch=True, commit=True):
    """
    Execute a SQL query and return the results.
    
    Args:
        query (str): SQL query to execute
        params (tuple, optional): Parameters for the query
        fetch (bool): Whether to fetch results (for SELECT queries)
        commit (bool): Whether to commit the transaction
        
    Returns:
        list: Query results if fetch=True, else None
    """
    with get_db_connection() as conn:
        with conn.cursor() as cursor:
            try:
                cursor.execute(query, params)
                
                if fetch:
                    results = cursor.fetchall()
                else:
                    results = None
                    
                if commit:
                    conn.commit()
                    
                return results
            except Exception as e:
                conn.rollback()
                logger.error(f"Error executing query: {e}")
                logger.error(f"Query: {query}")
                logger.error(f"Params: {params}")
                raise

def execute_batch(query, params_list, fetch=False):
    """
    Execute a batch SQL operation with multiple parameter sets.
    
    Args:
        query (str): SQL query to execute
        params_list (list): List of parameter tuples
        fetch (bool): Whether to fetch results
        
    Returns:
        list: Combined results if fetch=True, else None
    """
    if not params_list:
        return [] if fetch else None
        
    with transaction() as conn:
        with conn.cursor() as cursor:
            results = []
            for params in params_list:
                cursor.execute(query, params)
                if fetch:
                    batch_results = cursor.fetchall()
                    results.extend(batch_results)
            
            return results if fetch else None

def test_connection():
    """Test the database connection"""
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute("SELECT 1")
                cursor.fetchone()
                logger.info("Database connection test successful!")
                return True
    except Exception as e:
        logger.error(f"Database connection test failed: {e}")
        return False