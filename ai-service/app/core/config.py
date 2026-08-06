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

    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""
    AWS_DEFAULT_REGION: str = "ap-south-1"

    class Config:
        env_file = "../.env"
        extra = "ignore"

settings = Settings()
