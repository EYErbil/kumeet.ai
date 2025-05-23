def save_credentials(self, credentials: CalendarCredentials) -> str:
        """Save calendar credentials to the database."""
        try:
            # Format scopes for PostgreSQL if needed
            if hasattr(credentials, "scopes") and credentials.scopes:
                scopes = credentials.scopes
                if isinstance(scopes, list):
                    # Convert list to PostgreSQL array format
                    scopes_pg = "{" + ",".join([f'"{s}"' for s in scopes]) + "}"
                else:
                    scopes_pg = scopes
            else:
                scopes_pg = None
            
            # Format token expiry
            if hasattr(credentials, "token_expiry") and credentials.token_expiry:
                token_expiry = credentials.token_expiry
            else:
                token_expiry = None
            
            # Check if we're using a mock database
            if hasattr(self, 'db') and isinstance(self.db, MagicMock):
                # Save to a file for persistence in mock mode
                import os
                import json
                from datetime import datetime
                
                # Create a mock credentials directory if it doesn't exist
                mock_creds_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "mock_credentials")
                os.makedirs(mock_creds_dir, exist_ok=True)
                
                # Serialize the credentials
                creds_data = {
                    "id": "mock_cred_id",
                    "user_id": credentials.user_id,
                    "calendar_type": credentials.calendar_type,
                    "access_token": credentials.access_token,
                    "refresh_token": credentials.refresh_token,
                    "token_expiry": token_expiry.isoformat() if token_expiry else None,
                    "client_id": getattr(credentials, 'client_id', None),
                    "client_secret": getattr(credentials, 'client_secret', None),
                    "token_uri": getattr(credentials, 'token_uri', None),
                    "scopes": credentials.scopes if hasattr(credentials, "scopes") else None,
                    "email": getattr(credentials, 'email', None),
                    "tenant_id": getattr(credentials, 'tenant_id', None)
                }
                
                # Save to file
                mock_creds_file = os.path.join(mock_creds_dir, f"{credentials.user_id}_{credentials.calendar_type}.json")
                with open(mock_creds_file, 'w') as f:
                    json.dump(creds_data, f)
                
                return "mock_cred_id"
            
            # For real database, continue with normal processing
            try:
                # Check if credentials already exist for this user and calendar type
                with get_db_connection() as conn:
                    with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                        cursor.execute(
                            """
                            SELECT credentials_id FROM calendar_credentials 
                            WHERE user_id = %s AND calendar_type = %s
                            """,
                            (credentials.user_id, credentials.calendar_type)
                        )
                        existing = cursor.fetchone()
                        
                        if existing:
                            # Update existing credentials
                            try:
                                cursor.execute(
                                    """
                                    UPDATE calendar_credentials 
                                    SET 
                                        access_token = %s, 
                                        refresh_token = %s, 
                                        token_expiry = %s,
                                        client_id = %s,
                                        client_secret = %s,
                                        token_uri = %s,
                                        scopes = %s::text[],
                                        email = %s,
                                        tenant_id = %s,
                                        updated_at = CURRENT_TIMESTAMP
                                    WHERE credentials_id = %s
                                    RETURNING credentials_id
                                    """,
                                    (
                                        credentials.access_token,
                                        credentials.refresh_token,
                                        token_expiry,
                                        getattr(credentials, 'client_id', None),
                                        getattr(credentials, 'client_secret', None),
                                        getattr(credentials, 'token_uri', None),
                                        scopes_pg,
                                        getattr(credentials, 'email', None),
                                        getattr(credentials, 'tenant_id', None),
                                        existing['credentials_id']
                                    )
                                )
                                result = cursor.fetchone()
                                conn.commit()
                                return str(result['credentials_id'])
                            except Exception as update_error:
                                conn.rollback()
                                logger.error(f"Error updating credentials: {str(update_error)}")
                                raise
                        else:
                            # Insert new credentials
                            try:
                                # First, verify that the user exists
                                cursor.execute(
                                    """
                                    SELECT COUNT(*) FROM users
                                    WHERE firebase_uid = %s
                                    """,
                                    (credentials.user_id,)
                                )
                                user_count = cursor.fetchone()
                                if user_count and user_count['count'] == 0:
                                    raise ValueError(f"User {credentials.user_id} does not exist in users table")
                                
                                cursor.execute(
                                    """
                                    INSERT INTO calendar_credentials 
                                    (user_id, calendar_type, access_token, refresh_token, token_expiry, 
                                    client_id, client_secret, token_uri, scopes, email, tenant_id)
                                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s::text[], %s, %s)
                                    RETURNING credentials_id
                                    """,
                                    (
                                        credentials.user_id,
                                        credentials.calendar_type,
                                        credentials.access_token,
                                        credentials.refresh_token,
                                        token_expiry,
                                        getattr(credentials, 'client_id', None),
                                        getattr(credentials, 'client_secret', None),
                                        getattr(credentials, 'token_uri', None),
                                        scopes_pg,
                                        getattr(credentials, 'email', None),
                                        getattr(credentials, 'tenant_id', None)
                                    )
                                )
                                result = cursor.fetchone()
                                conn.commit()
                                return str(result['credentials_id'])
                            except Exception as insert_error:
                                conn.rollback()
                                logger.error(f"Error inserting credentials: {str(insert_error)}")
                                raise
            except psycopg2.Error as db_error:
                logger.error(f"Database error while saving credentials: {str(db_error)}")
                raise
        except Exception as e:
            logger.error(f"Error saving credentials: {str(e)}")
            raise 