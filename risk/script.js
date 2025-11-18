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

// Video placeholder click handler
document.addEventListener('DOMContentLoaded', function() {
    const videoPlaceholder = document.querySelector('.video-placeholder');
    
    if (videoPlaceholder) {
        videoPlaceholder.addEventListener('click', function() {
            // Replace with your actual video URL
            const videoUrl = 'https://www.youtube.com/embed/YOUR_VIDEO_ID';
            
            // Create iframe for video
            const iframe = document.createElement('iframe');
            iframe.src = videoUrl;
            iframe.width = '100%';
            iframe.height = '100%';
            iframe.frameBorder = '0';
            iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
            iframe.allowFullscreen = true;
            iframe.style.position = 'absolute';
            iframe.style.top = '0';
            iframe.style.left = '0';
            
            // Replace placeholder with iframe
            this.parentElement.innerHTML = '';
            this.parentElement.appendChild(iframe);
        });
    }
});

// Form submission handler
function handleSubmit(event) {
    event.preventDefault();
    
    // Get form data
    const formData = new FormData(event.target);
    const formObject = {};
    formData.forEach((value, key) => {
        formObject[key] = value;
    });
    
    // Here you would typically send the data to your backend
    // For now, we'll just show an alert
    alert('Teşekkürler! Formunuz alındı. Ödeme sayfasına yönlendirileceksiniz.');
    
    // In a real implementation, you would:
    // 1. Send data to your payment processor
    // 2. Redirect to payment page
    // 3. Handle payment callback
    
    console.log('Form Data:', formObject);
    
    // Example: Redirect to payment (uncomment and add your payment URL)
    // window.location.href = 'https://your-payment-url.com';
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

