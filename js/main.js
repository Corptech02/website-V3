// Main JavaScript for Vanguard Insurance Website

// DOM Elements
const header = document.getElementById('header');
const navToggle = document.getElementById('navToggle');
const navMenu = document.getElementById('navMenu');
const quoteForm = document.getElementById('quoteForm');
const contactForm = document.getElementById('contactForm');

// Header Scroll Effect
let lastScroll = 0;
window.addEventListener('scroll', () => {
    const currentScroll = window.pageYOffset;

    // Add/remove scrolled class
    if (header) {
        if (currentScroll > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    }
    
    
    lastScroll = currentScroll;
});

// Mobile Menu Toggle
if (navToggle && navMenu) {
    navToggle.addEventListener('click', () => {
        navToggle.classList.toggle('active');
        navMenu.classList.toggle('active');
        document.body.style.overflow = navMenu.classList.contains('active') ? 'hidden' : '';
    });
}

// Close mobile menu when clicking on a link
if (navToggle && navMenu) {
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', () => {
            navToggle.classList.remove('active');
            navMenu.classList.remove('active');
            document.body.style.overflow = '';
        });
    });
}

// Smooth Scrolling for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const href = this.getAttribute('href');
        if (!href || href === '#') return;
        const target = document.querySelector(href);
        if (target) {
            const headerOffset = 80;
            const elementPosition = target.offsetTop;
            const offsetPosition = elementPosition - headerOffset;
            
            window.scrollTo({
                top: offsetPosition,
                behavior: 'smooth'
            });
        }
    });
});


// Number Counter Animation - Removed since statistics section was removed

// Testimonial Slider
const testimonialCards = document.querySelectorAll('.testimonial-card');
const dots = document.querySelectorAll('.dot');

if (testimonialCards.length > 0 && dots.length > 0) {
    let currentTestimonial = 0;

    const showTestimonial = (index) => {
        testimonialCards.forEach(card => card.classList.remove('active'));
        dots.forEach(dot => dot.classList.remove('active'));

        if (testimonialCards[index]) testimonialCards[index].classList.add('active');
        if (dots[index]) dots[index].classList.add('active');
    };

    // Auto-rotate testimonials
    const rotateTestimonials = () => {
        currentTestimonial = (currentTestimonial + 1) % testimonialCards.length;
        showTestimonial(currentTestimonial);
    };

    // Set up auto-rotation
    let testimonialInterval = setInterval(rotateTestimonials, 5000);

    // Handle dot clicks
    dots.forEach((dot, index) => {
        dot.addEventListener('click', () => {
            currentTestimonial = index;
            showTestimonial(currentTestimonial);

            // Reset auto-rotation
            clearInterval(testimonialInterval);
            testimonialInterval = setInterval(rotateTestimonials, 5000);
        });
    });
}

// Form Validation and Submission
const validateForm = (form) => {
    const inputs = form.querySelectorAll('input[required], select[required], textarea[required]');
    let isValid = true;
    
    inputs.forEach(input => {
        if (!input.value.trim()) {
            isValid = false;
            input.style.borderColor = '#e74c3c';
            
            // Reset border color after 3 seconds
            setTimeout(() => {
                input.style.borderColor = '';
            }, 3000);
        }
    });
    
    return isValid;
};

// Quote Form Submission
if (quoteForm) {
    quoteForm.addEventListener('submit', (e) => {
        e.preventDefault();

        if (!validateForm(quoteForm)) {
            showNotification('Please fill in all required fields', 'error');
            return;
        }

        // Redirect to commercial auto quote page
        window.location.href = 'pages/quote-commercial-auto.html';
    });
}

// Contact Form Submission
if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        if (!validateForm(contactForm)) {
            showNotification('Please fill in all required fields', 'error');
            return;
        }
        
        // Simulate form submission
        const submitButton = contactForm.querySelector('button[type="submit"]');
        const originalText = submitButton.textContent;
        submitButton.textContent = 'Sending...';
        submitButton.disabled = true;
        
        setTimeout(() => {
            showNotification('Message sent successfully! We\'ll get back to you soon.', 'success');
            contactForm.reset();
            submitButton.textContent = originalText;
            submitButton.disabled = false;
        }, 2000);
    });
}


// Intersection Observer for scroll animations
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -100px 0px'
};

const scrollObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

// Apply to elements with data-aos attribute
document.addEventListener('DOMContentLoaded', () => {
    const animatedElements = document.querySelectorAll('[data-aos]');
    
    animatedElements.forEach(element => {
        element.style.opacity = '0';
        element.style.transform = 'translateY(20px)';
        element.style.transition = 'all 0.6s ease';
        
        const delay = element.getAttribute('data-aos-delay');
        if (delay) {
            element.style.transitionDelay = `${delay}ms`;
        }
        
        scrollObserver.observe(element);
    });
});

// Parallax Effect for Hero Section
const heroSection = document.querySelector('.hero');
const heroBackground = document.querySelector('.animated-bg');

if (heroSection && heroBackground) {
    window.addEventListener('scroll', () => {
        const scrolled = window.pageYOffset;
        const parallaxSpeed = 0.5;
        
        if (scrolled < window.innerHeight) {
            heroBackground.style.transform = `translateY(${scrolled * parallaxSpeed}px)`;
        }
    });
}

// Dynamic Year in Footer
const currentYear = new Date().getFullYear();
const footerYear = document.querySelector('.footer-bottom p');
if (footerYear) {
    footerYear.innerHTML = footerYear.innerHTML.replace('2024', currentYear);
}

// Preloader (optional)
window.addEventListener('load', () => {
    const preloader = document.querySelector('.preloader');
    if (preloader) {
        setTimeout(() => {
            preloader.style.opacity = '0';
            setTimeout(() => {
                preloader.style.display = 'none';
            }, 500);
        }, 500);
    }
});

// Enhanced Dropdown Menu Interactions
const dropdowns = document.querySelectorAll('.dropdown');

dropdowns.forEach(dropdown => {
    let timeout;
    
    dropdown.addEventListener('mouseenter', () => {
        clearTimeout(timeout);
        dropdown.querySelector('.dropdown-content').style.display = 'block';
    });
    
    dropdown.addEventListener('mouseleave', () => {
        timeout = setTimeout(() => {
            dropdown.querySelector('.dropdown-content').style.display = '';
        }, 300);
    });
});

// Form Input Animation
const formInputs = document.querySelectorAll('.form-group input, .form-group textarea, .form-group select');

formInputs.forEach(input => {
    input.addEventListener('focus', function() {
        this.parentElement.classList.add('focused');
    });
    
    input.addEventListener('blur', function() {
        if (!this.value) {
            this.parentElement.classList.remove('focused');
        }
    });
    
    // Check on load if input has value
    if (input.value) {
        input.parentElement.classList.add('focused');
    }
});

// Lazy Loading for Images
const lazyImages = document.querySelectorAll('img[data-src]');

if ('IntersectionObserver' in window) {
    const imageObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.getAttribute('data-src');
                img.removeAttribute('data-src');
                imageObserver.unobserve(img);
            }
        });
    });
    
    lazyImages.forEach(img => imageObserver.observe(img));
} else {
    // Fallback for browsers without IntersectionObserver
    lazyImages.forEach(img => {
        img.src = img.getAttribute('data-src');
        img.removeAttribute('data-src');
    });
}

// Newsletter Form
const newsletterForm = document.querySelector('.newsletter-form');
if (newsletterForm) {
    newsletterForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = newsletterForm.querySelector('input[type="email"]').value;
        
        if (email) {
            showNotification('Thank you for subscribing to our newsletter!', 'success');
            newsletterForm.reset();
        }
    });
}

// Add smooth reveal animation to sections
const revealSections = () => {
    const sections = document.querySelectorAll('section');
    
    sections.forEach(section => {
        const sectionTop = section.getBoundingClientRect().top;
        const triggerPoint = window.innerHeight * 0.8;
        
        if (sectionTop < triggerPoint) {
            section.classList.add('revealed');
        }
    });
};

window.addEventListener('scroll', revealSections);
window.addEventListener('load', revealSections);

// Performance Optimization: Debounce scroll events
const debounce = (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
};

// Apply debounce to scroll-heavy functions
window.addEventListener('scroll', debounce(() => {
    // Your scroll functions here
}, 10));

// Check login state and update header
function checkLoginState() {
    const isLoggedIn = localStorage.getItem('vanguard_logged_in') === 'true';
    const userName = localStorage.getItem('vanguard_user_name') || 'User';

    if (isLoggedIn) {
        updateHeaderForLoggedInUser(userName);
    }
}

function updateHeaderForLoggedInUser(userName) {
    const navList = document.querySelector('.nav-list');
    const navActions = document.querySelector('.nav-actions');

    if (navList && navActions) {
        // Remove "Get a Quote" link
        const quoteLinks = navList.querySelectorAll('.nav-link');
        quoteLinks.forEach(link => {
            if (link.textContent.trim() === 'Get a Quote') {
                link.parentElement.remove();
            }
        });

        // Show profile nav item, hide mobile login nav item
        const profileNavItem = document.getElementById('profileNavItem');
        const mobileLoginNavItem = document.getElementById('mobileLoginNavItem');
        if (profileNavItem) profileNavItem.style.display = '';
        if (mobileLoginNavItem) mobileLoginNavItem.style.display = 'none';

        // Update Login button to Logout button
        const loginBtn = navActions.querySelector('.btn-primary');
        if (loginBtn && loginBtn.textContent.trim() === 'Login') {
            loginBtn.textContent = 'Logout';
            loginBtn.classList.add('logout-btn-dynamic');
            loginBtn.href = '#';

            // Add logout button styling
            const style = document.createElement('style');
            style.id = 'logout-btn-style';
            if (!document.getElementById('logout-btn-style')) {
                style.textContent = `
                    .logout-btn-dynamic {
                        background: #e74c3c !important;
                        background-image: none !important;
                    }
                    .logout-btn-dynamic:hover {
                        background: #c0392b !important;
                        box-shadow: 0 6px 20px rgba(231, 76, 60, 0.4) !important;
                    }
                `;
                document.head.appendChild(style);
            }

            loginBtn.addEventListener('click', handleLogout);
        }
    }
}

function handleLogout(e) {
    e.preventDefault();

    // Clear login state
    localStorage.removeItem('vanguard_logged_in');
    localStorage.removeItem('vanguard_user_name');
    localStorage.removeItem('vanguard_policy_number');

    // Redirect to login page (check if we're in pages/ directory or root)
    const currentPath = window.location.pathname;
    if (currentPath.includes('/pages/')) {
        window.location.href = 'login.html';
    } else {
        window.location.href = 'pages/login.html';
    }
}

// Run on page load
document.addEventListener('DOMContentLoaded', checkLoginState);

console.log('Vanguard Insurance Group website initialized successfully!');