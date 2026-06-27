import os
import glob
import re
import psycopg2
from psycopg2 import sql
import sys

DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql://postgres:postgres@localhost:54322/postgres")
SCHEMA = os.environ.get("SCHEMA", "t_p29017774_avn_academy_training")

# Validate schema to prevent SQL Injection
if not re.fullmatch(r"[a-zA-Z_][a-zA-Z0-9_]*", SCHEMA):
    print(f"CRITICAL: Invalid database SCHEMA identifier: '{SCHEMA}'")
    sys.exit(1)

def run_migrations():
    print(f"Connecting to database to run migrations...")
    try:
        conn = psycopg2.connect(DATABASE_URL)
        # Autocommit = False for transactional safety.
        # We want each migration script to execute in its own transaction.
        conn.autocommit = False
    except Exception as e:
        print(f"Failed to connect to database at {DATABASE_URL}: {e}")
        sys.exit(1)
    
    try:
        with conn.cursor() as cur:
            # Create schema safely using psycopg2.sql.Identifier
            cur.execute(
                sql.SQL("CREATE SCHEMA IF NOT EXISTS {};").format(sql.Identifier(SCHEMA))
            )
            conn.commit()
            
            # Ensure the tracking table exists
            cur.execute(sql.SQL("""
                CREATE TABLE IF NOT EXISTS {}.migration_history (
                    id SERIAL PRIMARY KEY,
                    filename VARCHAR(255) NOT NULL UNIQUE,
                    applied_at TIMESTAMP DEFAULT NOW()
                );
            """).format(sql.Identifier(SCHEMA)))
            conn.commit()

            # Consolidate inline DDLs here to prevent table locks and race conditions during active HTTP requests
            print("Applying structural pre-setup checks (formerly inline migrations)...")
            try:
                cur.execute(sql.SQL("""
                    ALTER TABLE {}.test_settings ADD COLUMN IF NOT EXISTS time_limit_per_question INTEGER DEFAULT 0;
                """).format(sql.Identifier(SCHEMA)))
                cur.execute(sql.SQL("""
                    ALTER TABLE {}.test_settings ADD COLUMN IF NOT EXISTS passing_score_percent INTEGER DEFAULT 80;
                """).format(sql.Identifier(SCHEMA)))
                cur.execute(sql.SQL("""
                    CREATE TABLE IF NOT EXISTS {}.custom_materials (
                        id SERIAL PRIMARY KEY,
                        material_type VARCHAR(50) NOT NULL UNIQUE,
                        data JSONB NOT NULL,
                        updated_at TIMESTAMP DEFAULT NOW()
                    );
                """).format(sql.Identifier(SCHEMA)))
                conn.commit()
                print("Structural pre-setup applied successfully.")
            except Exception as setup_err:
                conn.rollback()
                print(f"Warning/Error on structural pre-setup: {setup_err}")
                # We do not crash here, in case columns already existed or have conflicts, but log it.
            
            # Find all SQL files
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
                cur.execute(
                    sql.SQL("SELECT id FROM {}.migration_history WHERE filename = %s").format(sql.Identifier(SCHEMA)),
                    (filename,)
                )
                if cur.fetchone():
                    print(f"Migration {filename} already applied. Skipping.")
                    continue
                    
                print(f"Applying migration: {filename}...")
                with open(filepath, "r", encoding="utf-8") as f:
                    sql_content = f.read()
                    
                if not sql_content.strip():
                    continue
                
                try:
                    # Execute migration SQL
                    cur.execute(sql_content)
                    # Log migration in history
                    cur.execute(
                        sql.SQL("INSERT INTO {}.migration_history (filename) VALUES (%s)").format(sql.Identifier(SCHEMA)),
                        (filename,)
                    )
                    # Commit this specific migration successfully
                    conn.commit()
                    print(f"Migration {filename} successfully applied.")
                except Exception as mig_err:
                    conn.rollback()
                    print(f"CRITICAL: Failed to apply migration {filename}. Rolling back. Error: {mig_err}")
                    raise mig_err
                    
    except Exception as e:
        print(f"Error occurred during migration: {e}")
        sys.exit(1)
    finally:
        conn.close()
    
    print("All migrations checked/applied successfully.")

if __name__ == "__main__":
    run_migrations()
