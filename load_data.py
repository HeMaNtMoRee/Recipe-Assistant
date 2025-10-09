import pandas as pd
from pymongo import MongoClient
import sys
import os
from dotenv import load_dotenv

# --- Configuration ---
MONGO_URI = os.environ.get('MONGO_URI')
DB_NAME = os.environ.get('DB_NAME')
COLLECTION_NAME = os.environ.get('COLLECTION_NAME')

CSV_PATH = os.environ.get('CSV_PATH')
CHUNK_SIZE = os.environ.get('CHUNK_SIZE')
MAX_ROWS_TO_LOAD = os.environ.get('MAX_ROWS_TO_LOAD')

def stream_csv_to_mongodb():
    print("Connecting to MongoDB...")
    try:
        client = MongoClient(MONGO_URI)
        db = client[DB_NAME]
        collection = db[COLLECTION_NAME]
        
        # Clear the collection before loading new data to avoid duplicates
        print(f"Clearing existing data from '{COLLECTION_NAME}' collection...")
        collection.delete_many({})
        
        collection.create_index("title")
        print("Successfully connected to MongoDB.")
    except Exception as e:
        print(f"Error: Could not connect to MongoDB. \nDetails: {e}")
        return

    print(f"Starting to load a maximum of {MAX_ROWS_TO_LOAD} rows from {CSV_PATH}...")
    total_rows_inserted = 0
    
    try:
        csv_iterator = pd.read_csv(CSV_PATH, chunksize=CHUNK_SIZE, iterator=True)

        for i, chunk in enumerate(csv_iterator):
            if total_rows_inserted >= MAX_ROWS_TO_LOAD:
                print(f"Reached the limit of {MAX_ROWS_TO_LOAD} rows. Stopping.")
                break

            # --- Data Cleaning ---
            if 'Unnamed: 0' in chunk.columns:
                chunk = chunk.rename(columns={'Unnamed: 0': 'id'})
            for col in ['ingredients', 'directions', 'NER']:
                chunk[col] = chunk[col].apply(safe_eval)

            records = chunk.to_dict(orient='records')
            
            # --- Insert into MongoDB ---
            if records:
                collection.insert_many(records)
                total_rows_inserted += len(records)
                print(f"  ... Inserted chunk {i+1}, total rows: {total_rows_inserted}")

        print("\nData loading complete!")
        print(f"Successfully inserted a total of {total_rows_inserted} recipes.")

    except Exception as e:
        print(f"An error occurred: {e}")
    finally:
        client.close()
        print("MongoDB connection closed.")


def safe_eval(val):
    if isinstance(val, str):
        try:
            from ast import literal_eval
            return literal_eval(val)
        except (ValueError, SyntaxError):
            return []
    return val if isinstance(val, list) else []


if __name__ == '__main__':
    stream_csv_to_mongodb()