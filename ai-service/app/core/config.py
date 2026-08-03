from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    POSTGRES_USER: str = "hexa_admin"
    POSTGRES_PASSWORD: str = "hexa_secure_2024"
    POSTGRES_DB: str = "hexa_medplus_db"
    POSTGRES_HOST: str = "postgres" 
    POSTGRES_PORT: int = 5432
    
    KAFKA_BOOTSTRAP_SERVERS: str = "kafka:9092"
    
    NVIDIA_NIM_API_KEY: str = ""
    CUSTOM_LLM_BASE_URL: str = ""
    TAVILY_API_KEY: str = ""

    class Config:
        env_file = "../.env"

settings = Settings()
