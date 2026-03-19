import requests
import json
import time
from typing import Dict, Any

class ViraloTVAPITester:
    def __init__(self, base_url: str):
        self.base_url = base_url.rstrip('/')
        self.auth_token = None
        self.test_results = {}
        
    def log_test(self, test_name: str, success: bool, response_time: float, details: str = "", response_data: Any = None):
        """Log test results"""
        self.test_results[test_name] = {
            "success": success,
            "response_time_ms": round(response_time * 1000, 2),
            "details": details,
            "response_data": response_data
        }
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name} ({round(response_time * 1000, 2)}ms)")
        if details:
            print(f"    Details: {details}")
        if not success and response_data:
            print(f"    Response: {response_data}")
    
    def make_request(self, method: str, endpoint: str, data: Dict = None, auth: bool = False) -> tuple:
        """Make HTTP request and measure response time"""
        url = f"{self.base_url}{endpoint}"
        headers = {"Content-Type": "application/json"}
        
        if auth and self.auth_token:
            headers["Authorization"] = f"Bearer {self.auth_token}"
        
        print(f"Making {method} request to: {url}")
        
        start_time = time.time()
        try:
            if method == "GET":
                response = requests.get(url, headers=headers, timeout=30, verify=True)
            elif method == "POST":
                response = requests.post(url, headers=headers, json=data, timeout=30, verify=True)
            elif method == "DELETE":
                response = requests.delete(url, headers=headers, timeout=30, verify=True)
            else:
                raise ValueError(f"Unsupported method: {method}")
            
            response_time = time.time() - start_time
            print(f"Response status: {response.status_code}")
            
            try:
                response_data = response.json()
            except:
                response_data = response.text
                print(f"Response text: {response_data[:200]}...")
                
            return response.status_code, response_data, response_time
        except requests.RequestException as e:
            response_time = time.time() - start_time
            print(f"Request failed with error: {e}")
            return None, str(e), response_time
    
    def test_user_registration(self):
        """Test user registration"""
        test_data = {
            "email": "test@viralo.com",
            "password": "test123456",
            "name": "Test User"
        }
        
        status_code, response_data, response_time = self.make_request("POST", "/api/auth/register", test_data)
        
        if status_code == 200 and "access_token" in response_data:
            self.auth_token = response_data["access_token"]
            self.log_test("User Registration", True, response_time, "User registered successfully")
        elif status_code == 400 and "Email already registered" in str(response_data):
            self.log_test("User Registration", True, response_time, "Minor: User already exists (expected behavior)")
        else:
            self.log_test("User Registration", False, response_time, f"Status: {status_code}", response_data)
    
    def test_user_login(self):
        """Test user login"""
        test_data = {
            "email": "test@viralo.com",
            "password": "test123456"
        }
        
        status_code, response_data, response_time = self.make_request("POST", "/api/auth/login", test_data)
        
        if status_code == 200 and "access_token" in response_data:
            # Update token in case it's different
            self.auth_token = response_data["access_token"]
            self.log_test("User Login", True, response_time, "User logged in successfully")
        else:
            self.log_test("User Login", False, response_time, f"Status: {status_code}", response_data)
    
    def test_get_current_user(self):
        """Test get current user"""
        status_code, response_data, response_time = self.make_request("GET", "/api/auth/me", auth=True)
        
        if status_code == 200 and "email" in response_data:
            self.log_test("Get Current User", True, response_time, "User details retrieved successfully")
        else:
            self.log_test("Get Current User", False, response_time, f"Status: {status_code}", response_data)
    
    def test_create_series(self):
        """Test create series"""
        test_data = {
            "title": "Love & Revenge",
            "description": "A thrilling drama series",
            "thumbnail_url": "https://picsum.photos/400/600",
            "genre": "Drama"
        }
        
        status_code, response_data, response_time = self.make_request("POST", "/api/series", test_data, auth=True)
        
        if status_code == 200 and "id" in response_data:
            self.series_id = response_data["id"]
            self.log_test("Create Series", True, response_time, f"Series created with ID: {self.series_id}")
        elif status_code == 200 and "_id" in response_data:
            self.series_id = response_data["_id"]
            self.log_test("Create Series", True, response_time, f"Series created with ID: {self.series_id}")
        else:
            self.log_test("Create Series", False, response_time, f"Status: {status_code}", response_data)
            self.series_id = None
    
    def test_create_video_episode(self):
        """Test create video episode"""
        test_data = {
            "title": "The Beginning",
            "description": "Episode 1 of Love & Revenge",
            "cloudfront_url": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
            "thumbnail_url": "https://picsum.photos/400/600",
            "duration": 120,
            "genre": "Drama",
            "episode_number": 1,
            "is_premium": False,
            "tags": ["drama", "romance"]
        }
        
        if hasattr(self, 'series_id') and self.series_id:
            test_data["series_id"] = self.series_id
        
        status_code, response_data, response_time = self.make_request("POST", "/api/videos", test_data, auth=True)
        
        if status_code == 200 and "id" in response_data:
            self.video_id = response_data["id"]
            self.log_test("Create Video Episode", True, response_time, f"Episode created with ID: {self.video_id}")
        elif status_code == 200 and "_id" in response_data:
            self.video_id = response_data["_id"]
            self.log_test("Create Video Episode", True, response_time, f"Episode created with ID: {self.video_id}")
        else:
            self.log_test("Create Video Episode", False, response_time, f"Status: {status_code}", response_data)
            self.video_id = None
    
    def test_create_premium_video(self):
        """Test create premium video"""
        test_data = {
            "title": "Premium Show",
            "description": "This is a premium content",
            "cloudfront_url": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
            "thumbnail_url": "https://picsum.photos/400/600",
            "duration": 180,
            "genre": "Thriller",
            "is_premium": True,
            "tags": ["thriller", "suspense"]
        }
        
        status_code, response_data, response_time = self.make_request("POST", "/api/videos", test_data, auth=True)
        
        if status_code == 200 and ("id" in response_data or "_id" in response_data):
            premium_video_id = response_data.get("id") or response_data.get("_id")
            self.premium_video_id = premium_video_id
            self.log_test("Create Premium Video", True, response_time, f"Premium video created with ID: {premium_video_id}")
        else:
            self.log_test("Create Premium Video", False, response_time, f"Status: {status_code}", response_data)
            self.premium_video_id = None
    
    def test_get_all_videos(self):
        """Test get all videos"""
        status_code, response_data, response_time = self.make_request("GET", "/api/videos")
        
        if status_code == 200 and isinstance(response_data, list):
            self.log_test("Get All Videos", True, response_time, f"Retrieved {len(response_data)} videos")
        else:
            self.log_test("Get All Videos", False, response_time, f"Status: {status_code}", response_data)
    
    def test_get_single_video(self):
        """Test get single video"""
        if not hasattr(self, 'video_id') or not self.video_id:
            self.log_test("Get Single Video", False, 0, "No video ID available from previous test")
            return
        
        status_code, response_data, response_time = self.make_request("GET", f"/api/videos/{self.video_id}")
        
        if status_code == 200 and ("id" in response_data or "_id" in response_data):
            self.log_test("Get Single Video", True, response_time, f"Video details retrieved for ID: {self.video_id}")
        else:
            self.log_test("Get Single Video", False, response_time, f"Status: {status_code}", response_data)
    
    def test_get_trending_videos(self):
        """Test get trending videos"""
        status_code, response_data, response_time = self.make_request("GET", "/api/videos/trending/top")
        
        if status_code == 200 and isinstance(response_data, list):
            self.log_test("Get Trending Videos", True, response_time, f"Retrieved {len(response_data)} trending videos")
        else:
            self.log_test("Get Trending Videos", False, response_time, f"Status: {status_code}", response_data)
    
    def test_search_videos(self):
        """Test search videos"""
        status_code, response_data, response_time = self.make_request("GET", "/api/videos/search/Love")
        
        if status_code == 200 and isinstance(response_data, list):
            self.log_test("Search Videos", True, response_time, f"Found {len(response_data)} videos matching 'Love'")
        else:
            self.log_test("Search Videos", False, response_time, f"Status: {status_code}", response_data)
    
    def test_filter_videos_by_genre(self):
        """Test filter videos by genre"""
        status_code, response_data, response_time = self.make_request("GET", "/api/videos?genre=Drama")
        
        if status_code == 200 and isinstance(response_data, list):
            self.log_test("Filter Videos by Genre", True, response_time, f"Found {len(response_data)} drama videos")
        else:
            self.log_test("Filter Videos by Genre", False, response_time, f"Status: {status_code}", response_data)
    
    def test_add_to_my_list(self):
        """Test add to my list"""
        if not hasattr(self, 'video_id') or not self.video_id:
            self.log_test("Add to My List", False, 0, "No video ID available from previous test")
            return
        
        status_code, response_data, response_time = self.make_request("POST", f"/api/my-list/{self.video_id}", auth=True)
        
        if status_code == 200 and "message" in response_data:
            self.log_test("Add to My List", True, response_time, "Video added to My List successfully")
        else:
            self.log_test("Add to My List", False, response_time, f"Status: {status_code}", response_data)
    
    def test_get_my_list(self):
        """Test get my list"""
        status_code, response_data, response_time = self.make_request("GET", "/api/my-list", auth=True)
        
        if status_code == 200 and isinstance(response_data, list):
            self.log_test("Get My List", True, response_time, f"My List contains {len(response_data)} videos")
        else:
            self.log_test("Get My List", False, response_time, f"Status: {status_code}", response_data)
    
    def test_add_watch_history(self):
        """Test add watch history"""
        if not hasattr(self, 'video_id') or not self.video_id:
            self.log_test("Add Watch History", False, 0, "No video ID available from previous test")
            return
        
        test_data = {
            "video_id": self.video_id,
            "last_watched_position": 60,
            "completed": False
        }
        
        status_code, response_data, response_time = self.make_request("POST", "/api/watch-history", test_data, auth=True)
        
        if status_code == 200 and "message" in response_data:
            self.log_test("Add Watch History", True, response_time, "Watch history added successfully")
        else:
            self.log_test("Add Watch History", False, response_time, f"Status: {status_code}", response_data)
    
    def test_get_watch_history(self):
        """Test get watch history"""
        status_code, response_data, response_time = self.make_request("GET", "/api/watch-history", auth=True)
        
        if status_code == 200 and isinstance(response_data, list):
            self.log_test("Get Watch History", True, response_time, f"Watch history contains {len(response_data)} items")
        else:
            self.log_test("Get Watch History", False, response_time, f"Status: {status_code}", response_data)
    
    def test_get_series_episodes(self):
        """Test get series episodes"""
        if not hasattr(self, 'series_id') or not self.series_id:
            self.log_test("Get Series Episodes", False, 0, "No series ID available from previous test")
            return
        
        status_code, response_data, response_time = self.make_request("GET", f"/api/series/{self.series_id}/episodes")
        
        if status_code == 200 and isinstance(response_data, list):
            self.log_test("Get Series Episodes", True, response_time, f"Series has {len(response_data)} episodes")
        else:
            self.log_test("Get Series Episodes", False, response_time, f"Status: {status_code}", response_data)
    
    def test_get_genres(self):
        """Test get genres"""
        status_code, response_data, response_time = self.make_request("GET", "/api/genres")
        
        if status_code == 200 and "genres" in response_data:
            self.log_test("Get Genres", True, response_time, f"Retrieved {len(response_data['genres'])} genres")
        else:
            self.log_test("Get Genres", False, response_time, f"Status: {status_code}", response_data)
    
    def test_get_admin_stats(self):
        """Test get admin stats"""
        status_code, response_data, response_time = self.make_request("GET", "/api/admin/stats", auth=True)
        
        if status_code == 200 and "total_users" in response_data:
            self.log_test("Get Admin Stats", True, response_time, "Admin stats retrieved successfully")
        else:
            self.log_test("Get Admin Stats", False, response_time, f"Status: {status_code}", response_data)
    
    def test_remove_from_my_list(self):
        """Test remove from my list"""
        if not hasattr(self, 'video_id') or not self.video_id:
            self.log_test("Remove from My List", False, 0, "No video ID available from previous test")
            return
        
        status_code, response_data, response_time = self.make_request("DELETE", f"/api/my-list/{self.video_id}", auth=True)
        
        if status_code == 200 and "message" in response_data:
            self.log_test("Remove from My List", True, response_time, "Video removed from My List successfully")
        else:
            self.log_test("Remove from My List", False, response_time, f"Status: {status_code}", response_data)
    
    def test_subscription_upgrade(self):
        """Test subscription upgrade"""
        status_code, response_data, response_time = self.make_request("POST", "/api/subscription/upgrade", auth=True)
        
        if status_code == 200 and "message" in response_data:
            self.log_test("Subscription Upgrade", True, response_time, "Subscription upgraded successfully")
        else:
            self.log_test("Subscription Upgrade", False, response_time, f"Status: {status_code}", response_data)
    
    def run_all_tests(self):
        """Run all tests in sequence"""
        print("🚀 Starting Viralo TV API Tests")
        print("=" * 60)
        
        # Authentication tests
        self.test_user_registration()
        self.test_user_login()
        self.test_get_current_user()
        
        # Content creation tests
        self.test_create_series()
        self.test_create_video_episode()
        self.test_create_premium_video()
        
        # Video retrieval tests
        self.test_get_all_videos()
        self.test_get_single_video()
        self.test_get_trending_videos()
        self.test_search_videos()
        self.test_filter_videos_by_genre()
        
        # User interaction tests
        self.test_add_to_my_list()
        self.test_get_my_list()
        self.test_add_watch_history()
        self.test_get_watch_history()
        
        # Series tests
        self.test_get_series_episodes()
        
        # Metadata tests
        self.test_get_genres()
        self.test_get_admin_stats()
        
        # Cleanup tests
        self.test_remove_from_my_list()
        self.test_subscription_upgrade()
        
        # Summary
        self.print_summary()
    
    def print_summary(self):
        """Print test summary"""
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        
        passed = sum(1 for result in self.test_results.values() if result["success"])
        failed = len(self.test_results) - passed
        avg_response_time = sum(result["response_time_ms"] for result in self.test_results.values()) / len(self.test_results)
        
        print(f"✅ Passed: {passed}")
        print(f"❌ Failed: {failed}")
        print(f"⏱️  Average Response Time: {avg_response_time:.2f}ms")
        print(f"📈 Success Rate: {(passed / len(self.test_results)) * 100:.1f}%")
        
        if failed > 0:
            print("\n🔥 FAILED TESTS:")
            for test_name, result in self.test_results.items():
                if not result["success"]:
                    print(f"   • {test_name}: {result['details']}")
        
        print("=" * 60)


if __name__ == "__main__":
    # Use the backend URL from environment variable
    API_BASE_URL = "https://viralo-replica.preview.emergentagent.com"
    
    print(f"Testing API at: {API_BASE_URL}")
    tester = ViraloTVAPITester(API_BASE_URL)
    tester.run_all_tests()