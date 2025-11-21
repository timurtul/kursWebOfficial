// Mobile Menu Toggle
function toggleMobileMenu() {
    const mobileMenu = document.getElementById('mobileMenu');
    if (mobileMenu) {
        mobileMenu.classList.toggle('active');
    }
}

// Smooth scroll to form
function scrollToForm() {
    document.getElementById('orderForm').scrollIntoView({ 
        behavior: 'smooth',
        block: 'center'
    });
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
const PREVIEW_IMAGE_FALLBACK = 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1600&q=80';

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
    const video = document.createElement('video');
    video.src = src;
    video.controls = true;
    video.autoplay = false;
    video.muted = false;
    video.setAttribute('playsinline', '');
    video.volume = 1;
    video.style.width = '100%';
    video.style.height = '100%';
    video.style.objectFit = 'cover';
    video.style.position = 'absolute';
    video.style.top = '0';
    video.style.left = '0';
    container.appendChild(video);
    video.addEventListener('error', function() {
        console.error('Video yüklenemedi');
        alert('Video yüklenirken bir hata oluştu. Lütfen tekrar deneyin.');
    });
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

