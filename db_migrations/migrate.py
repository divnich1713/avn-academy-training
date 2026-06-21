import os
import glob
import psycopg2
import sys

DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql://postgres:postgres@localhost:54322/postgres")
SCHEMA = os.environ.get("SCHEMA", "t_p29017774_avn_academy_training")

def run_migrations():
    print(f"Connecting to database to run migrations...")
    try:
        conn = psycopg2.connect(DATABASE_URL)
        conn.autocommit = True
    except Exception as e:
        print(f"Failed to connect to database at {DATABASE_URL}: {e}")
        sys.exit(1)
    
    try:
        with conn.cursor() as cur:
            # Create schema if not exists
            cur.execute(f"CREATE SCHEMA IF NOT EXISTS {SCHEMA};")
            
            # Create migrations tracking table
            cur.execute(f"""
                CREATE TABLE IF NOT EXISTS {SCHEMA}.migration_history (
                    id SERIAL PRIMARY KEY,
                    filename VARCHAR(255) NOT NULL UNIQUE,
                    applied_at TIMESTAMP DEFAULT NOW()
                );
            """)
            
            # Find all SQL files
            # Determine directory path relative to script
            script_dir = os.path.dirname(os.path.abspath(__file__))
            sql_files = sorted(glob.glob(os.path.join(script_dir, "*.sql")))
            
            if not sql_files:
                print("No SQL migration files found.")
                return
                
            for filepath in sql_files:
                filename = os.path.basename(filepath)
                if filename.startswith("migrate.py"):
                    continue
                
                # Check if already applied
                cur.execute(f"SELECT id FROM {SCHEMA}.migration_history WHERE filename = %s", (filename,))
                if cur.fetchone():
                    print(f"Migration {filename} already applied. Skipping.")
                    continue
                    
                print(f"Applying migration: {filename}...")
                with open(filepath, "r", encoding="utf-8") as f:
                    sql = f.read()
                    
                if not sql.strip():
                    continue
                
                # Execute migration SQL
                cur.execute(sql)
                
                # Log migration
                cur.execute(f"INSERT INTO {SCHEMA}.migration_history (filename) VALUES (%s)", (filename,))
                print(f"Migration {filename} successfully applied.")
                
    except Exception as e:
        print(f"Error occurred during migration: {e}")
        sys.exit(1)
    finally:
        conn.close()
    
    print("All migrations checked/applied successfully.")

if __name__ == "__main__":
    run_migrations()
