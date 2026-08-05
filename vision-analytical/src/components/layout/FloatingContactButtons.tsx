'use client';

import { useEffect, useState } from 'react';
import { MessageCircle, Phone } from 'lucide-react';
import { whatsappLink, telLink } from '@/lib/contact-links';
import { cn } from '@/lib/utils';

// Hidden until the user scrolls past the fold so it never sits on top of a
// page's own hero CTAs (e.g. the homepage hero already has WhatsApp/Call buttons).
export function FloatingContactButtons() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function handleScroll() {
      setVisible(window.scrollY > 500);
    }
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div
      className={cn(
        'fixed right-5 bottom-5 z-30 flex flex-col gap-3 transition-all duration-200',
        visible ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-4 opacity-0',
      )}
      aria-hidden={!visible}
    >
      <a
        href={telLink()}
        aria-label="Call us"
        tabIndex={visible ? 0 : -1}
        className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg transition-transform hover:scale-105"
      >
        <Phone className="h-5 w-5" />
      </a>
      <a
        href={whatsappLink('Hi, I need help with a laboratory instrument or spare part.')}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat on WhatsApp"
        tabIndex={visible ? 0 : -1}
        className="flex h-12 w-12 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition-transform hover:scale-105"
      >
        <MessageCircle className="h-5 w-5" />
      </a>
    </div>
  );
}
