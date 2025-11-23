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

  // Video'yu MediaSource API ile progressive loading yap (büyük videolar için)
  // Token URL'de görünmez, sadece fetch isteklerinde header'da gönderilir
  static async setupVideoStream(videoElement, courseId, videoFile) {
    const token = this.getToken();
    if (!token) {
      throw new Error('Giriş yapmanız gerekiyor');
    }

    const url = `${API_BASE_URL}/courses/${courseId}/videos/${encodeURIComponent(videoFile)}`;
    
    // MediaSource API desteği kontrolü
    if (!window.MediaSource || !MediaSource.isTypeSupported('video/mp4; codecs="avc1.42E01E, mp4a.40.2"')) {
      console.warn('MediaSource API desteklenmiyor, blob URL kullanılıyor (küçük videolar için)');
      return this.getVideoBlobUrlFallback(courseId, videoFile);
    }

    return new Promise((resolve, reject) => {
      const mediaSource = new MediaSource();
      const sourceUrl = URL.createObjectURL(mediaSource);
      
      videoElement.src = sourceUrl;

      mediaSource.addEventListener('sourceopen', async () => {
        try {
          const sourceBuffer = mediaSource.addSourceBuffer('video/mp4; codecs="avc1.42E01E, mp4a.40.2"');
          
          // İlk chunk'ı yükle (video metadata için)
          const firstChunkSize = 2 * 1024 * 1024; // 2MB
          const response = await fetch(url, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Range': `bytes=0-${firstChunkSize - 1}`
            }
          });

          if (!response.ok && response.status !== 206) {
            throw new Error(`Video yüklenemedi: ${response.status}`);
          }

          const arrayBuffer = await response.arrayBuffer();
          
          // Content-Range header'ından toplam boyutu al
          const contentRange = response.headers.get('Content-Range');
          const totalSize = contentRange ? parseInt(contentRange.split('/')[1]) : response.headers.get('Content-Length');
          
          sourceBuffer.addEventListener('updateend', async () => {
            if (!sourceBuffer.updating && mediaSource.readyState === 'open') {
              // İlk chunk yüklendi, kalan video'yu yükle
              try {
                await this.loadVideoChunks(url, token, sourceBuffer, firstChunkSize, parseInt(totalSize), mediaSource);
                mediaSource.endOfStream();
                resolve(sourceUrl);
              } catch (error) {
                console.error('Video chunk yükleme hatası:', error);
                reject(error);
              }
            }
          }, { once: true });

          sourceBuffer.appendBuffer(arrayBuffer);
        } catch (error) {
          console.error('MediaSource hatası:', error);
          reject(error);
        }
      });

      mediaSource.addEventListener('error', (e) => {
        reject(new Error('MediaSource hatası: ' + e.message));
      });
    });
  }

  // Video chunk'larını yükle (progressive loading)
  static async loadVideoChunks(url, token, sourceBuffer, startByte, totalSize, mediaSource) {
    const chunkSize = 5 * 1024 * 1024; // 5MB chunks
    let currentByte = startByte;

    while (currentByte < totalSize && mediaSource.readyState === 'open') {
      // Buffer doluysa bekle
      if (sourceBuffer.updating) {
        await new Promise(resolve => {
          sourceBuffer.addEventListener('updateend', resolve, { once: true });
        });
      }

      // Buffer doluysa tekrar bekle
      if (sourceBuffer.buffered.length > 0) {
        const bufferedEnd = sourceBuffer.buffered.end(sourceBuffer.buffered.length - 1);
        if (bufferedEnd >= totalSize * 0.9) {
          // %90'ı yüklendi, yeterli
          break;
        }
      }

      const endByte = Math.min(currentByte + chunkSize - 1, totalSize - 1);
      
      try {
        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Range': `bytes=${currentByte}-${endByte}`
          }
        });

        if (!response.ok && response.status !== 206) {
          break; // Hata varsa dur
        }

        const arrayBuffer = await response.arrayBuffer();
        
        if (sourceBuffer.updating) {
          await new Promise(resolve => {
            sourceBuffer.addEventListener('updateend', resolve, { once: true });
          });
        }

        if (mediaSource.readyState === 'open') {
          sourceBuffer.appendBuffer(arrayBuffer);
          currentByte = endByte + 1;
        } else {
          break; // MediaSource kapandı
        }
      } catch (error) {
        console.error('Chunk yükleme hatası:', error);
        break;
      }
    }
  }

  // Fallback: Blob URL (MediaSource desteklenmiyorsa veya küçük videolar için)
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

