// Mobile Menu Toggle
function toggleMobileMenu() {
    const mobileMenu = document.getElementById('mobileMenu');
    if (mobileMenu) {
        mobileMenu.classList.toggle('active');
    }
}

// Shopier satın alma sayfasına yönlendir
function redirectToShopier() {
    window.location.href = 'https://www.shopier.com/timurtul/41476030';
}

// Smooth scroll to form (eski fonksiyon, artık Shopier'e yönlendiriyor)
function scrollToForm() {
    redirectToShopier();
}

// FAQ Toggle
function toggleFaq(element) {
    const faqItem = element.parentElement;
    const isActive = faqItem.classList.contains('active');
    
    // Close all FAQ items
    document.querySelectorAll('.faq-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Open clicked item if it wasn't active
    if (!isActive) {
        faqItem.classList.add('active');
    }
}

// Video placeholder click handler - Backend entegrasyonu
const PREVIEW_IMAGE_FALLBACK = 'https://vekilify.com/thumb.png';

document.addEventListener('DOMContentLoaded', function() {
    const videoPlaceholder = document.querySelector('.video-placeholder');
    
    if (videoPlaceholder) {
        setPlaceholderImage(videoPlaceholder);
        videoPlaceholder.addEventListener('click', async function() {
            const previewUrl = this.dataset.previewVideo;
            if (previewUrl) {
                insertVideo(this.parentElement, previewUrl);
                return;
            }

            // Kullanıcı giriş yapmış mı kontrol et
            if (!API.isAuthenticated()) {
                alert('Video izlemek için önce giriş yapmanız ve kursu satın almanız gerekiyor.');
                scrollToForm();
                return;
            }
            
            // Kurs ID (varsayılan 1, dinamik yapılabilir)
            const courseId = 1;
            
            try {
                // Kullanıcının kursa erişimi var mı kontrol et
                const myCourses = await API.getMyCourses();
                const hasAccess = myCourses.some(c => c.id === courseId);
                
                if (!hasAccess) {
                    alert('Bu videoyu izlemek için kursu satın almanız gerekiyor.');
                    scrollToForm();
                    return;
                }
                
                // Kurs bilgilerini al
                const course = await API.getCourse(courseId);
                
                // İlk videoyu oynat (veya video seçici göster)
                const firstVideo = course.modules[0];
                if (firstVideo) {
                    const videoUrl = API.getVideoUrl(courseId, firstVideo.fileName);
                    
                    // HTML5 video player oluştur
                    insertVideo(this.parentElement, videoUrl);
                }
            } catch (error) {
                console.error('Video yükleme hatası:', error);
                alert('Video yüklenirken bir hata oluştu: ' + error.message);
            }
        });
    }
});

function setPlaceholderImage(element) {
    if (!element) return;
    const image = element.dataset.previewImage || PREVIEW_IMAGE_FALLBACK;
    element.style.backgroundImage = `linear-gradient(180deg, rgba(15, 11, 54, 0.88), rgba(15, 11, 54, 0.7)), url('${image}')`;
}

function insertVideo(container, src) {
    container.innerHTML = '';
    
    // Loading indicator with progress
    const loader = document.createElement('div');
    loader.className = 'video-loader';
    const loaderInner = document.createElement('div');
    loaderInner.style.cssText = 'position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); z-index: 10; text-align: center; color: white;';
    loaderInner.innerHTML = `
        <div style="width: 50px; height: 50px; border: 4px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 10px;"></div>
        <div style="font-size: 14px; opacity: 0.9;" id="loadingText">Video yükleniyor...</div>
        <div style="width: 200px; height: 4px; background: rgba(255,255,255,0.2); border-radius: 2px; margin: 10px auto 0; overflow: hidden;">
            <div id="loadingProgress" style="width: 0%; height: 100%; background: white; transition: width 0.3s ease;"></div>
        </div>
    `;
    loader.style.cssText = 'position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 9;';
    loader.appendChild(loaderInner);
    container.appendChild(loader);
    
    const video = document.createElement('video');
    video.src = src;
    video.controls = true;
    video.autoplay = false;
    video.muted = false;
    video.setAttribute('playsinline', '');
    // Preload stratejisini iyileştir - video içeriğini de yükle
    video.preload = 'auto';
    video.volume = 1;
    video.style.width = '100%';
    video.style.height = '100%';
    video.style.objectFit = 'cover';
    video.style.position = 'absolute';
    video.style.top = '0';
    video.style.left = '0';
    
    // Buffering stratejisi ekle
    video.setAttribute('webkit-playsinline', '');
    video.setAttribute('x5-playsinline', '');
    
    // Progress tracking
    const progressBar = loader.querySelector('#loadingProgress');
    const loadingText = loader.querySelector('#loadingText');
    
    let loadingStarted = false;
    let removeLoaderTimeout = null;
    
    const updateProgress = () => {
        if (!video.buffered.length) return;
        
        const loaded = video.buffered.end(video.buffered.length - 1);
        const total = video.duration;
        
        if (total && !isNaN(total) && total > 0) {
            const percent = Math.min((loaded / total) * 100, 100);
            if (progressBar) {
                progressBar.style.width = percent + '%';
            }
            
            if (!loadingStarted && loaded > 0) {
                loadingStarted = true;
                if (loadingText) {
                    loadingText.textContent = 'Video yükleniyor... (' + Math.round(percent) + '%)';
                }
            }
        }
    };
    
    // Video yüklendiğinde loader'ı kaldır
    const removeLoader = () => {
        if (removeLoaderTimeout) return; // Zaten kaldırılacak
        
        removeLoaderTimeout = setTimeout(() => {
            if (loader && loader.parentNode) {
                loader.style.opacity = '0';
                loader.style.transition = 'opacity 0.5s ease';
                setTimeout(() => {
                    if (loader.parentNode) {
                        loader.parentNode.removeChild(loader);
                    }
                }, 500);
            }
        }, 500); // Kısa bir gecikme ile kaldır (buffer tamamlanmış olsun)
    };
    
    // Progress event'leri
    video.addEventListener('progress', updateProgress);
    video.addEventListener('timeupdate', updateProgress);
    
    // Birden fazla event dinle (S3 linkleri için) - daha agresif
    video.addEventListener('canplay', function() {
        if (loadingText) loadingText.textContent = 'Video hazırlanıyor...';
        // Biraz buffer'ın yüklenmesini bekle
        setTimeout(removeLoader, 800);
    }, { once: true });
    
    video.addEventListener('loadeddata', function() {
        if (loadingText) loadingText.textContent = 'Video verisi yüklendi...';
        updateProgress();
    }, { once: true });
    
    video.addEventListener('canplaythrough', function() {
        if (loadingText) loadingText.textContent = 'Video hazır!';
        removeLoader();
    }, { once: true });
    
    video.addEventListener('loadedmetadata', function() {
        updateProgress();
        // S3 linkleri için ekstra kontrol
        if (video.readyState >= 3) {
            if (loadingText) loadingText.textContent = 'Video neredeyse hazır...';
        }
    });
    
    // Video hazır olduğunda da kontrol et
    const checkReady = () => {
        if (video.readyState >= 3) {
            updateProgress();
            if (video.buffered.length > 0 && video.buffered.end(0) > 2) {
                removeLoader();
            }
        }
    };
    
    // Error handling
    video.addEventListener('error', function(e) {
        console.error('Video yüklenemedi:', e, video.error);
        if (loadingText) {
            loadingText.textContent = 'Video yüklenirken hata oluştu...';
        }
        
        // Hata durumunda retry mekanizması
        setTimeout(() => {
            removeLoader();
            const errorMsg = video.error ? 
                `Video yüklenemedi (${video.error.code === 4 ? 'Kaynak bulunamadı' : 'Bilinmeyen hata'}). Lütfen sayfayı yenileyin.` :
                'Video yüklenirken bir hata oluştu. Lütfen sayfayı yenileyin.';
            alert(errorMsg);
        }, 2000);
    });
    
    // Stalled event - video yükleme durduğunda
    video.addEventListener('stalled', function() {
        if (loadingText) {
            loadingText.textContent = 'Bağlantı kontrol ediliyor...';
        }
    });
    
    // Waiting event - video buffer beklerken
    video.addEventListener('waiting', function() {
        if (loader && loader.parentNode && loader.style.opacity !== '0') {
            if (loadingText) {
                loadingText.textContent = 'Video yükleniyor, lütfen bekleyin...';
            }
        }
    });
    
    container.appendChild(video);
    
    // Video yükleme başladığında progress'i başlat
    video.addEventListener('loadstart', function() {
        if (loadingText) {
            loadingText.textContent = 'Video bağlantısı kuruluyor...';
        }
    });
    
    // Hemen kontrol et
    setTimeout(checkReady, 100);
    setTimeout(checkReady, 500);
    setTimeout(checkReady, 1000);
    
    video.play().catch(() => {});
}

// Form submission handler - Backend entegrasyonu
async function handleSubmit(event) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    const name = formData.get('name') || form.querySelector('input[type="text"]')?.value;
    const email = formData.get('email') || form.querySelector('input[type="email"]')?.value;
    const phone = formData.get('phone') || form.querySelector('input[type="tel"]')?.value;
    
    try {
        // Önce kullanıcı kaydı/girişi yap (email kontrolü ile)
        let token = API.getToken();
        let user = API.getUser();
        
        if (!token || !user) {
            // Kullanıcı kaydı yap (şifre otomatik oluşturulabilir veya kullanıcıdan istenebilir)
            const tempPassword = Math.random().toString(36).slice(-8) + 'A1!';
            
            try {
                // Önce kayıt dene
                const registerData = await API.register(email, tempPassword, name);
                token = registerData.token;
                user = registerData.user;
                
                // Kullanıcıya şifresini email ile gönder (backend'de email servisi eklenebilir)
                console.log('Kayıt başarılı. Geçici şifre:', tempPassword);
            } catch (error) {
                // Eğer kullanıcı zaten varsa giriş yap
                if (error.message.includes('zaten kayıtlı')) {
                    // Kullanıcıdan şifre iste veya password reset flow başlat
                    alert('Bu email ile kayıtlı bir hesap var. Lütfen giriş yapın veya şifre sıfırlama yapın.');
                    return;
                }
                throw error;
            }
        }
        
        // Kurs satın alma işlemi
        const courseId = 1; // Varsayılan kurs ID (dinamik yapılabilir)
        
        try {
            const purchaseResult = await API.purchaseCourse(courseId);
            
            // Başarılı mesajı göster
            alert('Satın alma başarılı! Kurs paneline yönlendiriliyorsunuz...');
            
            // Kurs paneline yönlendir (veya modal aç)
            setTimeout(() => {
                window.location.href = 'course-player.html?courseId=' + courseId;
            }, 1000);
            
        } catch (error) {
            if (error.message.includes('zaten satın alınmış')) {
                alert('Bu kursu zaten satın aldınız. Kurs paneline yönlendiriliyorsunuz...');
                setTimeout(() => {
                    window.location.href = 'course-player.html?courseId=' + courseId;
                }, 1000);
            } else {
                throw error;
            }
        }
        
    } catch (error) {
        console.error('Hata:', error);
        alert('Bir hata oluştu: ' + error.message);
    }
}

// Scroll animations
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver(function(entries) {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

// Observe elements for animation
document.addEventListener('DOMContentLoaded', function() {
    const animateElements = document.querySelectorAll('.problem-item, .benefit-item, .module, .testimonial');
    
    animateElements.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(el);
    });
});

// Add scroll-to-top button functionality (optional)
let scrollButton = null;

window.addEventListener('scroll', function() {
    if (window.scrollY > 500) {
        if (!scrollButton) {
            scrollButton = document.createElement('button');
            scrollButton.innerHTML = '↑';
            scrollButton.className = 'scroll-to-top';
            scrollButton.style.cssText = `
                position: fixed;
                bottom: 30px;
                right: 30px;
                width: 50px;
                height: 50px;
                border-radius: 50%;
                background: linear-gradient(135deg, #8D3AF6 0%, #7a2fd9 100%);
                color: white;
                border: none;
                font-size: 1.5rem;
                cursor: pointer;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                z-index: 1000;
                transition: transform 0.3s ease;
            `;
            scrollButton.addEventListener('click', function() {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });
            scrollButton.addEventListener('mouseenter', function() {
                this.style.transform = 'scale(1.1)';
            });
            scrollButton.addEventListener('mouseleave', function() {
                this.style.transform = 'scale(1)';
            });
            document.body.appendChild(scrollButton);
        }
        scrollButton.style.display = 'block';
    } else if (scrollButton) {
        scrollButton.style.display = 'none';
    }
});

