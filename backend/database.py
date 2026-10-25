import logging
from typing import Optional
from supabase import create_client, Client
from config import settings

logger = logging.getLogger("previsit.database")

_client: Optional[Client] = None

def get_supabase_client() -> Client:
    """
    Returns the initialized Supabase client using the service role key.
    Enforces that only the backend can access the database, bypassing RLS safely.
    """
    global _client
    if _client is not None:
        return _client

    url = settings.SUPABASE_URL.strip().rstrip("/")
    if url.endswith("/rest/v1"):
        url = url[:-len("/rest/v1")].rstrip("/")
    key = settings.SUPABASE_SERVICE_ROLE_KEY.strip()

    if not url or not key or "your-project" in url or "your_supabase" in key:
        raise ValueError(
            "Supabase credentials are not configured. Please set valid SUPABASE_URL and "
            "SUPABASE_SERVICE_ROLE_KEY values in backend/.env"
        )

    try:
        _client = create_client(url, key)
        logger.info("Supabase client successfully initialized.")
        return _client
    except Exception as e:
        logger.error(f"Failed to initialize Supabase client: {e}")
        raise

def check_database_connection() -> dict:
    """
    Checks connection to Supabase and verifies table accessibility.
    """
    url = settings.SUPABASE_URL
    key = settings.SUPABASE_SERVICE_ROLE_KEY

    if not url or not key or "your-project" in url or "your_supabase" in key:
        return {
            "status": "unconfigured",
            "connected": False,
            "message": "Supabase credentials have placeholder values in .env. Configure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
        }

    try:
        client = get_supabase_client()
        # Ping the intakes table with a limit 1 query
        res = client.table("intakes").select("id").limit(1).execute()
        return {
            "status": "connected",
            "connected": True,
            "table_exists": True,
            "message": "Successfully connected to Supabase and verified 'intakes' table."
        }
    except Exception as e:
        err_msg = str(e)
        return {
            "status": "error",
            "connected": False,
            "table_exists": False,
            "message": f"Connection test failed: {err_msg}"
        }
