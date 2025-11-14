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
document.addEventListener('DOMContentLoaded', function() {
    const videoPlaceholder = document.querySelector('.video-placeholder');
    
    if (videoPlaceholder) {
        videoPlaceholder.addEventListener('click', async function() {
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
                    const video = document.createElement('video');
                    video.src = videoUrl;
                    video.controls = true;
                    video.style.width = '100%';
                    video.style.height = '100%';
                    video.style.objectFit = 'contain';
                    video.style.position = 'absolute';
                    video.style.top = '0';
                    video.style.left = '0';
                    
                    // Replace placeholder with video
                    this.parentElement.innerHTML = '';
                    this.parentElement.appendChild(video);
                    
                    // Video yükleme hatası kontrolü
                    video.addEventListener('error', function() {
                        console.error('Video yüklenemedi');
                        alert('Video yüklenirken bir hata oluştu. Lütfen tekrar deneyin.');
                    });
                }
            } catch (error) {
                console.error('Video yükleme hatası:', error);
                alert('Video yüklenirken bir hata oluştu: ' + error.message);
            }
        });
    }
});

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

