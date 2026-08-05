import { MessageCircle, Phone } from 'lucide-react';
import { whatsappLink, telLink } from '@/lib/contact-links';

export function FloatingContactButtons() {
  return (
    <div className="fixed right-5 bottom-5 z-30 flex flex-col gap-3">
      <a
        href={telLink()}
        aria-label="Call us"
        className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg transition-transform hover:scale-105"
      >
        <Phone className="h-5 w-5" />
      </a>
      <a
        href={whatsappLink('Hi, I need help with a laboratory instrument or spare part.')}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat on WhatsApp"
        className="flex h-12 w-12 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition-transform hover:scale-105"
      >
        <MessageCircle className="h-5 w-5" />
      </a>
    </div>
  );
}
