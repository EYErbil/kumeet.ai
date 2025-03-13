from db import conn
import psycopg2

class UserService:
    @staticmethod
    def create_user(firebase_uid, email, first_name=None, last_name=None):
        """Create a new user in the database."""
        try:
            with conn.cursor() as cur:
                query = """
                INSERT INTO users (firebase_uid, email, first_name, last_name)
                VALUES (%s, %s, %s, %s)
                RETURNING firebase_uid;
                """
                cur.execute(query, (firebase_uid, email, first_name, last_name))
                user_id = cur.fetchone()[0]
                conn.commit()
                return user_id
        except psycopg2.Error as e:
            print(f"Error creating user: {e}")
            conn.rollback()
            raise

    @staticmethod
    def get_user_by_firebase_uid(firebase_uid):
        """Get user details by Firebase UID."""
        try:
            with conn.cursor() as cur:
                query = """
                SELECT firebase_uid, email, first_name, last_name, created_at, last_active
                FROM users
                WHERE firebase_uid = %s;
                """
                cur.execute(query, (firebase_uid,))
                result = cur.fetchone()
                if result:
                    return {
                        'firebase_uid': result[0],
                        'email': result[1],
                        'first_name': result[2],
                        'last_name': result[3],
                        'created_at': result[4],
                        'last_active': result[5]
                    }
                return None
        except psycopg2.Error as e:
            print(f"Error getting user: {e}")
            raise

    @staticmethod
    def update_user_last_active(firebase_uid):
        """Update user's last active timestamp."""
        try:
            with conn.cursor() as cur:
                query = """
                UPDATE users
                SET last_active = CURRENT_TIMESTAMP
                WHERE firebase_uid = %s;
                """
                cur.execute(query, (firebase_uid,))
                conn.commit()
        except psycopg2.Error as e:
            print(f"Error updating last active timestamp: {e}")
            conn.rollback()
            raise

    @staticmethod
    def update_user_profile(firebase_uid, first_name=None, last_name=None):
        """Update user's profile information."""
        try:
            with conn.cursor() as cur:
                updates = []
                params = []
                
                if first_name is not None:
                    updates.append("first_name = %s")
                    params.append(first_name)

                if last_name is not None:
                    updates.append("last_name = %s")
                    params.append(last_name)
                
                if not updates:
                    return
                
                query = f"""
                UPDATE users
                SET {", ".join(updates)}
                WHERE firebase_uid = %s;
                """
                params.append(firebase_uid)
                
                cur.execute(query, params)
                conn.commit()
        except psycopg2.Error as e:
            print(f"Error updating user profile: {e}")
            conn.rollback()
            raise

    @staticmethod
    def user_exists(firebase_uid):
        """Check if a user exists in the database."""
        try:
            with conn.cursor() as cur:
                query = """
                SELECT EXISTS(
                    SELECT 1 FROM users 
                    WHERE firebase_uid = %s
                );
                """
                cur.execute(query, (firebase_uid,))
                return cur.fetchone()[0]
        except psycopg2.Error as e:
            print(f"Error checking user existence: {e}")
            raise 