import os
import json
import logging
from services.summarization_service import SummarizationService
from db import get_db_connection

# Set up logging
logging.basicConfig(level=logging.INFO,
                    format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def create_test_summary_json(output_dir="test_results", meeting_id=1):
    """
    Create a test summary.json file with sample data for testing
    """
    # Ensure directory exists
    os.makedirs(output_dir, exist_ok=True)
    
    # Sample summary data
    summary_data = [
        {
            "chunk": 1,
            "timestamp": "00:01:35-00:02:20",
            "text": "Team decided to prioritize the new analytics feature for Q3.",
            "importance": 9
        },
        {
            "chunk": 2,
            "timestamp": "00:05:12-00:05:45",
            "text": "Budget for marketing campaign was increased by 15%.",
            "importance": 8
        },
        {
            "chunk": 3,
            "timestamp": "00:12:30-00:13:10",
            "text": "Weekly team meetings will now be held on Thursdays instead of Tuesdays.",
            "importance": 7
        },
        {
            "chunk": 4,
            "timestamp": "00:18:45-00:19:30",
            "text": "John will take responsibility for the client presentation next week.",
            "importance": 8
        },
        {
            "chunk": 5,
            "timestamp": "00:25:10-00:26:00",
            "text": "Product launch date confirmed for September 15th.",
            "importance": 10
        }
    ]
    
    # Write to summary.json file
    summary_json_path = os.path.join(output_dir, "summary.json")
    with open(summary_json_path, 'w', encoding='utf-8') as f:
        json.dump(summary_data, f, ensure_ascii=False, indent=2)
    
    logger.info(f"Created test summary.json at {summary_json_path}")
    return summary_json_path

def verify_database_insertion(meeting_id):
    """
    Verify the summary data was inserted into the meeting_summaries table
    """
    with get_db_connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute("""
            SELECT summary_id, summary_type, content, created_at
            FROM meeting_summaries
            WHERE meeting_id = %s AND summary_type = 'detailed'
            """, (meeting_id,))
            
            result = cursor.fetchone()
            
            if result:
                logger.info(f"Successfully found meeting summary in database with ID {result[0]}")
                logger.info(f"Summary type: {result[1]}")
                logger.info(f"Created at: {result[3]}")
                logger.info(f"Content preview: {result[2][:100]}...")
                return True
            else:
                logger.error(f"No detailed summary found for meeting ID {meeting_id}")
                return False

def cleanup(test_dir="test_results"):
    """
    Clean up test files
    """
    try:
        if os.path.exists(os.path.join(test_dir, "summary.json")):
            os.remove(os.path.join(test_dir, "summary.json"))
            
        if os.path.exists(test_dir):
            os.rmdir(test_dir)
            
        logger.info(f"Cleaned up test directory {test_dir}")
    except Exception as e:
        logger.error(f"Error during cleanup: {e}")

def main():
    """
    Main test function
    """
    # Test meeting ID - make sure this exists in your database
    meeting_id = 1
    test_dir = "test_results"
    
    try:
        # Create a test summary.json file
        summary_json_path = create_test_summary_json(test_dir, meeting_id)
        
        # Process the summary.json file
        logger.info(f"Processing summary.json for meeting ID {meeting_id}")
        result = SummarizationService._process_summary_json(meeting_id, summary_json_path)
        
        if result:
            logger.info("Summary processing completed successfully")
            
            # Verify the database insertion
            if verify_database_insertion(meeting_id):
                logger.info("✅ Test passed: Summary.json was successfully processed and inserted into the database")
            else:
                logger.error("❌ Test failed: Could not verify database insertion")
        else:
            logger.error("❌ Test failed: Summary processing failed")
            
    except Exception as e:
        logger.error(f"❌ Test error: {e}")
    finally:
        # Cleanup
        cleanup(test_dir)

if __name__ == "__main__":
    main() 