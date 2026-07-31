/* Vision Analytical — interactions (minimal, professional) */
(function () {
  'use strict';

  // Header shadow on scroll
  var header = document.querySelector('.header');
  var btt = document.getElementById('btt');
  function onScroll() {
    var y = window.scrollY;
    if (header) header.classList.toggle('sc', y > 8);
    if (btt) btt.classList.toggle('show', y > 600);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Mobile menu
  var toggle = document.getElementById('navToggle');
  var links = document.getElementById('navLinks');
  if (toggle && links) {
    toggle.addEventListener('click', function () { links.classList.toggle('open'); });
    links.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () { links.classList.remove('open'); });
    });
  }

  // Scroll reveal
  var revealEls = document.querySelectorAll('.rv');
  if ('IntersectionObserver' in window && revealEls.length) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('in'); });
  }

  // Count-up numbers
  function animateCount(el) {
    var raw = el.getAttribute('data-count');
    var target = parseFloat(raw);
    var dec = (raw.indexOf('.') > -1) ? 1 : 0;
    var dur = 1400, start = null;
    function tick(ts) {
      if (!start) start = ts;
      var p = Math.min((ts - start) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = (target * eased).toFixed(dec);
      if (p < 1) requestAnimationFrame(tick);
      else el.textContent = target.toFixed(dec);
    }
    requestAnimationFrame(tick);
  }
  var counters = document.querySelectorAll('[data-count]');
  if ('IntersectionObserver' in window && counters.length) {
    var co = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { animateCount(e.target); co.unobserve(e.target); }
      });
    }, { threshold: 0.5 });
    counters.forEach(function (el) { co.observe(el); });
  }

  // Contact form tabs (Quote / Engineer Visit / Service)
  window.selectFormTab = function (btn, type) {
    document.querySelectorAll('.form-tab').forEach(function (t) { t.classList.remove('active'); });
    btn.classList.add('active');
    var subject = document.getElementById('f-subject');
    if (subject) subject.value = type;
    var heading = document.getElementById('f-heading');
    if (heading) heading.textContent = type;
  };

  // Build WhatsApp enquiry from form
  window.sendEnquiry = function () {
    var g = function (id) { var el = document.getElementById(id); return el ? el.value.trim() : ''; };
    var subject = g('f-subject') || 'General Enquiry';
    var name = g('f-name'), company = g('f-company'), phone = g('f-phone'),
        instrument = g('f-instrument'), message = g('f-message');
    if (!name || !phone) {
      alert('Please enter your name and phone number so we can call you back.');
      return;
    }
    var lines = [
      '*Vision Analytical — ' + subject + '*',
      'Name: ' + name,
      company ? 'Company: ' + company : '',
      'Phone: ' + phone,
      instrument ? 'Instrument: ' + instrument : '',
      message ? 'Details: ' + message : ''
    ].filter(Boolean);
    var url = 'https://wa.me/919136216080?text=' + encodeURIComponent(lines.join('\n'));
    window.open(url, '_blank');
  };
})();
