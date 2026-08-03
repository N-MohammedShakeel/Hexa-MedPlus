import logging
import sys

# Configure a standard logger for the application
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)]
)

logger = logging.getLogger("hexa_ai")

def log_info(msg: str):
    logger.info(msg)

def log_warn(msg: str):
    logger.warning(msg)

def log_error(msg: str):
    logger.error(msg)
