# Author : Sree Karan H
import os
import redis
import redis.asyncio as redis_async
from config.api_config import Config

class RedisClient:
    def __init__(self):
        
        url = f"redis://{':' + Config.REDIS_PASSWORD + '@' if Config.REDIS_PASSWORD else ''}{Config.REDIS_HOST}:{Config.REDIS_PORT}/{Config.REDIS_DB}"

        self.redis = redis_async.from_url(
            url,
            decode_responses=True,
            socket_connect_timeout=5,   
            socket_timeout=5,           
            retry_on_timeout=True,
            health_check_interval=30
        )

    async def get(self, key: str):
        return await self.redis.get(key)

    async def set(self, key: str, value: str):
        await self.redis.set(key, value)

    async def delete(self, key: str):
        return await self.redis.delete(key)

    async def delete_many(self, *keys):
        return await self.redis.delete(*keys)
            
    async def close(self):
        await self.redis.close()