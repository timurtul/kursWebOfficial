// API Configuration
// Otomatik olarak mevcut hostname'i kullan (localhost veya production)
const API_BASE_URL = `${window.location.protocol}//${window.location.host}/api`;

// Local Storage Keys
const STORAGE_KEYS = {
  TOKEN: 'auth_token',
  USER: 'user_data'
};

// API Helper Functions
class API {
  // Get auth token from localStorage
  static getToken() {
    return localStorage.getItem(STORAGE_KEYS.TOKEN);
  }

  // Save token to localStorage
  static saveToken(token) {
    localStorage.setItem(STORAGE_KEYS.TOKEN, token);
  }

  // Get user data from localStorage
  static getUser() {
    const userData = localStorage.getItem(STORAGE_KEYS.USER);
    return userData ? JSON.parse(userData) : null;
  }

  // Save user data to localStorage
  static saveUser(user) {
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
  }

  // Clear auth data
  static clearAuth() {
    localStorage.removeItem(STORAGE_KEYS.TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER);
  }

  // Check if user is authenticated
  static isAuthenticated() {
    return !!this.getToken();
  }

  // Make authenticated API request
  static async request(endpoint, options = {}) {
    const token = this.getToken();
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Bir hata oluştu');
      }

      return data;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }

  // Auth endpoints
  static async register(email, password, name) {
    const data = await this.request('/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name })
    });
    
    if (data.token) {
      this.saveToken(data.token);
      this.saveUser(data.user);
    }
    
    return data;
  }

  static async login(email, password) {
    const data = await this.request('/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    
    if (data.token) {
      this.saveToken(data.token);
      this.saveUser(data.user);
    }
    
    return data;
  }

  static logout() {
    this.clearAuth();
    window.location.href = '/';
  }

  // Course endpoints
  static async getCourses() {
    return this.request('/courses');
  }

  static async getCourse(courseId) {
    return this.request(`/courses/${courseId}`);
  }

  // Video streaming için çok kısa süreli token al (20 saniye geçerli)
  // Bu token URL'de görünür ama çok kısa süreli olduğu için güvenlik riski çok düşük
  // Video hemen yüklenmeye başlar (progressive loading)
  static async getVideoStreamUrl(courseId, videoFile) {
    const token = this.getToken();
    if (!token) {
      throw new Error('Giriş yapmanız gerekiyor');
    }

    try {
      // Çok kısa süreli stream token al (2 dakika)
      const tokenUrl = `${API_BASE_URL}/courses/${courseId}/videos/${encodeURIComponent(videoFile)}/stream-token`;
      const response = await fetch(tokenUrl, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `Token alınamadı: ${response.status}`;
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.error || errorMessage;
        } catch (e) {
          if (errorText) {
            errorMessage = errorText;
          }
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      const streamToken = data.token;

      // Video URL'ini stream token ile oluştur
      // Token URL'de görünür ama sadece 2 dakika geçerli
      return `${API_BASE_URL}/courses/${courseId}/videos/${encodeURIComponent(videoFile)}?token=${streamToken}`;
    } catch (error) {
      console.error('Stream token alma hatası:', error);
      throw error;
    }
  }

  // Fallback: Blob URL (küçük videolar için - MediaSource desteklenmiyorsa)
  static async getVideoBlobUrlFallback(courseId, videoFile) {
    const token = this.getToken();
    if (!token) {
      throw new Error('Giriş yapmanız gerekiyor');
    }

    const url = `${API_BASE_URL}/courses/${courseId}/videos/${encodeURIComponent(videoFile)}`;
    
    try {
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `Video yüklenemedi: ${response.status}`;
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.error || errorMessage;
        } catch (e) {
          if (errorText) {
            errorMessage = errorText;
          }
        }
        throw new Error(errorMessage);
      }

      const blob = await response.blob();
      return URL.createObjectURL(blob);
    } catch (error) {
      console.error('Video fetch hatası:', error);
      throw error;
    }
  }

  // Purchase endpoints
  static async purchaseCourse(courseId, paymentMethod = 'credit_card') {
    return this.request('/purchase', {
      method: 'POST',
      body: JSON.stringify({ courseId, paymentMethod })
    });
  }

  static async getMyCourses() {
    return this.request('/my-courses');
  }

  // Access code verification (token olmadan da çalışır)
  static async verifyAccessCode(code, courseId) {
    const token = this.getToken();
    const headers = {
      'Content-Type': 'application/json'
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    try {
      const response = await fetch(`${API_BASE_URL}/verify-access-code`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ code, courseId })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Bir hata oluştu');
      }
      
      if (data.token) {
        this.saveToken(data.token);
        this.saveUser({ id: data.userId, email: data.email || 'guest@videokurs.com', name: 'Misafir Kullanıcı' });
      }
      
      return data;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = API;
}

