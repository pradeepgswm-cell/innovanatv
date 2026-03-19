from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta
from typing import List, Optional
from pydantic import BaseModel, Field, EmailStr
from bson import ObjectId
import os
import logging
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'viralo_db')]

# Security
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
SECRET_KEY = os.environ.get('SECRET_KEY', 'your-secret-key-change-in-production')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 30

security = HTTPBearer()

# Create the main app
app = FastAPI(title="Viralo TV API")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


# ==================== MODELS ====================

class PyObjectId(ObjectId):
    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v):
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid objectid")
        return ObjectId(v)

    @classmethod
    def __get_pydantic_json_schema__(cls, field_schema):
        field_schema.update(type="string")


class UserRegister(BaseModel):
    email: EmailStr
    password: str
    name: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class User(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    email: EmailStr
    name: str
    subscription_status: str = "free"  # free, premium
    subscription_expiry: Optional[datetime] = None
    watch_history: List[dict] = []
    my_list: List[str] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str}


class Token(BaseModel):
    access_token: str
    token_type: str
    user: User


class VideoCreate(BaseModel):
    title: str
    description: str
    cloudfront_url: str
    thumbnail_url: str
    duration: int  # in seconds
    genre: str
    series_id: Optional[str] = None
    episode_number: Optional[int] = None
    is_premium: bool = False
    tags: List[str] = []


class Video(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    title: str
    description: str
    cloudfront_url: str
    thumbnail_url: str
    duration: int
    genre: str
    series_id: Optional[str] = None
    episode_number: Optional[int] = None
    is_premium: bool = False
    views_count: int = 0
    upload_date: datetime = Field(default_factory=datetime.utcnow)
    tags: List[str] = []

    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str}


class SeriesCreate(BaseModel):
    title: str
    description: str
    thumbnail_url: str
    genre: str


class Series(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    title: str
    description: str
    thumbnail_url: str
    genre: str
    total_episodes: int = 0
    episodes: List[str] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str}


class WatchHistoryCreate(BaseModel):
    video_id: str
    last_watched_position: int  # in seconds
    completed: bool = False


class WatchHistory(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    user_id: str
    video_id: str
    last_watched_position: int
    completed: bool
    watched_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str}


# ==================== UTILITY FUNCTIONS ====================

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password):
    return pwd_context.hash(password)


def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = await db.users.find_one({"email": email})
    if user is None:
        raise credentials_exception
    
    user["_id"] = str(user["_id"])
    return User(**user)


# ==================== AUTHENTICATION ROUTES ====================

@api_router.post("/auth/register", response_model=Token)
async def register(user_data: UserRegister):
    # Check if user already exists
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create new user
    hashed_password = get_password_hash(user_data.password)
    user_dict = {
        "email": user_data.email,
        "name": user_data.name,
        "password": hashed_password,
        "subscription_status": "free",
        "subscription_expiry": None,
        "watch_history": [],
        "my_list": [],
        "created_at": datetime.utcnow()
    }
    
    result = await db.users.insert_one(user_dict)
    user_dict["_id"] = str(result.inserted_id)
    
    # Create access token
    access_token = create_access_token(data={"sub": user_data.email})
    
    # Remove password from response
    user_dict.pop("password", None)
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": User(**user_dict)
    }


@api_router.post("/auth/login", response_model=Token)
async def login(user_data: UserLogin):
    user = await db.users.find_one({"email": user_data.email})
    if not user or not verify_password(user_data.password, user["password"]):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    
    access_token = create_access_token(data={"sub": user_data.email})
    user["_id"] = str(user["_id"])
    user.pop("password", None)
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": User(**user)
    }


@api_router.get("/auth/me", response_model=User)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user


# ==================== VIDEO ROUTES ====================

@api_router.post("/videos", response_model=Video)
async def create_video(video_data: VideoCreate, current_user: User = Depends(get_current_user)):
    video_dict = video_data.dict()
    video_dict["views_count"] = 0
    video_dict["upload_date"] = datetime.utcnow()
    
    result = await db.videos.insert_one(video_dict)
    video_dict["_id"] = str(result.inserted_id)
    
    # If part of series, update series
    if video_data.series_id:
        await db.series.update_one(
            {"_id": ObjectId(video_data.series_id)},
            {
                "$push": {"episodes": str(result.inserted_id)},
                "$inc": {"total_episodes": 1}
            }
        )
    
    return Video(**video_dict)


@api_router.get("/videos", response_model=List[Video])
async def get_videos(
    genre: Optional[str] = None,
    is_premium: Optional[bool] = None,
    limit: int = 50,
    skip: int = 0
):
    query = {}
    if genre:
        query["genre"] = genre
    if is_premium is not None:
        query["is_premium"] = is_premium
    
    videos = await db.videos.find(query).sort("upload_date", -1).skip(skip).limit(limit).to_list(limit)
    for video in videos:
        video["_id"] = str(video["_id"])
    
    return [Video(**video) for video in videos]


@api_router.get("/videos/{video_id}", response_model=Video)
async def get_video(video_id: str):
    if not ObjectId.is_valid(video_id):
        raise HTTPException(status_code=400, detail="Invalid video ID")
    
    video = await db.videos.find_one({"_id": ObjectId(video_id)})
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    
    # Increment view count
    await db.videos.update_one({"_id": ObjectId(video_id)}, {"$inc": {"views_count": 1}})
    video["views_count"] += 1
    video["_id"] = str(video["_id"])
    
    return Video(**video)


@api_router.delete("/videos/{video_id}")
async def delete_video(video_id: str, current_user: User = Depends(get_current_user)):
    if not ObjectId.is_valid(video_id):
        raise HTTPException(status_code=400, detail="Invalid video ID")
    
    result = await db.videos.delete_one({"_id": ObjectId(video_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Video not found")
    
    return {"message": "Video deleted successfully"}


@api_router.get("/videos/trending/top", response_model=List[Video])
async def get_trending_videos(limit: int = 20):
    videos = await db.videos.find().sort("views_count", -1).limit(limit).to_list(limit)
    for video in videos:
        video["_id"] = str(video["_id"])
    
    return [Video(**video) for video in videos]


@api_router.get("/videos/search/{query}", response_model=List[Video])
async def search_videos(query: str, limit: int = 50):
    videos = await db.videos.find({
        "$or": [
            {"title": {"$regex": query, "$options": "i"}},
            {"description": {"$regex": query, "$options": "i"}},
            {"tags": {"$regex": query, "$options": "i"}}
        ]
    }).limit(limit).to_list(limit)
    
    for video in videos:
        video["_id"] = str(video["_id"])
    
    return [Video(**video) for video in videos]


# ==================== SERIES ROUTES ====================

@api_router.post("/series", response_model=Series)
async def create_series(series_data: SeriesCreate, current_user: User = Depends(get_current_user)):
    series_dict = series_data.dict()
    series_dict["total_episodes"] = 0
    series_dict["episodes"] = []
    series_dict["created_at"] = datetime.utcnow()
    
    result = await db.series.insert_one(series_dict)
    series_dict["_id"] = str(result.inserted_id)
    
    return Series(**series_dict)


@api_router.get("/series", response_model=List[Series])
async def get_all_series(limit: int = 50, skip: int = 0):
    series_list = await db.series.find().skip(skip).limit(limit).to_list(limit)
    for series in series_list:
        series["_id"] = str(series["_id"])
    
    return [Series(**series) for series in series_list]


@api_router.get("/series/{series_id}", response_model=Series)
async def get_series(series_id: str):
    if not ObjectId.is_valid(series_id):
        raise HTTPException(status_code=400, detail="Invalid series ID")
    
    series = await db.series.find_one({"_id": ObjectId(series_id)})
    if not series:
        raise HTTPException(status_code=404, detail="Series not found")
    
    series["_id"] = str(series["_id"])
    return Series(**series)


@api_router.get("/series/{series_id}/episodes", response_model=List[Video])
async def get_series_episodes(series_id: str):
    if not ObjectId.is_valid(series_id):
        raise HTTPException(status_code=400, detail="Invalid series ID")
    
    videos = await db.videos.find({"series_id": series_id}).sort("episode_number", 1).to_list(100)
    for video in videos:
        video["_id"] = str(video["_id"])
    
    return [Video(**video) for video in videos]


# ==================== WATCH HISTORY ROUTES ====================

@api_router.post("/watch-history")
async def add_watch_history(history_data: WatchHistoryCreate, current_user: User = Depends(get_current_user)):
    history_dict = history_data.dict()
    history_dict["user_id"] = current_user.id
    history_dict["watched_at"] = datetime.utcnow()
    
    # Check if already exists
    existing = await db.watch_history.find_one({
        "user_id": current_user.id,
        "video_id": history_data.video_id
    })
    
    if existing:
        # Update existing
        await db.watch_history.update_one(
            {"_id": existing["_id"]},
            {
                "$set": {
                    "last_watched_position": history_data.last_watched_position,
                    "completed": history_data.completed,
                    "watched_at": datetime.utcnow()
                }
            }
        )
        return {"message": "Watch history updated"}
    else:
        # Create new
        await db.watch_history.insert_one(history_dict)
        return {"message": "Watch history added"}


@api_router.get("/watch-history", response_model=List[dict])
async def get_watch_history(current_user: User = Depends(get_current_user), limit: int = 50):
    history_list = await db.watch_history.find({"user_id": current_user.id}).sort("watched_at", -1).limit(limit).to_list(limit)
    
    # Fetch video details for each history item
    result = []
    for history in history_list:
        if ObjectId.is_valid(history["video_id"]):
            video = await db.videos.find_one({"_id": ObjectId(history["video_id"])})
            if video:
                video["_id"] = str(video["_id"])
                result.append({
                    "video": Video(**video),
                    "last_watched_position": history["last_watched_position"],
                    "completed": history["completed"],
                    "watched_at": history["watched_at"]
                })
    
    return result


# ==================== MY LIST ROUTES ====================

@api_router.post("/my-list/{video_id}")
async def add_to_my_list(video_id: str, current_user: User = Depends(get_current_user)):
    if not ObjectId.is_valid(video_id):
        raise HTTPException(status_code=400, detail="Invalid video ID")
    
    # Check if video exists
    video = await db.videos.find_one({"_id": ObjectId(video_id)})
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    
    # Add to my_list
    await db.users.update_one(
        {"_id": ObjectId(current_user.id)},
        {"$addToSet": {"my_list": video_id}}
    )
    
    return {"message": "Added to My List"}


@api_router.delete("/my-list/{video_id}")
async def remove_from_my_list(video_id: str, current_user: User = Depends(get_current_user)):
    await db.users.update_one(
        {"_id": ObjectId(current_user.id)},
        {"$pull": {"my_list": video_id}}
    )
    
    return {"message": "Removed from My List"}


@api_router.get("/my-list", response_model=List[Video])
async def get_my_list(current_user: User = Depends(get_current_user)):
    user = await db.users.find_one({"_id": ObjectId(current_user.id)})
    my_list = user.get("my_list", [])
    
    videos = []
    for video_id in my_list:
        if ObjectId.is_valid(video_id):
            video = await db.videos.find_one({"_id": ObjectId(video_id)})
            if video:
                video["_id"] = str(video["_id"])
                videos.append(Video(**video))
    
    return videos


# ==================== SUBSCRIPTION ROUTES ====================

@api_router.post("/subscription/upgrade")
async def upgrade_subscription(current_user: User = Depends(get_current_user)):
    # This is a placeholder - integrate with payment gateway (Stripe)
    expiry = datetime.utcnow() + timedelta(days=30)
    
    await db.users.update_one(
        {"_id": ObjectId(current_user.id)},
        {
            "$set": {
                "subscription_status": "premium",
                "subscription_expiry": expiry
            }
        }
    )
    
    return {"message": "Subscription upgraded to premium", "expiry": expiry}


@api_router.get("/subscription/status")
async def get_subscription_status(current_user: User = Depends(get_current_user)):
    return {
        "status": current_user.subscription_status,
        "expiry": current_user.subscription_expiry
    }


# ==================== GENRES ====================

@api_router.get("/genres")
async def get_genres():
    return {
        "genres": [
            "Drama",
            "Romance",
            "Thriller",
            "Revenge",
            "Comedy",
            "Action",
            "Horror",
            "Mystery",
            "Family"
        ]
    }


# ==================== ADMIN STATS ====================

@api_router.get("/admin/stats")
async def get_admin_stats(current_user: User = Depends(get_current_user)):
    total_users = await db.users.count_documents({})
    total_videos = await db.videos.count_documents({})
    total_series = await db.series.count_documents({})
    premium_users = await db.users.count_documents({"subscription_status": "premium"})
    
    return {
        "total_users": total_users,
        "total_videos": total_videos,
        "total_series": total_series,
        "premium_users": premium_users
    }


# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
